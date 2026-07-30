import { NextResponse } from "next/server";

import { analysisReviewEventSchema } from "@/lib/ai/research-review";
import { readAnalysisRun } from "@/lib/ai/structured-research-persistence";
import { buildReviewedMarkdown } from "@/lib/ai/reviewed-markdown";
import { listAnalysisReviewEvents } from "@/lib/research-api";
import { writeAuditLog } from "@/lib/security/audit";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  decodeJwtSubject,
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
    const authToken = await authenticatedTokenFromRequest(request);
    const [run, reviewResult] = await Promise.all([
      readAnalysisRun({ authToken, workspaceId, runId }),
      listAnalysisReviewEvents(workspaceId, runId, authToken),
    ]);
    if (
      !run?.output ||
      reviewResult.status < 200 ||
      reviewResult.status >= 300 ||
      !("data" in reviewResult.payload)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "reviewed_export_not_found",
            message: "The reviewed analysis export was not found.",
          },
        },
        { status: 404 },
      );
    }
    const events = analysisReviewEventSchema
      .array()
      .parse(reviewResult.payload.data);
    const exportedAt = new Date().toISOString();
    const exported = buildReviewedMarkdown({
      runId,
      result: run.output,
      events,
      exportedAt,
    });
    await writeAuditLog({
      clerkUserId: decodeJwtSubject(authToken),
      action: "research_analysis.exported",
      entityType: "research_analysis_run",
      entityId: runId,
      request,
      metadata: {
        acceptedSections: exported.acceptedSections,
        sectionCount: run.output.sections.length,
        fullyReviewed: exported.fullyReviewed,
        citationCount: run.output.citations.length,
      },
    });
    return new Response(exported.markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="aperture-reviewed-${runId}.md"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "reviewed_export_unavailable",
          message: "The reviewed Markdown export could not be created.",
        },
      },
      { status: 502 },
    );
  }
}
