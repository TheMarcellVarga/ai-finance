import { NextResponse } from "next/server";
import { z } from "zod";

import { addRealProviderHolding, createRealProviderPortfolio, loadRealProviderPortfolio } from "@/lib/finance-api";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

const portfolioMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(1).max(80),
    ticker: z.string().trim().min(1).max(12),
    quantity: z.number().int().positive().max(1_000_000),
    averageCostCents: z.number().int().nonnegative().max(100_000_000).optional(),
    notes: z.string().trim().max(180).optional(),
  }),
  z.object({
    action: z.literal("add_holding"),
    portfolioId: z.string().trim().min(1).max(120),
    ticker: z.string().trim().min(1).max(12),
    quantity: z.number().int().positive().max(1_000_000),
    averageCostCents: z.number().int().nonnegative().max(100_000_000).optional(),
    notes: z.string().trim().max(180).optional(),
  }),
]);

function routeError(error: unknown) {
  if (isAuthenticationRequiredError(error)) {
    return authenticationRequiredResponse();
  }
  return NextResponse.json(
    {
      error: {
        code: error instanceof Error && "code" in error ? String(error.code) : "finance_api_unavailable",
        message: error instanceof Error ? error.message : "The Go finance API is not reachable from the Next.js server route.",
      },
    },
    { status: error instanceof Error && "code" in error && error.code === "finance_workspace_empty" ? 404 : 502 },
  );
}

export async function GET(request: Request) {
  try {
    const payload = await loadRealProviderPortfolio(await authenticatedTokenFromRequest(request));
    return NextResponse.json(payload);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, { status: 400 });
  }
  const parsed = portfolioMutationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Portfolio name, ticker, quantity, and optional cost must be valid." } },
      { status: 400 },
    );
  }

  try {
    const authToken = await authenticatedTokenFromRequest(request);
    const input = { ...parsed.data, ticker: parsed.data.ticker.toUpperCase() };
    const payload = input.action === "create"
      ? await createRealProviderPortfolio(input, authToken)
      : await addRealProviderHolding(input, authToken);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
