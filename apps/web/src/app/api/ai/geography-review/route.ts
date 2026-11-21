import { createHash } from "node:crypto";

import { aiPersistenceConfigured, persistGeographyReview } from "@/lib/ai/persistence";
import { geographyReviewInput, rankGeographyLocally } from "@/lib/ai/geography-review";
import { rankGeographyWithModel } from "@/lib/ai/geography-review-model";
import { missingLiveAiConfigurationMessage, resolveLiveStructuredResearchModel, selectedLiveAiProvider } from "@/lib/ai/model-provider";
import { checkUsageLimit } from "@/lib/billing/usage";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { authenticatedSessionToken, authenticationRequiredResponse, decodeJwtSubject, isAuthenticationRequiredError } from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function aiAvailable() {
  return process.env.AI_GEOGRAPHY_REVIEW_ENABLED === "true"
    && !missingLiveAiConfigurationMessage(selectedLiveAiProvider())
    && aiPersistenceConfigured();
}

function errorResponse(status: number, message: string) {
  return Response.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return Response.json({ enabled: aiAvailable() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!aiAvailable()) return errorResponse(503, "AI geography review is unavailable. Algo mode is ready to use.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return errorResponse(415, "Send the geography snapshot as JSON.");
  }

  let authToken: string;
  try {
    authToken = await authenticatedSessionToken();
  } catch (error) {
    if (isAuthenticationRequiredError(error)) return authenticationRequiredResponse();
    throw error;
  }

  const subject = createHash("sha256").update(decodeJwtSubject(authToken)).digest("hex");
  const rate = await checkRateLimit({ key: `ai:geography_review:${subject}`, windowSeconds: 60, max: 4 });
  if (!rate.allowed) return errorResponse(429, "Too many AI reviews. Try again in a minute or switch to Algo.");

  // This endpoint accepts only a small aggregate snapshot. Bound reads before JSON parsing.
  const reader = request.body?.getReader();
  if (!reader) return errorResponse(400, "A geography snapshot is required.");
  let payload = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        return errorResponse(413, "The geography snapshot is too large.");
      }
      payload += decoder.decode(value, { stream: true });
    }
    payload += decoder.decode();
  } catch {
    return errorResponse(400, "The geography snapshot could not be read.");
  }
  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return errorResponse(400, "The geography snapshot must be valid JSON.");
  }
  const parsed = geographyReviewInput.safeParse(body);
  if (!parsed.success || rankGeographyLocally(parsed.data).length < 2) {
    return errorResponse(400, "AI needs at least two populated geography topics to compare.");
  }

  const quota = await checkUsageLimit({ authToken, feature: "structured_research" });
  if (!quota.allowed) return errorResponse(402, "Your AI research allowance is exhausted. Algo remains available.");
  if (quota.status !== "available") return errorResponse(503, "AI usage tracking is unavailable. Switch to Algo or try again later.");

  const startedAt = performance.now();
  try {
    const live = resolveLiveStructuredResearchModel();
    const result = await rankGeographyWithModel(live.model, parsed.data, AbortSignal.any([request.signal, AbortSignal.timeout(18_000)]));
    const stored = await persistGeographyReview({
      authToken,
      input: parsed.data,
      order: result.order,
      provider: live.provider,
      model: live.modelId,
      usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens },
      latencyMs: Math.round(performance.now() - startedAt),
    });
    return Response.json({ order: result.order, saved: stored }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse(502, "AI could not rank these topics. Try again or switch to Algo.");
  }
}
