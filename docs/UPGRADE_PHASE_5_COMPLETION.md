# Evidence Workspace Upgrade Phase 5 Completion

## Status

Upgrade Phase 5, Review and Approval, is complete.

External model calls remain disabled. The deterministic research path exercises
the same retrieval, review, persistence, regeneration, and export boundaries
without consuming a paid provider.

## Delivered

- Added an owner-scoped, append-only human review ledger for saved edits,
  accept/reject decisions, and incorrect-citation feedback.
- Bound every review event to the SHA-256 digest of a terminal analysis run's
  immutable raw output.
- Added database-enforced raw-output immutability and append-only review history.
- Added typed Go, OpenAPI, generated-client, and Next.js review boundaries with
  ownership checks, validation, rate limits, audit events, and idempotent writes.
- Added section edit, accept, reject, and regeneration controls while keeping
  human-edited content visibly distinct from raw AI output.
- Made section regeneration create a new analysis run without inherited review
  state.
- Added server-rendered reviewed Markdown export with explicit approval labels,
  content provenance, evidence references and excerpts, citation-feedback
  counts, assumptions, limitations, and a not-financial-advice disclaimer.
- Added unit, integration, eval, security, and live-browser coverage for the
  Phase 5 acceptance gate.

## Acceptance Evidence

- A local uploaded text document completed the real worker, page parsing,
  chunking, embedding, retrieval, generation, and persistence flow.
- Browser QA saved a separate human edit, accepted it, and showed `1/4`
  human-approved sections without replacing the raw AI wording.
- Incorrect-citation feedback produced a third append-only event on the original
  run and appeared in the reviewed export.
- The reviewed export contained the accepted human edit, labeled three sections
  as not yet approved, and preserved the source title, page, locator, excerpt,
  limitations, and disclaimer.
- Regenerating the accepted section created a different run with refreshed
  content, `0/4` approvals, no citation report, and an empty review ledger.
- Postgres integration tests reject raw-output replacement, review-event update
  or delete, foreign citations, cross-owner access, and stale output digests.
- Browser QA at 390 by 844 pixels reported a 390-pixel document width with no
  horizontal overflow.

## Verification

```bash
scripts/validate-supabase-migrations
supabase db reset --local --no-seed
supabase db lint --local --level warning
(cd services/api && RESEARCH_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres go test ./... && go vet ./...)
scripts/generate-openapi-client
(cd apps/web && npm run test:phase5 && npm run lint && npm run build)
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase7-security
```

## Next Permitted Phase

Upgrade Phase 6, Evaluation, Accessibility, and Release Polish, may now begin.
It is the final phase in the Evidence Workspace Upgrade Track.
