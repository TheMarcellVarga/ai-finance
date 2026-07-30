# ADR 005: Human Review Ledger And Export

## Status

Accepted for Evidence Workspace Upgrade Phase 5.

## Context

Upgrade Phase 4 stores an immutable, claim-level citation trust artifact in
`research_analysis_runs.output_json`. Phase 5 adds editing, acceptance,
rejection, section regeneration, incorrect-citation feedback, and reviewed
Markdown export.

These actions must not let model output approve itself, overwrite the original
result, inherit stale approval after regeneration, or export unsupported
content as reviewed.

## Decision

### Raw output remains immutable

Once an analysis run has a non-null `output_json`, database enforcement rejects
later changes to that field. Telemetry and terminal bookkeeping may still be
updated without replacing the raw result.

### Human actions use an append-only ledger

`research_analysis_review_events` records owner-scoped human actions:

- `edit_saved`
- `accepted`
- `rejected`
- `citation_flagged`

Every event records the raw-output SHA-256 digest it reviewed. Edit events store
the user-authored section title and body separately from the raw section.
Acceptance or rejection may reference a prior edit event from the same run and
section; otherwise it refers to the raw section.

The table grants no update or delete path. A database trigger rejects both
operations as defense in depth.

### Go owns review mutations

The Go research API validates identity, workspace ownership, run ownership,
terminal run state, section membership, content references, citation
membership, request size, and idempotency before appending an event. Next.js
provides same-origin BFF routes and the interactive review interface.

The actor identity always comes from the authenticated session. The request
cannot submit a user ID or claim that a model performed the review.

### Approval is derived, not mutable state

Current section review state is derived by folding events in creation order.
An edit clears a prior decision for that section. A later acceptance or
rejection applies only to its referenced raw or edited content version.

No `approved` flag is stored on the model output.

### Regeneration creates a new analysis run

The regenerate-section control starts a new immutable analysis run linked by
`retry_of_run_id` and identifies the requested section in the versioned
generation request. Review events remain attached to the prior run. The new run
therefore starts unreviewed and cannot inherit stale approval.

### Reviewed Markdown is assembled server-side

Export loads the owner-scoped run and its review ledger, derives the current
section state, and emits Markdown that:

- labels the document and every section as reviewed, rejected, or unreviewed
- uses the accepted user edit when one exists
- keeps raw and user-edited provenance explicit
- preserves document, page, source-locator, excerpt, and unsupported-claim
  warnings
- includes the research-only disclaimer

The export endpoint never accepts client-supplied content or arbitrary source
URLs.

## Security And Privacy

- Review reads and writes require user, workspace, and run ownership.
- Review events are append-only and idempotent.
- Event payloads are size-bounded and exclude raw prompts.
- Citation feedback can reference only a citation stored on the active run.
- Markdown is returned as a download and does not render user HTML.
- Audit logs record review mutations and export attempts without raw research
  text or source excerpts.
- Model/provider code has no path to the review mutation API.

## Consequences

- A new migration adds the review ledger, indexes, RLS, and immutability
  triggers.
- The Go research store and OpenAPI contract gain review-event routes.
- Next.js gains BFF review and export routes plus section review controls.
- Regeneration remains a generation action, not an approval action.
- Phase 6 can evaluate the complete upload-to-reviewed-export workflow without
  changing the trust semantics established in Phase 4.

## Acceptance

- AI output cannot append an approval without an authenticated human request.
- Raw output and user edits remain independently inspectable.
- Regeneration produces a new run with no inherited approval.
- Export clearly distinguishes reviewed and unreviewed content and retains
  evidence references.
