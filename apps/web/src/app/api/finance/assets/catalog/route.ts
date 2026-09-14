import { NextResponse } from "next/server";

import { loadRealProviderAssetCatalog } from "@/lib/finance-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadRealProviderAssetCatalog());
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "asset_catalog_unavailable",
          message: error instanceof Error ? error.message : "The asset catalog is temporarily unavailable.",
        },
      },
      { status: 502 },
    );
  }
}
