package research

import (
	"bytes"
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresRetrievalOwnershipAndDiagnostics(t *testing.T) {
	databaseURL := os.Getenv("RESEARCH_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("RESEARCH_TEST_DATABASE_URL is not configured")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	store := NewPostgresStore(pool)
	storage := NewMemoryStorage()
	embedder := NewHashEmbedder(DefaultEmbeddingDimensions)
	userA := "retrieval-integration-owner-" + NewID()
	userB := "retrieval-integration-other-" + NewID()
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, "delete from public.profiles where clerk_user_id = any($1::text[])", []string{userA, userB})
	})

	workspace, err := store.CreateWorkspace(ctx, userA, "Evidence integration", "")
	if err != nil {
		t.Fatal(err)
	}
	otherWorkspace, err := store.CreateWorkspace(ctx, userA, "Other evidence", "")
	if err != nil {
		t.Fatal(err)
	}
	document := createPostgresTestDocument(t, ctx, store, storage, userA, workspace.ID, "Supply chain evidence.")
	otherDocument := createPostgresTestDocument(t, ctx, store, storage, userA, otherWorkspace.ID, "Unrelated evidence.")

	parser, err := NewPageAwareParser("")
	if err != nil {
		t.Fatal(err)
	}
	processor := Processor{
		Store: store, Storage: storage, Parser: parser,
		Chunker: NewPageWindowChunker(), Embedder: embedder,
	}
	for range 2 {
		processed, err := processor.ProcessNext(ctx, "postgres-integration-worker")
		if err != nil || !processed {
			t.Fatalf("processing failed: processed=%v err=%v", processed, err)
		}
	}

	retriever := Retriever{Store: store, Embedder: embedder}
	response, err := retriever.Search(ctx, userA, workspace.ID, SearchRequest{
		Query: "supply chain evidence", DocumentIDs: []string{document.ID},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(response.Results) != 1 || response.Results[0].DocumentID != document.ID ||
		response.Diagnostics.RunID == "" {
		t.Fatalf("unexpected retrieval response: %#v", response)
	}
	if _, err := retriever.Search(ctx, userB, workspace.ID, SearchRequest{Query: "supply chain"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-owner retrieval denial, got %v", err)
	}
	if _, err := retriever.Search(ctx, userA, workspace.ID, SearchRequest{
		Query: "unrelated evidence", DocumentIDs: []string{otherDocument.ID},
	}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-workspace document filter denial, got %v", err)
	}

	var runCount int
	if err := pool.QueryRow(ctx,
		"select count(*) from public.research_retrieval_runs where id = $1",
		response.Diagnostics.RunID,
	).Scan(&runCount); err != nil {
		t.Fatal(err)
	}
	if runCount != 1 {
		t.Fatalf("expected persisted retrieval diagnostics, got %d rows", runCount)
	}
}

func createPostgresTestDocument(
	t *testing.T,
	ctx context.Context,
	store *PostgresStore,
	storage *MemoryStorage,
	userID, workspaceID, content string,
) Document {
	t.Helper()
	validated, err := ValidateUpload("evidence.txt", "text/plain", []byte(content))
	if err != nil {
		t.Fatal(err)
	}
	document, err := store.CreatePendingDocument(ctx, userID, workspaceID, UploadMetadata{
		ID: NewID(), Title: "Evidence", OriginalFilename: "evidence.txt",
		MimeType: validated.MimeType, ByteSize: int64(len(content)),
		SHA256: validated.SHA256, Extension: validated.Extension,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := storage.Put(
		ctx, document.StorageObjectKey, document.MimeType,
		bytes.NewReader([]byte(content)), int64(len(content)),
	); err != nil {
		t.Fatal(err)
	}
	document, err = store.FinalizeUpload(ctx, userID, workspaceID, document.ID)
	if err != nil {
		t.Fatal(err)
	}
	return document
}
