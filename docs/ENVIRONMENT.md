# Environment

This file lists planned local and production configuration. Exact variable names can change when scaffolds are created, but secrets must remain server-only unless explicitly marked public.

## Local Services

- Next.js app in `apps/web`
- Go API in `services/api`
- Supabase local Postgres
- optional Redis-compatible local cache or Upstash dev credentials

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
- `VERCEL_AI_GATEWAY_API_KEY` or Vercel-managed AI Gateway credentials
- `FMP_API_KEY`
- `TWELVE_DATA_API_KEY`
- `FINNHUB_API_KEY`
- `FINNHUB_WEBHOOK_SECRET`
- `SEC_USER_AGENT`
- `FINANCE_API_BASE_URL` for the Next.js server-side BFF route when it calls the Go API

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
5. Add AI Gateway configuration.
6. Add provider keys only after server-side boundaries exist.

## Go API Local Auth

The Go API supports `API_AUTH_MODE=dev` only outside production. It accepts `Authorization: Bearer dev:<clerk_user_id>` so the local authenticated path can be tested before Clerk is wired.

Production must use `API_AUTH_MODE=clerk`, `CLERK_JWT_ISSUER`, and `CLERK_JWKS_URL` so the API validates Clerk JWTs with RS256 JWKS keys. `CLERK_JWT_AUDIENCE` is optional but should be set when Clerk token templates include an audience.

## Deployment Notes

- Vercel hosts Next.js.
- Go API deploys as a container service.
- Cloudflare fronts app/API domains and security controls.
- Production env values live in the relevant deployment platform, not in source control.
