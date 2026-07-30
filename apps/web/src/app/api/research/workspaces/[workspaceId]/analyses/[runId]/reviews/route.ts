import { NextResponse } from "next/server";

import {
  analysisReviewEventSchema,
  appendAnalysisReviewEventSchema,
} from "@/lib/ai/research-review";
import {
  appendAnalysisReviewEvent,
  listAnalysisReviewEvents,
} from "@/lib/research-api";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ workspaceId: string; runId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { workspaceId, runId } = await context.params;
    const result = await listAnalysisReviewEvents(
      workspaceId,
      runId,
      await authenticatedTokenFromRequest(request),
    );
    if (
      result.status >= 200 &&
      result.status < 300 &&
      "data" in result.payload
    ) {
      const events = analysisReviewEventSchema.array().parse(result.payload.data);
      return NextResponse.json(
        { data: events, meta: result.payload.meta },
        { status: result.status },
      );
    }
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "analysis_reviews_unavailable",
          message: "The human review history could not be loaded.",
        },
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const parsed = appendAnalysisReviewEventSchema.safeParse(
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_review_event",
            message: "The human review action is invalid.",
          },
        },
        { status: 400 },
      );
    }
    const { workspaceId, runId } = await context.params;
    const result = await appendAnalysisReviewEvent(
      workspaceId,
      runId,
      await authenticatedTokenFromRequest(request),
      parsed.data,
    );
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_json",
            message: "Request body must be valid JSON.",
          },
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "analysis_review_unavailable",
          message: "The human review action could not be stored.",
        },
      },
      { status: 502 },
    );
  }
}
