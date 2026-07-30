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
- citation presence and exact retrieved-metadata matching
- active retrieval-run and retrieved-chunk allow-list binding
- unsupported material-claim disclosure
- model self-approval rejection and immutable-output binding
- stale decision rejection after edit or regeneration
- reviewed-export status labels and evidence preservation
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
5. User creates or loads a provider-backed portfolio.
6. User adds a holding.
7. User generates a real AI portfolio brief.
8. User saves the brief.
9. User creates a goal scenario.
10. Billing upgrade path is visible and entitlement-aware.

Evidence workspace addition:

1. Upload and process an owner-scoped source.
2. Run a structured earnings review.
3. Confirm every material claim is supported or visibly unsupported.
4. Activate a citation and compare its bounded excerpt and page with the source.
5. Confirm forged run IDs, foreign chunks, and incomplete allow-lists fail validation.
6. Save a human edit and verify the raw AI section remains visible and unchanged.
7. Accept the edit, report an incorrect citation, and export reviewed Markdown.
8. Regenerate the accepted section and confirm the new run has no inherited approval.

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
