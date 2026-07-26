package research

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"
)

type memoryWorkspace struct {
	Workspace
	UserID    string
	ProfileID string
}

type memoryDocument struct {
	Document
	UserID string
}

type memoryJob struct {
	ID             string
	DocumentID     string
	Status         string
	IdempotencyKey string
	Attempts       int
	MaxAttempts    int
	AvailableAt    time.Time
	LeaseOwner     string
	LeaseExpiresAt time.Time
}

type MemoryStore struct {
	mu         sync.Mutex
	workspaces map[string]*memoryWorkspace
	documents  map[string]*memoryDocument
	pages      map[string][]Page
	chunks     map[string][]Chunk
	jobs       map[string]*memoryJob
	profiles   map[string]string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		workspaces: map[string]*memoryWorkspace{},
		documents:  map[string]*memoryDocument{},
		pages:      map[string][]Page{},
		chunks:     map[string][]Chunk{},
		jobs:       map[string]*memoryJob{},
		profiles:   map[string]string{},
	}
}

func (s *MemoryStore) PersistenceMode() string {
	return "memory"
}

func (s *MemoryStore) profileID(userID string) string {
	if id := s.profiles[userID]; id != "" {
		return id
	}
	id := NewID()
	s.profiles[userID] = id
	return id
}

func (s *MemoryStore) ListWorkspaces(_ context.Context, userID string) ([]Workspace, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]Workspace, 0)
	for _, workspace := range s.workspaces {
		if workspace.UserID == userID && workspace.Status != "archived" {
			result = append(result, workspace.Workspace)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].UpdatedAt.After(result[j].UpdatedAt) })
	return result, nil
}

func (s *MemoryStore) CreateWorkspace(_ context.Context, userID, name, description string) (Workspace, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	workspace := &memoryWorkspace{
		Workspace: Workspace{
			ID:          NewID(),
			Name:        cleanText(name, "Primary research workspace", 120),
			Description: cleanText(description, "", 1000),
			Status:      "active",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		UserID:    userID,
		ProfileID: s.profileID(userID),
	}
	s.workspaces[workspace.ID] = workspace
	return workspace.Workspace, nil
}

func (s *MemoryStore) GetWorkspace(_ context.Context, userID, workspaceID string) (Workspace, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	workspace, ok := s.workspaces[workspaceID]
	if !ok || workspace.UserID != userID || workspace.Status == "archived" {
		return Workspace{}, ErrNotFound
	}
	return workspace.Workspace, nil
}

func (s *MemoryStore) ListDocuments(_ context.Context, userID, workspaceID string) ([]Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.ownsWorkspace(userID, workspaceID) {
		return nil, ErrNotFound
	}
	result := make([]Document, 0)
	for _, document := range s.documents {
		if document.UserID == userID && document.WorkspaceID == workspaceID && document.Status != "deleted" {
			result = append(result, document.Document)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].CreatedAt.After(result[j].CreatedAt) })
	return result, nil
}

func (s *MemoryStore) GetDocument(_ context.Context, userID, workspaceID, documentID string) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	document, ok := s.documents[documentID]
	if !ok || document.UserID != userID || document.WorkspaceID != workspaceID || document.Status == "deleted" {
		return Document{}, ErrNotFound
	}
	return document.Document, nil
}

func (s *MemoryStore) CreatePendingDocument(_ context.Context, userID, workspaceID string, upload UploadMetadata) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	workspace, ok := s.workspaces[workspaceID]
	if !ok || workspace.UserID != userID || workspace.Status != "active" {
		return Document{}, ErrNotFound
	}
	if _, exists := s.documents[upload.ID]; exists {
		return Document{}, ErrConflict
	}
	now := time.Now().UTC()
	document := &memoryDocument{
		Document: Document{
			ID:               upload.ID,
			WorkspaceID:      workspaceID,
			Title:            cleanText(upload.Title, upload.OriginalFilename, 200),
			OriginalFilename: cleanText(upload.OriginalFilename, "document"+upload.Extension, 255),
			MimeType:         upload.MimeType,
			ByteSize:         upload.ByteSize,
			SHA256:           upload.SHA256,
			StorageBucket:    "research-documents",
			StorageObjectKey: ObjectKey(workspace.ProfileID, workspaceID, upload.ID, upload.Extension),
			Status:           "uploading",
			CreatedAt:        now,
			UpdatedAt:        now,
		},
		UserID: userID,
	}
	s.documents[document.ID] = document
	workspace.UpdatedAt = now
	return document.Document, nil
}

