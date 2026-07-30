package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
)

type reviewTestStore struct {
	research.Store
	owner       string
	workspaceID string
	runID       string
	events      []research.AnalysisReviewEvent
}

func (s *reviewTestStore) ListAnalysisReviewEvents(
	_ context.Context,
	userID, workspaceID, runID string,
) ([]research.AnalysisReviewEvent, error) {
	if userID != s.owner || workspaceID != s.workspaceID || runID != s.runID {
		return nil, research.ErrNotFound
	}
	return append([]research.AnalysisReviewEvent(nil), s.events...), nil
}

func (s *reviewTestStore) AppendAnalysisReviewEvent(
	_ context.Context,
	userID, workspaceID, runID string,
	input research.AppendAnalysisReviewEventInput,
) (research.AnalysisReviewEvent, bool, error) {
	if userID != s.owner || workspaceID != s.workspaceID || runID != s.runID {
		return research.AnalysisReviewEvent{}, false, research.ErrNotFound
	}
	for _, event := range s.events {
		if event.RequestID == input.RequestID {
			return event, true, nil
		}
	}
	event := research.AnalysisReviewEvent{
		ID: research.NewID(), RequestID: input.RequestID, AnalysisRunID: runID,
		SectionKey: input.SectionKey, EventType: input.EventType,
		ContentEventID: input.ContentEventID, SectionTitle: input.SectionTitle,
		SectionBody: input.SectionBody, Note: input.Note,
		CitationChunkID: input.CitationChunkID,
		OutputSHA256:    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		CreatedAt:       time.Now().UTC(),
	}
	s.events = append(s.events, event)
	return event, false, nil
}

