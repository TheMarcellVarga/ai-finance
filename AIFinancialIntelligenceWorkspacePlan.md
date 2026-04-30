# AI Financial Intelligence Workspace Implementation Spec

## Summary
Build a greenfield recruiter-grade fintech product: a cinematic public SaaS site plus an authenticated AI financial research and portfolio decision-support workspace. The product must never present itself as an AI trading bot, automated advisor, broker, or return-guarantee system.

Core stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Clerk, Supabase Postgres, Go backend service, `pgx`/`sqlc`, Stripe Billing, Vercel, Cloudflare, Upstash Redis, Resend, PostHog, Sentry, Vercel AI SDK, `lightweight-charts`, and Recharts. Use US equities/ETFs for v1.

Backend decision: use Go for the dedicated finance/data backend. Keep Next.js as the web app, server-rendered product surface, authenticated BFF, AI streaming surface, and webhook entrypoint. Use Go for portfolio calculations, market-data ingestion, provider normalization, REST APIs, rate-limited finance endpoints, audit logging, and future background jobs. Python is optional later for notebooks, offline research, or specialized quant/ML experiments, but it should not be the primary backend for v1.

## Product Surfaces
- Marketing: `/`, `/product`, `/pricing`, `/security`, `/blog`, `/terms`, `/privacy`.
- App: `/app`, `/app/portfolio`, `/app/research`, `/app/goals`, `/app/watchlist`, `/app/risk`, `/app/settings`, `/app/billing`.
- Hero aesthetic: dark metal/glass, cinematic depth, subtle market-map visuals, dense dashboard previews, premium fintech tone. Responsive layouts for mobile, laptop, wide desktop.
- Main dashboard: portfolio value, allocation, volatility proxy, sector exposure, watchlist movers, saved AI briefs, goal progress, and risk warnings.
- AI research: prompt-based market questions, company/ETF research briefs, SEC filing summaries, watchlist summaries, and portfolio risk explanations with citations.
- Goals/gamification: user defines target amount, time horizon, contribution cadence, and risk preference; app generates milestones, challenges, achievements, streaks, and progress states.
- Pricing: Free, Pro, Research Pro, Team/Advisor. Stripe controls subscriptions and entitlements.

## Architecture
- Next.js Server Components for read-heavy pages; Client Components only for charts, forms, filters, and interactive panels.
- Next.js Route Handlers cover webhooks, AI streaming routes, and BFF endpoints that need tight Clerk/UI integration.
- Go service owns the core REST API under `/v1/*`: assets, portfolios, holdings, watchlists, market data, risk, goals, usage, and audit-backed mutations.
- Next.js calls the Go API from server code; browsers do not call the Go API directly unless routed through Cloudflare with strict Clerk JWT validation and CORS.
- Generate an OpenAPI spec from the Go API and use it to create a typed TypeScript client for the Next.js app.
- Lazy initialize Supabase, Redis, Resend, Stripe, Sentry, and AI clients to avoid build-time env failures.
- Clerk handles auth, session UX, user profile, MFA-ready account flows, and future organizations.
- Supabase stores application data only; no service-role key in browser code.
- Upstash Redis handles rate limits, API response cache, AI quota counters, and market-data lock keys.
- Cloudflare handles DNS, WAF, Turnstile for public forms, bot protection, and security headers.
- Deploy Next.js to Vercel. Deploy the Go API as a container service, preferably Google Cloud Run, Fly.io, or Railway for v1. Put it behind `api.<domain>` via Cloudflare.
- Pinecone is deferred. Use Supabase `pgvector` first for research/document embeddings; introduce Pinecone only if retrieval scale or latency demands it.

## Backend Service Shape
- Language/runtime: Go 1.23+.
- HTTP router: `chi` or standard `net/http` with structured middleware.
- Database: Supabase Postgres via `pgx`; use `sqlc` for type-safe SQL queries.
- Migrations: SQL migrations managed in repo and applied through Supabase CLI or a controlled migration command.
- API contract: OpenAPI 3.1 generated/maintained with request and response schemas.
- Auth: verify Clerk JWTs in Go middleware, map Clerk subject to internal `profiles.id`, and enforce ownership in every handler.
- Observability: structured JSON logs, request IDs, Sentry errors, latency metrics, and audit events for sensitive finance actions.
- Background jobs: start with cron-triggered Go endpoints for market-data refreshes; move to a worker process only when needed.
- Python boundary: use Python only for offline analytics, notebooks, model experiments, or batch scripts that do not sit on the main request path.

## Data Model
Use SQL migrations against Supabase Postgres. Go code accesses data through `pgx` and generated `sqlc` query methods.

Tables:
- `profiles`: Clerk user id, display name, role, onboarding state.
- `subscriptions`: Stripe customer id, subscription id, plan, status, period dates.
- `assets`: ticker, name, exchange, type, sector, industry, CIK, metadata.
- `price_snapshots`: asset id, date/time, open/high/low/close/volume, provider.
- `portfolios`: user id, name, base currency, visibility.
- `holdings`: portfolio id, asset id, quantity, average cost, notes.
- `transactions`: holding/portfolio id, buy/sell/deposit/withdrawal/dividend, date, amount.
- `watchlists` and `watchlist_items`.
- `research_documents`: asset id, source type, title, URL, fetched text, embedding status.
- `ai_briefs`: user id, asset/portfolio id, prompt, model, output JSON, citations, token cost.
- `goals`: user id, target amount, deadline, risk preference, contribution cadence, status.
- `goal_milestones`, `challenges`, `achievements`, `user_achievements`.
- `audit_logs`: user id, action, entity, IP hash, user agent hash.
- `usage_events`: user id, feature, count, billing period, metadata.

