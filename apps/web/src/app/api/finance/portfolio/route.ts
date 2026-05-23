import { NextResponse } from "next/server";

import { loadRealProviderPortfolio } from "@/lib/finance-api";

export async function POST() {
  try {
    const payload = await loadRealProviderPortfolio();
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
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
