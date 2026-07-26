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
| `GET` | `/v1/assets/search?q=` | Ticker and asset search |
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
| `POST` | `/api/finance/portfolio` | Same-origin provider-backed portfolio fixture route for local demo flows |
| `POST` | `/api/research/saves` | Research-room save route with entitlement and usage checks |
| `GET` | `/api/research/workspaces/:workspaceId/documents` | Authenticated document-status BFF proxy |
| `POST` | `/api/research/workspaces/:workspaceId/documents` | Authenticated multipart upload BFF proxy |
| `POST` | `/api/research/workspaces/:workspaceId/documents/:documentId/retry` | Authenticated retry BFF proxy |
| `POST` | `/api/research/workspaces/:workspaceId/analyses` | Start an owner-scoped structured earnings review and stream typed NDJSON events |
| `GET` | `/api/research/workspaces/:workspaceId/analyses/:runId` | Read an owner-scoped stored structured-generation run |
| `POST` | `/api/research/workspaces/:workspaceId/analyses/:runId/cancel` | Persist cancellation and abort the in-process generation run |
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
