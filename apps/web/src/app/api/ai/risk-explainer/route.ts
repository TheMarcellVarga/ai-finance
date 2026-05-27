import { NextResponse } from "next/server";

import { getPortfolioSnapshot } from "@/lib/ai/portfolio-tools";
import {
  createDeterministicRiskExplainer,
  riskExplainerRequestSchema,
  riskExplainerSchema,
} from "@/lib/ai/research-intelligence";
import { checkUsageLimit, recordUsageEvent } from "@/lib/billing/usage";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { bearerTokenFromRequest } from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fallbackDevToken = process.env.FINANCE_API_DEV_TOKEN ?? "dev:user_demo";

function requestAuthorization(request: Request) {
  return request.headers.get("authorization") ?? `Bearer ${fallbackDevToken}`;
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

  const parsedRequest = riskExplainerRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Portfolio and prompt must match the Phase 6 risk contract." } },
      { status: 400 },
    );
  }

  const authToken = bearerTokenFromRequest(request, fallbackDevToken);
  const rateLimit = await checkRateLimit({ key: `ai:risk_explainer:${authToken}`, windowSeconds: 60, max: 12 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Risk explainer requests are temporarily rate-limited.", resetAt: rateLimit.resetAt } },
      { status: 429 },
    );
  }
  const usageGate = await checkUsageLimit({ authToken, feature: "risk_explainer" });
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

  try {
    const snapshot = await getPortfolioSnapshot({
      portfolioId: parsedRequest.data.portfolioId,
      requestAuthorization: requestAuthorization(request),
    });
    const explanation = createDeterministicRiskExplainer(snapshot, parsedRequest.data.prompt);
    const parsedExplanation = "concentrationSignals" in explanation ? riskExplainerSchema.parse(explanation) : explanation;
    const usage = await recordUsageEvent({
      authToken,
      feature: "risk_explainer",
      metadata: { mode: "deterministic-fixture", portfolioId: parsedRequest.data.portfolioId },
    });

    return NextResponse.json({
      data: parsedExplanation,
      meta: {
        mode: "deterministic-fixture",
        liveAiGatewayCall: false,
        toolRuns: [
          {
            name: "getPortfolioSnapshot",
            status: "success",
            provider: snapshot.dataFreshness.provider,
            capturedAt: snapshot.dataFreshness.capturedAt,
            freshness: snapshot.dataFreshness.freshness,
          },
        ],
        usage: { entitlement: usageGate, persistence: usage },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "risk_explainer_failed",
          message:
            error instanceof Error
              ? error.message
              : "The risk explainer could not be generated from the owner-scoped snapshot.",
        },
      },
      { status: 502 },
    );
  }
}