## API Interfaces
Expose versioned REST from the Go API under `/v1`. Next.js may proxy or wrap these under `/api/v1` where the UI needs same-origin access.

- `GET /v1/assets/search?q=`
- `GET /v1/assets/:ticker`
- `GET /v1/assets/:ticker/prices?range=`
- `GET/POST /v1/portfolios`
- `GET/PATCH/DELETE /v1/portfolios/:id`
- `POST /v1/portfolios/:id/holdings`
- `POST /v1/watchlists/:id/items`
- `POST /v1/research/brief`
- `POST /v1/goals`
- `POST /v1/goals/:id/generate-plan`
- `GET /v1/usage`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/clerk`

Go REST request/response payloads are defined in OpenAPI and validated server-side. The Next.js app uses generated TypeScript types plus Zod validation for UI forms. Every authenticated endpoint enforces ownership, plan entitlement, rate limits, and structured error responses.

## Data Providers
- SEC EDGAR: server-side filings, company facts, CIK/ticker mapping, filing links.
- Alpha Vantage: market data and indicators, cached aggressively because free usage is limited.
- Demo data: seeded curated tickers and static snapshots so the portfolio looks polished even when external APIs are unavailable.
- Provider layer: define `MarketDataProvider`, `FilingsProvider`, and `NewsProvider` interfaces so Finnhub/Twelve Data/FMP can be added later without rewriting app code.

## AI Behavior
- Use Vercel AI SDK for structured outputs and streaming assistant UX.
- AI outputs must include: summary, key risks, supporting data, citations, confidence label, and “not financial advice” notice.
- Never generate trade instructions like “buy now” or “sell immediately.” Use decision-support language: “watch,” “review,” “risk factor,” “scenario,” “tradeoff.”
- Store AI runs, citations, model, token usage, latency, and user-facing output.
- Guardrails: prompt-injection checks for fetched documents, max context limits, no hidden system prompt exposure, no personal financial advice framing.

## Security
- Clerk session validation on all app routes and APIs.
- Stripe webhook signature verification; Clerk webhook verification.
- Supabase RLS enabled as defense-in-depth for user-owned tables.
- Strict CSP, HSTS, secure cookies, CSRF-safe mutations, rate limiting, and server-only secrets.
- PostHog/Sentry scrub PII, holdings, financial amounts, prompts, and API keys.
- Audit log sensitive actions: login webhook sync, billing changes, portfolio mutations, AI research generation, export attempts.
- Add visible disclaimers on AI research, goals, projections, risk panels, and pricing pages.

## Build Phases
1. Scaffold Next.js app, design system, landing page, pricing, security page, footer/header, responsive shell.
2. Add Clerk auth, onboarding, protected app layout, Supabase setup, SQL migrations, seed data.
3. Scaffold the Go API service with health checks, Clerk JWT middleware, Postgres connection, OpenAPI, and CI test commands.
4. Build portfolio, watchlist, charts, asset search, cached market-data provider, SEC filings provider.
5. Add AI research briefs, goal planner, gamification, usage limits, and entitlement checks.
6. Add Stripe Billing, Resend emails, PostHog events, Sentry, Cloudflare security notes, docs.
7. Polish recruiter demo: seeded account, cinematic dashboard states, README architecture diagram, screenshots, test coverage report.

## Test Plan
- Unit: Zod schemas, Go finance calculations, goal planner, entitlement logic, provider normalization.
- Integration: Go REST APIs, `sqlc` queries, Supabase migrations, Stripe webhook lifecycle, Clerk webhook sync.
- Contract: OpenAPI schema validation and generated TypeScript client compatibility.
- AI fixtures: structured output validity, citation persistence, refusal of trading-bot prompts, prompt-injection samples.
- E2E: landing page, pricing, sign-up, onboarding, create portfolio, add holding, generate AI brief, create goal, upgrade billing.
- Visual/responsive: mobile, 13-inch laptop, 16-inch laptop, wide desktop, dark mode contrast, dashboard chart overflow.
- Security checks: dependency audit, secret scanning, auth bypass tests, rate-limit tests, webhook signature failure tests.

## Assumptions
- Optimize for recruiter portfolio signal over fastest launch.
- v1 supports US equities/ETFs only.
- Clerk is the auth choice; Stripe is billing source of truth.
- Supabase Postgres is preferred over Firebase because relational finance data is central.
- Go is the primary backend language for finance/data APIs. Next.js remains the frontend, BFF, AI UX, and webhook layer.
- Python is not part of the v1 request path unless a specific quant or ML need appears.
- Product is decision-support only, not brokerage, trade execution, or regulated investment advice.
- Current source checks: Supabase billing/docs, Clerk pricing, Stripe Billing, SEC EDGAR APIs, Alpha Vantage support/rate limits, Upstash pricing, Pinecone pricing, and local Vercel Next.js/AI SDK/shadcn guidance.
