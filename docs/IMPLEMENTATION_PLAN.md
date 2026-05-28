# Implementation Plan

`docs/MASTER_EXECUTION_ROADMAP.md` is the execution authority. This file is a shorter build-plan view for day-to-day orientation.

## Phase 0: Control Plane

Status: complete.

Artifacts:
- Agent rules
- Master roadmap
- AI integration setup
- backend decision
- repo-local skills
- placeholder scripts
- documentation map

Gate:
- Future agents can identify the source of truth and route work by phase and skill.

## Phase 1: Product And Brand Lock

Status: complete.

Primary skills:
- `finance-product-guardrails`
- `nextjs-fintech-ui`
- Taste Skill for frontend polish direction only

Work:
- Lock product name, positioning, pricing limits, MVP golden path, demo asset universe, and brand/media direction.
- Avoid app code until the Phase 1 gate is satisfied.

Gate:
- Product, pricing, demo flow, and brand direction are exact enough for implementation.

## Phase 2: App Scaffold And Design System

Status: complete.

Work:
- Create `apps/web`.
- Configure Next.js App Router, TypeScript, Tailwind, shadcn/ui, linting, and formatting.
- Build marketing routes, protected app shell skeletons, global theme tokens, responsive nav, and placeholder brand assets.

Gate:
- Landing, product, pricing, security, and app shell render responsively.

## Phase 3: Backend And Data Foundation

Status: complete.

Work:
- Create `services/api`.
- Add Go health endpoint, middleware shape, OpenAPI contract, Supabase migrations, `pgx`, `sqlc`, and provider interfaces.

Gate:
- API starts locally, migrations validate, and authenticated request path is defined.

## Phase 4: Portfolio Workspace MVP

Status: complete.

Work:
- Build onboarding, portfolio CRUD, holdings, transactions, watchlist, asset search, summary cards, allocation charts, and real provider market data.

Artifacts:
- Go API portfolio CRUD, holdings, transactions, watchlists, owner isolation, and real provider market-data metadata.
- OpenAPI and generated TypeScript client coverage for portfolio and watchlist flows.
- Portfolio workspace UI with provider-backed portfolio creation, summary cards, holdings table, transaction ledger, allocation bars, watchlist, and freshness disclosure.

Gate:
- User can complete the golden path through portfolio creation and cannot access another user's portfolio.

## Phase 5: Real AI Foundation

Status: implementation complete; fixture mode is the active working path and live credential verification is deferred.

Work:
- Add AI SDK streaming route, tool registry, AI persistence, usage tracking, portfolio snapshot tool, structured portfolio brief schema, citations, eval fixtures, and disabled-by-default live provider configuration.

Artifacts:
- AI SDK portfolio brief route at `/api/ai/portfolio-brief`.
- Structured portfolio brief schema, safety precheck, and refusal output.
- Owner-scoped `getPortfolioSnapshot` AI tool wrapper around the finance API.
- Supabase REST persistence adapter for AI threads, messages, tool runs, briefs, citations, usage events, model, token usage, and latency.
- Deterministic AI eval and safety fixture scripts.

Gate:
- The no-Gateway verifier passes with an owner-scoped finance API snapshot, schema-valid output, citations, safety metadata, and explicit no-model-call disclosure.

Deferred:
- Add a separate opt-in live-provider verifier if the project later chooses to validate AI Gateway or another paid model provider.
- Verify Supabase persistence with server-side Supabase credentials.

## Phase 6: Research And Goal Intelligence
Status: complete in deterministic fixture mode; live SEC ingestion and model-backed generation remain follow-on hardening work.

Work:
- Add SEC filing ingestion, `pgvector` retrieval, filing summaries, watchlist digest, goal planner, risk explainer, and safe achievements.

Gate:
- Filing and goal outputs cite sources or assumptions and avoid return promises.

## Phase 7: Billing, Security, And Observability
Status: complete in local/server-enforced mode; live webhook delivery requires configured Stripe, Clerk, and Supabase secrets.

Work:
- Add Stripe products, entitlements, usage limits, webhook verification, Sentry, PostHog privacy rules, audit logs, and rate limits.
- Completed with entitlement catalog, billing dashboard, AI usage gates, signed Stripe/Clerk webhooks, webhook idempotency migration, privacy-scrubbed observability helpers, audit logging, and Go API local Free-plan limits.

Gate:
- Entitlements are server-enforced and sensitive data is scrubbed from analytics/errors.

## Phase 8: Polish And Portfolio Case Study
Status: complete in local portfolio-case-study mode; public deployment remains environment-dependent. This phase is not enough for portfolio readiness until Phase 9 removes unfinished visible surfaces.

Work:
- Final brand assets, licensed media notes, mobile polish, screenshots, demo video script, architecture diagram, README, API docs, and deployed demo.

Gate:
- The project is credible in screenshots and works end to end on mobile and desktop.

Artifacts:
- Updated README with current phase status, architecture diagram, demo path, and case-study link.
- Brand/media notes in `docs/BRAND_AND_MEDIA.md`.
- Portfolio case study in `docs/PORTFOLIO_CASE_STUDY.md`.
- Demo walkthrough script in `docs/DEMO_WALKTHROUGH.md`.
- Phase 8 API documentation notes in `docs/API_SPEC.md`.
- Local screenshot capture set in `docs/screenshots/` when generated from the dev server.

## Phase 9: Completion And No-Placeholder Pass
Status: queued; required before portfolio-ready review.

Work:
- Finish, replace, or remove every linked route that still looks reserved, static-only, fixture-only, or incomplete.
- Build working watchlist and settings experiences.
- Turn blog/privacy/terms into real content or remove them from navigation until complete.
- Connect research, goals, and risk pages to route-backed interactions instead of static deterministic-only displays.
- Add or hide billing checkout/customer-portal affordances based on configured Stripe state.
- Remove user-facing "skeleton", "scaffold", "placeholder", "future work", "coming soon", "not implemented", "todo", and "deferred" wording.

Gate:
- No linked route looks unfinished in desktop or mobile screenshots.
- Navigation only points to finished routes.
- The unfinished surfaces audit in `docs/UNFINISHED_SURFACES_AUDIT.md` is fully resolved.
- Lint, build, Go tests, AI evals, safety fixtures, and Phase 7 security checks pass.

## Task Template

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
