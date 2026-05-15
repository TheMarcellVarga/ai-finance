# AI Financial Intelligence Workspace

Recruiter-grade fintech/wealthtech product build for an AI financial research and portfolio decision-support workspace.

This project is not a trading bot, brokerage product, robo-advisor, return-prediction engine, or personalized investment advice system. The product helps users research assets, understand portfolio risk, compare scenarios, review goals, and save cited AI-assisted briefs.

## Current Status

Roadmap phase: Phase 2, App Scaffold And Design System.

Phase 0 control-plane assets are in place, and Phase 1 product/brand direction is drafted in [Product spec](docs/PRODUCT_SPEC.md):
- [Agent instructions](AGENTS.md)
- [Master execution roadmap](docs/MASTER_EXECUTION_ROADMAP.md)
- [AI integration and development setup](docs/AI_INTEGRATION_AND_DEV_SETUP.md)
- [Backend decision](docs/BACKEND_DECISION.md)
- [Repo-local AI skills](ai-dev/skills)
- Placeholder workflow scripts in [scripts](scripts)

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

## Placeholder Scripts

These scripts intentionally return success until the app, API, and database scaffolds exist:

```bash
scripts/generate-openapi-client
scripts/validate-supabase-migrations
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
```

## Local Development

The initial Next.js scaffold lives in `apps/web`.

```bash
cd apps/web
npm run dev -- -p 3100
```
