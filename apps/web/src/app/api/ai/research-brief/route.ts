import { NextResponse } from "next/server";

import {
  createDeterministicFilingSummary,
  filingSummaryRequestSchema,
  filingSummarySchema,
} from "@/lib/ai/research-intelligence";
import { checkUsageLimit, recordUsageEvent } from "@/lib/billing/usage";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

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

  let authToken: string;
  try {
    authToken = await authenticatedTokenFromRequest(request);
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    throw error;
  }
  const rateLimit = await checkRateLimit({ key: `ai:filing_summary:${authToken}`, windowSeconds: 60, max: 12 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Research brief requests are temporarily rate-limited.", resetAt: rateLimit.resetAt } },
      { status: 429 },
    );
  }
  const usageGate = await checkUsageLimit({ authToken, feature: "filing_summary" });
  if (!usageGate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "entitlement_limit_reached",
          message: usageGate.message,
          plan: usageGate.plan,
          used: usageGate.used,
          limit: usageGate.limit,
        },
      },
      { status: 402 },
    );
  }

  const summary = filingSummarySchema.parse(createDeterministicFilingSummary(parsedRequest.data));
  const usage = await recordUsageEvent({
    authToken,
    feature: "filing_summary",
    metadata: { ticker: parsedRequest.data.ticker, mode: "deterministic-fixture" },
  });

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
          status: usage.status,
          reason: usage.status === "not_configured" ? "Supabase persistence remains optional in deterministic local mode." : undefined,
        },
      ],
      usage: { entitlement: usageGate, persistence: usage },
    },
  });
}
