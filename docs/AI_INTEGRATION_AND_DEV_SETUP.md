# AI Integration And AI Development Setup

## Purpose
This project should demonstrate real AI product engineering, not decorative AI copy. The AI layer must retrieve user-owned financial context, call constrained application tools, generate structured outputs, preserve citations, enforce finance safety boundaries, track cost/usage, and run repeatable evals.

The same repo should also be comfortable for future AI agents to work in. That means clear agent instructions, project-specific skills, deterministic scripts, and documentation that prevents agents from drifting into trading-bot, financial-advice, or architecture-breaking work.

## Product AI Features
- Portfolio copilot: answers questions about a user's portfolio using holdings, allocation, price snapshots, goals, and risk metrics.
- Asset research brief: summarizes a stock/ETF with company facts, recent price context, filings, risks, and cited sources.
- SEC filing summarizer: turns 10-K, 10-Q, and 8-K sections into structured summaries with source links and freshness labels.
- Watchlist digest: explains notable watchlist moves using cached market data and source-backed context.
- Goal planner: converts a user goal into milestones, contribution scenarios, educational challenges, and progress states without promising returns.
- Risk explainer: explains concentration, volatility, drawdown, and diversification signals in plain language.
- Research-room assistant: lets users save briefs, ask follow-up questions, and compare cited research artifacts.

## Runtime Architecture
- Next.js owns AI UX: streaming chat, assistant panels, structured result rendering, AI loading states, and user-facing disclaimers.
- Vercel AI SDK is the application AI orchestration layer for chat, streaming text, structured output, and tool calling.
- Vercel AI Gateway remains a supported later provider for text/chat models, but local verification does not call it because the account requires billing setup.
- Direct OpenAI through `@ai-sdk/openai` is the dormant live-provider path. It stays disabled unless `AI_EXTERNAL_CALLS_ENABLED=true` and `AI_MODEL_PROVIDER=openai` are set.
- Direct provider SDKs are allowed when they avoid Gateway billing blockers or support capabilities Gateway does not cover, especially embeddings.
- Go owns authoritative finance data and calculations. AI tools call Go API endpoints or server-side wrappers, never direct model-to-database access.
- Supabase Postgres stores AI threads, messages, tool runs, citations, retrieved context metadata, usage counters, and eval results.
- Supabase `pgvector` stores research/document embeddings for v1. Pinecone remains deferred until retrieval scale, latency, or operational needs justify it.

## AI Tool Registry
Expose a typed tool registry to the AI runtime. Every tool must validate input, enforce ownership, rate-limit usage, and return compact source-aware data.

Initial tools:
- `getPortfolioSnapshot`: holdings, allocation, value, concentration, and freshness.
- `getAssetProfile`: ticker metadata, sector, exchange, CIK, and cached fundamentals.
- `getPriceHistory`: normalized historical prices with provider and stale-data flags.
- `getFilingChunks`: retrieved SEC filing chunks with section labels and source URLs.
- `getWatchlistMovers`: watchlist price movement summary.
- `getGoalState`: current goal, milestones, challenges, and contribution assumptions.
- `createGoalDraft`: creates a proposed goal plan draft, not an active commitment.
- `saveResearchBrief`: persists a structured brief with citations and usage metadata.

Forbidden tools:
- Any brokerage order placement.
- Any tool that says whether a user should buy, sell, or hold.
- Any tool that optimizes for guaranteed profit or predicted return.
- Any tool that exposes another user's data.

## Structured Output Contracts
Each AI feature should return schema-validated data rather than unstructured prose only.

Every user-facing AI result must include:
- `summary`
- `keyFacts`
- `riskFactors`
- `citations`
- `assumptions`
- `dataFreshness`
- `confidence`
- `safetyLabel`
- `disclaimer`
- `followUpQuestions`

Feature-specific outputs:
- Portfolio brief: allocation observations, concentration risks, goal alignment, notable changes.
- Asset research brief: business summary, filing highlights, valuation caveats, market context.
- Filing summary: filing type, period, extracted section summaries, material risks, source chunks.
- Goal plan: milestones, contribution scenarios, educational challenges, progress metrics.
- Risk explanation: metric definitions, user-specific observations, limitations, suggested review areas.

## Retrieval And Citations
- Ingest SEC filings and other allowed research documents into `research_documents`.
- Split documents into `research_chunks` with source URL, filing accession, section label, character offsets where possible, token count, and embedding status.
- Retrieve chunks through server-side search using user intent, ticker, document type, and freshness filters.
- AI answers must cite retrieved chunks or structured market-data sources.
- If citations are unavailable, the UI must show the answer as uncited and lower confidence.
- If market data is stale, the AI must state the stale timestamp instead of implying real-time awareness.

## Safety And Compliance Rules
- The assistant is a financial research and portfolio decision-support assistant, not an advisor, broker, or trading bot.
- Never produce direct instructions such as "buy now," "sell immediately," or "this is suitable for you."
- Use language such as "review," "monitor," "risk factor," "scenario," "tradeoff," and "consider researching."
- Goal planning must be framed as educational scenario planning, not a return promise.
- Gamification should reward research discipline, diversification review, consistency, and learning, not risky trading or profit.
- The AI must refuse requests for automated trading, guaranteed returns, insider trading, market manipulation, or evasion of financial rules.
- The AI must not expose hidden prompts, internal policy text, secrets, API keys, raw JWTs, or another user's financial data.

