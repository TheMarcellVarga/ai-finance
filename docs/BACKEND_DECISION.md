# Backend Decision: Go for the Finance API

## Decision
Use Go for the dedicated backend service. Keep Next.js as the frontend, server-rendered product surface, authenticated BFF, AI streaming layer, and webhook surface.

This gives the project stronger backend engineering signal without overcomplicating the user-facing app. The system should read as a serious financial data product, not a single-page demo with some API routes attached.

## Why Go Fits
- Finance APIs benefit from predictable performance, simple deployment, strong concurrency, and clear service boundaries.
- Market-data ingestion, provider normalization, portfolio calculations, rate limits, and audit logging are good Go workloads.
- Go is credible for banking tech, fintech infrastructure, data APIs, and backend-heavy product roles.
- A Go service makes it easier to demonstrate production habits: OpenAPI, typed SQL, middleware, structured logging, health checks, and contract tests.

## Why Not Python as the Main Backend
Python is excellent for research, quant notebooks, data science, model experiments, and batch analytics. It is less ideal as the primary web API for this project because the recruiter signal should emphasize reliable product engineering, typed API contracts, secure auth, and operational simplicity.

Python can still be added later for:
- Offline portfolio analytics.
- Research notebooks.
- Backtesting experiments that are explicitly not trading-bot features.
- ML feature exploration.
- Batch enrichment scripts.

## Final Architecture
- `apps/web`: Next.js App Router app on Vercel.
- `services/api`: Go REST API service.
- `supabase`: SQL migrations and local Supabase configuration.
- `packages/contracts`: OpenAPI schema and generated TypeScript client if the repo becomes a monorepo.

Request flow:
1. User signs in with Clerk in the Next.js app.
2. Next.js server code sends Clerk-authenticated requests to the Go API.
3. Go middleware validates Clerk JWTs, maps users to internal profiles, checks entitlements, and enforces ownership.
4. Go reads/writes Supabase Postgres through `pgx` and `sqlc`.
5. Redis handles rate limits, provider cache, AI quota counters, and idempotency keys.

## Go Service Responsibilities
- Assets and ticker search.
- Portfolio, holdings, transactions, watchlists.
- Market-data provider abstraction.
- SEC EDGAR ingestion and normalized filing metadata.
- Risk calculations and portfolio summaries.
- Goal progress state and achievement events.
- Usage counters and entitlement enforcement.
- Audit logs for sensitive finance actions.

## Next.js Responsibilities
- Cinematic marketing site.
- Authenticated dashboard UI.
- AI chat/research streaming UX.
- Stripe and Clerk webhooks.
- Resend-triggering user workflows.
- Server-side BFF routes where same-origin browser access is useful.

## Recommended Go Stack
- Go 1.23+.
- `net/http` or `chi` for routing.
- `pgx` for Postgres.
- `sqlc` for type-safe SQL.
- `goose` or Supabase CLI SQL migrations.
- `oapi-codegen` for OpenAPI-driven handlers and client types.
- `zerolog` or `slog` for structured logs.
- Sentry Go SDK for errors.
- Testcontainers only if local integration tests need disposable Postgres; otherwise use Supabase local.

## Deployment
- Next.js: Vercel.
- Go API: Cloud Run, Fly.io, or Railway for v1.
- Edge/security: Cloudflare routes `www.<domain>` to Vercel and `api.<domain>` to the Go service.
- Database: Supabase Postgres.
- Cache/rate limits: Upstash Redis.

## Non-Goals
- Do not build an AI trading bot.
- Do not connect to brokerage order execution in v1.
- Do not generate buy/sell commands or guaranteed-return claims.
- Do not put Python in the critical request path unless there is a specific quant/ML requirement.
