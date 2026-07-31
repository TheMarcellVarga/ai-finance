# Evidence Workspace Upgrade Phase 6 Completion

## Status

Upgrade Phase 6, Evaluation, Accessibility, and Release Polish, is complete. This also completes the six-phase Evidence Workspace Upgrade Track.

External model calls remain disabled. The checked-in release baseline uses the no-cost deterministic provider and identifies that mode explicitly; it does not claim live-model quality or production deployment.

## Delivered

- Added 40 regression cases across five source-document fixtures for factual, comparative, calculation, citation, safety, and failure behavior.
- Stored a versioned comparison baseline with build, provider, model, workflow, prompt, schema, retrieval, latency, cost, and per-case outcome metadata.
- Added `/app/research/evaluations` with metric definitions, release-gate status, comparison metadata, and an accessible semantic case table.
- Blocked retrieved-document prompt injection before generation, excluded hostile chunks from persisted analysis evidence, and failed closed when no safe evidence remained.
- Added coverage for schema repair/degradation, citation allow-lists, unsupported material claims, advice boundaries, prompt injection, stale approval, review immutability, and cross-owner isolation.
- Added a disposable local-Supabase E2E gate covering upload, worker processing, retrieval, structured analysis, edit/accept/citation feedback, cross-owner rejection, reviewed export, and malicious-document rejection.
- Added CI quality and E2E jobs using pinned major versions of the current official setup actions.
- Completed a WCAG 2.2 AA-focused pass: skip navigation, labeled navigation regions, focusable main targets, status/error announcements, hidden loading decoration, reduced-motion overrides, table captions, and keyboard-native holdings interaction.
- Added non-root multi-stage API/worker images, Kubernetes deployment templates, health probes, read-only filesystem controls, bounded worker scratch storage, secret separation, and a production runbook.
- Updated the README, AI setup guidance, environment guide, roadmap, and recruiter-facing portfolio case study.

## Acceptance Evidence

- `40/40` evidence evaluations pass across five sources.
- Structured output either validates, repairs once, or records an explicit partial/failed result.
- Citation schemas bind evidence to the active retrieval run and complete chunk allow-list.
- Postgres integration and E2E checks reject cross-owner and cross-workspace access with no information leakage.
- Material factual findings require valid supporting evidence or an explicit unsupported warning.
- AI output cannot approve itself; edits remain distinct, and regeneration invalidates stale approval.
- The complete upload-to-reviewed-export E2E workflow passes, including the not-financial-advice boundary.
- Accessibility and deployment contract verifiers pass; the web production build and both container targets build successfully.
- Known production failure modes, configuration, deployment order, incident response, and rollback behavior are documented in `docs/DEPLOYMENT_RUNBOOK.md`.

## Verification

```bash
scripts/validate-supabase-migrations
supabase db reset --local --no-seed
supabase db lint --local --level warning
(cd services/api && RESEARCH_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres go test ./... && go vet ./...)
scripts/generate-openapi-client
(cd apps/web && npm run test:phase6 && npm run lint && npm run build)
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase7-security
scripts/verify-accessibility-contracts
scripts/verify-deployment-artifacts
scripts/verify-evidence-workspace-e2e
(cd services/api && docker build --target api -t aperture-api:phase6 .)
(cd services/api && docker build --target worker -t aperture-worker:phase6 .)
```

## Release Boundary

Local product and release artifacts are complete. Public deployment, hosted Supabase migration, production Clerk/Stripe configuration, and live OpenAI activation require real environment credentials and explicit user approval. None were performed as part of this phase.
