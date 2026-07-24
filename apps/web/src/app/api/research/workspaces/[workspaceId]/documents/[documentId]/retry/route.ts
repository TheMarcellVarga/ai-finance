import { NextResponse } from "next/server";

import { retryResearchDocument } from "@/lib/research-api";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

type RouteContext = {
  params: Promise<{ workspaceId: string; documentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspaceId, documentId } = await context.params;
    const result = await retryResearchDocument(
      workspaceId,
      documentId,
      await authenticatedTokenFromRequest(request),
    );
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "research_retry_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "The document could not be retried.",
        },
      },
      { status: 502 },
    );
  }
}
