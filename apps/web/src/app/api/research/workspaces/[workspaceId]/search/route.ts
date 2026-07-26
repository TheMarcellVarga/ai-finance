import { NextResponse } from "next/server";

import { searchResearchEvidence } from "@/lib/research-api";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspaceId } = await context.params;
    const body = (await request.json()) as {
      query?: unknown;
      limit?: unknown;
      documentIds?: unknown;
    };
    const result = await searchResearchEvidence(
      workspaceId,
      await authenticatedTokenFromRequest(request),
      {
        query: typeof body.query === "string" ? body.query : "",
        limit: typeof body.limit === "number" ? body.limit : undefined,
        documentIds: Array.isArray(body.documentIds)
          ? body.documentIds.filter(
              (documentId): documentId is string =>
                typeof documentId === "string",
            )
          : undefined,
      },
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
          code: "research_search_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "Evidence search could not be completed.",
        },
      },
      { status: 502 },
    );
  }
}