func (s *MemoryStore) FinalizeUpload(_ context.Context, userID, workspaceID, documentID string) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	document, ok := s.documents[documentID]
	if !ok || document.UserID != userID || document.WorkspaceID != workspaceID {
		return Document{}, ErrNotFound
	}
	if document.Status != "uploading" && document.Status != "failed" {
		return Document{}, ErrConflict
	}
	now := time.Now().UTC()
	document.Status = "queued"
	document.ErrorCode = ""
	document.ErrorMessage = ""
	document.AttemptCount++
	document.UploadedAt = &now
	document.UpdatedAt = now
	job := &memoryJob{
		ID:             NewID(),
		DocumentID:     document.ID,
		Status:         "queued",
		IdempotencyKey: document.ID + ":parse:" + time.Now().UTC().Format("20060102150405.000000000"),
		MaxAttempts:    3,
		AvailableAt:    now,
	}
	s.jobs[job.ID] = job
	return document.Document, nil
}

func (s *MemoryStore) FailUpload(_ context.Context, userID, workspaceID, documentID, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	document, ok := s.documents[documentID]
	if !ok || document.UserID != userID || document.WorkspaceID != workspaceID {
		return ErrNotFound
	}
	document.Status = "failed"
	document.ErrorCode = cleanText(code, "storage_failure", 80)
	document.ErrorMessage = "The document could not be stored. Retry the upload."
	document.UpdatedAt = time.Now().UTC()
	return nil
}

func (s *MemoryStore) RetryDocument(_ context.Context, userID, workspaceID, documentID string) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	document, ok := s.documents[documentID]
	if !ok || document.UserID != userID || document.WorkspaceID != workspaceID {
		return Document{}, ErrNotFound
	}
	if document.Status != "failed" {
		return Document{}, ErrConflict
	}
	for _, job := range s.jobs {
		if job.DocumentID == documentID && (job.Status == "queued" || job.Status == "processing") {
			return Document{}, ErrConflict
		}
	}
	now := time.Now().UTC()
	document.Status = "queued"
	document.ErrorCode = ""
	document.ErrorMessage = ""
	document.AttemptCount++
	document.UpdatedAt = now
	job := &memoryJob{
		ID:             NewID(),
		DocumentID:     document.ID,
		Status:         "queued",
		IdempotencyKey: document.ID + ":retry:" + time.Now().UTC().Format("20060102150405.000000000"),
		MaxAttempts:    3,
		AvailableAt:    now,
	}
	s.jobs[job.ID] = job
	return document.Document, nil
}

func (s *MemoryStore) ListPages(_ context.Context, userID, workspaceID, documentID string) ([]Page, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	document, ok := s.documents[documentID]
	if !ok || document.UserID != userID || document.WorkspaceID != workspaceID {
		return nil, ErrNotFound
	}
	return clonePages(s.pages[documentID]), nil
}

