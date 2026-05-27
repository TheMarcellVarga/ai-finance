# Security And Compliance

## Product Boundary

This product is financial research and portfolio decision support. It must not become a trading bot, brokerage tool, robo-advisor, suitability engine, or guaranteed-return product.

## Sensitive Data

Treat the following as sensitive:
- identity data
- portfolio and holdings data
- financial amounts
- prompts
- AI outputs
- billing data
- API keys and provider credentials
- webhook secrets
- raw JWTs
- private prompts and system instructions

## Auth And Ownership

- Clerk validates user sessions.
- Go API validates Clerk JWTs and maps users to internal profiles.
- Every user-owned resource must be ownership-checked server-side.
- Do not reveal whether another user's resource exists.
- Supabase RLS acts as defense in depth.

## Secrets

- No service-role keys in browser code.
- No provider keys in public env vars.
- No raw JWTs in logs.
- No webhook secrets outside server-only runtime.
- Lazy initialize external clients to avoid build-time secret exposure.

## AI Safety

AI outputs must include:
- assumptions
- data freshness
- citations when available
- confidence label
- safety label
- not-financial-advice disclaimer

AI must refuse or reframe:
- buy/sell-now prompts
- automated trading requests
- guaranteed return requests
- suitability claims
- prompt extraction
- secret exfiltration
- cross-user data access

## Analytics And Errors

PostHog and Sentry payloads must scrub:
- PII
- holdings
- financial amounts
- raw prompts
- full AI outputs
- API keys
- JWTs

Only safe metadata should be sent by default, such as feature name, route, plan tier, redacted error class, request ID, and aggregate usage counters.

Phase 7 server observability routes analytics and error payloads through `scrubForTelemetry`, which redacts prompts, AI outputs, holdings, financial amounts, billing fields, raw JWTs, API keys, and secrets before PostHog or Sentry-compatible reporting.

## Webhooks

- Stripe webhooks require signature verification.
- Clerk webhooks require signature verification.
- Webhook handlers must be idempotent.
- Billing state changes should create audit events.
- Phase 7 webhook handlers verify signatures before business processing, use `webhook_events` for duplicate suppression when Supabase is configured, and never trust client-supplied billing state.

## Audit Logs

Audit sensitive actions:
- profile sync
- billing changes
- portfolio mutations
- watchlist mutations
- AI research generation
- exports
- entitlement changes
- admin actions if added later

Hash or redact IP and user-agent fields.

## Security Review Gate

Before public deployment:
- Run dependency and secret checks.
- Verify auth bypass tests.
- Verify ownership isolation.
- Verify rate limits.
- Verify webhook signature failures.
- Verify privacy scrubbing in analytics and error monitoring.
