# Master Execution Roadmap

## Purpose
This roadmap turns the extensive planning into an executable timeline. It is the control plane for future AI-assisted implementation: what to build, in what order, which skills to use, what artifacts each phase produces, and which acceptance gates must pass before moving forward.

This document is the execution authority for the repo. Future agents should consult it first, follow the phase order, and use its acceptance gates to decide whether a phase is complete.

The goal is not to build everything at once. The goal is to move through controlled phases until the project becomes a polished, recruiter-grade AI financial intelligence workspace.

## Operating Model
- Start each task by naming the current roadmap phase.
- Do not skip phases unless the user explicitly updates the roadmap or confirms a deliberate exception.
- If a task belongs to a later phase, record it as queued instead of implementing it early.
- Work in phases, not scattered features.
- Each phase must produce visible artifacts: docs, code, tests, screenshots, deploys, or eval results.
- Use the repo-local skills in `ai-dev/skills` to route future AI work.
- Use Taste Skill only for frontend taste/polish; it does not override finance, AI safety, backend, or security rules.
- Keep the product boundary fixed: research and portfolio decision support, never trading automation or investment advice.
- Every implementation task should name its phase, skill, target files, acceptance criteria, and verification command.

## Skill Routing
Use this routing table when assigning future AI tasks.

| Work Type | Primary Skill | Support Skill |
| --- | --- | --- |
| Product copy, pricing, goals, gamification | `finance-product-guardrails` | `security-review-fintech` |
| Marketing/product UI, dashboard UI, media, branding | `nextjs-fintech-ui` | Taste Skill |
| Screenshot-to-code or redesign polish | Taste Skill `image-to-code-skill` / `redesign-skill` | `nextjs-fintech-ui` |
| Go API, OpenAPI, finance calculations | `go-finance-api` | `security-review-fintech` |
| Supabase schema, RLS, vectors, migrations | `supabase-finance-schema` | `security-review-fintech` |
| AI tools, RAG, prompts, citations, evals | `ai-research-features` | `finance-product-guardrails` |
| Auth, billing, privacy, abuse, deployment review | `security-review-fintech` | relevant subsystem skill |

## Timeline Overview
Assume a focused solo/AI-assisted build. Compress or expand based on available time, but keep the order.

| Phase | Duration | Outcome |
| --- | --- | --- |
| 0. Control Plane | 1-2 days | Repo docs, AI skills, task rules, roadmap, and source of truth ready. |
| 1. Product And Brand Lock | 2-4 days | Name, positioning, product spec, pricing limits, brand/media direction, demo flow. |
| 2. App Scaffold And Design System | 3-5 days | Next.js app, routes, shell, theme, responsive layout, initial landing/product/pricing pages. |
| 3. Backend And Data Foundation | 4-7 days | Go API scaffold, Supabase migrations, auth mapping, OpenAPI, provider skeletons. |
| 4. Portfolio Workspace MVP | 5-8 days | Authenticated dashboard, portfolios, holdings, watchlist, charts, real provider market data. |
| 5. Real AI Foundation | 5-8 days | Disabled-by-default external provider support, streaming route, tool registry, AI persistence, first evals, portfolio brief. |
| 6. Research And Goal Intelligence | 5-8 days | Filing summaries, RAG chunks, goal planner, risk explainer, safe gamification. |
| 7. Billing, Security, And Observability | 4-7 days | Stripe plans, entitlements, usage limits, Sentry, PostHog, audit logs, security checks. |
| 8. Polish And Portfolio Case Study | 5-10 days | Brand assets, stock media, mobile pass, screenshots, README, architecture diagram, demo video. |
| 9. Completion And No-Placeholder Pass | 4-8 days | Replace, finish, or remove every visible scaffold, fixture-only surface, placeholder page, and unfinished workflow before portfolio review. |

## Phase 0: Control Plane
Status: complete.

Deliverables:
- `AGENTS.md`
- `docs/AI_INTEGRATION_AND_DEV_SETUP.md`
- `docs/MASTER_EXECUTION_ROADMAP.md`
- `ai-dev/skills/*`
- placeholder scripts for OpenAPI generation, AI evals, migration validation, and AI safety fixtures
- documentation map: `README.md`, product, implementation, architecture, database, API, AI, design, security, testing, and environment docs

