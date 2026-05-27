import { NextResponse } from "next/server";

import { createDeterministicGoalPlan, goalPlanRequestSchema, goalPlanSchema } from "@/lib/ai/research-intelligence";

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

  const plan = createDeterministicGoalPlan(parsedRequest.data);
  const parsedPlan = "goalName" in plan ? goalPlanSchema.parse(plan) : plan;

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
    },
  });
}
