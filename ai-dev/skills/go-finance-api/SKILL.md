---
name: go-finance-api
description: Build and review the Go finance API. Use when working on services/api, OpenAPI contracts, Clerk JWT middleware, pgx/sqlc queries, portfolio calculations, market-data providers, SEC ingestion, rate limits, audit logs, or backend tests.
---

# Go Finance API

## Overview
Use this skill for backend implementation planning and review. The Go service owns authoritative finance data APIs and must enforce auth, ownership, validation, rate limits, and audit logging.

## Required Patterns
- Use Go 1.23+.
- Use `pgx` and `sqlc` for database access.
- Keep SQL explicit and migration-backed.
- Validate all request bodies and path/query parameters.
- Verify Clerk JWTs before accessing user-owned data.
- Enforce resource ownership inside every handler, not only at the router.
- Return structured errors with stable codes.
- Log request IDs and audit sensitive finance mutations.

## API Boundary
- Go owns `/v1` finance/data APIs.
- Next.js can proxy or call Go server-side, but should not duplicate finance business logic.
- AI tools call typed wrappers around Go APIs, not raw database access.

## References
Read `references/api-boundary.md` before changing backend routes, OpenAPI, or finance calculations.
