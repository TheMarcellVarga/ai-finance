# API Spec

The Go service exposes versioned REST APIs under `/v1`. Next.js may wrap selected endpoints under same-origin route handlers where UI integration benefits from it.

## API Principles

- OpenAPI 3.1 is the contract source for request/response schemas.
- Every authenticated endpoint validates Clerk identity, maps to `profiles.id`, checks entitlements, enforces ownership, and rate-limits sensitive operations.
- Errors are structured and do not leak secrets, raw prompts, holdings details, or internal stack traces.
- Finance APIs return provider and freshness metadata when values depend on cached or external data.

## Go API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/health` | Service health |
| `GET` | `/v1/assets/search?q=&assetClass=&countryCode=&region=&currency=&exchange=&limit=` | Provider-backed global asset search with canonical class and ISO country filters |
| `GET` | `/v1/assets/catalog` | Canonical asset-class taxonomy, region options, ISO country coverage, and currency standard |
| `GET` | `/v1/assets/:ticker/quote` | Latest real-provider quote |
| `GET` | `/v1/assets/:ticker/intraday?interval=5min` | Intraday real-provider price series |
| `GET` | `/v1/assets/:ticker` | Asset profile |
| `GET` | `/v1/assets/:ticker/prices?range=` | Cached price history |
| `GET` | `/v1/portfolios` | List user portfolios |
| `POST` | `/v1/portfolios` | Create portfolio |
| `GET` | `/v1/portfolios/:id` | Portfolio detail |
| `PATCH` | `/v1/portfolios/:id` | Update portfolio |
| `DELETE` | `/v1/portfolios/:id` | Delete portfolio |
| `POST` | `/v1/portfolios/:id/holdings` | Add or update holding |
| `GET` | `/v1/watchlists` | List user watchlists |
| `POST` | `/v1/watchlists` | Create watchlist |
| `POST` | `/v1/watchlists/:id/items` | Add watchlist item |
| `GET` | `/v1/research/workspaces` | List owner-scoped research workspaces |
| `POST` | `/v1/research/workspaces` | Create an owner-scoped research workspace |
| `GET` | `/v1/research/workspaces/:workspaceId` | Get an owner-scoped research workspace |
| `GET` | `/v1/research/workspaces/:workspaceId/documents` | List workspace documents and processing state |
| `POST` | `/v1/research/workspaces/:workspaceId/documents` | Validate, privately store, and queue a PDF or text document |
| `GET` | `/v1/research/workspaces/:workspaceId/documents/:documentId` | Get document processing state |
| `POST` | `/v1/research/workspaces/:workspaceId/documents/:documentId/retry` | Idempotently retry a failed document |
| `GET` | `/v1/research/workspaces/:workspaceId/documents/:documentId/pages` | List page-aware parsed records |
| `GET` | `/v1/research/workspaces/:workspaceId/analysis-runs/:runId/review-events` | List append-only owner-scoped human review events |
| `POST` | `/v1/research/workspaces/:workspaceId/analysis-runs/:runId/review-events` | Append a validated edit, decision, or incorrect-citation event |
| `POST` | `/v1/goals` | Create goal scenario |
| `POST` | `/v1/goals/:id/generate-plan` | Generate safe goal draft |
| `GET` | `/v1/ai/context/portfolio/:portfolioId` | AI tool-safe portfolio snapshot |
| `POST` | `/v1/ai/tool-results` | Persist tool output summary |
| `GET` | `/v1/usage` | Current user usage and limits |

