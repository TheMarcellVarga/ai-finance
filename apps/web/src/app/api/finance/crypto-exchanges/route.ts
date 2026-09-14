import { NextResponse } from "next/server";

import {
  CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL,
  CRYPTO_MONITOR_SCOPE,
  CRYPTO_MONITOR_SCOPE_LABEL,
  getCryptoExchangeCatalog,
  normalizeCryptoMonitorScope,
} from "@/lib/crypto-exchanges";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const scope = normalizeCryptoMonitorScope(new URL(request.url).searchParams.get("scope"));

  return NextResponse.json({
    data: getCryptoExchangeCatalog(scope),
    meta: {
      capturedAt: new Date().toISOString(),
      publicMarketDataOnly: true,
      scope,
      scopeLabel: scope === CRYPTO_MONITOR_SCOPE ? CRYPTO_MONITOR_SCOPE_LABEL : CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL,
      scopeDefault: CRYPTO_MONITOR_SCOPE,
      scopeSelectable: true,
    },
  });
}