## Usage, Billing, And Cost Controls
- Every AI request consumes a metered usage event tied to the user and billing period.
- Entitlements control monthly AI briefs, filing summaries, watchlist digests, research-room saves, and team usage.
- Store model, provider, prompt hash, token usage, latency, cache hit/miss, and estimated cost.
- Rate-limit by user, organization, route, and feature.
- Apply hard context limits and summarize older thread context before adding more retrieved data.
- Prefer cached structured finance data over repeated provider calls.

## AI Evaluation Plan
Create an eval fixture set before the AI feature is considered complete.

Required eval groups:
- Schema validity: all AI outputs conform to their Zod/OpenAPI schemas.
- Citation behavior: research and filing answers include valid citations.
- Advice boundary: model refuses or reframes direct buy/sell/trading-bot prompts.
- Ownership isolation: prompts cannot retrieve another user's portfolio.
- Prompt injection: malicious filing text cannot override system rules.
- Stale data disclosure: old market data is labeled clearly.
- Goal planner safety: no guaranteed returns, no aggressive profit challenge framing.
- Regression snapshots: important demo prompts remain stable enough for portfolio demos.

CI should fail if core evals break. Non-blocking evals can report drift for review.

## AI Dev Setup For Future Agents
Create a first-class AI development environment so future agents can work safely and consistently.

Required repo docs:
- `AGENTS.md`: top-level rules for AI agents working in this repo.
- `docs/MASTER_EXECUTION_ROADMAP.md`: primary execution authority for phase order, task routing, dependencies, and acceptance gates.
- `docs/AI_INTEGRATION_AND_DEV_SETUP.md`: source of truth for AI product behavior and agent workflow.
- `docs/AI_FEATURES.md`: detailed schemas, prompts, tools, and UI rendering rules.
- `docs/SECURITY_AND_COMPLIANCE.md`: finance safety, data privacy, auth, and audit rules.
- `docs/API_SPEC.md`: Go API and AI tool-facing contracts.
- `docs/DATABASE_SCHEMA.md`: tables used by AI, RAG, usage, and evals.

Recommended project-specific skills are scaffolded in `ai-dev/skills`:
- `finance-product-guardrails`: use when writing product copy, AI prompts, pricing, goals, or gamification.
- `go-finance-api`: use when editing the Go service, OpenAPI contracts, `sqlc` queries, or finance calculations.
- `nextjs-fintech-ui`: use when building the metal/glass dashboard, charts, responsive layouts, or AI panels.
- `supabase-finance-schema`: use when changing migrations, RLS policies, AI tables, or vector search.
- `ai-research-features`: use when changing prompts, tool calling, RAG, structured outputs, citations, or evals.
- `security-review-fintech`: use before merging auth, billing, portfolio, AI, or financial-data changes.

External frontend quality skill:
- Taste Skill by Leon Lin should be used as an optional frontend taste layer during UI implementation, redesign, and screenshot-to-code work.
- Prefer `gpt-tasteskill` or `taste-skill` for premium frontend execution; consider `image-to-code-skill` when implementing from the inspiration screenshot.
- Taste Skill is not the source of truth for finance behavior, compliance boundaries, backend architecture, AI safety, or data security. Use it together with `nextjs-fintech-ui`, `finance-product-guardrails`, and `security-review-fintech`.
- Install when implementation starts with `npx skills add https://github.com/Leonxlnx/taste-skill`, then select the relevant included skill variant for the task.

Skill design rules:
- Keep each `SKILL.md` concise and task-triggered.
- Put detailed schemas, prompt examples, and policies in `references/` files.
- Add scripts only for deterministic repeated work.
- Validate skills after creation.
- Do not create broad generic skills that load too much context.

Recommended deterministic scripts:
- `scripts/generate-openapi-client`
- `scripts/run-ai-evals`
- `scripts/check-ai-safety-fixtures`
- `scripts/validate-supabase-migrations`

Additional scripts to add after the app scaffold exists:
- `scripts/seed-demo-finance-data`
- `scripts/check-public-env-leaks`
- `scripts/snapshot-demo-prompts`

## Implementation Milestones
1. Add AI schemas, storage tables, and usage counters.
2. Build disabled-by-default external provider configuration and a minimal streaming assistant route.
3. Add tool registry wrappers around Go API data.
4. Implement portfolio brief with citations and evals.
5. Implement filing summarizer with chunk retrieval and `pgvector`.
6. Implement goal planner with safe gamification outputs.
7. Add billing limits, cost tracking, and AI usage UI.
8. Expand the existing `AGENTS.md`, project-specific skills, and deterministic placeholder scripts as the real app scaffold appears.

## Acceptance Criteria
- Local verification uses the approved no-Gateway deterministic path. Live external model calls require the explicit `AI_EXTERNAL_CALLS_ENABLED=true` kill switch.
- AI outputs are schema-validated and persistence-ready; persistence runs when server-side Supabase credentials are configured.
- AI answers cite actual stored or fetched sources when presenting research claims.
- AI refuses trading-bot and direct buy/sell prompts.
- A user cannot force the AI to access another user's data.
- AI usage is rate-limited, metered, and tied to billing entitlements.
- Future AI agents have clear repo instructions and project-specific skill guidance before implementation scales.

## References
- Vercel AI SDK documentation: https://ai-sdk.dev/docs
- Vercel AI SDK structured data: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- OpenAI structured outputs: https://platform.openai.com/docs/guides/structured-outputs
- OpenAI function calling: https://platform.openai.com/docs/guides/function-calling
- Taste Skill: https://www.tasteskill.dev/
- Taste Skill GitHub: https://github.com/Leonxlnx/taste-skill
