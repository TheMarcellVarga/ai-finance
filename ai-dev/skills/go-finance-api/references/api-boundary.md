# Go Finance API Boundary

## Owns
- Portfolio, holdings, transactions, watchlists.
- Asset search, price snapshots, provider normalization.
- SEC filing ingestion metadata.
- Risk calculations and portfolio summaries.
- Goal state and achievement events.
- Usage counters and audit logs.

## Must Enforce
- Clerk JWT verification.
- Internal profile mapping.
- Resource ownership.
- Plan entitlement.
- Rate limits.
- Structured errors.
- Audit logs for sensitive mutations.

## Must Avoid
- Raw model access to database credentials.
- Duplicating finance logic in Next.js.
- Float math for money or quantities.
- Unbounded provider calls.
