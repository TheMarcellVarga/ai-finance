# Aperture Web App

Next.js 16 App Router application for Aperture Financial Intelligence. It owns public marketing pages, authenticated workspace rendering, same-origin API routes, AI user experience, and Clerk/Stripe webhook handlers.

The Go service in `services/api` owns authoritative finance APIs, portfolio calculations, provider normalization, and ownership enforcement. Next.js server code calls the Go API; browser code generally talks to Next.js.

## Primary Workspace Routes

- `/app` — Overview
- `/app/monitors` — Markets
- `/app/portfolio` — Portfolio
- `/app/goals` — Plan
- `/app/learn` — Learn

Research, risk, watchlist, evaluations, settings, and billing are supporting surfaces. The app also contains the same-origin BFF and research workflow routes.

## Commands

For the integrated local workspace, run `scripts/dev-local` from the repository root. It starts or reuses the Go API, document worker, and web app on the configured local ports.

For web-only work:

```bash
npm run dev -- -p 3020
npm run lint
npm run build
npm audit --omit=dev
```

External AI calls remain disabled by default. The web app does not contain finance service credentials or authoritative portfolio calculations.
