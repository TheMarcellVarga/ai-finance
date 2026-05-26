# AI Financial Intelligence Workspace

Recruiter-grade fintech/wealthtech product build for an AI financial research and portfolio decision-support workspace.

This project is not a trading bot, brokerage product, robo-advisor, return-prediction engine, or personalized investment advice system. The product helps users research assets, understand portfolio risk, compare scenarios, review goals, and save cited AI-assisted briefs.

## Current Status

Roadmap phase: Phase 5, Real AI Foundation, implementation complete with live credential verification pending.

Phase 0 control-plane assets, Phase 1 product/brand direction, Phase 2 app scaffold/design system, Phase 3 backend/data foundation, Phase 4 portfolio workspace MVP, and Phase 5 real AI foundation are in place:
- [Agent instructions](AGENTS.md)
- [Master execution roadmap](docs/MASTER_EXECUTION_ROADMAP.md)
- [AI integration and development setup](docs/AI_INTEGRATION_AND_DEV_SETUP.md)
- [Backend decision](docs/BACKEND_DECISION.md)
- [Repo-local AI skills](ai-dev/skills)
- Go API scaffold in [services/api](services/api)
- OpenAPI contract and generated TypeScript client in [packages/contracts](packages/contracts)
- Supabase migrations in [supabase/migrations](supabase/migrations)
- Deterministic workflow scripts in [scripts](scripts)
- Owner-scoped portfolio/watchlist API flows with real provider market-data metadata
- Portfolio workspace UI with provider-backed portfolio creation, holdings, transactions, allocation review, and decision-support disclaimers
- AI SDK portfolio brief route with AI Gateway model configuration, owner-scoped `getPortfolioSnapshot` tool wrapper, structured output schema, citations/freshness contract, Supabase persistence path, usage tracking, and deterministic AI eval/safety scripts

Remaining Phase 5 verification:
- Run a real AI Gateway portfolio brief request.
- Confirm Supabase persistence rows for the AI thread, messages, tool run, brief, citations, and usage event.

## Product Direction

Working name: Aperture Financial Intelligence.

The product is a premium AI finance workspace for portfolio-aware research, SEC filing summaries, watchlist monitoring, goal scenario planning, and risk explanation. AI outputs must include data freshness, assumptions, citations when available, and a not-financial-advice boundary.

## Planned Stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Clerk for auth
- Supabase Postgres, SQL migrations, `pgvector`
- Go service for finance/data APIs, `pgx`, `sqlc`, OpenAPI
- Vercel AI SDK and Vercel AI Gateway
- Stripe Billing
- Upstash Redis
- Resend
- PostHog and Sentry
- Vercel for Next.js, Cloudflare at the edge, container hosting for Go API

## Source Of Truth

Read these before implementation:
1. [Master execution roadmap](docs/MASTER_EXECUTION_ROADMAP.md)
2. [Implementation spec](AIFinancialIntelligenceWorkspacePlan.md)
3. [AI integration setup](docs/AI_INTEGRATION_AND_DEV_SETUP.md)
4. [Backend decision](docs/BACKEND_DECISION.md)
5. [Markdown docs plan](AIProjectMarkdownDocsPlan.md)

## Documentation Map

- [Product spec](docs/PRODUCT_SPEC.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [API spec](docs/API_SPEC.md)
- [AI features](docs/AI_FEATURES.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Security and compliance](docs/SECURITY_AND_COMPLIANCE.md)
- [Testing strategy](docs/TESTING_STRATEGY.md)
- [Environment](docs/ENVIRONMENT.md)

## Workflow Scripts

```bash
scripts/dev-local
scripts/generate-openapi-client
scripts/validate-supabase-migrations
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase5-live
```

## Local Development

Use the combined local runner for portfolio and AI work. It starts the Go finance API with `services/api/.env`, waits for `/v1/health`, then starts or reuses the Next.js dev server.

```bash
scripts/dev-local
```

Manual web-only startup is still available for static marketing routes that do not need finance data.

```bash
cd apps/web
npm run dev
```

The Phase 5 portfolio brief route lives in `apps/web` and calls the Go API for owner-scoped portfolio context.

```bash
scripts/dev-local
curl -X POST http://127.0.0.1:3000/api/ai/portfolio-brief \
  -H "Authorization: Bearer dev:user_demo" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Summarize concentration risk and data freshness as research."}'
```

To close the Phase 5 live gate, configure `VERCEL_AI_GATEWAY_API_KEY` or
`AI_GATEWAY_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, then run:

```bash
scripts/verify-phase5-live
```