func (s *MemoryStore) ClaimProcessingJob(_ context.Context, workerID string, lease time.Duration) (ProcessingJob, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	var selected *memoryJob
	for _, job := range s.jobs {
		claimable := job.Status == "queued" && !job.AvailableAt.After(now)
		expired := job.Status == "processing" && !job.LeaseExpiresAt.After(now)
		if !claimable && !expired {
			continue
		}
		if selected == nil || job.AvailableAt.Before(selected.AvailableAt) {
			selected = job
		}
	}
	if selected == nil {
		return ProcessingJob{}, false, nil
	}
	document := s.documents[selected.DocumentID]
	if document == nil {
		selected.Status = "failed"
		return ProcessingJob{}, false, nil
	}
	selected.Status = "processing"
	selected.Attempts++
	selected.LeaseOwner = workerID
	selected.LeaseExpiresAt = now.Add(lease)
	document.Status = "processing"
	document.UpdatedAt = now
	return ProcessingJob{
		ID:          selected.ID,
		Document:    document.Document,
		Attempts:    selected.Attempts,
		MaxAttempts: selected.MaxAttempts,
	}, true, nil
}

func (s *MemoryStore) CompleteProcessingJob(_ context.Context, jobID string, pages []Page, chunks []Chunk, _ map[string]int64) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	job := s.jobs[jobID]
	if job == nil || job.Status != "processing" {
		return Document{}, ErrNotFound
	}
	document := s.documents[job.DocumentID]
	if document == nil {
		return Document{}, ErrNotFound
	}
	now := time.Now().UTC()
	normalizedPages := clonePages(pages)
	for index := range normalizedPages {
		normalizedPages[index].ID = NewID()
		normalizedPages[index].DocumentID = document.ID
		normalizedPages[index].WorkspaceID = document.WorkspaceID
	}
	s.pages[document.ID] = normalizedPages
	s.chunks[document.ID] = cloneChunks(chunks)
	job.Status = "succeeded"
	job.LeaseOwner = ""
	job.LeaseExpiresAt = time.Time{}
	document.Status = "ready"
	document.PageCount = len(normalizedPages)
	document.ErrorCode = ""
	document.ErrorMessage = ""
	document.ParsedAt = &now
	document.UpdatedAt = now
	return document.Document, nil
}

func cloneChunks(chunks []Chunk) []Chunk {
	result := make([]Chunk, len(chunks))
	for index, chunk := range chunks {
		result[index] = chunk
		result[index].HeadingPath = append([]string(nil), chunk.HeadingPath...)
		result[index].Embedding = append([]float32(nil), chunk.Embedding...)
	}
	return result
}

func (s *MemoryStore) FailProcessingJob(_ context.Context, jobID, code, message string, retryable bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	job := s.jobs[jobID]
	if job == nil {
		return ErrNotFound
	}
	document := s.documents[job.DocumentID]
	if document == nil {
		return ErrNotFound
	}
	now := time.Now().UTC()
	safeCode := cleanText(code, "processing_failed", 80)
	safeMessage := cleanText(message, "The document could not be processed.", 500)
	if retryable && job.Attempts < job.MaxAttempts {
		job.Status = "queued"
		job.AvailableAt = now.Add(time.Duration(job.Attempts) * time.Second)
		job.LeaseOwner = ""
		job.LeaseExpiresAt = time.Time{}
		document.Status = "queued"
	} else {
		job.Status = "failed"
		document.Status = "failed"
	}
	document.ErrorCode = safeCode
	document.ErrorMessage = safeMessage
	document.UpdatedAt = now
	return nil
}

func (s *MemoryStore) ownsWorkspace(userID, workspaceID string) bool {
	workspace := s.workspaces[workspaceID]
	return workspace != nil && workspace.UserID == userID && workspace.Status != "archived"
}

func cleanText(value, fallback string, max int) string {
	value = strings.TrimSpace(value)
	if value == "" {
		value = fallback
	}
	runes := []rune(value)
	if len(runes) > max {
		value = string(runes[:max])
	}
	return value
}

func clonePages(pages []Page) []Page {
	result := make([]Page, len(pages))
	for index, page := range pages {
		result[index] = page
		if page.SourceMetadata != nil {
			result[index].SourceMetadata = make(map[string]any, len(page.SourceMetadata))
			for key, value := range page.SourceMetadata {
				result[index].SourceMetadata[key] = value
			}
		}
	}
	return result
}
