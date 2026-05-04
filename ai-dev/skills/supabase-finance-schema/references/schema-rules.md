# Supabase Finance Schema Rules

## Core Tables
- profiles
- subscriptions
- assets
- price_snapshots
- portfolios
- holdings
- transactions
- watchlists
- research_documents
- research_chunks
- ai_threads
- ai_messages
- ai_tool_runs
- ai_evaluations
- goals
- audit_logs
- usage_events

## Security
- Enable RLS as defense-in-depth.
- Avoid authorization decisions based on user-editable metadata.
- Keep service-role operations server-only.
- Use audit logs for sensitive mutations.

## Finance Precision
- Use numeric or integer minor units.
- Do not use floating point for financial values.
