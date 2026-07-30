package research

import (
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestValidateUpload(t *testing.T) {
	t.Run("accepts PDF magic bytes", func(t *testing.T) {
		result, err := ValidateUpload("report.pdf", "application/octet-stream", []byte("%PDF-1.7\nfixture"))
		if err != nil {
			t.Fatal(err)
		}
		if result.MimeType != "application/pdf" || result.Extension != ".pdf" || len(result.SHA256) != 64 {
			t.Fatalf("unexpected PDF validation result: %#v", result)
		}
	})

	t.Run("accepts UTF-8 text", func(t *testing.T) {
		result, err := ValidateUpload("notes.txt", "text/plain; charset=utf-8", []byte("Revenue review\n"))
		if err != nil {
			t.Fatal(err)
		}
		if result.MimeType != "text/plain" {
			t.Fatalf("unexpected MIME type: %s", result.MimeType)
		}
	})

	t.Run("rejects extension and signature mismatch", func(t *testing.T) {
		_, err := ValidateUpload("report.pdf", "application/pdf", []byte("not a pdf"))
		var validationError *ValidationError
		if !errors.As(err, &validationError) || validationError.Code != "invalid_pdf_signature" {
			t.Fatalf("expected invalid PDF signature, got %v", err)
		}
	})

	t.Run("rejects binary text", func(t *testing.T) {
		_, err := ValidateUpload("notes.txt", "text/plain", []byte{'a', 0, 'b'})
		var validationError *ValidationError
		if !errors.As(err, &validationError) || validationError.Code != "invalid_text_encoding" {
			t.Fatalf("expected invalid text encoding, got %v", err)
		}
	})
}

func TestValidateAnalysisReviewEvent(t *testing.T) {
	requestID := "11111111-1111-4111-8111-111111111111"
	contentEventID := "22222222-2222-4222-8222-222222222222"
	citationChunkID := "33333333-3333-4333-8333-333333333333"

	edit, err := ValidateAnalysisReviewEvent(AppendAnalysisReviewEventInput{
		RequestID: requestID, SectionKey: "executive_summary", EventType: "edit_saved",
		SectionTitle: " Edited summary ", SectionBody: " Human-reviewed wording. ",
	})
	if err != nil || edit.SectionTitle != "Edited summary" || edit.SectionBody != "Human-reviewed wording." {
		t.Fatalf("expected normalized edit, got %#v err=%v", edit, err)
	}

	if _, err := ValidateAnalysisReviewEvent(AppendAnalysisReviewEventInput{
		RequestID: requestID, SectionKey: "executive_summary", EventType: "accepted",
		ContentEventID: contentEventID,
	}); err != nil {
		t.Fatalf("expected referenced acceptance to validate: %v", err)
	}

	if _, err := ValidateAnalysisReviewEvent(AppendAnalysisReviewEventInput{
		RequestID: requestID, SectionKey: "risk_factors", EventType: "citation_flagged",
		CitationChunkID: citationChunkID, Note: "The excerpt does not support this wording.",
	}); err != nil {
		t.Fatalf("expected citation feedback to validate: %v", err)
	}

	tests := []AppendAnalysisReviewEventInput{
		{RequestID: "not-a-uuid", SectionKey: "executive_summary", EventType: "accepted"},
		{RequestID: requestID, SectionKey: "unknown", EventType: "accepted"},
		{RequestID: requestID, SectionKey: "executive_summary", EventType: "edit_saved", SectionTitle: "Missing body"},
		{RequestID: requestID, SectionKey: "executive_summary", EventType: "accepted", SectionBody: "Injected content"},
		{RequestID: requestID, SectionKey: "risk_factors", EventType: "citation_flagged", CitationChunkID: citationChunkID},
	}
	for _, input := range tests {
		if _, err := ValidateAnalysisReviewEvent(input); err == nil {
			t.Fatalf("expected invalid review payload to fail: %#v", input)
		}
	}
}

func TestPageAwareParserPreservesPageNumbers(t *testing.T) {
	parser, err := NewPageAwareParser("")
	if err != nil {
		t.Fatal(err)
	}
	pages, err := parser.Parse(context.Background(), bytes.NewBufferString("Page one\r\n\fPage two\n"), "text/plain")
	if err != nil {
		t.Fatal(err)
	}
	if len(pages) != 2 || pages[0].PageNumber != 1 || pages[1].PageNumber != 2 {
		t.Fatalf("unexpected pages: %#v", pages)
	}
	if pages[0].NormalizedText != "Page one" || pages[1].NormalizedText != "Page two" {
		t.Fatalf("normalization did not preserve content: %#v", pages)
	}
}

func TestLocalStorageRejectsTraversalAndPersists(t *testing.T) {
	storage, err := NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := storage.Put(context.Background(), "../escape.txt", "text/plain", bytes.NewBufferString("x"), 1); err == nil {
		t.Fatal("expected path traversal rejection")
	}
	if err := storage.Put(context.Background(), "profiles/p/workspaces/w/source.txt", "text/plain", bytes.NewBufferString("evidence"), 8); err != nil {
		t.Fatal(err)
	}
	object, err := storage.Open(context.Background(), "profiles/p/workspaces/w/source.txt")
	if err != nil {
		t.Fatal(err)
	}
	defer object.Close()
	data := make([]byte, 8)
	if _, err := object.Read(data); err != nil {
		t.Fatal(err)
	}
	if string(data) != "evidence" {
		t.Fatalf("unexpected stored content: %q", string(data))
	}
}

func TestMemoryStoreEnforcesOwnershipAndProcessorCompletes(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()
	storage := NewMemoryStorage()
	parser, err := NewPageAwareParser("")
	if err != nil {
		t.Fatal(err)
	}
	workspace, err := store.CreateWorkspace(ctx, "user-a", "Annual reports", "Evidence review")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.GetWorkspace(ctx, "user-b", workspace.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-user workspace denial, got %v", err)
	}

	content := []byte("First page\fSecond page")
	validated, err := ValidateUpload("filing.txt", "text/plain", content)
	if err != nil {
		t.Fatal(err)
	}
	document, err := store.CreatePendingDocument(ctx, "user-a", workspace.ID, UploadMetadata{
		ID:               NewID(),
		Title:            "Annual filing",
		OriginalFilename: "filing.txt",
		MimeType:         validated.MimeType,
		ByteSize:         int64(len(content)),
		SHA256:           validated.SHA256,
		Extension:        validated.Extension,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := storage.Put(ctx, document.StorageObjectKey, document.MimeType, bytes.NewReader(content), int64(len(content))); err != nil {
		t.Fatal(err)
	}
	if _, err := store.FinalizeUpload(ctx, "user-a", workspace.ID, document.ID); err != nil {
		t.Fatal(err)
	}

	processor := Processor{Store: store, Storage: storage, Parser: parser}
	processed, err := processor.ProcessNext(ctx, "test-worker")
	if err != nil || !processed {
		t.Fatalf("processor result: processed=%v err=%v", processed, err)
	}
	ready, err := store.GetDocument(ctx, "user-a", workspace.ID, document.ID)
	if err != nil {
		t.Fatal(err)
	}
	if ready.Status != "ready" || ready.PageCount != 2 {
		t.Fatalf("unexpected ready document: %#v", ready)
	}
	pages, err := store.ListPages(ctx, "user-a", workspace.ID, document.ID)
	if err != nil || len(pages) != 2 || pages[1].PageNumber != 2 {
		t.Fatalf("unexpected pages: %#v err=%v", pages, err)
	}
	if pages[0].ID == "" || pages[0].DocumentID != document.ID || pages[0].WorkspaceID != workspace.ID {
		t.Fatalf("expected persisted ownership provenance, got %#v", pages[0])
	}
	if pages[0].SourceMetadata["documentId"] != document.ID ||
		pages[0].SourceMetadata["workspaceId"] != workspace.ID ||
		pages[0].SourceMetadata["pageNumber"] != 1 {
		t.Fatalf("expected source metadata provenance, got %#v", pages[0].SourceMetadata)
	}
	indexedChunks := store.chunks[document.ID]
	if len(indexedChunks) != 2 {
		t.Fatalf("expected one indexed chunk per short page, got %#v", indexedChunks)
	}
	for _, chunk := range indexedChunks {
		if chunk.EmbeddingStatus != "ready" ||
			chunk.EmbeddingProvider != HashEmbeddingProvider ||
			chunk.EmbeddingVersion != HashEmbeddingVersion ||
			len(chunk.Embedding) != DefaultEmbeddingDimensions {
			t.Fatalf("expected versioned ready embedding, got %#v", chunk)
		}
	}
	if _, err := store.GetDocument(ctx, "user-b", workspace.ID, document.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-user document denial, got %v", err)
	}
}

func TestMemoryStoreRetriesFailedProcessing(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()
	workspace, _ := store.CreateWorkspace(ctx, "user-a", "Retry", "")
	document, _ := store.CreatePendingDocument(ctx, "user-a", workspace.ID, UploadMetadata{
		ID:               NewID(),
		OriginalFilename: "empty.txt",
		MimeType:         "text/plain",
		ByteSize:         1,
		SHA256:           "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		Extension:        ".txt",
	})
	_, _ = store.FinalizeUpload(ctx, "user-a", workspace.ID, document.ID)
	job, ok, err := store.ClaimProcessingJob(ctx, "worker", time.Minute)
	if err != nil || !ok {
		t.Fatalf("claim failed: %v", err)
	}
	if err := store.FailProcessingJob(ctx, job.ID, "no_extractable_text", "No extractable text was found.", false); err != nil {
		t.Fatal(err)
	}
	failed, _ := store.GetDocument(ctx, "user-a", workspace.ID, document.ID)
	if failed.Status != "failed" {
		t.Fatalf("expected failed status, got %s", failed.Status)
	}
	retried, err := store.RetryDocument(ctx, "user-a", workspace.ID, document.ID)
	if err != nil || retried.Status != "queued" {
		t.Fatalf("retry failed: %#v err=%v", retried, err)
	}
}

func TestLocalStorageFilePermissions(t *testing.T) {
	root := t.TempDir()
	storage, err := NewLocalStorage(root)
	if err != nil {
		t.Fatal(err)
	}
	key := "profiles/p/workspaces/w/documents/d/source.txt"
	if err := storage.Put(context.Background(), key, "text/plain", bytes.NewBufferString("x"), 1); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(filepath.Join(root, filepath.FromSlash(key)))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o600 {
		t.Fatalf("expected private file permissions, got %o", info.Mode().Perm())
	}
}
