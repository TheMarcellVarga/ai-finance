import { NextRequest, NextResponse } from "next/server";

import {
  loadCryptoMonitor,
  normalizeCryptoMonitorInterval,
  normalizeCryptoMonitorLimit,
  normalizeCryptoMonitorScope,
  normalizeCryptoMonitorProvider,
} from "@/lib/crypto-monitor";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const interval = normalizeCryptoMonitorInterval(request.nextUrl.searchParams.get("interval"));
  const limit = normalizeCryptoMonitorLimit(request.nextUrl.searchParams.get("limit"));
  const scope = normalizeCryptoMonitorScope(request.nextUrl.searchParams.get("scope"));
  const provider = normalizeCryptoMonitorProvider(request.nextUrl.searchParams.get("provider"), scope);

  try {
    const payload = await loadCryptoMonitor(interval, limit, provider, scope);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "crypto_market_data_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "Crypto market data is temporarily unavailable.",
        },
      },
      { status: 502 },
    );
  }
}