## Next.js Route Handlers

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/ai/portfolio-brief` | Structured portfolio brief with fixture mode by default and dormant live provider support |
| `POST` | `/api/ai/research-brief` | Deterministic filing/research brief route with citations and freshness metadata |
| `POST` | `/api/ai/goal-plan` | Safe educational goal scenario route with usage checks |
| `POST` | `/api/ai/risk-explainer` | Portfolio risk explanation route with assumptions and disclaimer |
| `GET` | `/api/finance/intraday` | Same-origin intraday chart proxy backed by the finance API |
| `GET` | `/api/finance/assets/search?q=&assetClass=&countryCode=` | Same-origin global asset picker proxy backed by the finance API |
| `GET` | `/api/finance/crypto-exchanges?scope=singapore_mas_dpt\|global` | Server-generated catalog. The Singapore / MAS-authorised DPT scope is the default and is represented by the UI checkbox; `global` explicitly opts into all supported public providers with ticker and OHLCV capabilities. |
| `GET` | `/api/finance/crypto-monitor?provider={exchangeId}&scope=singapore_mas_dpt\|global&interval=4h&limit=20` | Public spot crypto monitor. Omitted scope defaults to Singapore / MAS-authorised providers; `global` opts into the broader catalog. The provider ID must come from `/api/finance/crypto-exchanges` for the selected scope. The production-safe default is 20 markets because each selected market may require several candle-history requests in a short-lived Vercel function; callers may request up to 80 when their runtime allows it. OKX uses the native adapter and other catalog entries use the server-only CCXT adapter. Supported intervals, in chronological order: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `12h`, `1d`, `3d`, `1w`. |
| `POST` | `/api/finance/portfolio` | Same-origin provider-backed portfolio fixture route for local demo flows |
| `POST` | `/api/research/saves` | Research-room save route with entitlement and usage checks |
| `GET` | `/api/research/workspaces/:workspaceId/documents` | Authenticated document-status BFF proxy |
| `POST` | `/api/research/workspaces/:workspaceId/documents` | Authenticated multipart upload BFF proxy |
| `POST` | `/api/research/workspaces/:workspaceId/documents/:documentId/retry` | Authenticated retry BFF proxy |
| `POST` | `/api/research/workspaces/:workspaceId/analyses` | Start an owner-scoped structured earnings review and stream typed NDJSON events with claim-level citation trust |
| `GET` | `/api/research/workspaces/:workspaceId/analyses/:runId` | Read an owner-scoped stored structured-generation run and its immutable evidence snapshot |
| `POST` | `/api/research/workspaces/:workspaceId/analyses/:runId/cancel` | Persist cancellation and abort the in-process generation run |
| `GET` | `/api/research/workspaces/:workspaceId/analyses/:runId/reviews` | Read typed human review history |
| `POST` | `/api/research/workspaces/:workspaceId/analyses/:runId/reviews` | Validate and append a human edit, decision, or citation report |
| `GET` | `/api/research/workspaces/:workspaceId/analyses/:runId/export` | Download a server-rendered reviewed Markdown artifact |
| `POST` | `/api/webhooks/stripe` | Stripe webhook with signature verification |
| `POST` | `/api/webhooks/clerk` | Clerk webhook with signature verification |

## Error Shape

Planned response:

```json
{
  "error": {
    "code": "ownership_denied",
    "message": "The requested resource is unavailable.",
    "requestId": "req_..."
  }
}
```

Do not expose whether another user's resource exists.

## Structured Research Citation Contract

Completed and partial `earnings_review` results use
`structured-research-v2`. Material claims include a support state, a
qualitative evidence-strength label, and zero or more retrieved chunk IDs.
Supported claims must map to citations whose metadata exactly matches the
active retrieval result. Unsupported claims have no citation target and remain
visible to the user. The response also includes application-computed material
claim coverage counts, percentage, and state.

## Human Review Contract

Review events are append-only and bound to the exact SHA-256 digest of a
terminal analysis run's immutable output. Supported event types are
`edit_saved`, `accepted`, `rejected`, and `citation_flagged`. Decisions can
reference an earlier edit event for the same section; citation feedback must
reference a citation from the active output. Idempotency keys make safe retries
return the existing event without granting update or delete permission.

## Contract Workflow

1. Define or update OpenAPI schema.
2. Implement Go handler and validation.
3. Generate or validate TypeScript client through `scripts/generate-openapi-client`.
4. Add tests for auth, ownership, validation, and error shape.

## Contract Artifacts

- OpenAPI source: `packages/contracts/openapi/finance-api.yaml`
- Generated TypeScript client: `packages/contracts/src/generated/client.ts`
- Go handlers: `services/api/internal/httpapi`
- Local verification: `scripts/generate-openapi-client`

## Phase 8 API Documentation Notes

The OpenAPI contract currently documents the Go finance API surface. Next.js route handlers are documented here because they are application/BFF routes rather than public Go API endpoints.

Route-level implementation files:

- AI routes: `apps/web/src/app/api/ai/*/route.ts`
- Finance BFF routes: `apps/web/src/app/api/finance/*/route.ts`
- Research save route: `apps/web/src/app/api/research/saves/route.ts`
- Research document routes: `apps/web/src/app/api/research/workspaces/*`
- Webhooks: `apps/web/src/app/api/webhooks/*/route.ts`

Verification commands:

```bash
scripts/generate-openapi-client
cd services/api && go test ./...
cd apps/web && npm run build
```
