# Aperture Web App

Next.js App Router scaffold for the AI Financial Intelligence Workspace.

This app owns:
- marketing routes: `/`, `/product`, `/pricing`, `/security`
- workspace shell routes: `/app`, `/app/portfolio`, `/app/research`, `/app/goals`, `/app/watchlist`, `/app/risk`, `/app/settings`, `/app/billing`
- future Clerk session UX, AI streaming surfaces, Stripe/Clerk webhooks, and BFF routes

It does not own authoritative finance calculations or portfolio data access. Those belong to the planned Go API in `services/api`.

## Commands

```bash
npm run dev -- -p 3100
npm run lint
npm run build
npm audit --omit=dev
```

## Current Scope

Phase 2 scaffold only:
- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui initialization
- dark fintech theme tokens
- responsive marketing and workspace skeletons

Auth, Supabase, Go API integration, Stripe, real AI routes, and data persistence are later roadmap phases.
