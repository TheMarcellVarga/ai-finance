# ADR 004: Claim-Level Citation Trust

## Status

Accepted for Evidence Workspace Upgrade Phase 4.

## Context

Upgrade Phase 3 stores a schema-valid structured research result whose section
and citation chunk IDs are limited to the retrieval run. The result does not
yet distinguish individual material findings, expose source excerpts for
inspection, or communicate citation coverage and evidence strength.

Phase 4 must make support inspectable without weakening the existing ownership
boundary or introducing a model-controlled approval signal.

## Decision

### Claim-level support contract

Every structured section may contain explicit claims. Each claim records:

- a stable claim key within the result
- the claim text
- whether the claim is material
- `supported` or `unsupported` status
- qualitative evidence strength
- zero or more retrieved chunk IDs

A material claim without valid evidence is allowed only when it is marked
`unsupported`. The interface must render a visible warning for it.

### Application-owned trust validation

The model may propose claim mappings, but the application validates them
against the exact evidence returned by the active retrieval run:

- every claim chunk ID must be in the retrieval allow-list
- every supported claim chunk must have a top-level citation
- citation document, page, source locator, excerpt, and retrieval score must
  match the application-owned evidence record
- citation coverage counts and state must equal the claim set

Invalid trust metadata follows the existing single-repair path. It cannot be
silently accepted.

### Persisted evidence snapshots

The validated result stores compact source excerpts inside its citation
objects. `research_analysis_runs.output_json` therefore remains the immutable
run-level trust artifact for this phase. No separate citation table is needed
until Phase 5 introduces approval history and incorrect-citation feedback.

This avoids a partially committed multi-table write while preserving the exact
evidence shown to the user. The run already stores the retrieval run ID and
retrieved chunk IDs separately.

### Interactive evidence panel

Citation controls select evidence from the active result only. The panel shows
the stored document title, page, source locator, exact excerpt, and qualitative
retrieval context. It never accepts a client-supplied document URL or arbitrary
chunk target.

The panel is keyboard-operable, keeps visible focus, and uses text plus icons
for status rather than color alone.

### Evidence strength

Evidence strength is qualitative:

- `strong`: support spans more than one source document
- `moderate`: support spans multiple retrieved passages
- `limited`: support relies on one retrieved passage
- `unsupported`: no valid retrieved passage supports the material claim

These states describe the available evidence set. They do not score investment
quality, predict correctness, or approve a conclusion.

## Security and privacy

- Run reads remain filtered by user, workspace, and run ID.
- Citation targets remain limited to the run's stored retrieval allow-list.
- Supabase service-role credentials remain server-only.
- Raw prompts are not added to citation data or telemetry.
- Source document text is stored only as a bounded excerpt already returned to
  the owner-scoped generation workflow.
- No citation or evidence-strength state constitutes financial advice or user
  approval.

## Consequences

- The structured research schema, prompt, and workflow versions advance.
- Deterministic generation and fixtures must produce claim-level mappings.
- Existing Phase 3 run records remain historical v1 artifacts.
- Phase 5 can normalize feedback and approval history without changing the
  Phase 4 trust semantics.

## Acceptance

- Every material claim is either supported by an active-run chunk or visibly
  unsupported.
- Selecting a citation reveals the matching excerpt and page.
- Forged chunk IDs or citation metadata fail validation and receive at most one
  repair attempt.
- A run owned by another user or workspace remains unavailable.
