# Demo Walkthrough Script

## Setup

Start the local stack:

```bash
scripts/dev-local
```

If a Next dev server is already running, use that server and confirm the Go API is healthy:

```bash
curl -fsS http://127.0.0.1:8120/v1/health
```

## Walkthrough

1. Open `/`.
   - Say: "Aperture helps people research markets, review holdings, and compare goal scenarios. It is not a brokerage or an advice service."
   - Introduce the five destinations: Overview, Markets, Portfolio, Plan, and Learn.

2. Open `/app` (Overview).
   - Show portfolio state, market context, and freshness where available.
   - Explain that unavailable services are surfaced as unavailable rather than replaced with invented values.

3. Open `/app/monitors` (Markets).
   - Search and filter the supported asset universe; inspect monitor state, source, freshness, and coverage limits.
   - Say: "The monitor gives market context. Provider gaps and proxy instruments are labeled, and the page does not tell users what to trade."

4. Open `/app/portfolio`.
   - Show provider-backed holdings, allocation, concentration, and the portfolio context available for review.
   - Say: "The browser does not compute authoritative finance state. The UI calls server routes backed by the Go finance API."

5. Open `/app/goals` (Plan).
   - Show the goal scenario and the assumptions behind it.
   - Say: "These are user-controlled illustrations, not forecasts or promises."

6. Open `/app/learn`.
   - Show how lessons and labs connect to market and planning questions.

7. Optionally open `/app/research` for the supporting document workflow.
   - Show private source upload, cited analysis, human section review, and reviewed export when local storage and the API are available.
   - Clarify that this is a supporting research capability, not the primary navigation story.

8. Close with the engineering story.
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
