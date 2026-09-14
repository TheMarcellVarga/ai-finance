import { NextResponse } from "next/server";
import { z } from "zod";

import { searchRealProviderAssets } from "@/lib/finance-api";

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  assetClass: z.string().trim().max(64).optional(),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).optional(),
  region: z.string().trim().max(32).optional(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
  exchange: z.string().trim().max(32).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = searchSchema.safeParse({
    q: params.get("q") ?? "",
    assetClass: params.get("assetClass") ?? undefined,
    countryCode: params.get("countryCode") ?? undefined,
    region: params.get("region") ?? undefined,
    currency: params.get("currency") ?? undefined,
    exchange: params.get("exchange") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Asset search filters are invalid." } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await searchRealProviderAssets({
      query: parsed.data.q,
      assetClass: parsed.data.assetClass,
      countryCode: parsed.data.countryCode?.toUpperCase(),
      region: parsed.data.region,
      currency: parsed.data.currency?.toUpperCase(),
      exchange: parsed.data.exchange,
      limit: parsed.data.limit,
    }));
  } catch (error) {
    return NextResponse.json(
      { error: { code: "asset_search_unavailable", message: error instanceof Error ? error.message : "Global asset search is unavailable." } },
      { status: 502 },
    );
  }
}
