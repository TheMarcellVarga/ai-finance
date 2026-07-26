# ADR 003: Structured Research Generation

Status: accepted

Date: 2026-07-27

Roadmap phase: Evidence Workspace Upgrade Phase 3

## Context

Phase 2 established owner-filtered retrieval with stable chunk identifiers,
page provenance, versioned embeddings, and persisted retrieval diagnostics.
Phase 3 must turn only that retrieved evidence into a structured research
result while keeping the user informed about progress and preserving failure
state.

The generation foundation must:

- keep Next.js responsible for AI orchestration and streaming UX;
- retrieve evidence through the authenticated Go API rather than reading raw
  document tables from the model runtime;
- stream typed workflow, stage, and section events;
- validate every completed result and make at most one repair attempt;
- preserve invalid output as an explicit partial result when repair fails;
- stop downstream stages after cancellation and store the terminal state;
- normalize provider, model, prompt, schema, retrieval, token, cost, and latency
  telemetry;
- keep external model calls disabled until provider spend is explicitly
  approved.

## Decision

### First workflow

The first workflow is `earnings_review`. It accepts:

- an owner-scoped workspace ID from the route;
- a research question between 2 and 500 characters;
- up to 20 selected document IDs;
- an optional prior run ID when retrying.

It produces four ordered sections:

1. executive summary;
2. operating signals;
3. risk factors;
4. questions for review.

Each section contains a stable key, title, concise research-only body, evidence
chunk IDs, confidence, and an explicit completion state. The overall result
also includes assumptions, freshness, safety label, disclaimer, follow-up
questions, and workflow/schema versions.

This phase records evidence references but does not yet claim that every
sentence is mapped to a citation. Claim-level citation validation and the
interactive evidence panel belong to Phase 4.

### Runtime boundaries

Next.js owns the generation pipeline and streams newline-delimited JSON events
from:

`POST /api/research/workspaces/{workspaceID}/analyses`

The pipeline:

1. authenticates the request and checks usage/rate limits;
2. creates an owner-scoped analysis run;
3. calls the Go evidence-search endpoint with the authenticated token;
4. stores the retrieval-run and returned chunk IDs;
5. invokes a provider-neutral generator;
6. validates the candidate and attempts one repair when necessary;
7. streams completed sections in schema order;
8. stores the structured result and normalized terminal telemetry.

The browser never receives service-role or provider credentials. The generator
receives a bounded evidence projection, not database access.

### Provider modes

`deterministic-evidence-v1` is the default local and CI provider. It creates a
schema-valid, evidence-derived result with zero model tokens and zero provider
cost. The UI labels it as local deterministic mode. It exists to exercise
retrieval, streaming, persistence, repair, cancellation, and degraded-state
behavior without pretending that a model was called.

The dormant live adapter uses the existing Vercel AI SDK provider selection.
It can run only when all required server configuration is present, including:

- `AI_EXTERNAL_CALLS_ENABLED=true`;
- `AI_RESEARCH_GENERATION_MODE=live`;
- the selected provider's server-only credential.

Live output is parsed as JSON and validated by the same schema used by the
deterministic provider. Invalid live output receives one bounded repair call.
No automatic third attempt is allowed.

### Streaming contract

The response content type is `application/x-ndjson`. Every line is one
discriminated event with a monotonically increasing sequence number and
timestamp. Event types are:

- `run.created`;
- `stage.started`;
- `stage.completed`;
- `section.completed`;
- `run.completed`;
- `run.partial`;
- `run.cancelled`;
- `run.failed`.

The named stages are `retrieval`, `generation`, `validation`, `repair`, and
`persistence`. Events contain safe metadata only. Raw prompts, full retrieved
document text, provider credentials, and hidden instructions are not included
in telemetry events.

### Validation, repair, and partial results

The workflow schema is the authority. The runtime validates the first candidate
with Zod. If validation fails, it records sanitized issue paths and invokes the
same provider's repair method once.

If repair succeeds, the run is marked `completed` with `repair_attempted=true`
and `repair_succeeded=true`.

