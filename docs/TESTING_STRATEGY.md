# Testing Strategy

Testing should scale with risk. Auth, finance calculations, ownership, AI safety, billing, and privacy require stronger coverage than static marketing pages.

## Unit Tests

Targets:
- Zod schemas
- finance calculations
- provider normalization
- entitlement logic
- goal planner constraints
- AI output schemas
- prompt safety utilities

## Integration Tests

Targets:
- Go REST handlers
- `sqlc` queries
- Supabase migrations
- Clerk user mapping
- Stripe webhook lifecycle
- AI persistence paths
- usage counters

## Contract Tests

Targets:
- OpenAPI schema validity
- generated TypeScript client compatibility
- structured error shape
- request/response validation

## AI Fixtures And Evals

Required groups:
- schema validity
- citation presence
- advice-boundary refusal/reframe
- prompt-injection resistance
- stale-data disclosure
- ownership isolation
- goal planner safety
- regression snapshots for demo prompts

Scripts:
- `scripts/run-ai-evals`
- `scripts/check-ai-safety-fixtures`

## E2E Tests

Golden path:
1. Landing page loads.
2. Pricing and security pages load.
3. User signs in.
4. User completes onboarding.
5. User creates or loads demo portfolio.
6. User adds a holding.
7. User generates a real AI portfolio brief.
8. User saves the brief.
9. User creates a goal scenario.
10. Billing upgrade path is visible and entitlement-aware.

## Visual And Responsive QA

Check:
- mobile
- 13-inch laptop
- 16-inch laptop
- wide desktop
- chart overflow
- navigation behavior
- dark mode contrast
- reduced-motion behavior
- media loading fallback

## Security Tests

Check:
- auth bypass attempts
- ownership isolation
- rate-limit behavior
- webhook signature failure
- env leak scan
- PII/prompt/holding scrubbing in logs

## Acceptance Rule

No AI feature is complete until evals catch at least schema failures and advice-boundary failures.
