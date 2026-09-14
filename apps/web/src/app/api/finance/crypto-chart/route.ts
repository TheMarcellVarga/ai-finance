import { NextRequest, NextResponse } from "next/server";

import {
  loadCryptoChart,
  normalizeCryptoMonitorInterval,
  normalizeCryptoMonitorScope,
  normalizeCryptoMonitorProvider,
} from "@/lib/crypto-monitor";

export const dynamic = "force-dynamic";

function normalizeSymbol(value: string | null, provider: ReturnType<typeof normalizeCryptoMonitorProvider>) {
  const symbol = value?.trim().toUpperCase() ?? "";
  const valid = provider === "okx"
    ? /^[A-Z0-9]+-USDT$/.test(symbol)
    : /^[A-Z0-9]+\/(?:USD|USDC|USDT)$/.test(symbol);
  return valid ? symbol : null;
}

export async function GET(request: NextRequest) {
  const scope = normalizeCryptoMonitorScope(request.nextUrl.searchParams.get("scope"));
  const provider = normalizeCryptoMonitorProvider(request.nextUrl.searchParams.get("provider"), scope);
  const symbol = normalizeSymbol(request.nextUrl.searchParams.get("symbol"), provider);
  const interval = normalizeCryptoMonitorInterval(request.nextUrl.searchParams.get("interval"));

  if (!symbol) {
    return NextResponse.json(
      { error: { code: "invalid_crypto_symbol", message: "A valid public spot crypto symbol is required." } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await loadCryptoChart(symbol, interval, provider, scope));
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "crypto_chart_unavailable",
          message: error instanceof Error ? error.message : "Crypto chart data is temporarily unavailable.",
        },
      },
      { status: 502 },
    );
  }
}
