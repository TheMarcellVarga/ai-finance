import { NextResponse } from "next/server";

import { readAnalysisRun } from "@/lib/ai/structured-research-persistence";
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
    const run = await readAnalysisRun({
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
    return NextResponse.json({
      data: run,
      meta: { persistence: "owner_scoped" },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "analysis_run_unavailable",
          message: "Research analysis run could not be loaded.",
        },
      },
      { status: 502 },
    );
  }
}