Acceptance gate:
- All skill folders validate.
- Future agents can identify source-of-truth docs.
- No app implementation has started before product/brand decisions are locked.

## Phase 1: Product And Brand Lock
Status: complete.

Primary skills: `finance-product-guardrails`, `nextjs-fintech-ui`, Taste Skill.

Deliverables:
- `docs/PRODUCT_SPEC.md`
- product name shortlist and final working name
- homepage/product/pricing copy direction
- MVP golden path
- exact pricing tiers and entitlement limits
- demo asset universe: curated US equities/ETFs
- brand keywords, logo direction, color/material direction
- stock image/video candidate list with license notes

Acceptance gate:
- The product can be explained in one sentence without saying "trading bot."
- The MVP demo flow is exact.
- Pricing limits are concrete enough to implement.
- Logo/media direction is specific enough to generate assets.

## Phase 2: App Scaffold And Design System
Status: complete.

Primary skills: `nextjs-fintech-ui`, Taste Skill.

Deliverables:
- Next.js App Router scaffold
- shadcn/ui setup
- global theme tokens
- marketing layout, header, footer
- product, pricing, security route skeletons
- authenticated app shell route skeletons
- responsive navigation
- initial brand/logo placeholder assets

Acceptance gate:
- Landing, product, pricing, and app shell render responsively.
- No fake final AI cards are used as finished features.
- Visual direction matches dark premium fintech, not generic SaaS.
- Lighthouse/Core Web Vitals are not obviously damaged by media.

## Phase 3: Backend And Data Foundation
Status: complete.

Primary skills: `go-finance-api`, `supabase-finance-schema`.

Deliverables:
- Go API scaffold in `services/api`
- health endpoint
- Clerk JWT middleware plan implemented
- Supabase SQL migrations
- `pgx`/`sqlc` setup
- OpenAPI 3.1 contract
- generated TypeScript client placeholder flow
- provider configuration for real asset and quote data
- provider interfaces for market data and filings

Completed artifacts:
- `services/api` Go module with health, real provider asset search, request IDs, structured errors, Clerk/JWKS auth middleware, local dev auth mode, provider interfaces, `pgx` connection setup, `sqlc.yaml`, and handler/auth tests.
- `packages/contracts/openapi/finance-api.yaml` plus `packages/contracts/src/generated/client.ts`.
- `supabase/migrations/202605230001_phase3_foundation.sql` and `202605230002_seed_demo_assets.sql`.
- `scripts/generate-openapi-client` and `scripts/validate-supabase-migrations` now perform deterministic validation instead of returning placeholder success.

Acceptance gate:
- Go API starts locally.
- Database migrations apply locally.
- Authenticated request path is defined.
- OpenAPI contract can generate or validate client types.
- Real provider keys support a local portfolio demo without mock market prices.

## Phase 4: Portfolio Workspace MVP
Status: complete.

Primary skills: `go-finance-api`, `nextjs-fintech-ui`.

Deliverables:
- onboarding flow
- portfolio create/read/update/delete
- holdings and transactions
- watchlist
- asset search
- dashboard summary cards
- allocation and price charts
- real provider market data display
- provider-backed portfolio flow

Completed artifacts:
- Owner-scoped Go portfolio endpoints for list, create, read, update, delete, and add holding using real provider quote data.
- Owner-scoped Go watchlist endpoints for list, create, and add item.
- OpenAPI 3.1 contract and generated TypeScript client expanded for portfolio and watchlist flows.
- Portfolio workspace UI with real provider portfolio creation, holdings table, allocation bars, provider freshness, and decision-support disclaimer.
- Handler tests covering the portfolio golden path, owner isolation, holding mutation, watchlist creation, and provider data metadata.

Acceptance gate:
- User can complete the golden path through portfolio creation.
- User cannot access another user's portfolio.
- Charts fit mobile and desktop containers.
- Provider failures are visible and block fabricated market values.

## Phase 5: Real AI Foundation
Status: implementation complete; fixture mode is the active working path and live credential verification is deferred.

Primary skills: `ai-research-features`, `security-review-fintech`.

