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

Status: drafted.

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

Status: in progress.

Work:
- Create `apps/web`.
- Configure Next.js App Router, TypeScript, Tailwind, shadcn/ui, linting, and formatting.
- Build marketing routes, protected app shell skeletons, global theme tokens, responsive nav, and placeholder brand assets.

Gate:
- Landing, product, pricing, security, and app shell render responsively.

## Phase 3: Backend And Data Foundation

Work:
- Create `services/api`.
- Add Go health endpoint, middleware shape, OpenAPI contract, Supabase migrations, `pgx`, `sqlc`, seed data, and provider interfaces.

Gate:
- API starts locally, migrations validate, and authenticated request path is defined.

## Phase 4: Portfolio Workspace MVP

Work:
- Build onboarding, portfolio CRUD, holdings, transactions, watchlist, asset search, summary cards, allocation charts, and cached market data.

Gate:
- User can complete the golden path through portfolio creation and cannot access another user's portfolio.

## Phase 5: Real AI Foundation

Work:
- Add Vercel AI Gateway, streaming route, tool registry, AI persistence, usage tracking, portfolio snapshot tool, structured portfolio brief schema, citations, and eval fixtures.

Gate:
- At least one real model call is persisted, schema-valid, cited where possible, and advice-boundary safe.

## Phase 6: Research And Goal Intelligence

Work:
- Add SEC filing ingestion, `pgvector` retrieval, filing summaries, watchlist digest, goal planner, risk explainer, and safe achievements.

Gate:
- Filing and goal outputs cite sources or assumptions and avoid return promises.

## Phase 7: Billing, Security, And Observability

Work:
- Add Stripe products, entitlements, usage limits, webhook verification, Sentry, PostHog privacy rules, audit logs, and rate limits.

Gate:
- Entitlements are server-enforced and sensitive data is scrubbed from analytics/errors.

## Phase 8: Polish And Portfolio Case Study

Work:
- Final brand assets, licensed media notes, mobile polish, screenshots, demo video script, architecture diagram, README, API docs, and deployed demo.

Gate:
- The project is credible in screenshots and works end to end on mobile and desktop.

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
