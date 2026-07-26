# Upgrade Phase 3 Completion

Upgrade Phase 3 delivers the first end-to-end structured-generation workflow:
an evidence-grounded earnings review that retrieves private source material,
streams typed progress and sections, validates the terminal object, and stores
the full run lifecycle.

## Delivered

- Versioned `earnings_review` request, result, section, citation, telemetry, and
  NDJSON event contracts.
- Owner-filtered retrieval followed by section streaming and final structured
  validation.
- Exactly one repair attempt for invalid provider output, followed by an
  explicit evidence-only partial result when repair is exhausted.
- Owner-scoped run creation, read, retry linkage, cancellation, and in-process
  abort registration.
- Durable `research_analysis_runs` storage with forced RLS and recorded
  provider/model, prompt/schema/workflow versions, retrieved chunks, validation
  issues, repair outcome, token/cost values, stage timings, total latency,
  event sequence, and terminal timestamps.
- Monthly AI-brief entitlement accounting and per-user rate limiting for
  structured research.
- A responsive research-workspace panel for question and document scope,
  progress, cancellation, retry, complete/partial/failure states, streamed
  sections, evidence references, telemetry, and the research-only disclaimer.
- A deterministic no-spend generator plus a dormant Vercel AI SDK/OpenAI live
  path protected by the external-call kill switch.

## Acceptance evidence

- A browser run streamed and rendered four validated earnings-review sections
  from a processed private document, including evidence references and stored
  telemetry.
- The forced invalid fixture produced one successful repair and a completed
  run.
- The forced double-invalid fixture produced one failed repair and a stored
  partial result.
- An abortable fixture confirmed cancellation during generation: the stream
  emitted `run.cancelled`, emitted no later sections, and the database stored
  the cancellation request and terminal state.
- The same cancellation target returned `404` to a different owner.
- Database inspection confirmed prompt hashes, versions, provider/model,
  retrieved chunk counts, repair flags, tokens/cost fields, latency, and
  terminal timestamps for complete, repaired, partial, and cancelled runs.
- Desktop and 390 px mobile browser checks confirmed the structured review is
  readable and consistent with the existing Aperture workspace.

## Verification

```bash
scripts/validate-supabase-migrations
supabase db reset --local --no-seed
supabase db lint --local --level warning
cd services/api && go test ./... && go vet ./...
scripts/generate-openapi-client
cd apps/web && npm run test:phase3 && npm run lint && npm run build
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
```

External model calls remained disabled throughout verification.
