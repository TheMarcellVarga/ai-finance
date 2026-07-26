# ADR 002: Evidence Retrieval Foundation

Status: accepted

Date: 2026-07-26

Roadmap phase: Evidence Workspace Upgrade Phase 2

## Context

Phase 1 established private, owner-scoped research workspaces, durable document processing, and page-aware text extraction. Phase 2 must turn those pages into searchable evidence without weakening ownership boundaries or requiring paid model calls in local development and CI.

The retrieval foundation must:

- preserve document and page provenance;
- produce the same chunk identities when unchanged documents are reprocessed;
- support lexical and semantic retrieval behind a provider-independent boundary;
- constrain candidates to the authenticated owner's selected workspace and documents before ranking;
- record enough diagnostics to reproduce retrieval behavior without retaining raw user queries;
- keep the direct OpenAI embedding path dormant until external calls are explicitly enabled.

## Decision

### Page-aware deterministic chunking

- Chunks never cross page boundaries.
- `page-window-v1` normalizes page text and groups complete paragraphs and sentences toward a 1,200-character target, with a 1,600-character hard limit and approximately 200 characters of sentence-aligned overlap.
- Oversized sentences are split on word boundaries.
- Each chunk records its one-based page number, page-local sequence, normalized heading path, character start and end offsets, source locator, content hash, and chunker version.
- Stable chunk IDs are content-derived UUIDs built from the document ID, chunker version, page number, sequence, offsets, and content hash.
- Reprocessing replaces a document's chunks transactionally. Unchanged source text therefore produces unchanged IDs.

Page-local chunks are intentionally preferred over cross-page context windows because a retrieval result must cite an unambiguous source page. Adjacent-page expansion can be added later without changing stored chunk identity.

### Embedding boundary and versions

Go owns a provider-independent `Embedder` interface. Every implementation exposes:

- provider;
- model;
- implementation version;
- dimensions;
- whether the implementation makes external calls.

`hash-embedding-v1` is the default local and CI implementation. It uses deterministic token feature hashing and normalization to create 1,536-dimensional vectors without network access or model spend. It exists to exercise the complete indexing and vector-search path; it is not represented as model-generated semantic intelligence.

The dormant live adapter uses OpenAI embeddings at 1,536 dimensions. It may initialize only when all of the following are explicitly configured:

- `AI_EXTERNAL_CALLS_ENABLED=true`;
- `RESEARCH_EMBEDDING_PROVIDER=openai`;
- a server-only OpenAI API key.

Provider, model, implementation version, and dimensions are stored with every indexed chunk and retrieval run. A model change creates a new index version rather than silently mixing incompatible embeddings.

### Hybrid retrieval

Retrieval combines:

- PostgreSQL full-text search over a generated `tsvector` column with a GIN index;
- cosine-distance vector search over `pgvector` with a partial HNSW index;
- reciprocal-rank fusion over bounded lexical and vector candidate sets.

Both candidate queries apply owner, workspace, optional document, embedding-version, and ready-status filters before ranking. The database returns more candidates than the requested limit so the Go service can suppress exact and near-duplicate text while still filling the result set.

Near duplicates are suppressed using normalized token shingles. The highest-ranked result is retained, while materially different chunks from the same page remain eligible.

### API boundary

Go exposes an owner-scoped evidence search endpoint beneath a workspace:

`POST /v1/research/workspaces/{workspaceID}/search`

The request accepts:

- a query between 2 and 500 characters;
- a result limit between 1 and 20;
- up to 20 document IDs, all of which must belong to the selected workspace.

The response returns evidence snippets with document ID, document name, page number, source locator, heading path, rank scores, and indexing metadata. It also returns a diagnostics object containing the retrieval-run ID, applied filters, embedding descriptor, candidate/result counts, and stage latency.

Next.js exposes the endpoint through an authenticated same-origin BFF route. The browser never receives backend or provider credentials.

### Diagnostics and privacy

Every successful search records:

- owner and workspace IDs;
- selected document IDs;
- SHA-256 of the normalized query, not the raw query;
- requested and returned counts;
- result chunk IDs in rank order;
- chunker and embedding versions;
- applied filters;
- query-embedding, database-search, and total latency;
- creation time.

Retrieval diagnostics are owner-scoped and protected by RLS. Raw query text, document text, and embeddings are not copied into diagnostic records.

### Failure behavior

- Documents become `ready` only after their pages and indexed chunks are committed together.
- An embedding or persistence failure leaves no partially refreshed index and marks the processing attempt failed with a sanitized error.
- Search rejects unknown or cross-workspace document filters rather than silently ignoring them.
- Search returns an explicit empty result with diagnostics when no ready chunks match.
- Production startup rejects the local hash embedder unless a deliberate configuration override is present.

## Consequences

Benefits:

- citations retain reliable page provenance;
- indexing and retrieval are fully testable without external services;
- provider changes are explicit and auditable;
- ownership filters exist in both application queries and RLS;
- model and chunker versions make retrieval results reproducible;
- duplicate evidence does not crowd out distinct sources.

Costs:

- deterministic local embeddings provide weaker semantics than a live embedding model;
- page boundaries can separate context that spans pages;
- hybrid ranking and version filters add query complexity;
- each document retry re-embeds its complete chunk set in v1;
- HNSW filtering may require candidate over-fetching as the corpus grows.

## Rejected alternatives

### Browser-side embeddings

Rejected because provider keys, sensitive document text, and model calls must remain behind server boundaries.

### Vector-only retrieval

Rejected because identifiers, ticker symbols, dates, and exact filing language benefit from lexical matching.

### Raw-query diagnostic storage

Rejected because research queries may reveal holdings, financial concerns, or personal goals and are not required to reproduce index behavior.

### Cross-page chunks

Rejected for v1 because they make page citations ambiguous. Neighbor expansion is a safer future extension.

### Immediate managed vector database

Rejected because Supabase Postgres with `pgvector` is the documented v1 system of record and avoids premature infrastructure.

## Verification

- deterministic chunk identity and overlap tests;
- embedding determinism, dimensions, normalization, and external-call kill-switch tests;
- exact and near-duplicate suppression tests;
- representative lexical, vector, and hybrid ranking fixtures;
- two-user and cross-workspace retrieval isolation tests;
- invalid document-filter tests;
- migration validation, RLS checks, and local database reset;
- Go tests, Next.js lint/build, and evidence-search interaction checks.

## References

- Supabase HNSW indexes: https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes
- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search
- Supabase full-text search: https://supabase.com/docs/guides/database/full-text-search
