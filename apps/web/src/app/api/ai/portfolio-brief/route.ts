import { generateText, Output, streamText } from "ai";
import { NextResponse } from "next/server";

import {
  buildPortfolioBriefPrompt,
  classifyPromptSafety,
  createDeterministicPortfolioBrief,
  createRefusalBrief,
  portfolioBriefRequestSchema,
  portfolioBriefSchema,
} from "@/lib/ai/portfolio-brief";
import { persistPortfolioBrief } from "@/lib/ai/persistence";
import { getPortfolioSnapshot } from "@/lib/ai/portfolio-tools";
import { createFinanceAiTools } from "@/lib/ai/tool-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const model = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.1-instant";
const fallbackDevToken = process.env.FINANCE_API_DEV_TOKEN ?? "dev:user_demo";

if (!process.env.VERCEL_AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_API_KEY) {
  process.env.VERCEL_AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
}

function aiGatewayConfigured() {
  return Boolean(process.env.VERCEL_AI_GATEWAY_API_KEY);
}

function shouldUseDeterministicFixtureMode() {
  if (process.env.AI_PORTFOLIO_BRIEF_MODE === "fixture") {
    return true;
  }
  if (process.env.AI_PORTFOLIO_BRIEF_MODE === "live") {
    return false;
  }
  return process.env.NODE_ENV !== "production" && !aiGatewayConfigured();
}

function bearerTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return fallbackDevToken;
}

function requestAuthorization(request: Request) {
  return request.headers.get("authorization") ?? `Bearer ${fallbackDevToken}`;
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Request body must be valid JSON." } },
      { status: 400 },
    );
  }

  const parsedRequest = portfolioBriefRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Prompt and portfolioId must match the AI brief contract." } },
      { status: 400 },
    );
  }

  const prompt =
    parsedRequest.data.prompt ??
    "Generate a portfolio brief focused on allocation, concentration, data freshness, and research follow-ups.";
  const safety = classifyPromptSafety(prompt);

  if (!safety.safe) {
    const brief = createRefusalBrief(prompt);
    return NextResponse.json({
      data: brief,
      meta: {
        model: "safety-precheck",
        safety: safety.reason,
        persistence: { status: "not_attempted" },
      },
    });
  }

  try {
    const authorization = requestAuthorization(request);
    const authToken = bearerTokenFromRequest(request);
    const snapshot = await getPortfolioSnapshot({
      portfolioId: parsedRequest.data.portfolioId,
      requestAuthorization: authorization,
    });

    if (shouldUseDeterministicFixtureMode()) {
      const brief = createDeterministicPortfolioBrief(snapshot, prompt);
      const latencyMs = Math.round(performance.now() - startedAt);
      const persistence = await persistPortfolioBrief({
        authToken,
        prompt,
        model: "deterministic-fixture",
        snapshot,
        brief,
        latencyMs,
        tokenUsage: { mode: "fixture", totalTokens: 0 },
      });

      return NextResponse.json({
        data: brief,
        meta: {
          model: "deterministic-fixture",
          mode: "fixture",
          liveAiGatewayCall: false,
          latencyMs,
          persistence,
          todo:
            "Set VERCEL_AI_GATEWAY_API_KEY and AI_PORTFOLIO_BRIEF_MODE=live, then verify Supabase persistence before closing the Phase 5 live gate.",
          toolRuns: [
            {
              name: "getPortfolioSnapshot",
              status: "success",
              provider: snapshot.dataFreshness.provider,
              capturedAt: snapshot.dataFreshness.capturedAt,
              freshness: snapshot.dataFreshness.freshness,
            },
          ],
          usage: { mode: "fixture", totalTokens: 0 },
        },
      });
    }

    const generationPrompt = buildPortfolioBriefPrompt(snapshot, prompt);

    if (parsedRequest.data.stream) {
      const result = streamText({
        model,
        system:
          "You are a financial research assistant. Stream a concise research-only portfolio brief. Do not provide buy, sell, hold, trading, suitability, or guaranteed-return advice.",
        prompt: generationPrompt,
        tools: createFinanceAiTools(authorization),
      });

      return result.toUIMessageStreamResponse({
        headers: {
          "x-ai-model": model,
          "x-ai-safety-label": "research_only",
        },
      });
    }

    const result = await generateText({
      model,
      output: Output.object({
        schema: portfolioBriefSchema,
        name: "PortfolioBrief",
        description: "A research-only, citation-backed portfolio brief.",
      }),
      system:
        "You are a financial research assistant. Return only schema-valid output. Do not provide buy, sell, hold, trading, suitability, or guaranteed-return advice.",
      prompt: generationPrompt,
      tools: createFinanceAiTools(authorization),
    });

    const brief = portfolioBriefSchema.parse(result.output);
    const latencyMs = Math.round(performance.now() - startedAt);
    const usage = (result as { usage?: unknown; totalUsage?: unknown }).usage ?? (result as { totalUsage?: unknown }).totalUsage;
    const persistence = await persistPortfolioBrief({
      authToken,
      prompt,
      model,
      snapshot,
      brief,
      latencyMs,
      tokenUsage: usage,
    });

    return NextResponse.json({
      data: brief,
      meta: {
        model,
        latencyMs,
        persistence,
        toolRuns: [
          {
            name: "getPortfolioSnapshot",
            status: "success",
            provider: snapshot.dataFreshness.provider,
            capturedAt: snapshot.dataFreshness.capturedAt,
            freshness: snapshot.dataFreshness.freshness,
          },
        ],
        usage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "ai_portfolio_brief_failed",
          message:
            error instanceof Error
              ? error.message
              : "The AI portfolio brief could not be generated from the owner-scoped snapshot.",
        },
      },
      { status: 502 },
    );
  }
}
