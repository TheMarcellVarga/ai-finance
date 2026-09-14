# Demo Walkthrough Script

## Setup

Start the local stack:

```bash
scripts/dev-local
```

If a Next dev server is already running, use that server and confirm the Go API is healthy:

```bash
curl -fsS http://127.0.0.1:8080/v1/health
```

## Walkthrough

1. Open `/`.
   - Say: "Aperture is an AI financial research workspace, not a trading bot or brokerage product."
   - Show the source, freshness, and advice-boundary signals in the hero preview.

2. Open `/product`.
   - Say: "The product is built around a golden path: load a portfolio, inspect exposure, generate cited AI research, and save the result."
   - Point out portfolio workspace, research room, filing intelligence, and goal scenarios.

3. Open `/app/portfolio`.
   - Refresh provider-backed data.
   - Show holdings, allocation, concentration, intraday chart, provider freshness, and the decision-support disclaimer.
   - Say: "The browser does not compute authoritative finance state. The UI calls server routes backed by the Go finance API."

4. Open `/app/monitors`.
   - Move through equities, fixed income, funds, currencies, commodities, real estate, derivatives, private-market proxies, cash/rates, protection/contracts, and the dedicated crypto monitor.
   - Say: "Each monitor uses a free public source, shows its quote convention and freshness, and marks proxy data instead of implying coverage we do not have."

5. Open `/app/research`.
   - Show filing highlights, material risk review, and retrieved chunks.
   - Say: "Phase 6 uses deterministic fixtures locally but keeps the final contract: citations, freshness, assumptions, and safety labels."

6. Open `/app/goals`.
   - Show milestones, contribution scenarios, and educational challenges.
   - Say: "Goal planning is framed as scenario education and research discipline, not a promise of returns."

7. Open `/app/risk`.
   - Show concentration, allocation, limitations, and review actions.
   - Say: "The risk explainer gives review areas, not buy or sell instructions."

8. Open `/app/billing`.
   - Show plan limits and usage period.
   - Say: "Entitlements are server-enforced and route handlers check usage before AI generation."

9. Close with the engineering story.
   - Next.js owns product and AI UX.
   - Go owns finance APIs, ownership, calculations, rate limits, and audit behavior.
   - Supabase stores user-owned finance data, AI persistence, usage, billing metadata, and research chunks.
   - External AI calls are disabled by default and require explicit opt-in.

## Verification Commands

```bash
cd services/api && go test ./...
scripts/validate-supabase-migrations
scripts/generate-openapi-client
cd apps/web && npm run lint && npm run build
scripts/run-ai-evals
scripts/check-ai-safety-fixtures
scripts/verify-phase7-security
```

## Live Demo Caveats

- Live AI provider calls are disabled unless `AI_EXTERNAL_CALLS_ENABLED=true` is explicitly configured.
- Vercel AI Gateway verification is intentionally skipped locally to avoid billing blockers.
- Live Stripe and Clerk webhook delivery requires configured deployment secrets.
- Supabase persistence verification requires server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
