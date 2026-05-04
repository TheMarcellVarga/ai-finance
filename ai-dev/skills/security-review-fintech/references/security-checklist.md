# Fintech Security Checklist

## Auth
- Clerk JWT validation.
- Server-side ownership checks.
- MFA-ready account flow.
- No trust in client-supplied user IDs.

## Data
- No service-role key in browser.
- Sensitive values scrubbed from analytics/errors.
- Audit logs for sensitive mutations.
- Explicit retention/export/delete plan.

## AI
- Tools enforce ownership.
- Retrieved context is bounded.
- Prompt injection fixtures exist.
- AI refuses trading-bot and direct buy/sell prompts.

## Billing
- Stripe webhook signatures verified.
- Entitlement checks are server-side.
- Past-due/canceled states handled predictably.