Deliverables:
- disabled-by-default external AI provider configuration
- streaming AI route
- AI thread/message persistence
- tool registry wrapper layer
- `getPortfolioSnapshot` tool
- structured portfolio brief schema
- citations/data freshness fields
- usage tracking and quota counters
- first AI eval fixture set

Completed artifacts:
- `apps/web/src/app/api/ai/portfolio-brief/route.ts` uses Vercel AI SDK structured output with fixture mode by default, optional direct OpenAI as the dormant live-provider path, later optional AI Gateway, and an optional streaming mode for the portfolio brief route.
- Local development uses deterministic fixture mode for `/api/ai/portfolio-brief` by default, returning a schema-valid, cited brief from the owner-scoped portfolio snapshot without model spend. This is the current working mode and does not require live AI credentials.
- `apps/web/src/lib/ai/portfolio-brief.ts` defines the portfolio brief schema, citations/freshness contract, prompt builder, and advice-boundary safety precheck.
- `apps/web/src/lib/ai/tool-registry.ts` and `portfolio-tools.ts` provide an owner-scoped `getPortfolioSnapshot` AI tool wrapper that calls the application finance API instead of raw database access.
- `apps/web/src/lib/ai/persistence.ts` persists AI threads, messages, tool runs, briefs, citations, usage events, latency, model, and token usage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured server-side.
- `scripts/run-ai-evals` and `scripts/check-ai-safety-fixtures` now run deterministic schema, citation/freshness, advice-boundary, ownership-isolation, prompt-injection, and safety fixture checks.
- `scripts/verify-phase5-live` now intentionally skips Vercel AI Gateway so local verification is not blocked by account billing or credit-card requirements. It runs the deterministic portfolio brief path against an owner-scoped finance API snapshot and validates schema, citation, safety, disclaimer, and no-model-call metadata.

Deferred live verification:
- Vercel AI Gateway live calls are skipped by policy in local verification to avoid requiring a valid credit card or live model spend.
- Direct OpenAI through `@ai-sdk/openai` is available as the dormant live-provider path, but it remains off until `AI_EXTERNAL_CALLS_ENABLED=true`, `AI_PORTFOLIO_BRIEF_MODE=live`, `AI_MODEL_PROVIDER=openai`, and an OpenAI API key are configured.
- If the team later chooses to re-open paid live verification, add a separate script instead of changing the no-Gateway verifier. That future script can use Vercel AI Gateway credentials via `vercel link` and `vercel env pull apps/web/.env.local`, `VERCEL_AI_GATEWAY_API_KEY` / `AI_GATEWAY_API_KEY`, or direct OpenAI.
- Optionally set `AI_GATEWAY_MODEL` to the intended final demo model; otherwise the route defaults to the low-cost `amazon/nova-micro`.
- Point Next.js at the finance API with `FINANCE_API_BASE_URL` and, for local dev auth, `FINANCE_API_DEV_TOKEN`.
- Apply Supabase migrations to the configured remote project so `public.profiles` and AI persistence tables exist.
- Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if you want live AI persistence verification later.

Temporary Phase 6 unblock:
- Phase 6 implementation may proceed behind deterministic AI fixture mode to avoid early model spend, provided all AI-facing UI and docs continue to label fixture output as non-live.
- Before Phase 8 recruiter-demo polish, Phase 5 only needs to be re-opened if the live AI path is being finalized for a public demo.

Acceptance gate:
- Local verification intentionally skips Vercel AI Gateway and proves the no-Gateway deterministic AI path.
- Portfolio brief is schema-valid, citation-backed, and persistence-ready when Supabase credentials are configured.
- AI cannot access another user's portfolio.
- AI refuses trading-bot and direct buy/sell prompts.
- Eval runner catches at least schema and advice-boundary failures.

## Phase 6: Research And Goal Intelligence
Status: complete in deterministic fixture mode; live SEC ingestion and model-backed generation remain follow-on hardening work.

Primary skills: `ai-research-features`, `finance-product-guardrails`, `supabase-finance-schema`.

Deliverables:
- research document ingestion
- `research_chunks` and `pgvector` retrieval
- SEC filing summarizer
- watchlist digest
- goal planner
- risk explainer
- safe challenges and achievements
- cited research-room saves

