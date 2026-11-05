# Interview presentation scope

The interview path is Overview → Markets → Portfolio → Plan → Learn. Keep the explanation focused on market context, holdings, and transparent contribution scenarios. Scenarios assume zero investment return and are not advice.

The presentation pass removes duplicate overview destination cards, AI usage from the financial overview, workspace particle effects, notification shortcuts, commercial pricing promotion, and long settings implementation descriptions. Market geography is optional; country enrichment runs when that view is opened. Existing user records and finance/AI API contracts are preserved.

## Deliberately unavailable

- Paid subscriptions and upgrades: disabled; no checkout is advertised.
- Account-wide data export and email alerts: disabled in Settings.
- The older risk-report generation/save panel: disabled because its action returned status without displaying a generated report. The calculated risk explanation remains explicitly labeled as calculation, not AI generation.
- Document research: disabled when its private workspace cannot load. Existing source retrieval and structured research remain available when storage is connected.
- Portfolio entry: disabled during service outages and requests. Refresh retries the service; an empty portfolio is treated as an empty state, not an outage.
- External model calls remain disabled by existing server configuration. No provider spending was enabled by this pass.

## Verification and environment

- Web lint, production build, and final TypeScript check passed.
- Existing goal-scenario, structured research, review, Markdown export, and overview-chart tests: 20 passed.
- Public landing page inspected at mobile and desktop sizes; pricing preview inspected with a native disabled subscription button.
- The existing Clerk/Google sign-in flow was completed in Chrome; the signed-in overview, portfolio entry, and planner empty states were checked. Authentication remains enabled.
- Local Supabase was restored without resetting volumes. The machine had filled its disk and OrbStack stopped with an I/O error; clearing generated build/npm package caches allowed recovery. The pending `202609260001` migration was applied transactionally and its RLS remains enabled.
- Use `npm run dev`; web defaults to `http://localhost:3020` and API to `http://127.0.0.1:8120`. Other projects retain ports 3000 and 8080.

Do not describe this pass as a complete production-readiness or live-provider audit. The live runtime was verified using a separate development identity, including provider-backed portfolio creation, web-to-Go reads, goal calculations, persistent research upload/processing, and cross-owner denial. The temporary portfolio was removed. No personal holdings were inserted.

## Second verification pass

Direct component-render checks confirm that an offline portfolio disables entry without claiming there are no holdings; a connected, empty portfolio still allows entry. Export, alerts, document research without storage, and the older report action render native disabled buttons. Refresh is disabled while a holding is being saved to avoid overlapping reads and writes. Portfolio validation errors no longer claim the market service is down. The local Supabase outage was subsequently resolved and the live integration checks below passed.

## Runtime recovery verification

- Existing data retained; local Postgres and Supabase gateway healthy.
- Project API, web app, and persistent research worker running. A cold application start through `npm run dev` was verified; it launches all three on the documented ports.
- Provider-backed AAPL portfolio created and read through the Next.js BFF under a temporary test identity, then deleted.
- A second test identity cannot read that portfolio or its private research workspace.
- Goal scenario completed through the running API without model calls.
- Synthetic text document uploaded and processed to `ready` with Postgres persistence.
- Startup rejects web/API ports owned by unrelated projects.
- Paid AI remains disabled. Account sign-in is working through the existing Google/Clerk configuration.
