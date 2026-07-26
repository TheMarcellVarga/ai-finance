# Upgrade Phase 2 Completion: Retrieval

Completed: 2026-07-26

## Outcome

Aperture now turns owner-scoped document pages into versioned, searchable
evidence. The document worker creates deterministic page-local chunks, embeds
them behind a provider-independent boundary, and commits pages and ready chunks
atomically. Signed-in users can search a workspace or selected documents and
receive ranked passages with document and page provenance.

The search response includes reproducible diagnostics. The database records
retrieved chunk IDs, applied filters, chunker and embedding versions, candidate
and result counts, and stage latency without persisting the raw query.

This phase does not generate research conclusions, call a text-generation
model, approve findings, or add trading behavior.

## Architecture Delivered

- Decision record:
  `docs/decisions/ADR_002_RETRIEVAL_FOUNDATION.md`
- Chunker:
  `services/api/internal/research/chunker.go`
- Embedding providers:
  `services/api/internal/research/embedding.go`
- Retrieval orchestration and duplicate suppression:
  `services/api/internal/research/retrieval.go`
- Owner-filtered Postgres persistence and hybrid retrieval:
  `services/api/internal/research/postgres_store.go`
- SQL source and generated `sqlc` methods:
  `services/api/sql/queries/research.sql`
- Retrieval schema:
  `supabase/migrations/20260726154349_phase20_retrieval_foundation.sql`
- Go endpoint:
  `POST /v1/research/workspaces/{workspaceID}/search`
- Next.js BFF endpoint:
  `POST /api/research/workspaces/{workspaceID}/search`
- Evidence search and diagnostics UI:
  `apps/web/src/components/research-workspace.tsx`

## Chunking And Index Guarantees

- Chunks never cross page boundaries.
- `page-window-v1` targets 1,200 characters, caps chunks at 1,600 characters,
  and uses sentence-aligned overlap.
- Stable chunk IDs include document, page, sequence, character range, chunker
  version, and content hash.
- Reprocessing unchanged pages produces unchanged chunk identities.
- Pages and chunks are replaced in one Postgres transaction.
- Documents become `ready` only after their complete page and chunk index is
  committed.
- Every ready chunk records embedding provider, model, implementation version,
  dimensions, and timestamp.

## Retrieval Behavior

- PostgreSQL full-text candidates use a generated `tsvector` column and GIN
  index.
- Cosine-vector candidates use `pgvector` and a partial HNSW index.
- Reciprocal-rank fusion combines bounded lexical and vector candidates.
- Owner, workspace, document, document-ready, and embedding-version filters are
  applied before ranking.
- The Go service over-fetches candidates, removes exact and near duplicates,
  and then applies the requested result limit.
- Results include document ID, document title, page number, source locator,
  heading path, indexing versions, and rank components.

## Embedding Modes

The default development and CI provider is deterministic
`hash-embedding-v1`. It produces normalized 1,536-dimensional feature-hash
vectors without network access or model spend. It validates the complete
indexing and retrieval path but is not presented as live model-generated
semantic intelligence.

The dormant live provider uses direct OpenAI embeddings. It cannot initialize
unless all required server configuration is present:

```text
RESEARCH_EMBEDDING_PROVIDER=openai
AI_EXTERNAL_CALLS_ENABLED=true
OPENAI_API_KEY=<server-only value>
```

Production rejects the local provider by default. A deliberate
`ALLOW_LOCAL_RESEARCH_EMBEDDINGS_IN_PRODUCTION=true` override is required if a
non-model production environment is intentionally being exercised.

## Security And Privacy

- Every search is tied to the authenticated Clerk subject and resolved profile.
- Application queries explicitly constrain workspace ownership and selected
  document membership.
- `aperture_api` transactions set `app.current_profile_id` and run with forced
  RLS.
- Cross-user workspaces and cross-workspace document filters return opaque
  `404` responses.
- Retrieval diagnostics are owner-scoped with forced RLS.
- Diagnostics retain a SHA-256 query hash, not raw query text.
- Document text and embeddings are not copied into logs or diagnostic rows.
- Browser code receives neither database credentials nor provider credentials.
- External embedding calls remain disabled by default.

## Acceptance Evidence

The Supabase schema was rebuilt from an empty local database:

```bash
supabase db reset --local --no-seed
supabase db lint --local --level warning
scripts/validate-supabase-migrations
```

The live Postgres integration test processes two documents and verifies a
representative query, document/page provenance, retrieval-run persistence,
cross-user denial, and cross-workspace document-filter denial:

```bash
RESEARCH_TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable' \
  go test ./internal/research \
  -run TestPostgresRetrievalOwnershipAndDiagnostics \
  -count=1
```

Automated checks:

```bash
cd services/api && go test ./... && go vet ./...
scripts/generate-openapi-client
cd apps/web && npm run lint && npm run build
```

Focused tests cover:

- stable chunk identity, page boundaries, overlap, and hard limits;
- deterministic normalized embeddings and the external-call kill switch;
- representative evidence ranking;
- exact and near-duplicate suppression;
- invalid query and document-filter normalization;
- Go HTTP search behavior;
- cross-owner and cross-workspace retrieval isolation;
- persisted retrieval diagnostics.

The evidence-search interface was rendered and inspected at desktop and 390px
mobile widths. It has no horizontal page overflow and includes accessible
labels, document-scope controls, loading skeletons, empty results, inline
errors, cited passages, and expandable retrieval diagnostics.

## Phase Commits

- `2a39a3c` `docs: define phase 2 retrieval architecture`
- `b95df7e` `feat(db): add versioned evidence retrieval schema`
- `33dbbd8` `feat(research): add deterministic page-aware chunking`
- `a93a456` `feat(research): add versioned embedding providers`
- `c8be218` `feat(research): index chunks during document processing`
- `ee71413` `feat(research): add owner-filtered hybrid evidence search`
- `00953b4` `feat(web): add cited evidence search workspace`

## Next Permitted Phase

Upgrade Phase 3: Structured Generation.

Generation must use only chunks returned through this owner-filtered retrieval
boundary. It must persist model, provider, prompt/schema versions, tokens, cost,
latency, and retrieved chunk IDs, and it must keep external model calls disabled
until provider spend is explicitly approved.
