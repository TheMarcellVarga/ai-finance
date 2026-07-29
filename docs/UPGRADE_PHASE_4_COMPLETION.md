# Evidence Workspace Upgrade Phase 4 Completion

## Status

Upgrade Phase 4, Citations and Trust, is complete.

External model calls remain disabled. The deterministic research path exercises
the same retrieval, validation, persistence, and evidence-inspection boundaries
without consuming a paid provider.

## Delivered

- Added `structured-research-v2` claim objects with materiality, support state,
  qualitative evidence strength, and evidence chunk mappings.
- Validated citation targets against the exact active retrieval run and complete
  retrieved-chunk allow-list.
- Required stored citation metadata to match the retrieved document, page,
  source locator, section label, excerpt, and retrieval score.
- Computed evidence strength and material-claim coverage inside the application.
- Preserved unsupported material findings as explicit warnings without hidden or
  clickable citation targets.
- Added an accessible evidence inspector that opens the bounded stored excerpt
  and page from claim-level citation controls.
- Persisted the complete trust artifact in the immutable analysis-run output.
- Extended deterministic evals for forged run IDs, incomplete allow-lists,
  metadata mismatches, claim mapping, and unsupported findings.

## Acceptance Evidence

- A local end-to-end run over an uploaded text document completed with two of
  two material findings mapped and 100 percent citation coverage.
- Both claim citations activated the stored source excerpt and page 1 in the
  evidence inspector.
- Browser QA at 390 by 844 pixels reported no horizontal overflow and retained
  the evidence inspector and coverage state.
- Unit and eval fixtures verify that unsupported findings remain visible and
  that citation targets cannot escape the active run.
- Supabase inspection confirmed `structured-research-v2`, an exact excerpt and
  page, the active retrieval run ID, and one retrieved chunk in the immutable
  completed output.

## Verification

```bash
scripts/validate-supabase-migrations
supabase db reset --local --no-seed
supabase db lint --local --level warning
(cd services/api && go test ./... && go vet ./...)
scripts/generate-openapi-client
(cd apps/web && npm run test:phase4 && npm run lint && npm run build)
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase7-security
```

## Next Permitted Phase

Upgrade Phase 5, Review and Approval, may now begin. It must preserve immutable
raw output, keep human edits separate, and prevent AI-generated content from
approving itself.
