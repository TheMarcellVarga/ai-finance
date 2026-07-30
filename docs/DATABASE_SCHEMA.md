# Database Schema

Supabase Postgres is the relational system of record. Use SQL migrations, `pgx`, and `sqlc` for Go backend access. Use RLS as defense in depth for user-owned data.

## Ownership Model

- `profiles.id` is the internal user identifier.
- `profiles.clerk_user_id` maps Clerk subjects to internal users.
- Every user-owned table includes `user_id` directly or through a parent relationship.
- Every authenticated API path must enforce ownership in Go and rely on RLS as an extra guard.

## Core Tables

| Table | Purpose |
| --- | --- |
| `profiles` | Clerk mapping, display name, role, onboarding state |
| `subscriptions` | Stripe customer/subscription state and plan |
| `assets` | Curated equities/ETFs, ticker metadata, CIK, sector, type |
| `price_snapshots` | Cached market data with provider and freshness |
| `portfolios` | User-owned portfolio containers |
| `holdings` | Positions linked to portfolios and assets |
| `transactions` | Buy/sell/deposit/withdrawal/dividend records for modeling only |
| `watchlists` | User-owned watchlists |
| `watchlist_items` | Assets in watchlists |
| `goals` | Educational scenario goals and preferences |
| `goal_milestones` | Draft or active goal milestone states |
| `challenges` | Safe education/research/diversification challenges |
| `achievements` | Safe achievement catalog |
| `user_achievements` | User progress on achievements |
| `audit_logs` | Sensitive action records with hashed IP/user-agent fields |
| `usage_events` | Entitlement and quota counters |

## Research And AI Tables

| Table | Purpose |
| --- | --- |
| `research_documents` | Source documents, filing metadata, fetch status |
| `research_chunks` | Chunk text, source locators, token count, embeddings |
| `research_analysis_runs` | Owner-scoped structured-generation runs, retry links, versions, retrieved chunks, validation/repair state, claim-level citation trust artifacts, normalized usage, stage timing, cancellation, and terminal output |
| `research_analysis_review_events` | Append-only human edits, accept/reject decisions, and incorrect-citation reports bound to an immutable analysis-output digest |
| `ai_threads` | User-owned AI conversations by product surface |
| `ai_messages` | Messages, tool calls, citations, safety labels |
| `ai_briefs` | Structured saved AI outputs and usage metadata |
| `ai_tool_runs` | Validated inputs, compact outputs, latency, status |
| `ai_evaluations` | Fixture results, expected behavior, model, created time |

## Vector Search

Use Supabase `pgvector` for v1:
- Store embeddings on `research_chunks`.
- Track `embedding_status` on documents/chunks.
- Include source URL, filing accession, section label, and source locator where possible.
- Defer Pinecone unless scale or latency requires it.

## RLS Expectations

- Enable RLS on all user-owned tables.
- Policies must restrict by `auth.uid()` mapping where Supabase Auth is used, or by a controlled service-layer user context where Go owns access.
- Service-role access is server-only.
- No service-role key can appear in browser bundles or public env.
- `research_analysis_runs` has forced RLS, an `aperture_api` ownership policy,
  and explicit server-role grants. Raw research questions are represented only
  by a SHA-256 digest in this ledger.
- Phase 4 stores the validated claim map, exact citation snapshots, unsupported
  states, and computed coverage inside the immutable `output_json` for the
  analysis run. The existing `retrieval_run_id` and `retrieved_chunk_ids`
  remain the authoritative allow-list, avoiding a second partial-write path.
- Phase 5 prevents replacement of a non-null analysis `output_json` and forces
  RLS on `research_analysis_review_events`. Database triggers reject update or
  delete, stale output digests, non-terminal runs, foreign sections, unrelated
  edit references, and citation IDs absent from the active output. The API role
  receives only `SELECT` and `INSERT`.

## Migration Rules

- All schema changes live in `supabase/migrations`.
- Migrations must be reversible in intent, even if Supabase SQL files are forward-only.
- Keep provider-fetched market data clearly attributed and separated from user-owned portfolio data.
- Validate migrations with `scripts/validate-supabase-migrations` once wired.