func researchHandler(t *testing.T) (http.Handler, *research.MemoryStore, *research.MemoryStorage) {
	t.Helper()
	authenticator, err := auth.NewAuthenticator(auth.Config{
		Mode: "dev", Env: "test", DevPrefix: "dev:",
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	researchStore := research.NewMemoryStore()
	documentStore := research.NewMemoryStorage()
	handler := NewHandler(Options{
		Authenticator: authenticator,
		Research:      researchStore, ResearchEmbedder: research.NewHashEmbedder(research.DefaultEmbeddingDimensions),
		DocumentStore: documentStore,
		Logger:        slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	return handler, researchStore, documentStore
}

func TestResearchUploadProcessesPageAwareText(t *testing.T) {
	handler, researchStore, documentStore := researchHandler(t)
	workspaceID := createTestResearchWorkspace(t, handler, "dev:user_research")

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("title", "Risk committee notes"); err != nil {
		t.Fatal(err)
	}
	part, err := writer.CreateFormFile("file", "committee-notes.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("Page one evidence.\fPage two evidence.")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodPost, "/v1/research/workspaces/"+workspaceID+"/documents", &body)
	request.Header.Set("Authorization", "Bearer dev:user_research")
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusAccepted {
		t.Fatalf("expected upload 202, got %d: %s", response.Code, response.Body.String())
	}

	var uploaded struct {
		Data research.Document `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &uploaded); err != nil {
		t.Fatal(err)
	}
	if uploaded.Data.Status != "queued" {
		t.Fatalf("expected queued document, got %#v", uploaded.Data)
	}

	parser, err := research.NewPageAwareParser("pdftotext")
	if err != nil {
		t.Fatal(err)
	}
	processor := research.Processor{
		Store: researchStore, Storage: documentStore, Parser: parser,
	}
	processed, err := processor.ProcessNext(request.Context(), "test-worker")
	if err != nil || !processed {
		t.Fatalf("expected processing success, processed=%v err=%v", processed, err)
	}

	pagesRequest := httptest.NewRequest(
		http.MethodGet,
		"/v1/research/workspaces/"+workspaceID+"/documents/"+uploaded.Data.ID+"/pages",
		nil,
	)
	pagesRequest.Header.Set("Authorization", "Bearer dev:user_research")
	pagesResponse := httptest.NewRecorder()
	handler.ServeHTTP(pagesResponse, pagesRequest)
	if pagesResponse.Code != http.StatusOK {
		t.Fatalf("expected pages 200, got %d: %s", pagesResponse.Code, pagesResponse.Body.String())
	}
	var pages struct {
		Data []research.Page `json:"data"`
	}
	if err := json.Unmarshal(pagesResponse.Body.Bytes(), &pages); err != nil {
		t.Fatal(err)
	}
	if len(pages.Data) != 2 || pages.Data[1].PageNumber != 2 {
		t.Fatalf("expected two page-aware records, got %#v", pages.Data)
	}

	searchRequest := httptest.NewRequest(
		http.MethodPost,
		"/v1/research/workspaces/"+workspaceID+"/search",
		bytes.NewBufferString(`{"query":"page two evidence","limit":5}`),
	)
	searchRequest.Header.Set("Authorization", "Bearer dev:user_research")
	searchRequest.Header.Set("Content-Type", "application/json")
	searchResponse := httptest.NewRecorder()
	handler.ServeHTTP(searchResponse, searchRequest)
	if searchResponse.Code != http.StatusOK {
		t.Fatalf("expected search 200, got %d: %s", searchResponse.Code, searchResponse.Body.String())
	}
	var search struct {
		Data research.SearchResponse `json:"data"`
	}
	if err := json.Unmarshal(searchResponse.Body.Bytes(), &search); err != nil {
		t.Fatal(err)
	}
	if len(search.Data.Results) == 0 || search.Data.Results[0].PageNumber != 2 {
		t.Fatalf("expected page two evidence first, got %#v", search.Data.Results)
	}
	if search.Data.Diagnostics.RunID == "" ||
		search.Data.Diagnostics.Embedding.Version != research.HashEmbeddingVersion {
		t.Fatalf("expected versioned retrieval diagnostics, got %#v", search.Data.Diagnostics)
	}
}

func TestResearchDocumentsAreOwnerScoped(t *testing.T) {
	handler, _, _ := researchHandler(t)
	workspaceID := createTestResearchWorkspace(t, handler, "dev:user_owner")

	request := httptest.NewRequest(http.MethodGet, "/v1/research/workspaces/"+workspaceID+"/documents", nil)
	request.Header.Set("Authorization", "Bearer dev:user_other")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected other owner 404, got %d: %s", response.Code, response.Body.String())
	}
}

func TestResearchCrossOwnerOperationsAreOpaque(t *testing.T) {
	handler, _, _ := researchHandler(t)
	workspaceID := createTestResearchWorkspace(t, handler, "dev:user_owner")
	documentID := uploadTestTextDocument(t, handler, workspaceID, "dev:user_owner")

	tests := []struct {
		method       string
		path         string
		expectedCode int
	}{
		{http.MethodGet, "/v1/research/workspaces/" + workspaceID, http.StatusNotFound},
		{http.MethodGet, "/v1/research/workspaces/" + workspaceID + "/documents", http.StatusNotFound},
		{http.MethodGet, "/v1/research/workspaces/" + workspaceID + "/documents/" + documentID, http.StatusNotFound},
		{http.MethodGet, "/v1/research/workspaces/" + workspaceID + "/documents/" + documentID + "/pages", http.StatusNotFound},
		{http.MethodPost, "/v1/research/workspaces/" + workspaceID + "/documents/" + documentID + "/retry", http.StatusNotFound},
		{http.MethodGet, "/v1/research/workspaces/" + workspaceID + "/documents/" + documentID + "/download", http.StatusNotFound},
		{http.MethodDelete, "/v1/research/workspaces/" + workspaceID + "/documents/" + documentID, http.StatusMethodNotAllowed},
	}
	for _, test := range tests {
		request := httptest.NewRequest(test.method, test.path, nil)
		request.Header.Set("Authorization", "Bearer dev:user_other")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != test.expectedCode {
			t.Errorf("%s %s: expected %d, got %d: %s", test.method, test.path, test.expectedCode, response.Code, response.Body.String())
		}
	}
}

func TestResearchSearchRejectsCrossOwnerWorkspace(t *testing.T) {
	handler, _, _ := researchHandler(t)
	workspaceID := createTestResearchWorkspace(t, handler, "dev:user_owner")
	request := httptest.NewRequest(
		http.MethodPost,
		"/v1/research/workspaces/"+workspaceID+"/search",
		bytes.NewBufferString(`{"query":"owner evidence"}`),
	)
	request.Header.Set("Authorization", "Bearer dev:user_other")
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected opaque cross-owner 404, got %d: %s", response.Code, response.Body.String())
	}
}

func TestResearchAnalysisReviewEventsRequireHumanOwnerAndAreIdempotent(t *testing.T) {
	authenticator, err := auth.NewAuthenticator(auth.Config{
		Mode: "dev", Env: "test", DevPrefix: "dev:",
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	store := &reviewTestStore{
		Store: research.NewMemoryStore(), owner: "user_owner",
		workspaceID: "11111111-1111-4111-8111-111111111111",
		runID:       "22222222-2222-4222-8222-222222222222",
	}
	handler := NewHandler(Options{
		Authenticator: authenticator, Research: store,
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	path := "/v1/research/workspaces/" + store.workspaceID + "/analysis-runs/" + store.runID + "/review-events"
	body := `{"requestId":"33333333-3333-4333-8333-333333333333","sectionKey":"executive_summary","eventType":"accepted","contentEventId":"","sectionTitle":"","sectionBody":"","note":"Human checked against the source.","citationChunkId":""}`

	for attempt, expected := range []int{http.StatusCreated, http.StatusOK} {
		request := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(body))
		request.Header.Set("Authorization", "Bearer dev:user_owner")
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != expected {
			t.Fatalf("attempt %d: expected %d, got %d: %s", attempt+1, expected, response.Code, response.Body.String())
		}
	}
	if len(store.events) != 1 {
		t.Fatalf("expected one append-only event after replay, got %d", len(store.events))
	}

	crossOwner := httptest.NewRequest(http.MethodGet, path, nil)
	crossOwner.Header.Set("Authorization", "Bearer dev:user_other")
	crossOwnerResponse := httptest.NewRecorder()
	handler.ServeHTTP(crossOwnerResponse, crossOwner)
	if crossOwnerResponse.Code != http.StatusNotFound {
		t.Fatalf("expected opaque cross-owner 404, got %d: %s", crossOwnerResponse.Code, crossOwnerResponse.Body.String())
	}

	invalid := httptest.NewRequest(
		http.MethodPost,
		path,
		bytes.NewBufferString(`{"requestId":"not-a-uuid","sectionKey":"executive_summary","eventType":"accepted"}`),
	)
	invalid.Header.Set("Authorization", "Bearer dev:user_owner")
	invalid.Header.Set("Content-Type", "application/json")
	invalidResponse := httptest.NewRecorder()
	handler.ServeHTTP(invalidResponse, invalid)
	if invalidResponse.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid review request 400, got %d: %s", invalidResponse.Code, invalidResponse.Body.String())
	}
}

func TestResearchUploadRejectsDisguisedPDF(t *testing.T) {
	handler, _, _ := researchHandler(t)
	workspaceID := createTestResearchWorkspace(t, handler, "dev:user_research")

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "not-really.pdf")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("plain text")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/research/workspaces/"+workspaceID+"/documents", &body)
	request.Header.Set("Authorization", "Bearer dev:user_research")
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest || !bytes.Contains(response.Body.Bytes(), []byte("invalid_pdf_signature")) {
		t.Fatalf("expected invalid PDF response, got %d: %s", response.Code, response.Body.String())
	}
}

func createTestResearchWorkspace(t *testing.T, handler http.Handler, authorization string) string {
	t.Helper()
	request := httptest.NewRequest(
		http.MethodPost,
		"/v1/research/workspaces",
		bytes.NewBufferString(`{"name":"Primary research workspace"}`),
	)
	request.Header.Set("Authorization", "Bearer "+authorization)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusCreated {
		t.Fatalf("expected workspace 201, got %d: %s", response.Code, response.Body.String())
	}
	var created struct {
		Data research.Workspace `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	return created.Data.ID
}

func uploadTestTextDocument(
	t *testing.T,
	handler http.Handler,
	workspaceID string,
	authorization string,
) string {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "owner-evidence.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("Owner-scoped source evidence.")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(
		http.MethodPost,
		"/v1/research/workspaces/"+workspaceID+"/documents",
		&body,
	)
	request.Header.Set("Authorization", "Bearer "+authorization)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusAccepted {
		t.Fatalf("expected upload 202, got %d: %s", response.Code, response.Body.String())
	}
	var uploaded struct {
		Data research.Document `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &uploaded); err != nil {
		t.Fatal(err)
	}
	return uploaded.Data.ID
}
