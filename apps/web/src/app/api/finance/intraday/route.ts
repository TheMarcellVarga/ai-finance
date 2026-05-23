import { NextRequest, NextResponse } from "next/server";

import { loadIntradayChart } from "@/lib/finance-api";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  const interval = request.nextUrl.searchParams.get("interval") ?? "5min";

  if (!ticker) {
    return NextResponse.json(
      { error: { code: "missing_ticker", message: "Ticker is required." } },
      { status: 400 },
    );
  }

  try {
    const payload = await loadIntradayChart(ticker, interval);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "market_data_unavailable",
          message: error instanceof Error ? error.message : "Intraday market data is unavailable.",
        },
      },
      { status: 502 },
    );
  }
}
