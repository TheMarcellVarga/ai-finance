# AI Financial Intelligence Workspace Plan

## Summary
Build a greenfield fintech/wealthtech product: a cinematic public site plus an authenticated AI research and portfolio decision-support workspace. It will target retail investors, analysts, advisors, small funds, and finance creators, without positioning itself as an AI trading bot or trade execution system.

Recommended stack: Next.js App Router, TypeScript, React, Tailwind/shadcn-style UI, Supabase Postgres, Clerk auth, Stripe Billing, Vercel hosting, Cloudflare DNS/WAF/Turnstile, Upstash Redis, PostHog, Sentry, Resend. Use Pinecone only in a later phase if Supabase `pgvector` is not enough for document/research retrieval.

## Key Changes
- Create a responsive marketing site with header, footer, pricing, cinematic metal/glass hero, scrollable product story, and compliance-safe messaging: “AI research and portfolio decision-support,” not automated trading.
- Build an authenticated dashboard with portfolio overview, holdings, watchlists, market summaries, risk panels, AI research briefings, financial goal setting, challenges, and achievement progress.
- Use US equities/ETFs for v1. Data sources: SEC EDGAR APIs for filings/fundamentals, Alpha Vantage for market data with aggressive caching because its free tier is limited, and internal mock/demo datasets for polished demos when rate limits are hit.
- Backend: Next.js route handlers exposing versioned REST APIs under `/api/v1/*`, backed by Supabase Postgres and server-only DB access. No Supabase service key in the browser.
- Relational schema: users, portfolios, holdings, transactions, watchlists, assets, price snapshots, goals, challenges, achievements, AI runs, research documents, subscriptions, audit logs, and API usage counters.
- Auth: Clerk for polished user/session/org UX, MFA-ready flows, and future advisor/team accounts. Stripe remains the billing source of truth.
- AI: Vercel AI SDK with provider/model configured by env var, structured output for summaries and goal plans, prompt-injection guardrails, source citation storage, and clear “not financial advice” boundaries.
- Monetization:
  - Free: 1 portfolio, small watchlist, limited AI briefs.
  - Pro: individual portfolio intelligence and goals.
  - Research Pro: deeper AI summaries, document analysis, saved research rooms.
  - Team/Advisor: shared workspaces, advisor notes, client-style portfolios, exports.
- Infrastructure:
  - Vercel for app/API deployment.
  - Supabase for Postgres, storage, migrations, and optional vector search.
  - Upstash Redis for API rate limiting, cache locks, and background job coordination.
  - Resend for onboarding, billing, goal milestones, and alerts.
  - PostHog for product analytics.
  - Sentry for errors and performance.
  - Cloudflare for DNS, WAF rules, bot protection, and Turnstile on sensitive public forms.

## Security And Compliance
- Treat the product as financial decision-support only: no brokerage connection, order placement, copy-trading, or promised returns in v1.
- Add explicit disclaimers near AI outputs, goal projections, portfolio risk, and pricing pages.
- Validate all API input with Zod, enforce per-user authorization on every server action/route, rate-limit AI and market-data endpoints, and log sensitive actions.
- Enable strict headers: CSP, HSTS, frame protections, secure cookies, CSRF-safe mutation patterns, webhook signature verification, and environment secret separation.
- Use Supabase RLS as defense-in-depth, but route application DB access through trusted server code.
- Scrub PII and financial holdings from analytics/error payloads by default.

## Test Plan
- Unit tests: finance calculations, goal planning logic, risk scoring, API validation, entitlement checks.
- Integration tests: REST APIs with test database, Clerk-authenticated request simulation, Stripe webhook handling, market-data cache fallback.
- AI tests: structured output parsing, refusal/safety behavior, citation/source persistence, prompt-injection fixtures.
- E2E tests with Playwright: landing page, pricing, sign-up, onboarding, portfolio creation, watchlist, AI brief generation, goal challenge flow, billing upgrade/downgrade.
- Visual/responsive checks: mobile, small laptop, large desktop, dashboard density, hero section, pricing, and glass/metal theme readability.

## Assumptions
- This is a new greenfield app; the current workspace is empty and not a git repo.
- v1 uses US equities/ETFs only.
- Clerk is selected for auth; Stripe is selected for subscriptions.
- Firebase is not needed because Supabase Postgres is a better fit for relational finance data.
- Sources checked for planning: [Supabase billing docs](https://supabase.com/docs/guides/platform/org-based-billing), [Clerk pricing](https://clerk.com/pricing), [Stripe Billing](https://stripe.com/billing/pricing), [SEC EDGAR APIs](https://www.sec.gov/edgar/sec-api-documentation), [Alpha Vantage support/rate limits](https://www.alphavantage.co/support/), [Upstash Redis pricing](https://upstash.com/docs/redis/overall/pricing), and [Pinecone pricing](https://www.pinecone.io/pricing/).
