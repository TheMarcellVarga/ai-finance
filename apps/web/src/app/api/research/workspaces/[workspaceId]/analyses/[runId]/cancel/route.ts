import { NextResponse } from "next/server";

import { abortResearchRun } from "@/lib/ai/structured-research-cancellation";
import { requestAnalysisCancellation } from "@/lib/ai/structured-research-persistence";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspaceId, runId } = await context.params;
    const run = await requestAnalysisCancellation({
      authToken: await authenticatedTokenFromRequest(request),
      workspaceId,
      runId,
    });
    if (!run) {
      return NextResponse.json(
        {
          error: {
            code: "analysis_run_not_found",
            message: "Research analysis run was not found.",
          },
        },
        { status: 404 },
      );
    }
    const signalled = abortResearchRun(runId);
    return NextResponse.json({
      data: {
        runId,
        status: run.status,
        cancelRequestedAt: run.cancelRequestedAt,
      },
      meta: { inProcessAbortSignalled: signalled },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "analysis_cancel_failed",
          message: "The research run could not be cancelled.",
        },
      },
      { status: 502 },
    );
  }
}

