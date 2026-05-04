---
name: security-review-fintech
description: Review fintech security and privacy risks. Use before merging auth, billing, AI, portfolio, market-data, Supabase, Go API, webhook, analytics, error-reporting, or deployment changes.
---

# Security Review Fintech

## Overview
Use this skill for security review of finance, AI, billing, and user-owned data changes.

## Required Review Areas
- Authentication and session handling.
- Resource ownership and authorization.
- Supabase RLS and service-role exposure.
- Stripe and Clerk webhook verification.
- AI tool access boundaries.
- Prompt injection and data exfiltration.
- PII and financial data in analytics/errors.
- Rate limits and abuse controls.
- Secrets and public environment variables.
- Audit logs for sensitive mutations.

## Blockers
- Client-side service-role key.
- Missing ownership checks.
- Unsigned webhooks.
- AI tool that can access arbitrary user data.
- Raw holdings/prompts sent to analytics by default.
- Direct buy/sell AI behavior.
- Unbounded provider/API calls.

## References
Read `references/security-checklist.md` before reviewing security-sensitive changes.
