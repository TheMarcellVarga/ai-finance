# Agent Instructions

## Project Identity
This repo is for an AI Financial Intelligence Workspace: a fintech/wealthtech research and portfolio decision-support product. It is not an AI trading bot, brokerage tool, robo-advisor, or return-prediction product.

Future agents must keep the product recruiter-grade: real data flows, real AI integration, secure backend boundaries, polished responsive UI, and clear finance compliance judgment.

## Source Of Truth
Before implementing product, backend, AI, schema, or security work, read the relevant docs in this order:
1. `docs/MASTER_EXECUTION_ROADMAP.md`
2. `AIFinancialIntelligenceWorkspacePlan.md`
3. `docs/AI_INTEGRATION_AND_DEV_SETUP.md`
4. `docs/BACKEND_DECISION.md`
5. `AIProjectMarkdownDocsPlan.md`

`docs/MASTER_EXECUTION_ROADMAP.md` is the execution authority. Follow its phase order, dependency rules, skill routing, task template, and acceptance gates unless the user explicitly updates the roadmap.

Use `ai-dev/skills` as the repo-local skill source for future AI-assisted implementation. These skills are scaffolds for planning and should be installed or copied into the active agent skill path only when implementation starts.

## Product Guardrails
- Do not build trade execution, brokerage integrations, copy-trading, automated trading, or "buy/sell now" workflows.
- Do not promise returns, suitability, alpha, guaranteed outcomes, or personalized investment advice.
- Frame AI outputs as research, scenario analysis, risk explanation, and decision support.
- Gamification must reward learning, research discipline, diversification review, and consistency, not risky trades or profit streaks.
- Any AI output about assets, filings, portfolios, or goals must show data freshness, assumptions, citations when available, and a not-financial-advice disclaimer.

## Architecture Rules
- Next.js owns marketing, authenticated UI, BFF surfaces, AI streaming UX, Stripe/Clerk webhooks, and product rendering.
- Go owns authoritative finance/data APIs, portfolio calculations, market-data normalization, SEC ingestion, rate-limited mutations, and audit-backed backend behavior.
- Supabase Postgres is the relational system of record. Use SQL migrations, `pgx`, and `sqlc` for the Go backend.
- Use Supabase `pgvector` for v1 AI retrieval. Defer Pinecone unless scale or latency makes it necessary.
- Browsers should generally talk to Next.js. Next.js server code talks to Go. Public Go API access requires Clerk JWT validation, strict CORS, rate limits, and Cloudflare controls.

## AI Engineering Rules
- Real AI integration is mandatory for v1. Do not hard-code fake AI results for the final demo.
- Use Vercel AI SDK for chat, streaming, tool calling, and structured outputs.
- Vercel AI Gateway is optional and should remain disabled until paid API usage is explicitly approved.
- Use direct provider SDKs only where needed, especially no-credit-card live provider testing and embeddings if Gateway does not support the capability.
- Local and CI verification must keep external model calls disabled by default. Do not connect money-consuming AI APIs until the product is otherwise complete and the user explicitly enables them.
- Prefer the optional direct OpenAI provider as the dormant live path; keep it disabled until paid API usage is explicitly approved.
- AI tools must call application-owned APIs. Never let model calls directly access raw database credentials or unrestricted data.
- Persist AI threads, messages, tool runs, citations, retrieved context metadata, safety labels, usage, latency, model, and cost information.
- Add evals for schema validity, citations, advice boundaries, prompt injection, stale data disclosure, ownership isolation, and goal-planner safety.

## Security Rules
- Treat portfolio data, holdings, prompts, AI outputs, billing data, and user identity as sensitive.
- Never expose service-role keys, provider keys, raw JWTs, webhook secrets, or private prompts to the client.
- Validate every API request, enforce ownership on every user-owned resource, and log sensitive finance actions.
- Scrub PII, holdings, financial amounts, raw prompts, and AI outputs from analytics and error payloads unless explicitly safe.
- Stripe and Clerk webhooks require signature verification.

## Working Style
- Start every implementation task by identifying the roadmap phase and primary/support skill.
- Do not skip ahead to later roadmap phases unless the current phase acceptance gate is already satisfied or the user explicitly changes priorities.
- If a requested task conflicts with the roadmap order, update or clarify the roadmap before implementing.
- Prefer implementation decisions already documented in this repo over inventing new architecture.
- If a plan is ambiguous, update the docs before implementation.
- Keep future changes scoped: no unrelated refactors, no hidden trading-bot features, and no unreviewed provider changes.
- Add tests and evals proportional to risk, especially around auth, finance calculations, AI behavior, billing, and data privacy.
