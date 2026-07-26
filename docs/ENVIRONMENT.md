# Environment

This file lists planned local and production configuration. Exact variable names can change when scaffolds are created, but secrets must remain server-only unless explicitly marked public.

## Local Services

- Next.js app in `apps/web`
- Go API in `services/api`
- Supabase local Postgres
- optional Redis-compatible local cache or Upstash dev credentials

Use `scripts/dev-local` for local portfolio and AI development. It starts the Go API with `services/api/.env`, verifies `/v1/health`, then starts or reuses the Next.js dev server with `FINANCE_API_BASE_URL` pointed at the local API.

## Public Client Variables

Only values safe for browser exposure:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, set to `/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, set to `/sign-up`
- `NEXT_PUBLIC_POSTHOG_KEY` if configured with privacy-safe capture
- `NEXT_PUBLIC_POSTHOG_HOST`

Never expose service-role keys, provider keys, webhook secrets, raw JWTs, or private prompts.

## Server Variables

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER`
- `CLERK_JWT_AUDIENCE`
- `CLERK_JWKS_URL`
- `API_AUTH_MODE`
- `API_DEV_AUTH_PREFIX`
- `CLERK_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_RESEARCH_PRO`
- `STRIPE_PRICE_TEAM`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `POSTHOG_SERVER_API_KEY`
- `POSTHOG_PERSONAL_API_KEY` if needed server-side
- `VERCEL_OIDC_TOKEN`, `VERCEL_AI_GATEWAY_API_KEY`, or Vercel-managed AI Gateway credentials
- `AI_GATEWAY_MODEL`, optional, defaults to `amazon/nova-micro` for the Phase 5 portfolio brief route
- `AI_GATEWAY_API_KEY`, optional local alias for `VERCEL_AI_GATEWAY_API_KEY`
- `AI_PORTFOLIO_BRIEF_MODE`, optional; use `fixture` to avoid model calls during local development or `live` to request the selected external provider
- `AI_RESEARCH_GENERATION_MODE`, optional; defaults to deterministic and must be `live` to select the structured-research live provider
- `AI_RESEARCH_FIXTURE_SCENARIO`, development/test only; `valid`, `repair`, `partial`, or `provider_failure`
- `AI_RESEARCH_FIXTURE_DELAY_MS`, development/test only; abortable deterministic delay capped at 30 seconds for cancellation verification
- `AI_EXTERNAL_CALLS_ENABLED`, optional kill switch; must be exactly `true` before any live external AI provider is called
- `AI_MODEL_PROVIDER`, optional; use `openai` for direct OpenAI or `gateway` for Vercel AI Gateway. Defaults to `openai` only when live calls are explicitly enabled.
- `OPENAI_API_KEY`, optional for direct OpenAI testing
- `OPENAI_MODEL`, optional for direct OpenAI testing; defaults to `gpt-5-mini`
- `RESEARCH_EMBEDDING_PROVIDER`, defaults to `local`; use `openai` only when external calls are explicitly enabled
- `RESEARCH_EMBEDDING_MODEL`, optional live embedding model override; direct OpenAI defaults to `text-embedding-3-small`
- `ALLOW_LOCAL_RESEARCH_EMBEDDINGS_IN_PRODUCTION`, optional deliberate production override; production rejects deterministic local embeddings by default
- `FINANCE_API_DEV_TOKEN`, optional local token for Next.js server routes when the Go API runs in dev auth mode
- `FMP_API_KEY`
- `TWELVE_DATA_API_KEY`
- `FINNHUB_API_KEY`
- `FINNHUB_WEBHOOK_SECRET`
- `SEC_USER_AGENT`
- `FINANCE_API_BASE_URL` for the Next.js server-side BFF route when it calls the Go API
- `FINANCE_API_AUTH_MODE`, optional Next.js local override; set to `clerk` only when the Go API validates Clerk JWTs locally
- `WEB_PORT`, optional local override for `scripts/dev-local`; defaults to `3000`

## AI Configuration

AI runtime should track:
- model
- provider
- prompt hash
- token usage
- estimated cost
- latency
- cache hit/miss
- safety label

