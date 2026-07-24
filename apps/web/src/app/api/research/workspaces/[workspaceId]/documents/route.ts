import { NextResponse } from "next/server";

import {
  proxyResearchDocuments,
  uploadResearchDocument,
} from "@/lib/research-api";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

type RouteContext = { params: Promise<{ workspaceId: string }> };

function proxyResult(result: Awaited<ReturnType<typeof proxyResearchDocuments>>) {
  return NextResponse.json(result.payload, { status: result.status });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { workspaceId } = await context.params;
    return proxyResult(
      await proxyResearchDocuments(
        workspaceId,
        await authenticatedTokenFromRequest(request),
      ),
    );
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "research_api_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "The research API is unavailable.",
        },
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspaceId } = await context.params;
    const result = await uploadResearchDocument(
      workspaceId,
      await authenticatedTokenFromRequest(request),
      await request.formData(),
    );
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    return NextResponse.json(
      {
        error: {
          code: "research_upload_unavailable",
          message:
            error instanceof Error
              ? error.message
              : "The document upload could not be completed.",
        },
      },
      { status: 502 },
    );
  }
}
