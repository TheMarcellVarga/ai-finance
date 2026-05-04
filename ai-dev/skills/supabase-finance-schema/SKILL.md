---
name: supabase-finance-schema
description: Design and review Supabase finance schemas. Use when changing SQL migrations, RLS policies, financial data tables, AI persistence, pgvector retrieval, audit logs, usage counters, or data privacy behavior.
---

# Supabase Finance Schema

## Overview
Use this skill for database planning, migration review, RLS review, AI storage, and vector retrieval design.

## Schema Rules
- Use SQL migrations as the source of truth.
- Use internal UUID primary keys where practical.
- Store Clerk user IDs as unique external identity fields.
- Never use floating point for money, price, cost basis, or share quantities.
- Add `created_at` and `updated_at` to core tables.
- Add ownership indexes on user, portfolio, asset, and date fields.
- Enable RLS as defense-in-depth on exposed schemas.
- Keep service-role credentials server-only.

## AI Data Rules
- Store AI threads, messages, tool runs, citations, usage, and eval results.
- Use `pgvector` for v1 research chunks.
- Store source locators and freshness metadata for retrieved context.
- Avoid storing unnecessary raw PII in embeddings.

## References
Read `references/schema-rules.md` before changing migrations, RLS, vectors, or AI persistence.
