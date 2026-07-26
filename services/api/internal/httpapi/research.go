package httpapi

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
)

const maxMultipartBytes = research.MaxUploadBytes + (1 << 20)

func (s *server) listResearchWorkspaces(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) {
		return
	}
	workspaces, err := s.research.ListWorkspaces(r.Context(), principal.ClerkUserID)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": workspaces, "meta": s.researchMeta()})
}

func (s *server) createResearchWorkspace(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) || !s.enforceMutationRateLimit(w, r, principal) {
		return
	}
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	workspace, err := s.research.CreateWorkspace(r.Context(), principal.ClerkUserID, body.Name, body.Description)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "research_workspace.created", "research_workspace", workspace.ID, nil)
	writeJSON(w, http.StatusCreated, map[string]any{"data": workspace, "meta": s.researchMeta()})
}

func (s *server) getResearchWorkspace(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) {
		return
	}
	workspace, err := s.research.GetWorkspace(r.Context(), principal.ClerkUserID, r.PathValue("workspaceID"))
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": workspace, "meta": s.researchMeta()})
}

func (s *server) listResearchDocuments(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) {
		return
	}
	documents, err := s.research.ListDocuments(r.Context(), principal.ClerkUserID, r.PathValue("workspaceID"))
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": documents, "meta": s.researchMeta()})
}

func (s *server) getResearchDocument(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) {
		return
	}
	document, err := s.research.GetDocument(
		r.Context(), principal.ClerkUserID, r.PathValue("workspaceID"), r.PathValue("documentID"),
	)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": document, "meta": s.researchMeta()})
}

func (s *server) searchResearchEvidence(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) || !s.enforceMutationRateLimit(w, r, principal) {
		return
	}
	var request research.SearchRequest
	if err := decodeJSON(r, &request); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	response, err := s.retriever.Search(
		r.Context(), principal.ClerkUserID, r.PathValue("workspaceID"), request,
	)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": response, "meta": s.researchMeta()})
}

func (s *server) uploadResearchDocument(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) || !s.enforceMutationRateLimit(w, r, principal) {
		return
	}
	if s.documentStore == nil {
		writeError(w, r, http.StatusServiceUnavailable, "document_storage_not_configured", "Document storage is not configured.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxMultipartBytes)
	if err := r.ParseMultipartForm(research.MaxUploadBytes); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_multipart", "Upload one PDF or text document up to 10 MiB.")
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "file_required", "Choose a PDF or text document to upload.")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, research.MaxUploadBytes+1))
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "upload_read_failed", "The document could not be read.")
		return
	}
	validated, err := research.ValidateUpload(header.Filename, header.Header.Get("Content-Type"), data)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	uploadID := research.NewID()
	document, err := s.research.CreatePendingDocument(
		r.Context(),
		principal.ClerkUserID,
		r.PathValue("workspaceID"),
		research.UploadMetadata{
			ID: uploadID, Title: strings.TrimSpace(r.FormValue("title")),
			OriginalFilename: header.Filename, MimeType: validated.MimeType,
			ByteSize: int64(len(validated.Bytes)), SHA256: validated.SHA256,
			Extension: validated.Extension,
		},
	)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	if err := s.documentStore.Put(
		r.Context(), document.StorageObjectKey, validated.MimeType,
		bytes.NewReader(validated.Bytes), int64(len(validated.Bytes)),
	); err != nil {
		_ = s.research.FailUpload(r.Context(), principal.ClerkUserID, document.WorkspaceID, document.ID, "storage_failure")
		_ = s.documentStore.Delete(r.Context(), document.StorageObjectKey)
		s.logger.Error("document storage failed", "requestId", RequestID(r.Context()), "documentId", document.ID, "error", err)
		writeError(w, r, http.StatusServiceUnavailable, "storage_failure", "The document could not be stored. Retry the upload.")
		return
	}
	document, err = s.research.FinalizeUpload(
		r.Context(), principal.ClerkUserID, document.WorkspaceID, document.ID,
	)
	if err != nil {
		_ = s.documentStore.Delete(r.Context(), document.StorageObjectKey)
		_ = s.research.FailUpload(r.Context(), principal.ClerkUserID, document.WorkspaceID, document.ID, "queue_failure")
		s.writeResearchError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "research_document.uploaded", "research_document", document.ID, map[string]any{
		"mimeType": document.MimeType, "byteSize": document.ByteSize,
	})
	writeJSON(w, http.StatusAccepted, map[string]any{"data": document, "meta": s.researchMeta()})
}

func (s *server) retryResearchDocument(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) || !s.enforceMutationRateLimit(w, r, principal) {
		return
	}
	document, err := s.research.RetryDocument(
		r.Context(), principal.ClerkUserID, r.PathValue("workspaceID"), r.PathValue("documentID"),
	)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "research_document.retried", "research_document", document.ID, nil)
	writeJSON(w, http.StatusAccepted, map[string]any{"data": document, "meta": s.researchMeta()})
}

func (s *server) listResearchDocumentPages(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if !s.requireResearch(w, r) {
		return
	}
	pages, err := s.research.ListPages(
		r.Context(), principal.ClerkUserID, r.PathValue("workspaceID"), r.PathValue("documentID"),
	)
	if err != nil {
		s.writeResearchError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": pages, "meta": s.researchMeta()})
}

func (s *server) requireResearch(w http.ResponseWriter, r *http.Request) bool {
	if s.research != nil {
		return true
	}
	writeError(w, r, http.StatusServiceUnavailable, "research_not_configured", "Research persistence is not configured.")
	return false
}

func (s *server) researchMeta() map[string]any {
	meta := map[string]any{"persistence": s.research.PersistenceMode()}
	if s.documentStore != nil {
		meta["storage"] = s.documentStore.Mode()
	}
	return meta
}

func (s *server) writeResearchError(w http.ResponseWriter, r *http.Request, err error) {
	var validationError *research.ValidationError
	switch {
	case errors.As(err, &validationError):
		writeError(w, r, http.StatusBadRequest, validationError.Code, validationError.Message)
	case errors.Is(err, research.ErrNotFound):
		writeError(w, r, http.StatusNotFound, "not_found", "The research resource was not found.")
	case errors.Is(err, research.ErrConflict):
		writeError(w, r, http.StatusConflict, "invalid_document_state", "The document cannot be changed from its current state.")
	default:
		s.logger.Error("research request failed", "requestId", RequestID(r.Context()), "error", err)
		writeError(w, r, http.StatusInternalServerError, "research_request_failed", "The research request could not be completed.")
	}
}
