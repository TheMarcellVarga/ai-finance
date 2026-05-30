import { NextResponse } from "next/server";
import { z } from "zod";

import { checkUsageLimit, recordUsageEvent } from "@/lib/billing/usage";
import { writeAuditLog } from "@/lib/security/audit";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  decodeJwtSubject,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const researchSaveRequestSchema = z.object({
  title: z.string().min(3).max(120),
  sourceType: z.enum(["portfolio_brief", "filing_summary", "goal_plan", "risk_explainer"]),
  citationCount: z.number().int().min(0).max(100),
});

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

  const parsedRequest = researchSaveRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Saved research metadata must match the research-room contract." } },
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
  const rateLimit = await checkRateLimit({ key: `research_save:${authToken}`, windowSeconds: 60, max: 20 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Research save requests are temporarily rate-limited.", resetAt: rateLimit.resetAt } },
      { status: 429 },
    );
  }

  const usageGate = await checkUsageLimit({ authToken, feature: "research_save" });
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

  const usage = await recordUsageEvent({
    authToken,
    feature: "research_save",
    metadata: {
      sourceType: parsedRequest.data.sourceType,
      citationCount: parsedRequest.data.citationCount,
    },
  });
  const audit = await writeAuditLog({
    clerkUserId: decodeJwtSubject(authToken),
    action: "research.saved",
    entityType: "research_save",
    request,
    metadata: {
      sourceType: parsedRequest.data.sourceType,
      citationCount: parsedRequest.data.citationCount,
      usageStatus: usage.status,
    },
  });

  return NextResponse.json({
    data: {
      status: usage.status === "recorded" ? "saved" : "accepted_in_fixture_mode",
      title: parsedRequest.data.title,
    },
    meta: {
      usage: { entitlement: usageGate, persistence: usage },
      audit,
      disclaimer: "Saved research is decision-support context only and is not financial advice.",
    },
  });
}
