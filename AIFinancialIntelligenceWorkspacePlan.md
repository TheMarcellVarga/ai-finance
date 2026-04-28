# AI Financial Intelligence Workspace Implementation Spec

## Summary
Build a greenfield recruiter-grade fintech product: a cinematic public SaaS site plus an authenticated AI financial research and portfolio decision-support workspace. The product must never present itself as an AI trading bot, automated advisor, broker, or return-guarantee system.

Core stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Clerk, Supabase Postgres, Drizzle ORM, Stripe Billing, Vercel, Cloudflare, Upstash Redis, Resend, PostHog, Sentry, Vercel AI SDK, `lightweight-charts`, and Recharts. Use US equities/ETFs for v1.

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
- Route Handlers for REST APIs and webhooks; Server Actions for authenticated form mutations.
- Lazy initialize Supabase, Drizzle, Redis, Resend, Stripe, Sentry, and AI clients to avoid build-time env failures.
- Clerk handles auth, session UX, user profile, MFA-ready account flows, and future organizations.
- Supabase stores application data only; no service-role key in browser code.
- Upstash Redis handles rate limits, API response cache, AI quota counters, and market-data lock keys.
- Cloudflare handles DNS, WAF, Turnstile for public forms, bot protection, and security headers.
- Pinecone is deferred. Use Supabase `pgvector` first for research/document embeddings; introduce Pinecone only if retrieval scale or latency demands it.

## Data Model
Use Drizzle migrations against Supabase Postgres.

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
Expose versioned REST under `/api/v1`.

- `GET /api/v1/assets/search?q=`
- `GET /api/v1/assets/:ticker`
- `GET /api/v1/assets/:ticker/prices?range=`
- `GET/POST /api/v1/portfolios`
- `GET/PATCH/DELETE /api/v1/portfolios/:id`
- `POST /api/v1/portfolios/:id/holdings`
- `POST /api/v1/watchlists/:id/items`
- `POST /api/v1/research/brief`
- `POST /api/v1/goals`
- `POST /api/v1/goals/:id/generate-plan`
- `GET /api/v1/usage`
- `POST /api/webhooks/stripe`
- `POST /api/webhooks/clerk`

All request/response payloads use Zod schemas. Every authenticated endpoint enforces ownership, plan entitlement, rate limits, and structured error responses.

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
2. Add Clerk auth, onboarding, protected app layout, Supabase/Drizzle setup, migrations, seed data.
3. Build portfolio, watchlist, charts, asset search, cached market-data provider, SEC filings provider.
4. Add AI research briefs, goal planner, gamification, usage limits, and entitlement checks.
5. Add Stripe Billing, Resend emails, PostHog events, Sentry, Cloudflare security notes, docs.
6. Polish recruiter demo: seeded account, cinematic dashboard states, README architecture diagram, screenshots, test coverage report.

## Test Plan
- Unit: Zod schemas, finance calculations, goal planner, entitlement logic, provider normalization.
- Integration: REST APIs, Drizzle queries, Supabase migrations, Stripe webhook lifecycle, Clerk webhook sync.
- AI fixtures: structured output validity, citation persistence, refusal of trading-bot prompts, prompt-injection samples.
- E2E: landing page, pricing, sign-up, onboarding, create portfolio, add holding, generate AI brief, create goal, upgrade billing.
- Visual/responsive: mobile, 13-inch laptop, 16-inch laptop, wide desktop, dark mode contrast, dashboard chart overflow.
- Security checks: dependency audit, secret scanning, auth bypass tests, rate-limit tests, webhook signature failure tests.

## Assumptions
- Optimize for recruiter portfolio signal over fastest launch.
- v1 supports US equities/ETFs only.
- Clerk is the auth choice; Stripe is billing source of truth.
- Supabase Postgres is preferred over Firebase because relational finance data is central.
- Product is decision-support only, not brokerage, trade execution, or regulated investment advice.
- Current source checks: Supabase billing/docs, Clerk pricing, Stripe Billing, SEC EDGAR APIs, Alpha Vantage support/rate limits, Upstash pricing, Pinecone pricing, and local Vercel Next.js/AI SDK/shadcn guidance.
