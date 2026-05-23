# API Spec

The Go service exposes versioned REST APIs under `/v1`. Next.js may wrap selected endpoints under same-origin route handlers where UI integration benefits from it.

## API Principles

- OpenAPI 3.1 is the contract source for request/response schemas.
- Every authenticated endpoint validates Clerk identity, maps to `profiles.id`, checks entitlements, enforces ownership, and rate-limits sensitive operations.
- Errors are structured and do not leak secrets, raw prompts, holdings details, or internal stack traces.
- Finance APIs return provider and freshness metadata when values depend on cached or external data.

## Initial Routes

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
| `POST` | `/v1/research/brief` | Create research brief request |
| `POST` | `/v1/research/documents` | Ingest research document |
| `GET` | `/v1/research/documents/:id/chunks` | Retrieve document chunks |
| `POST` | `/v1/goals` | Create goal scenario |
| `POST` | `/v1/goals/:id/generate-plan` | Generate safe goal draft |
| `GET` | `/v1/ai/context/portfolio/:portfolioId` | AI tool-safe portfolio snapshot |
| `POST` | `/v1/ai/tool-results` | Persist tool output summary |
| `GET` | `/v1/usage` | Current user usage and limits |

## Next.js Route Handlers

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/ai/chat` | Streaming AI route |
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

## Phase 4 Contract Artifacts

- OpenAPI source: `packages/contracts/openapi/finance-api.yaml`
- Generated TypeScript client: `packages/contracts/src/generated/client.ts`
- Go handlers: `services/api/internal/httpapi`
- Local verification: `scripts/generate-openapi-client`
