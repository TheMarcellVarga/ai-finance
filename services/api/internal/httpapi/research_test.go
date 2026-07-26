package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
)

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