Completed artifacts:
- Deterministic Phase 6 AI schemas and generators in `apps/web/src/lib/ai/research-intelligence.ts` for SEC filing summaries, goal plans, and portfolio risk explanations.
- Next.js API routes for `/api/ai/research-brief`, `/api/ai/goal-plan`, and `/api/ai/risk-explainer`, all returning citation/freshness metadata, assumptions, safety labels, and not-financial-advice disclaimers.
- Research, goals, and risk app pages now render concrete Phase 6 outputs instead of skeleton placeholders.
- `supabase/migrations/202605270001_phase6_research_goal_intelligence.sql` seeds safe educational challenges, achievements, and deterministic research document chunks without mock market prices.
- AI eval and safety fixture scripts now cover filing citations, goal-planner safety, prompt injection, ownership-boundary language, and unsafe gamification language.
- `scripts/verify-phase5-mock` and `scripts/verify-phase5-live` both avoid Vercel AI Gateway account/billing blockers; the latter remains the Phase 5 verification command name but now validates the approved no-Gateway deterministic path.

Deferred live hardening:
- Replace deterministic SEC-style chunks with real SEC EDGAR ingestion, chunking, embeddings, and retrieval over `research_chunks`.
- Connect Phase 6 generation to direct OpenAI only if paid API usage is explicitly approved; otherwise keep the no-Gateway deterministic path.
- Persist saved research-room artifacts to Supabase in configured environments.

Acceptance gate:
- Filing summary includes valid source references.
- Goal planner avoids guaranteed-return and risky-profit framing.
- Risk explainer discloses assumptions and data freshness.
- Prompt-injection fixture cannot override assistant rules.

## Phase 7: Billing, Security, And Observability
Status: complete in server-enforced local mode; live Stripe/Clerk/Supabase webhook verification remains environment-dependent.

Primary skills: `security-review-fintech`, `finance-product-guardrails`.

Deliverables:
- Stripe products/prices mapped to app entitlements
- billing page
- usage limits for AI, watchlists, portfolios, research saves
- Clerk webhook sync
- Stripe webhook handling
- Sentry integration
- PostHog event plan with privacy scrubbing
- audit logs
- rate limits
- security checklist doc

Completed artifacts:
- Concrete Free, Pro, Research Pro, and Team/Advisor entitlement definitions in `apps/web/src/lib/billing/entitlements.ts`, matching the product-spec limits.
- Server-side usage and entitlement gate helpers in `apps/web/src/lib/billing/usage.ts`, applied to portfolio brief, filing summary, goal planner, and risk explainer routes.
- Signed Stripe and Clerk webhook route handlers at `/api/webhooks/stripe` and `/api/webhooks/clerk`, with deterministic signature verification, idempotent `webhook_events` handling, profile/subscription sync, and audit logging.
- Privacy-safe observability helpers in `apps/web/src/lib/security/observability.ts` for PostHog and Sentry-compatible server reporting with sensitive payload scrubbing.
- Audit logging helper in `apps/web/src/lib/security/audit.ts` that hashes request IP/user-agent values and avoids raw prompts, holdings, amounts, and secrets.
- Rate-limit helpers in `apps/web/src/lib/security/rate-limit.ts`, with Upstash REST support when configured and in-memory fallback for local development.
- Billing dashboard at `/app/billing` showing plan state, entitlement limits, and current usage period.
- Phase 7 Supabase migration `202605270002_phase7_billing_security_observability.sql` adds Stripe price/status metadata, entitlement snapshots, webhook idempotency records, and billing/usage indexes.
- Go finance API now reports default Free plan usage limits, enforces local portfolio/holding/watchlist limits, rate-limits finance mutations, and emits structured audit logs for sensitive mutations.
- `scripts/verify-phase7-security` verifies Phase 7 security artifacts and route enforcement wiring.

Deferred live hardening:
- Configure real Stripe products/prices and set `STRIPE_PRICE_*` environment variables in the deployment environment.
- Run Stripe and Clerk webhook delivery tests against configured secrets and Supabase service-role credentials.
- Replace local/in-memory rate-limit fallback with Upstash in production.
- Add hosted checkout/customer-portal flows once the public pricing CTA is connected to real Stripe products.

