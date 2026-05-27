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
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- `POSTHOG_PERSONAL_API_KEY` if needed server-side
- `VERCEL_OIDC_TOKEN`, `VERCEL_AI_GATEWAY_API_KEY`, or Vercel-managed AI Gateway credentials
- `AI_GATEWAY_MODEL`, optional, defaults to `amazon/nova-micro` for the Phase 5 portfolio brief route
- `AI_GATEWAY_API_KEY`, optional local alias for `VERCEL_AI_GATEWAY_API_KEY`
- `AI_PORTFOLIO_BRIEF_MODE`, optional; use `fixture` to avoid model calls during local development or `live` to force AI Gateway
- `FINANCE_API_DEV_TOKEN`, optional local token for Next.js server routes when the Go API runs in dev auth mode
- `FMP_API_KEY`
- `TWELVE_DATA_API_KEY`
- `FINNHUB_API_KEY`
- `FINNHUB_WEBHOOK_SECRET`
- `SEC_USER_AGENT`
- `FINANCE_API_BASE_URL` for the Next.js server-side BFF route when it calls the Go API
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

For cost-controlled development, `/api/ai/portfolio-brief` supports deterministic fixture mode. In non-production, the route defaults to fixture mode even when an AI Gateway credential is configured, unless `AI_PORTFOLIO_BRIEF_MODE=live` is explicitly set. Fixture mode still reads the owner-scoped finance API snapshot, applies prompt safety checks, returns the required structured fields, and attempts Supabase persistence if server credentials are configured. It does not make a model call.

Fixture mode is the active working mode for this repo. It is the recommended
path while live AI credentials are being deferred for privacy, billing, or
account setup reasons.

`scripts/verify-phase5-live` intentionally skips Vercel AI Gateway and clears
Gateway/Supabase credentials for the spawned web process. The script validates
the approved no-Gateway path: owner-scoped finance API context, schema-valid
portfolio brief output, citations, safety labels, assumptions, and explicit
`liveAiGatewayCall: false` metadata.

Manual live route testing remains possible outside the verifier. With
`AI_PORTFOLIO_BRIEF_MODE=live`, the route fails fast unless AI Gateway and
Supabase persistence are configured, and non-streaming responses must persist
thread, message, tool run, brief, citation, and usage metadata.

## Provider Notes

- SEC EDGAR requests need a compliant user agent/contact.
- FMP is the current Phase 4 quote/search provider and must be configured only in server environments.
- Twelve Data, Finnhub, and SEC EDGAR are configured for follow-on provider and filing work.
- Provider failures must be shown clearly; the app must not fabricate market prices.

## Setup Order

1. Scaffold app and API. Done for Phase 3.
2. Add local env examples without real secrets. `services/api/.env.example` exists.
3. Add Supabase migrations. Done for Phase 3.
4. Wire Clerk and Stripe dev webhooks.
5. Add AI Gateway configuration. Done for Phase 5 through the AI SDK portfolio brief route, with fixture mode as the current default.
6. Add provider keys only after server-side boundaries exist.

## Go API Local Auth

The Go API supports `API_AUTH_MODE=dev` only outside production. It accepts `Authorization: Bearer dev:<clerk_user_id>` so the local authenticated path can be tested before Clerk is wired.

Production must use `API_AUTH_MODE=clerk`, `CLERK_JWT_ISSUER`, and `CLERK_JWKS_URL` so the API validates Clerk JWTs with RS256 JWKS keys. `CLERK_JWT_AUDIENCE` is optional but should be set when Clerk token templates include an audience.

## Deployment Notes

- Vercel hosts Next.js.
- Go API deploys as a container service.
- Cloudflare fronts app/API domains and security controls.
- Production env values live in the relevant deployment platform, not in source control.
