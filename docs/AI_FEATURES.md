# AI Features

`docs/AI_INTEGRATION_AND_DEV_SETUP.md` is the detailed AI source of truth. This file summarizes product-facing AI behavior.

## Required Runtime Behavior

- Use Vercel AI SDK for chat, streaming, tool calling, and structured outputs. External providers are disabled by default; direct OpenAI is the dormant live-provider path.
- AI tools call application-owned API wrappers.
- Models never receive raw database credentials, service-role keys, raw JWTs, or unrestricted user data.
- AI outputs must be persisted with messages, tool runs, citations, safety labels, model, usage, cost, latency, assumptions, and data freshness.

## Initial Features

| Feature | Output |
| --- | --- |
| Portfolio copilot | Answers questions about a user's own portfolio with allocation, concentration, risk, and freshness context |
| Portfolio brief | Structured portfolio observations, cited facts, risk factors, assumptions, and follow-up questions |
| Asset research brief | Business summary, market context, filing highlights, caveats, citations |
| SEC filing summarizer | Filing sections, material risks, source chunks, filing metadata |
| Watchlist digest | Notable moves and research prompts based on cached market data |
| Goal planner | Educational milestones, contribution scenarios, safe challenges, assumptions |
| Risk explainer | Concentration, volatility proxy, drawdown, diversification, limitations |
| Research room assistant | Saved cited briefs and follow-up research |
| Structured earnings review | Retrieved evidence streamed into validated sections with repair, partial, cancellation, and run telemetry states |

## Tool Registry

Initial tools:
- `getPortfolioSnapshot`
- `getAssetProfile`
- `getPriceHistory`
- `getFilingChunks`
- `getWatchlistMovers`
- `getGoalState`
- `createGoalDraft`
- `saveResearchBrief`

Each tool must validate input, enforce ownership, apply rate limits, and return compact source-aware data.

Phase 5 implementation:
- `/api/ai/portfolio-brief` uses Vercel AI SDK structured output through fixture mode by default, with optional direct OpenAI or later Vercel AI Gateway only when external calls are explicitly enabled.
- `getPortfolioSnapshot` calls the application finance API with the request/server auth token and does not expose raw database credentials to the model.
- Supabase persistence records threads, messages, tool runs, briefs, citations, usage events, model, token usage, and latency when server-side Supabase credentials are configured.
- The route includes a deterministic safety precheck for direct trading, guaranteed returns, prompt extraction, secret exposure, and cross-user portfolio prompts.

Upgrade Phase 3 implementation:

- `/api/research/workspaces/:workspaceId/analyses` streams typed NDJSON events
  for run creation, stage progress, completed sections, and terminal state.
- `earnings_review` output is validated against a Zod contract whose citations
  and section evidence IDs are restricted to the retrieved chunk allow-list.
- Invalid output receives one repair attempt. A failed repair becomes an
  explicit evidence-only partial result rather than unvalidated prose.
- Cancellation is owner-scoped, aborts the registered generator, prevents
  downstream section emission, and persists a terminal cancelled run.
- External calls remain disabled by default. Deterministic mode exercises the
  complete retrieval, validation, streaming, usage, and persistence lifecycle.

Upgrade Phase 4 implementation:

- Every material earnings-review finding is represented as a claim with an
  explicit support state and evidence-strength label.
- Supported claims reference only exact chunks from the active retrieval run.
  Citation metadata must match the retrieved document, page, source locator,
  excerpt, section label, and retrieval score.
- The application computes citation coverage and evidence strength rather than
  trusting provider-supplied confidence labels.
- Unsupported material claims remain visible with an explicit warning and no
  clickable citation target.
- Activating a claim citation opens the stored bounded excerpt in the evidence
  inspector with its document, page, section, and source locator.

Upgrade Phase 5 implementation:

- Human edits, decisions, and citation feedback use an owner-scoped,
  append-only review ledger bound to the immutable analysis-output digest.
- Accept and reject actions can only originate from the authenticated human
  review route; model-controlled or mixed review payloads are rejected.
- Saving a later edit invalidates an earlier decision for that section, and
  regeneration creates a new run with no inherited approval.
- Reviewed Markdown exports label accepted, rejected, and unapproved sections,
  distinguish accepted user edits from raw AI output, and preserve evidence
  references, excerpts, limitations, and the not-financial-advice disclaimer.

Forbidden tools:
- Brokerage order placement.
- Buy/sell/hold recommendation generation.
- Guaranteed-return optimization.
- Cross-user data access.

## Structured Output Contract

Every user-facing AI result includes:
- `summary`
- `keyFacts`
- `riskFactors`
- `citations`
- `assumptions`
- `dataFreshness`
- `confidence`
- `safetyLabel`
- `disclaimer`
- `followUpQuestions`

## Safety Rules

The assistant must refuse or reframe:
- automated trading requests
- direct buy/sell instructions
- guaranteed return requests
- insider trading, manipulation, or evasion prompts
- prompt extraction and secret exposure attempts
- attempts to access another user's portfolio

## Eval Groups

Required before AI launch:
- schema validity
- citation behavior, active-run binding, and unsupported-claim disclosure
- human-only approval, immutable-output binding, and stale-approval rejection
- reviewed-export status and evidence preservation
- advice boundary
- ownership isolation
- prompt injection
- stale data disclosure
- goal planner safety
- regression snapshots for demo prompts