If repair fails, the runtime converts any valid sections from the candidate
into an explicit partial result. It never presents invalid content as complete.
The run is marked `partial`, includes sanitized validation issues, and records
one failed repair attempt.

If provider generation fails before a candidate exists, the runtime may create
an evidence-only partial fallback. That fallback is labeled `degraded`,
`needs_human_review`, and zero-token when no model output was usable.

### Cancellation

Cancellation is cooperative and available through:

`POST /api/research/workspaces/{workspaceID}/analyses/{runID}/cancel`

The cancellation handler verifies the authenticated owner before changing the
run. It sets `cancel_requested_at`, signals an in-process abort controller when
available, and stores the terminal `cancelled` state. The pipeline checks for
cancellation between every downstream stage and section emission. Aborting the
streaming request also requests cancellation.

A cancelled run is never resumed in place. Retry creates a new run linked
through `retry_of_run_id`, preserving the prior run unchanged.

### Persistence and telemetry

`research_analysis_runs` stores:

- owner and workspace;
- workflow and run status;
- prompt hash, never the raw prompt;
- prompt and schema versions;
- provider and model;
- selected document IDs;
- retrieval-run ID and retrieved chunk IDs;
- structured output or explicit partial output;
- validation issues and repair flags;
- input, output, and total token counts;
- estimated cost in USD;
- per-stage timings and total latency;
- retry and cancellation metadata;
- creation, start, completion, and update timestamps.

RLS is enabled and forced. The API role can access only rows whose user and
workspace match `current_profile_id()`. Service-role Next.js persistence still
filters every read and mutation by the resolved profile ID.

Local development can use a process-local repository when Supabase is not
configured. Responses identify that mode. Production requires durable
Supabase persistence and refuses to start a generation run without it.

### Privacy and safety

- Raw research questions are represented in diagnostics only by SHA-256.
- Retrieved chunk IDs are stored, but chunk text is not duplicated into
  analysis telemetry.
- Validation errors are reduced to schema paths and codes.
- Logs and analytics receive run IDs, versions, counts, status, and latency,
  not prompts or generated financial content.
- System instructions reinforce research-only framing, stale-data disclosure,
  uncertainty, and the prohibition on direct trade or suitability advice.
- Document instructions cannot change application policy or tool boundaries.

## Consequences

Benefits:

- the UI can render predictable progress and structured sections;
- invalid model output cannot silently become a complete result;
- cancellation and retries have auditable state;
- local and CI tests exercise the full pipeline without model spend;
- provider comparisons have normalized versions, usage, cost, latency, and
  retrieved-context metadata;
- Phase 4 can add claim-level citation validation without replacing the run
  model.

Costs:

- newline-delimited JSON requires a small client parser;
- cooperative cancellation can finish the currently executing remote provider
  operation before a cross-instance cancellation is observed;
- service-role persistence needs explicit owner filters in addition to RLS;
- deterministic local generation validates orchestration, not live model
  quality;
- claim-level citation coverage remains intentionally incomplete until Phase
  4.

## Rejected alternatives

### Browser-side model calls

Rejected because provider keys, private evidence, prompts, and usage controls
must remain server-side.

### Model access to raw Postgres

Rejected because the model must receive only owner-filtered results from
application-owned APIs.

### Unstructured text streaming

Rejected because the UI and persistence layer need stable section boundaries,
terminal states, and schema validation.

### Unlimited automatic repair

Rejected because repeated calls increase cost and latency, hide quality
failures, and make runs less reproducible.

### Overwriting a cancelled or failed run on retry

Rejected because raw run history must remain immutable enough for later review,
evaluation, and approval workflows.

## Verification

- schema-valid generation and typed stream ordering;
- one successful repair and one exhausted-repair partial result;
- explicit evidence-only degraded fallback;
- user cancellation stops later sections and is stored;
- retry creates a linked run;
- cross-owner cancellation denial;
- prompt hash and retrieved chunk persistence without raw prompt duplication;
- normalized provider/model/version/token/cost/latency metadata;
- external-call kill-switch tests;
- Next.js lint/build and responsive browser checks.
