# Portfolio Case Study

## Summary

Aperture Financial Intelligence is a recruiter-grade fintech/wealthtech workspace for portfolio-aware research, cited AI briefs, goal scenario planning, and risk explanation. The product deliberately avoids brokerage, trade execution, personalized investment advice, and return promises.

Current state: the six-phase Evidence Workspace upgrade is complete locally. The golden path now runs from private document upload through processing, retrieval, structured cited analysis, human review, citation feedback, and reviewed export. The production build, Go service, 40-case evidence evaluation, security checks, accessibility contracts, deployment artifacts, and disposable-database E2E flow pass without paid AI calls.

## Product Boundary

The product helps users:

- Review portfolios, allocation, concentration, holdings, global asset monitors, watchlist pins, and provider freshness.
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
- Premium dark fintech UI with responsive shell, portfolio workspace, global asset monitors, research, goals, risk, watchlist actions, settings, and billing surfaces.
- Go API with health checks, structured errors, request IDs, Clerk/JWKS auth middleware, local dev auth mode, provider interfaces, portfolio/watchlist handlers, rate limits, and handler tests.
- OpenAPI 3.1 contract plus generated TypeScript client validation flow.
- Supabase migrations for core finance tables, deterministic demo assets, Phase 6 research/goal intelligence, and Phase 7 billing/security/observability.
- Owner-scoped AI tool registry around `getPortfolioSnapshot`.
- AI persistence adapter for threads, messages, tool runs, briefs, citations, model, usage, cost, and latency metadata when server-side Supabase credentials are configured.
- Eval scripts for schema validity, citation behavior, advice boundaries, ownership isolation, prompt injection, stale data disclosure, and goal-planner safety.
- Stripe and Clerk webhook handlers with signature verification and idempotency storage.
- Privacy-scrubbed observability helpers for PostHog and Sentry-compatible reporting.
- A versioned evidence regression baseline covering 40 cases and five source documents, with schema, citation, injection, advice-boundary, unsupported-claim, calculation, latency, and cost metrics.
- An authenticated evaluation dashboard that makes build, provider, model, workflow, prompt, schema, and retrieval versions visible alongside case outcomes.
- Human-governed research output: immutable raw analysis, append-only edit/decision history, stale-approval invalidation, incorrect-citation feedback, and reviewed Markdown export.
- Separate reproducible API and document-worker container targets, non-root runtime images, health probes, read-only filesystems, and Kubernetes deployment templates.

## Safety And Security

Security-sensitive choices:

- Service-role keys, provider keys, webhook secrets, and private prompts stay server-side.
- Every user-owned finance API path validates identity and ownership.
- AI tools call application-owned APIs, not unrestricted database connections.
- Retrieved-document prompt injection is screened before generation; hostile chunks are excluded and the run fails closed when no safe evidence remains.
- Prompt-injection, unsafe trading prompts, forged citations, stale approval, and cross-owner retrieval are covered by deterministic and integration tests.
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
cd apps/web && npm run test:phase6
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase7-security
scripts/verify-accessibility-contracts
scripts/verify-deployment-artifacts
scripts/verify-evidence-workspace-e2e
```

Phase 5 route verification can use `scripts/verify-phase5-live` when no other Next dev server is running. If a local Next dev server is already active, call `/api/ai/portfolio-brief` against that server and validate that `meta.mode` is `fixture`, `liveAiGatewayCall` is false, `liveExternalAiCall` is false, citations are present, and the disclaimer includes not-financial-advice language.

## Screenshots

Local screenshot captures are stored under `docs/screenshots/` when generated:

- `home-desktop.png`
- `workspace-desktop.png`
- `portfolio-desktop.png`
- `research-mobile.png`

These screenshots should not contain real user PII, real holdings, raw prompts, API keys, webhook secrets, or non-public financial data.

## Release Boundary

- Deploy Next.js and the containerized Go services with production domains, Cloudflare controls, managed secrets, and secure CORS by following `docs/DEPLOYMENT_RUNBOOK.md`.
- Configure real Stripe products/prices and run live webhook delivery tests.
- Configure Clerk production auth and organization flows.
- Apply Supabase migrations to the remote project and verify AI persistence with service-role credentials.
- Enable direct OpenAI only after paid model usage is explicitly approved.
- Source licensed marketing media and record final license evidence.

These are environment activations, not missing local product paths. The repository deliberately does not contain production secrets, claim a public deployment, or represent deterministic local generation as a live model call.
