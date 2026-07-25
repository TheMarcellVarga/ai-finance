# Upgrade Phase 1 Completion: Document Foundation

Completed: 2026-07-24

## Outcome

Aperture now has a real, owner-scoped document foundation for evidence-first
financial research. A signed-in user can create a private research workspace,
upload a PDF or UTF-8 text document through Next.js, observe durable processing
state, and retry a failed parse. The Go API owns validation, storage
orchestration, page extraction, persistence, job leases, retry rules, and audit
events.

This phase does not call an external model and does not implement retrieval,
embeddings, generation, approval, or trading behavior.

## Architecture Delivered

- Decision record:
  `docs/decisions/ADR_001_DOCUMENT_FOUNDATION.md`
- Next.js remains the browser-facing BFF.
- Go remains authoritative for research mutations and processing state.
- Supabase Postgres stores workspaces, documents, pages, and processing jobs.
- The private Supabase Storage bucket is `research-documents`.
- The API uses `SET LOCAL ROLE aperture_api` plus
  `app.current_profile_id` for owner-scoped transactions.
- The worker uses Postgres leases with `FOR UPDATE SKIP LOCKED`.
- Development supports memory persistence and private local files.
- Production supports Postgres persistence and server-only Supabase Storage.

## Security And Privacy

- PDF files require a valid `%PDF-` signature.
- Text files require valid UTF-8 and reject binary NUL content.
- Uploads are limited to 10 MiB.
- Parsed documents are limited to 750 pages and 250,000 characters per page.
- Storage object keys are profile/workspace/document scoped.
- Storage bucket access is private.
- Browser code never receives a Supabase service-role key.
- User-owned tables force RLS and remove the previous global research read
  policies.
- Cross-owner workspace, document, page, and retry calls return `404`.
- Download and delete routes are not exposed in this phase; attempts cannot
  access objects.
- Logs contain document IDs and safe status codes, not raw document content.

## Processing Guarantees

- Upload metadata is created before storage and marked failed if storage fails.
- Successful storage atomically moves the document to `queued` and creates a
  uniquely keyed processing job.
- Workers claim one available job with a time-bounded lease.
- Parser failures persist stable, user-safe error codes and messages.
- Retry creates only one active job; concurrent or repeated retry requests
  return `409`.
- Every parsed page stores document ID, workspace ID, page number, normalized
  text hash, character count, and source metadata.
- OCR is explicitly deferred. Image-only PDFs fail with
  `no_extractable_text`.

## Acceptance Evidence

Local Supabase migrations were applied with:

```bash
supabase migration up --local
```

The live local Postgres/API/worker test produced:

```text
ready_status=ready
page_count=2
provenance_ok=true
other_list=404
other_get=404
other_pages=404
other_retry=404
unsupported_download=404
unsupported_delete=405
```

A separate live failure/retry run produced:

```text
failed_status=failed
retry_code=202
retry_attempt=2
second_retry=409
```

Automated checks:

```bash
scripts/validate-supabase-migrations
scripts/generate-openapi-client
cd services/api && go test ./... && go vet ./...
cd apps/web && npm run lint && npx tsc --noEmit && npm run build
```

The research workspace was rendered at desktop and mobile breakpoints. It had
no horizontal overflow or browser console errors, and the upload, status,
empty, failure, and retry states remain visible and keyboard accessible.

## Next Permitted Phase

Upgrade Phase 2: Retrieval.

Do not begin generation before deterministic, owner-filtered retrieval passes
its acceptance gate.
