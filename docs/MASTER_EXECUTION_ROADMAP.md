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
| 5. Real AI Foundation | 5-8 days | AI Gateway, streaming route, tool registry, AI persistence, first evals, portfolio brief. |
| 6. Research And Goal Intelligence | 5-8 days | Filing summaries, RAG chunks, goal planner, risk explainer, safe gamification. |
| 7. Billing, Security, And Observability | 4-7 days | Stripe plans, entitlements, usage limits, Sentry, PostHog, audit logs, security checks. |
| 8. Polish And Portfolio Case Study | 5-10 days | Brand assets, stock media, mobile pass, screenshots, README, architecture diagram, demo video. |

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
Status: implementation complete; live credential verification cost-deferred.

Primary skills: `ai-research-features`, `security-review-fintech`.

Deliverables:
- Vercel AI Gateway configuration
- streaming AI route
- AI thread/message persistence
- tool registry wrapper layer
- `getPortfolioSnapshot` tool
- structured portfolio brief schema
- citations/data freshness fields
- usage tracking and quota counters
- first AI eval fixture set

Completed artifacts:
- `apps/web/src/app/api/ai/portfolio-brief/route.ts` uses Vercel AI SDK structured output through AI Gateway with a configurable `AI_GATEWAY_MODEL`, plus an optional streaming mode for the portfolio brief route.
- Local development can use deterministic fixture mode for `/api/ai/portfolio-brief` when AI Gateway credentials are absent, returning a schema-valid, cited brief from the owner-scoped portfolio snapshot without model spend. This mode is a temporary workflow unblocker and does not satisfy the live AI acceptance gate.
- `apps/web/src/lib/ai/portfolio-brief.ts` defines the portfolio brief schema, citations/freshness contract, prompt builder, and advice-boundary safety precheck.
- `apps/web/src/lib/ai/tool-registry.ts` and `portfolio-tools.ts` provide an owner-scoped `getPortfolioSnapshot` AI tool wrapper that calls the application finance API instead of raw database access.
- `apps/web/src/lib/ai/persistence.ts` persists AI threads, messages, tool runs, briefs, citations, usage events, latency, model, and token usage when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured server-side.
- `scripts/run-ai-evals` and `scripts/check-ai-safety-fixtures` now run deterministic schema, citation/freshness, advice-boundary, ownership-isolation, prompt-injection, and safety fixture checks.
- `scripts/verify-phase5-live` runs the credential-dependent acceptance gate: live AI Gateway call, owner-scoped portfolio snapshot, schema/citation checks, and Supabase persistence IDs for thread, messages, tool run, brief, citations, and usage.

Pending live verification:
- TODO: Add `VERCEL_AI_GATEWAY_API_KEY` or Vercel-managed AI Gateway credentials before final demo verification.
- TODO: Optionally set `AI_GATEWAY_MODEL` to the intended final demo model; otherwise the route defaults to the low-cost `amazon/nova-micro`.
- TODO: Point Next.js at the finance API with `FINANCE_API_BASE_URL` and, for local dev auth, `FINANCE_API_DEV_TOKEN`.
- TODO: Apply Supabase migrations to the configured remote project so `public.profiles` and AI persistence tables exist.
- Run `scripts/verify-phase5-live` with AI Gateway credentials and a configured finance API to prove the demo includes a real model call.
- Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then verify AI thread, messages, tool run, brief, citation metadata, and usage rows are persisted.

Temporary Phase 6 unblock:
- Phase 6 implementation may proceed behind deterministic AI fixture mode to avoid early model spend, provided all AI-facing UI and docs continue to label fixture output as non-live.
- Before Phase 8 recruiter-demo polish, Phase 5 must be re-opened and the full live acceptance gate must pass with a real model call and persisted rows.

Acceptance gate:
- Demo includes at least one real model call.
- Portfolio brief is schema-valid and persisted.
- AI cannot access another user's portfolio.
- AI refuses trading-bot and direct buy/sell prompts.
- Eval runner catches at least schema and advice-boundary failures.

## Phase 6: Research And Goal Intelligence
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

Acceptance gate:
- Filing summary includes valid source references.
- Goal planner avoids guaranteed-return and risky-profit framing.
- Risk explainer discloses assumptions and data freshness.
- Prompt-injection fixture cannot override assistant rules.

## Phase 7: Billing, Security, And Observability
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

Acceptance gate:
- Entitlements are enforced server-side.
- Webhooks verify signatures.
- Sensitive data is not sent to analytics/errors by default.
- Past-due/canceled subscription states behave predictably.
- Security review has no known blocker.

## Phase 8: Polish And Portfolio Case Study
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

Acceptance gate:
- App looks credible in screenshots before the user clicks.
- Golden path works on mobile and desktop.
- AI demo is real, cited, and safe.
- README explains architecture, AI, security, and tradeoffs clearly.
- The project can be shown to fintech/AI product engineering recruiters.

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

## Done Definition For The Whole Project
The project is portfolio-ready when:
- the golden path works end to end,
- the UI is polished across mobile, laptop, and wide desktop,
- the Go API and Supabase data model support real user-owned finance data,
- real AI integration produces persisted, cited, schema-valid outputs,
- AI evals enforce safety boundaries,
- billing and usage limits work,
- security review has no known blocker,
- stock media and logo assets are license-safe and documented,
- README/case study explain architecture and tradeoffs clearly.