Acceptance gate:
- Entitlements are enforced server-side.
- Webhooks verify signatures.
- Sensitive data is not sent to analytics/errors by default.
- Past-due/canceled subscription states behave predictably.
- Security review has no known blocker.

## Phase 8: Polish And Portfolio Case Study
Status: complete in local portfolio-case-study mode, but not portfolio-ready until Phase 9 removes unfinished visible surfaces. Public deployment and live production-provider checks remain environment-dependent.

Primary skills: `nextjs-fintech-ui`, Taste Skill, `security-review-fintech`.

Deliverables:
- final logo and brand asset set
- licensed stock image/video assets with source notes
- mobile polish
- screenshot set
- short demo video or walkthrough script
- architecture diagram
- README
- API docs
- case-study section describing tradeoffs and security
- deployed demo

Completed artifacts:
- Updated `README.md` with Phase 8 status, architecture diagram, demo path, scripts, and case-study link.
- `docs/BRAND_AND_MEDIA.md` documents the production-safe brand package, final media direction, and license rules.
- `apps/web/public/brand/aperture-mark.svg` and `aperture-social-card.svg` provide local vector brand assets without relying on generated raster text.
- `docs/PORTFOLIO_CASE_STUDY.md` explains product boundary, architecture tradeoffs, AI safety, security posture, verification, and follow-on hardening.
- `docs/DEMO_WALKTHROUGH.md` provides a short demo video/walkthrough script and verification commands.
- `docs/API_SPEC.md` now documents the implemented Next.js route handlers alongside the Go API contract.
- `docs/ARCHITECTURE.md` includes a Mermaid system diagram.
- Local screenshot capture set is generated under `docs/screenshots/` during verification when a local browser is available.

Deferred live hardening:
- Deploy the public Next.js and Go API demo after production secrets and hosting targets are configured.
- Run live Stripe and Clerk webhook delivery tests against deployed endpoints.
- Apply migrations to remote Supabase and verify persisted AI runs with service-role credentials.
- Replace deterministic SEC-style content with live EDGAR ingestion and embeddings.
- Source final licensed stock media only after license terms are approved and recorded.

Acceptance gate:
- App looks credible in screenshots before the user clicks.
- Golden path works on mobile and desktop.
- AI demo is real, cited, and safe.
- README explains architecture, AI, security, and tradeoffs clearly.
- The project can be shown to fintech/AI product engineering recruiters.

## Phase 9: Completion And No-Placeholder Pass
Status: complete in local portfolio-demo mode. Public deployment and live production-provider checks remain environment-dependent.

Primary skills: `nextjs-fintech-ui`, `ai-research-features`, `go-finance-api`, `security-review-fintech`.

Purpose:
- Turn the local case-study app into a cohesive portfolio product by finishing, replacing, or removing every user-visible scaffold, skeleton, placeholder, fixture-only page, and "future work" surface.
- No public or app route may advertise incompleteness in normal user-facing copy.
- Fixture and deterministic modes may remain for local tests, but the demo UI must clearly present finished behavior or intentionally scoped demo data without looking unfinished.

Completed artifacts:
- `/app/watchlist` now renders a provider-backed watchlist workspace with list, refresh, add-ticker, source freshness, empty, loading, and error states through the Next.js `/api/finance/watchlist` BFF route backed by the Go watchlist API.
- `/app/settings` now renders concrete account, privacy, data export, notification, provider-mode, AI-boundary, and telemetry controls for the local portfolio demo.
- Clerk now gates `/app(.*)` through the Next.js 16 proxy and protected app layout, provides `/sign-in` and `/sign-up`, exposes Clerk-managed profile and session security at `/app/settings/account`, and replaces browser-side demo identity fallbacks with authenticated session tokens.
- `/blog`, `/privacy`, and `/terms` now contain concrete case-study, privacy, and research-support terms copy aligned with the finance and security guardrails.
- `/app/research`, `/app/goals`, and `/app/risk` now include route-backed action panels for AI generation and saved research behavior with usage, entitlement, citation, and audit paths.
- Billing remains a finished entitlement and usage surface with no visible upgrade action while live Stripe products/customer portal are not configured.
- User-facing completion-pass/blocker wording has been removed from app source, README, case study, and demo walkthrough.
- The portfolio case study follow-on list no longer calls Phase 9 incomplete.

Acceptance gate:
- `rg -n "skeleton|scaffold|placeholder|future work|coming soon|not implemented|todo|deferred" apps/web/src README.md docs/PORTFOLIO_CASE_STUDY.md docs/DEMO_WALKTHROUGH.md` returns no user-facing blocker language except explicit internal roadmap references.
- Every route linked in navigation has either a complete working experience or is removed from navigation.
- Watchlist, settings, public briefs/blog, privacy, and terms no longer look like reserved pages.
- Deterministic AI mode is visually presented as a local demo/test mode, not as an unfinished feature.
- Portfolio, research, goal, risk, billing, and watchlist flows have at least focused smoke/eval coverage.
- Fresh desktop and mobile screenshots show only finished portfolio-demo surfaces.

Verification commands:
- `cd services/api && go test ./...`
- `cd apps/web && npm run lint && npm run build`
- `scripts/run-ai-evals`
- `scripts/check-ai-safety-fixtures`
- `scripts/verify-phase7-security`
- Browser screenshot pass for `/`, `/app`, `/app/portfolio`, `/app/watchlist`, `/app/research`, `/app/goals`, `/app/risk`, `/app/settings`, `/app/billing`, `/blog`, `/privacy`, and `/terms`.

## Evidence Workspace Upgrade Track

This is the active roadmap after the original local portfolio-demo phases. It upgrades Aperture into a production-style, evidence-first financial document research workspace while preserving the existing Next.js, Go, Clerk, and Supabase boundaries.

The detailed gap analysis, architecture recommendation, migration risks, dependency proposal, and likely file changes are in `docs/REPOSITORY_ASSESSMENT.md`.

The upgrade follows these rules:

- Do not replace the Go finance/data backend with a Node-only backend.
- Do not implement retrieval before owner-scoped workspace/document storage is complete.
- Do not expose uploaded files or chunks through global read policies.
- Do not present deterministic fixtures as final document-research functionality.
- Do not let a model approve, publish, persist as approved, or export a conclusion.
- Keep external AI calls disabled until the user explicitly approves provider spend.
- Keep every feature commit reviewable and include its proportional tests.
- Create a milestone-completion documentation commit only after the milestone acceptance gate passes.

### Upgrade Phase 0: Repository Assessment And Roadmap Lock

Status: complete.

Primary skill: existing-project redesign audit.

Support skill: Supabase security and persistence review.

Deliverables:

- `docs/REPOSITORY_ASSESSMENT.md`
- current architecture and gap analysis
- recommended architecture and dependency proposal
- data, API, AI, frontend, security, testing, and migration review
- Upgrade Phases 1-6 and acceptance gates

Acceptance gate:

- The first task from the AI product upgrade plan is answered without application implementation.
- Existing working functionality is not deleted or replaced.
- Assumptions and unknowns are explicit.
- The master roadmap identifies the next permitted implementation phase.

### Upgrade Phase 1: Document Foundation

Status: complete.

Primary skills: `go-finance-api`, `supabase-finance-schema`.

Support skills: `nextjs-fintech-ui`, `security-review-fintech`.

Deliverables:

- document-research architecture decision record
- durable Go/Postgres profile-scoped transaction pattern
- owner-scoped research workspace and document schema
- private Supabase Storage upload flow
- PDF/text validation and page-aware parser abstraction
- Postgres-backed processing jobs and Go worker
- document processing status and retry UI

Acceptance gate:

- A signed-in user can upload a supported PDF or text file.
- Processing status is durable and failed processing can be retried idempotently.
- Parsed pages retain document, page, and source metadata.
- Cross-workspace list, read, download, retry, and delete attempts fail.
- No external model call is required.

Completion evidence: `docs/UPGRADE_PHASE_1_COMPLETION.md`.

### Upgrade Phase 2: Retrieval

Status: pending.

Primary skills: `ai-research-features`, `supabase-finance-schema`.

Support skills: `go-finance-api`, `security-review-fintech`.

Deliverables:

- deterministic page-aware chunking with stable IDs
- provider-independent embedding interface
- versioned embeddings and vector index
- owner-filtered retrieval API with workspace/document filters
- evidence search interface and retrieval diagnostics

Acceptance gate:

- Representative queries return relevant chunks with document and page metadata.
- Duplicate or near-duplicate context is suppressed.
- Cross-workspace retrieval tests pass.
- Retrieved chunk IDs, filters, model version, and stage latency are recorded.

### Upgrade Phase 3: Structured Generation

Status: pending.

Primary skill: `ai-research-features`.

Support skills: `nextjs-fintech-ui`, `finance-product-guardrails`, `security-review-fintech`.

Deliverables:

- generation, streaming, usage, retry, cancellation, and fallback interfaces
- first workflow input/output schemas
- typed stage and section streaming
- structured validation and one repair attempt
- cancellation, partial results, degraded states, and normalized telemetry

Acceptance gate:

- An earnings-review or custom-research result streams into structured sections.
- Invalid output is repaired once or preserved as an explicit partial result.
- User cancellation stops downstream work and is stored.
- Model, provider, prompt/schema versions, tokens, cost, latency, and retrieved chunks are stored.

### Upgrade Phase 4: Citations And Trust

Status: pending.

Primary skills: `ai-research-features`, `nextjs-fintech-ui`.

Support skill: `security-review-fintech`.

Deliverables:

- claim-to-chunk citation mapping
- citation validation against the retrieved-chunk allow-list
- interactive evidence panel
- unsupported-claim warnings
- qualitative evidence-strength states and citation coverage

Acceptance gate:

- Every material finding has valid support or a visible unsupported warning.
- Citation activation reveals the correct source excerpt and page.
- Citation targets cannot escape the active workspace or analysis run.

### Upgrade Phase 5: Review And Approval

Status: pending.

Primary skills: `nextjs-fintech-ui`, `go-finance-api`.

Support skills: `finance-product-guardrails`, `security-review-fintech`.

Deliverables:

- edit, accept, reject, and regenerate-section controls
- immutable raw output and append-only approval history
- incorrect-citation feedback
- reviewed Markdown export

Acceptance gate:

- AI output cannot approve itself.
- Raw and user-edited content remain distinct.
- Regeneration invalidates stale approval.
- Export distinguishes approved and unapproved content and preserves evidence references.

### Upgrade Phase 6: Evaluation, Accessibility, And Release Polish

Status: pending.

Primary skills: `ai-research-features`, `nextjs-fintech-ui`.

Support skills: `security-review-fintech`, `finance-product-guardrails`.

Deliverables:

- 30-50 evaluation cases across at least five source documents
- stored build/model/prompt/retrieval comparisons
- evaluation dashboard
- prompt-injection, isolation, and failure-mode tests
- end-to-end tests and CI gates
- WCAG 2.2 AA-focused pass
- API/worker deployment artifacts and updated portfolio case study

Acceptance gate:

- Structured output validates after repair or degrades explicitly.
- No cross-workspace retrieval occurs.
- Supported workflows contain no uncited material factual claims.
- Every consequential action requires approval.
- The upload-to-reviewed-export flow passes end to end.
- Known failure modes and production configuration are documented.

## AI Task Template
Use this template for future agent tasks.

```md
Task:
Phase:
Primary skill:
Support skill:
Files allowed:
Goal:
Non-goals:
Acceptance criteria:
Verification commands:
Security/AI/compliance checks:
```

## Dependency Rules
- Do not build billing before entitlements are defined.
- Do not build AI tools before ownership-safe Go API endpoints exist.
- Do not build RAG before research document schema exists.
- Do not polish screens before the golden path works.
- Do not create final marketing claims before product guardrails are reviewed.
- Do not deploy public demos before security and data privacy checks pass.
- Do not call the project portfolio-ready while any linked route still contains visible scaffold, skeleton, placeholder, or future-work copy.

## Done Definition For The Whole Project
The project is portfolio-ready when:
- the golden path works end to end,
- the UI is polished across mobile, laptop, and wide desktop,
- the Go API and Supabase data model support real user-owned finance data,
- real AI integration produces persisted, cited, schema-valid outputs,
- AI evals enforce safety boundaries,
- billing and usage limits work,
- security review has no known blocker,
- no linked route exposes visible scaffold, skeleton, placeholder, or future-work copy,
- stock media and logo assets are license-safe and documented,
- README/case study explain architecture and tradeoffs clearly.
