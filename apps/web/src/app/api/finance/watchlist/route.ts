import { NextResponse } from "next/server";
import { z } from "zod";

import { addRealProviderWatchlistItem, loadRealProviderWatchlist } from "@/lib/finance-api";

const addWatchlistItemSchema = z.object({
  ticker: z.string().trim().min(1).max(12),
  notes: z.string().trim().max(180).optional(),
});

export async function GET() {
  try {
    const payload = await loadRealProviderWatchlist();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "finance_api_unavailable",
          message: error instanceof Error ? error.message : "The Go finance API is not reachable from the Next.js server route.",
        },
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Request body must be valid JSON." } },
      { status: 400 },
    );
  }

  const parsedRequest = addWatchlistItemSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Ticker and notes must match the watchlist item contract." } },
      { status: 400 },
    );
  }

  try {
    const payload = await addRealProviderWatchlistItem(parsedRequest.data.ticker.toUpperCase(), parsedRequest.data.notes);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "watchlist_item_rejected",
          message: error instanceof Error ? error.message : "The watchlist item could not be added.",
        },
      },
      { status: 502 },
    );
  }
}
