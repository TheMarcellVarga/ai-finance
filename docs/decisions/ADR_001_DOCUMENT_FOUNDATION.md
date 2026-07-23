# ADR 001: Document Foundation

Status: accepted

Date: 2026-07-23

Roadmap phase: Evidence Workspace Upgrade Phase 1

## Context

Aperture needs owner-scoped research workspaces, private PDF/text uploads, page-aware parsing, durable processing status, and retry support before retrieval or model-backed document analysis can be built.

The existing architecture assigns:

- authenticated UI and BFF behavior to Next.js;
- authoritative finance/data APIs to Go;
- relational persistence and vectors to Supabase Postgres;
- private object storage to Supabase Storage;
- user authentication to Clerk.

The current research tables are asset-oriented fixtures. They do not provide workspace ownership, upload metadata, processing jobs, or private storage. Portfolio and watchlist runtime state is also still in memory, so the document path must establish the durable Go/Postgres pattern that later finance persistence can reuse.

## Decision

### Runtime boundaries

- Go owns research workspace, document, processing-status, retry, and page APIs.
- Next.js exposes same-origin BFF routes and the authenticated document UI.
- Supabase Postgres stores workspaces, documents, parsed pages, and processing jobs.
- Supabase Storage uses a private `research-documents` bucket.
- Original object paths follow `profiles/{profileID}/workspaces/{workspaceID}/documents/{documentID}/source.{ext}`.
- A dedicated Go worker command claims processing jobs from Postgres. The API process does not parse PDFs in request handlers.

### Upload path

Phase 1 uses a server-mediated upload:

1. The browser submits a PDF or UTF-8 text file to a same-origin Next.js route.
2. Next.js forwards the authenticated multipart request to the Go API.
3. Go validates the workspace owner, filename, declared content type, byte size, magic bytes, and UTF-8 text.
4. Go stores the object through a storage adapter and creates the document plus processing job in one application operation.
5. The response returns document status immediately.

This keeps Clerk as the only browser identity system and never exposes a Supabase service-role key. A direct signed-upload optimization can be added later without changing document ownership or processing contracts.

### Storage adapters

- `SupabaseStorage` is the production adapter and calls the private Storage API with server-only credentials.
- `LocalStorage` stores files under an explicitly configured development directory and prevents path traversal.
- Tests use an in-memory adapter.
- Public object URLs are never stored.

### Parsing

- A `DocumentParser` interface isolates parsing from job orchestration.
- UTF-8 text is normalized deterministically as page 1 unless form-feed page boundaries are present.
- PDF parsing uses the installed `pdftotext` executable behind the interface.
- Page boundaries are preserved from form-feed output.
- Blank pages are retained only when needed to preserve subsequent page numbering.
- Each normalized page stores its one-based page number, text hash, character count, and source metadata.
- Production startup fails if PDF support is enabled but the configured parser is unavailable.

Scanned-image OCR is not part of Phase 1. PDFs without extractable text fail with a stable `no_extractable_text` code and can be retried after a future OCR adapter is introduced.

### Jobs and retries

- Jobs are stored in `document_processing_jobs`.
- Workers claim jobs with `FOR UPDATE SKIP LOCKED`.
- A lease timestamp permits recovery after worker interruption.
- Job creation uses a unique idempotency key.
- Retry increments document attempt count and creates a new job only when no active job exists.
- Parsed pages are replaced transactionally only after a complete parse succeeds.
- Error messages exposed to users are bounded and sanitized; raw document content is not logged.

### Authorization and RLS

- Every Go query includes the authenticated Clerk subject or internal profile ID.
- Authenticated Postgres transactions set `app.current_profile_id` with `set_config(..., true)` for defense-in-depth RLS.
- Research workspace, document, and page policies follow workspace ownership.
- The previous global read policies for research documents and chunks are removed.
- Processing jobs are server-only.
- Supabase service-role credentials remain server-only and are used only by the storage adapter and existing controlled server integrations.

### Local and production modes

- Production requires Postgres persistence and Supabase Storage.
- Development can use the in-memory research repository and local private storage when Supabase is unavailable.
- The UI labels unavailable persistence as a configuration error; it does not claim a local in-memory upload is production durable.
- Tests exercise repository and storage interfaces without external credentials.

## File limits

Phase 1 limits:

- file types: PDF and UTF-8 plain text;
- maximum size: 10 MiB;
- maximum normalized pages: 750;
- maximum normalized characters per page: 250,000;
- one processing job per document at a time.

Limits are enforced on the server even when the browser provides earlier feedback.

## Consequences

Benefits:

- document ownership is authoritative and testable;
- parsing work cannot block request handlers;
- processing survives API restarts when Postgres is configured;
- storage and parser implementations can change behind interfaces;
- Phase 2 can add chunking and embeddings without changing upload contracts.

Costs:

- local production-style verification requires Supabase or another Postgres instance;
- `pdftotext` must be present in the API/worker image;
- server-mediated upload passes bytes through Next.js and Go and is limited to 10 MiB;
- OCR and resumable upload remain later hardening work.

## Rejected alternatives

### Node-only document backend

Rejected because it would duplicate or replace the repository's documented Go data boundary.

### Parsing inside a Next.js route

Rejected because serverless request limits and retries are a poor fit for document processing.

### Public Storage bucket

Rejected because uploaded financial documents are sensitive user-owned data.

### Direct browser use of the Supabase service role

Rejected because service-role keys bypass RLS and must never reach a browser.

### Adding a Redis-backed queue immediately

Rejected because a Postgres lease queue is sufficient for Phase 1 and avoids another operational dependency.

## Verification

- apply migrations to an empty local Supabase database;
- run two-user workspace/document ownership tests;
- run upload validation and parser tests for PDF, UTF-8 text, invalid magic bytes, oversized input, and empty extraction;
- run worker success, retry, lease recovery, and sanitized-error tests;
- run Next.js lint/build and Go tests;
- manually verify upload, status, retry, mobile layout, keyboard focus, and error states.

## References

- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase signed upload reference: https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl
