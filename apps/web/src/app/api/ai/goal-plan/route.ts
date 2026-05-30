import { NextResponse } from "next/server";

import { createDeterministicGoalPlan, goalPlanRequestSchema, goalPlanSchema } from "@/lib/ai/research-intelligence";
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

  const plan = createDeterministicGoalPlan(parsedRequest.data);
  const parsedPlan = "goalName" in plan ? goalPlanSchema.parse(plan) : plan;
  const usage = await recordUsageEvent({
    authToken,
    feature: "goal_plan",
    metadata: { mode: "deterministic-fixture", riskPreference: parsedRequest.data.riskPreference },
  });

  return NextResponse.json({
    data: parsedPlan,
    meta: {
      mode: "deterministic-fixture",
      liveAiGatewayCall: false,
      toolRuns: [
        {
          name: "getGoalState",
          status: "success",
          provider: "deterministic-goal-fixture",
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
}
