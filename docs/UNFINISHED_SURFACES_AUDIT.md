# Unfinished Surfaces Audit

## Purpose

This audit supports Phase 9: Completion And No-Placeholder Pass. The current project has a strong architecture and several working flows, but it is not portfolio-ready while linked routes still look reserved, static, fixture-only, or unfinished.

## User-Facing Blockers

| Surface | Current issue | Required Phase 9 fix |
| --- | --- | --- |
| `/app/watchlist` | Status-only page, no watchlist interaction. | Build list/create/add-item UI backed by the Go watchlist API, with provider freshness and failure states. |
| `/app/settings` | Status-only page, no controls. | Add concrete account/privacy/export/notification/provider-mode controls, even if some actions are local-demo only. |
| `/blog` | Placeholder case-study content. | Publish real case-study notes or remove the route from public navigation. |
| `/privacy` | Placeholder privacy copy. | Write a concrete privacy policy aligned with Clerk, Supabase, AI persistence, analytics scrubbing, and audit logs. |
| `/terms` | Placeholder terms copy. | Write concrete terms for research-only AI output, usage limits, data freshness, no advice, and no trade execution. |
| `/app/research` | Static deterministic filing summary only. | Add route-backed generation, saved research affordance, source state, and empty/error/loading states. |
| `/app/goals` | Static deterministic goal plan only. | Add goal input/generation flow, saved goal draft state, and safe gamification state. |
| `/app/risk` | Static deterministic risk demo. | Connect to the active portfolio snapshot and show assumptions/freshness from the selected portfolio. |
| `/app/billing` | Entitlement display exists, but checkout/customer portal is not finished. | Add configured Stripe actions or hide upgrade actions until live billing is configured. |
| Public navigation | Routes can lead to placeholder surfaces. | Remove links or finish each linked route. |

## Copy Blockers

The normal user-facing app should not contain:

- "skeleton"
- "scaffold"
- "placeholder"
- "future work"
- "coming soon"
- "not implemented"
- "todo"
- "deferred"

Internal docs may use these terms only inside roadmap/audit context.

## Phase 9 Done Criteria

- Every linked route has finished content and expected empty/loading/error states.
- Every visible fixture mode label is reframed as "local demo/test mode" where needed and hidden from recruiter screenshots unless intentionally explained.
- Screenshots for desktop and mobile show no reserved pages.
- `npm run lint`, `npm run build`, Go tests, AI evals, safety fixtures, and Phase 7 security verification all pass.
- The portfolio case study is updated after the cleanup pass with fresh screenshots.
