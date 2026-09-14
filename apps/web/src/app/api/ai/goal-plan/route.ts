import { NextResponse } from "next/server";

import { getPortfolioSnapshot } from "@/lib/ai/portfolio-tools";
import { createGoalScenarioPlan, goalPlanRequestSchema, goalPlanSchema } from "@/lib/ai/research-intelligence";
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

  const parsedRequest = goalPlanRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Goal inputs must match the Phase 6 goal-planner contract." } },
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
  const rateLimit = await checkRateLimit({ key: `ai:goal_plan:${authToken}`, windowSeconds: 60, max: 12 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Goal planner requests are temporarily rate-limited.", resetAt: rateLimit.resetAt } },
      { status: 429 },
    );
  }
  const usageGate = await checkUsageLimit({ authToken, feature: "goal_plan" });
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
      requestAuthorization: `Bearer ${authToken}`,
    });
    const plan = createGoalScenarioPlan(parsedRequest.data, snapshot);
    const parsedPlan = "goalName" in plan ? goalPlanSchema.parse(plan) : plan;
    const usage = await recordUsageEvent({
      authToken,
      feature: "goal_plan",
      metadata: { mode: "portfolio_scenario_calculator", riskPreference: parsedRequest.data.riskPreference },
    });

    return NextResponse.json({
      data: parsedPlan,
      meta: {
        mode: "portfolio_scenario_calculator",
        liveAiGatewayCall: false,
        toolRuns: [
          {
            name: "getPortfolioSnapshot",
            status: "success",
            provider: snapshot.dataFreshness.provider,
            freshness: snapshot.dataFreshness.freshness,
          },
          {
            name: "createGoalDraft",
            status: "success",
            safetyLabel: parsedPlan.safetyLabel,
          },
        ],
        usage: { entitlement: usageGate, persistence: usage },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "goal_plan_failed", message: error instanceof Error ? error.message : "The goal scenario could not be calculated." } },
      { status: 502 },
    );
  }
}
