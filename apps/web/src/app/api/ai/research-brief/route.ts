import { NextResponse } from "next/server";

import {
  createDeterministicFilingSummary,
  filingSummaryRequestSchema,
  filingSummarySchema,
} from "@/lib/ai/research-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const parsedRequest = filingSummaryRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Ticker and prompt must match the Phase 6 research contract." } },
      { status: 400 },
    );
  }

  const summary = filingSummarySchema.parse(createDeterministicFilingSummary(parsedRequest.data));

  return NextResponse.json({
    data: summary,
    meta: {
      mode: "deterministic-fixture",
      liveAiGatewayCall: false,
      toolRuns: [
        {
          name: "getFilingChunks",
          status: "success",
          sourceCount: summary.retrievedChunks.length,
          provider: summary.dataFreshness.provider,
          capturedAt: summary.dataFreshness.capturedAt,
        },
        {
          name: "saveResearchBrief",
          status: "deferred",
          reason: "Supabase persistence remains optional in deterministic local mode.",
        },
      ],
    },
  });
}
