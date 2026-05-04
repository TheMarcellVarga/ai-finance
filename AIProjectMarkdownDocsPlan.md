# AI Project Markdown Docs Plan

## Summary
Create a compact documentation layer so any AI coding agent can understand the product, architecture, design direction, database, APIs, security posture, and build order without re-deriving the plan.

## Files To Create
- `README.md`: public project overview, positioning, stack, local setup, scripts, and demo goals.
- `AGENTS.md`: instructions for AI agents working in this repo, including product boundaries, coding standards, security rules, and what not to build.
- `docs/PRODUCT_SPEC.md`: target users, product positioning, feature set, monetization, non-goals, and compliance-safe language.
- `docs/IMPLEMENTATION_PLAN.md`: phased build roadmap from scaffold to recruiter-ready demo.
- `docs/ARCHITECTURE.md`: Next.js/Vercel/Supabase/Clerk/Stripe/Upstash/AI SDK architecture and data flow.
- `docs/DATABASE_SCHEMA.md`: planned relational tables, ownership model, key fields, relationships, and RLS expectations.
- `docs/API_SPEC.md`: REST API routes, request/response expectations, auth rules, and error conventions.
- `docs/AI_FEATURES.md`: AI research briefs, goal planner, prompt rules, structured outputs, citations, safety boundaries.
- `docs/AI_INTEGRATION_AND_DEV_SETUP.md`: real AI runtime architecture, tool calling, RAG, evals, usage/cost controls, and project-specific AI skill setup.
- `docs/DESIGN_SYSTEM.md`: dark metal/glass aesthetic, responsive layout rules, component choices, dashboard UX patterns.
- `docs/SECURITY_AND_COMPLIANCE.md`: finance-specific security, auth, rate limiting, audit logs, privacy, disclaimers.
- `docs/TESTING_STRATEGY.md`: unit, integration, AI fixture, E2E, visual, and security test coverage.
- `docs/ENVIRONMENT.md`: required env vars, local services, provider keys, webhook setup, deployment notes.

## Important Content Rules
- Every doc must reinforce: this is an AI financial research and portfolio decision-support tool, not an AI trading bot.
- `AGENTS.md` should instruct future AI agents to avoid trade execution, investment advice promises, brokerage features, and unrealistic return claims.
- AI docs must require real model integration, structured outputs, citations, persisted AI runs, safety evals, and future project-specific skills.
- Technical docs should assume Next.js App Router, TypeScript, Go finance API, Supabase Postgres, Clerk, Stripe, Vercel, Vercel AI SDK, Vercel AI Gateway, Supabase `pgvector`, Upstash, Resend, PostHog, and Sentry.
- Keep docs practical and implementation-oriented, not pitch-deck prose.

## Execution Order
1. Create `README.md` and `AGENTS.md` first so the repo has top-level AI context.
2. Create product and implementation docs next.
3. Create architecture, database, API, AI, security, design, testing, and environment docs.
4. Cross-link docs from `README.md`.
5. Keep all files Markdown-only and ASCII-safe.

## Assumption
“`.md`s for AI” means repo documentation optimized for AI coding agents, project handoff, and future implementation guidance.
