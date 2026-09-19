import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { cryptoMonitorIntervals, type CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
import { loadDirectFreeAssetMonitor } from "@/lib/free-market-monitors";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  assetClass: z.string().trim().min(1).max(40),
  interval: z.enum(cryptoMonitorIntervals).default("1d"),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    assetClass: request.nextUrl.searchParams.get("class") ?? "",
    interval: request.nextUrl.searchParams.get("interval") ?? "1d",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_monitor_class", message: "A valid asset-class monitor is required." } }, { status: 400 });
  }

  try {
    return NextResponse.json(await loadDirectFreeAssetMonitor(parsed.data.assetClass, parsed.data.interval as CryptoMonitorInterval));
  } catch (error) {
    return NextResponse.json({ error: { code: "asset_monitor_unavailable", message: error instanceof Error ? error.message : "The asset-class monitor is unavailable." } }, { status: 502 });
  }
}
