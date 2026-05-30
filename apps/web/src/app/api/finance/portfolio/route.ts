import { NextResponse } from "next/server";

import { loadRealProviderPortfolio } from "@/lib/finance-api";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

export async function POST(request: Request) {
  try {
    const payload = await loadRealProviderPortfolio(await authenticatedTokenFromRequest(request));
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "finance_api_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "The Go finance API is not reachable from the Next.js server route.",
        },
      },
      { status: 502 },
    );
  }
}
