package research

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresReviewLedgerIsOwnerScopedAppendOnlyAndBoundToRawOutput(t *testing.T) {
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
	userA := "review-integration-owner-" + NewID()
	userB := "review-integration-other-" + NewID()
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, "delete from public.profiles where clerk_user_id = any($1::text[])", []string{userA, userB})
	})

	workspace, err := store.CreateWorkspace(ctx, userA, "Review integration", "")
	if err != nil {
		t.Fatal(err)
	}
	var profileID string
	if err := pool.QueryRow(ctx, "select id from public.profiles where clerk_user_id = $1", userA).Scan(&profileID); err != nil {
		t.Fatal(err)
	}
	runID := NewID()
	chunkID := NewID()
	output := `{
	  "sections": [
	    {"key": "executive_summary", "title": "Executive summary", "body": "Raw model wording.", "claims": []},
	    {"key": "operating_signals", "title": "Operating signals", "body": "Raw signals.", "claims": []},
	    {"key": "risk_factors", "title": "Risk factors", "body": "Raw risks.", "claims": []},
	    {"key": "questions_for_review", "title": "Questions for review", "body": "Raw questions.", "claims": []}
	  ],
	  "citations": [{"chunkId": "` + chunkID + `"}]
	}`
	if _, err := pool.Exec(ctx, `
		insert into public.research_analysis_runs (
		  id, user_id, workspace_id, workflow, workflow_version, status,
		  prompt_sha256, prompt_version, schema_version, provider, model, mode,
		  output_json, completed_at
		) values ($1, $2, $3, 'earnings_review', 'test-v1', 'completed',
		  repeat('a', 64), 'test-prompt', 'test-schema', 'test-provider', 'test-model',
		  'deterministic', $4::jsonb, now())
	`, runID, profileID, workspace.ID, output); err != nil {
		t.Fatal(err)
	}

	edit, replayed, err := store.AppendAnalysisReviewEvent(ctx, userA, workspace.ID, runID, AppendAnalysisReviewEventInput{
		RequestID: NewID(), SectionKey: "executive_summary", EventType: "edit_saved",
		SectionTitle: "Reviewed summary", SectionBody: "Human-edited wording.",
	})
	if err != nil || replayed {
		t.Fatalf("expected new edit event, replayed=%v err=%v", replayed, err)
	}
	acceptRequestID := NewID()
	accepted, replayed, err := store.AppendAnalysisReviewEvent(ctx, userA, workspace.ID, runID, AppendAnalysisReviewEventInput{
		RequestID: acceptRequestID, SectionKey: "executive_summary", EventType: "accepted",
		ContentEventID: edit.ID, Note: "Checked against the source.",
	})
	if err != nil || replayed || accepted.ContentEventID != edit.ID {
		t.Fatalf("expected accepted edited content, event=%#v replayed=%v err=%v", accepted, replayed, err)
	}
	replayedEvent, replayed, err := store.AppendAnalysisReviewEvent(ctx, userA, workspace.ID, runID, AppendAnalysisReviewEventInput{
		RequestID: acceptRequestID, SectionKey: "executive_summary", EventType: "accepted",
		ContentEventID: edit.ID, Note: "Checked against the source.",
	})
	if err != nil || !replayed || replayedEvent.ID != accepted.ID {
		t.Fatalf("expected idempotent replay, event=%#v replayed=%v err=%v", replayedEvent, replayed, err)
	}
	events, err := store.ListAnalysisReviewEvents(ctx, userA, workspace.ID, runID)
	if err != nil || len(events) != 2 {
		t.Fatalf("expected two append-only events, got %#v err=%v", events, err)
	}
	if _, err := store.ListAnalysisReviewEvents(ctx, userB, workspace.ID, runID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-owner review denial, got %v", err)
	}
	if _, _, err := store.AppendAnalysisReviewEvent(ctx, userA, workspace.ID, runID, AppendAnalysisReviewEventInput{
		RequestID: NewID(), SectionKey: "risk_factors", EventType: "citation_flagged",
		CitationChunkID: NewID(), Note: "Foreign citation.",
	}); !errors.Is(err, ErrReviewConflict) {
		t.Fatalf("expected foreign citation rejection, got %v", err)
	}
	if _, err := pool.Exec(ctx, "update public.research_analysis_runs set output_json = '{}'::jsonb where id = $1", runID); err == nil {
		t.Fatal("expected raw output replacement to fail")
	}
	if _, err := pool.Exec(ctx, "delete from public.research_analysis_review_events where id = $1", edit.ID); err == nil {
		t.Fatal("expected review event deletion to fail")
	}
}