For cost-controlled development, `/api/ai/portfolio-brief` supports deterministic fixture mode. In non-production, the route defaults to fixture mode even when a live provider credential is configured, unless `AI_PORTFOLIO_BRIEF_MODE=live` is explicitly set. Fixture mode still reads the owner-scoped finance API snapshot, applies prompt safety checks, returns the required structured fields, and attempts Supabase persistence if server credentials are configured. It does not make a model call.

Fixture mode is the active working mode for this repo. It is the recommended
path while live AI credentials are being deferred for privacy, billing, or
account setup reasons.

`scripts/verify-phase5-live` intentionally skips Vercel AI Gateway and clears
Gateway, OpenAI, and Supabase credentials for the spawned web process. The
script validates the approved no-Gateway path: owner-scoped finance API context,
schema-valid portfolio brief output, citations, safety labels, assumptions, and
explicit `liveAiGatewayCall: false` metadata.

The dormant live provider path is direct OpenAI via `@ai-sdk/openai`. It
remains off until `AI_EXTERNAL_CALLS_ENABLED=true`,
`AI_PORTFOLIO_BRIEF_MODE=live`, `AI_MODEL_PROVIDER=openai`, and an OpenAI API
key are configured.

Manual live route testing remains possible outside the verifier. With
`AI_PORTFOLIO_BRIEF_MODE=live`, the route fails fast unless
`AI_EXTERNAL_CALLS_ENABLED=true` and the selected provider is configured. Paid
or billing-gated providers such as Vercel AI Gateway and direct OpenAI should
stay disabled until the product is otherwise complete and the user explicitly
approves enabling spend.

Research retrieval uses the deterministic `hash-embedding-v1` implementation
in development and CI. It exercises the complete 1,536-dimension indexing and
hybrid-search path without a network call or model spend. It must not be
represented as live model-generated semantic intelligence.

The dormant live research embedding path requires
`RESEARCH_EMBEDDING_PROVIDER=openai`, `AI_EXTERNAL_CALLS_ENABLED=true`, and a
server-only `OPENAI_API_KEY`. Production startup rejects the local embedder
unless `ALLOW_LOCAL_RESEARCH_EMBEDDINGS_IN_PRODUCTION=true` is deliberately
configured.

Structured earnings review also defaults to deterministic mode. The dormant
live generation path requires `AI_RESEARCH_GENERATION_MODE=live`,
`AI_EXTERNAL_CALLS_ENABLED=true`, `AI_MODEL_PROVIDER=openai`, and a server-only
OpenAI key. Production ignores deterministic failure/delay fixture variables.

## Provider Notes

- SEC EDGAR requests need a compliant user agent/contact.
- FMP is the current Phase 4 quote/search provider and must be configured only in server environments.
- Twelve Data, Finnhub, and SEC EDGAR are configured for follow-on provider and filing work.
- Provider failures must be shown clearly; the app must not fabricate market prices.

## Setup Order

1. Scaffold app and API. Done for Phase 3.
2. Add local env examples without real secrets. `services/api/.env.example` exists.
3. Add Supabase migrations. Done for Phase 3.
4. Wire Clerk and Stripe dev webhooks. Phase 7 handlers exist and require configured secrets for live delivery tests.
5. Add disabled-by-default external AI provider configuration. Done for Phase 5 through the AI SDK portfolio brief route, with fixture mode as the current default.
6. Add billing, webhook, usage, audit, rate-limit, and observability server boundaries. Done for Phase 7 with local verification and environment-dependent live webhook delivery.
7. Add provider keys only after server-side boundaries exist.

## Go API Local Auth

The Go API supports `API_AUTH_MODE=dev` only outside production. It accepts `Authorization: Bearer dev:<clerk_user_id>` so a Clerk-authenticated local web session can remain owner-scoped before local JWKS verification is enabled. The Next.js workspace still requires Clerk sign-in before issuing this local token.

Production must use `API_AUTH_MODE=clerk`, `CLERK_JWT_ISSUER`, and `CLERK_JWKS_URL` so the API validates Clerk JWTs with RS256 JWKS keys. `CLERK_JWT_AUDIENCE` is optional but should be set when Clerk token templates include an audience.

## Deployment Notes

- Vercel hosts Next.js.
- Go API deploys as a container service.
- Cloudflare fronts app/API domains and security controls.
- Production env values live in the relevant deployment platform, not in source control.
