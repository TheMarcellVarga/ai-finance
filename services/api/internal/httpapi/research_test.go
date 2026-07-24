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
		Research:      researchStore, DocumentStore: documentStore,
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
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
