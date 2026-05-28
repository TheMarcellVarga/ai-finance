# Portfolio Case Study

## Summary

Aperture Financial Intelligence is a recruiter-grade fintech/wealthtech workspace for portfolio-aware research, cited AI briefs, goal scenario planning, and risk explanation. The product deliberately avoids brokerage, trade execution, personalized investment advice, and return promises.

Current state: the local Phase 9 completion pass is complete. Linked public and app routes now present finished portfolio-demo surfaces, the app builds, the Go API tests pass, deterministic AI evals pass, billing/security verification passes, and screenshots can be captured from the local dev server.

## Product Boundary

The product helps users:

- Review portfolios, allocation, concentration, holdings, watchlists, and provider freshness.
- Generate structured research and risk explanations with citations, assumptions, and safety labels.
- Compare educational goal scenarios without promising outcomes.
- Track usage limits and billing entitlements.

The product does not:

- Place trades.
- Connect to brokerage execution.
- Tell users to buy, sell, or hold.
- Promise suitability, alpha, or guaranteed returns.
- Let AI tools access raw database credentials or another user's data.

## Architecture Tradeoffs

Next.js owns product rendering, authenticated app routes, same-origin route handlers, AI UX, and webhooks. Go owns finance/data APIs, portfolio calculations, market-data normalization, ownership enforcement, rate limits, and audit-backed backend behavior.

Supabase Postgres is the system of record. SQL migrations define user-owned tables, billing/usage metadata, AI persistence, audit logs, and deterministic research chunks. `pgvector` remains the v1 retrieval direction for research documents.

The AI layer uses Vercel AI SDK contracts with deterministic fixture mode enabled by default. Direct OpenAI is wired as a dormant provider path, but external model calls require explicit opt-in through environment variables.

## Implementation Highlights

- Next.js App Router marketing routes and authenticated workspace routes.
- Premium dark fintech UI with responsive shell, portfolio workspace, research, goals, risk, watchlist, settings, and billing surfaces.
- Go API with health checks, structured errors, request IDs, Clerk/JWKS auth middleware, local dev auth mode, provider interfaces, portfolio/watchlist handlers, rate limits, and handler tests.
- OpenAPI 3.1 contract plus generated TypeScript client validation flow.
- Supabase migrations for core finance tables, deterministic demo assets, Phase 6 research/goal intelligence, and Phase 7 billing/security/observability.
- Owner-scoped AI tool registry around `getPortfolioSnapshot`.
- AI persistence adapter for threads, messages, tool runs, briefs, citations, model, usage, cost, and latency metadata when server-side Supabase credentials are configured.
- Eval scripts for schema validity, citation behavior, advice boundaries, ownership isolation, prompt injection, stale data disclosure, and goal-planner safety.
- Stripe and Clerk webhook handlers with signature verification and idempotency storage.
- Privacy-scrubbed observability helpers for PostHog and Sentry-compatible reporting.

## Safety And Security

Security-sensitive choices:

- Service-role keys, provider keys, webhook secrets, and private prompts stay server-side.
- Every user-owned finance API path validates identity and ownership.
- AI tools call application-owned APIs, not unrestricted database connections.
- Prompt-injection and unsafe trading prompts are covered by deterministic fixtures.
- Analytics and error helpers scrub PII, holdings, financial amounts, raw prompts, AI outputs, and secrets by default.
- Webhook events are idempotent and signature-verified.
- Local rate-limit fallback exists for development; Upstash should be configured in production.

## Verification Snapshot

Run these from the repo root unless noted:

```bash
cd services/api && go test ./...
scripts/validate-supabase-migrations
scripts/generate-openapi-client
cd apps/web && npm run lint && npm run build
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase7-security
```

Phase 5 route verification can use `scripts/verify-phase5-live` when no other Next dev server is running. If a local Next dev server is already active, call `/api/ai/portfolio-brief` against that server and validate that `meta.mode` is `fixture`, `liveAiGatewayCall` is false, `liveExternalAiCall` is false, citations are present, and the disclaimer includes not-financial-advice language.

## Screenshots

Local screenshot captures are stored under `docs/screenshots/` when generated:

- `home-desktop.png`
- `workspace-desktop.png`
- `portfolio-desktop.png`
- `research-mobile.png`

These screenshots should not contain real user PII, real holdings, raw prompts, API keys, webhook secrets, or non-public financial data.

## Follow-On Hardening

- Deploy Next.js and Go API with production domains, Cloudflare controls, and secure CORS.
- Configure real Stripe products/prices and run live webhook delivery tests.
- Configure Clerk production auth and organization flows.
- Apply Supabase migrations to the remote project and verify AI persistence with service-role credentials.
- Replace deterministic SEC-style chunks with live EDGAR ingestion, chunking, embeddings, and retrieval.
- Enable direct OpenAI only after paid model usage is explicitly approved.
- Source licensed marketing media and record final license evidence.
