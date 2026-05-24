import "server-only";

import { createHash } from "node:crypto";

import type { PortfolioBrief, PortfolioSnapshot } from "@/lib/ai/portfolio-brief";

type PersistenceResult = {
  status: "persisted" | "not_configured" | "failed";
  threadId?: string;
  briefId?: string;
  message?: string;
};

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function isUuid(value?: string) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function promptHash(prompt: string) {
  return createHash("sha256").update(prompt).digest("hex");
}

function billingPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function decodeJwtSubject(token?: string | null) {
  if (!token || token.startsWith("dev:")) {
    return token?.startsWith("dev:") ? token.slice("dev:".length) : "user_demo";
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return "user_unknown";
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return typeof decoded.sub === "string" && decoded.sub ? decoded.sub : "user_unknown";
  } catch {
    return "user_unknown";
  }
}

async function supabaseFetch<T>(path: string, init: RequestInit) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server persistence is not configured.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message ?? `Supabase returned ${response.status}.`);
  }
  return payload as T;
}

export async function persistPortfolioBrief(input: {
  authToken?: string | null;
  prompt: string;
  model: string;
  snapshot: PortfolioSnapshot;
  brief: PortfolioBrief;
  latencyMs: number;
  tokenUsage?: unknown;
}): Promise<PersistenceResult> {
  if (!isConfigured()) {
    return {
      status: "not_configured",
      message: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to persist AI threads, messages, briefs, tool runs, and usage.",
    };
  }

  try {
    const clerkUserId = decodeJwtSubject(input.authToken);
    const [profile] = await supabaseFetch<Array<{ id: string }>>("profiles?on_conflict=clerk_user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ clerk_user_id: clerkUserId }]),
    });

    const [thread] = await supabaseFetch<Array<{ id: string }>>("ai_threads", {
      method: "POST",
      body: JSON.stringify([
        {
          user_id: profile.id,
          title: "Portfolio brief",
          surface: "portfolio",
          linked_portfolio_id: isUuid(input.snapshot.id) ? input.snapshot.id : null,
          status: "active",
        },
      ]),
    });

    const citations = input.brief.citations;
    await supabaseFetch("ai_tool_runs", {
      method: "POST",
      body: JSON.stringify([
        {
          user_id: profile.id,
          thread_id: thread.id,
          tool_name: "getPortfolioSnapshot",
          validated_input_json: { portfolioId: input.snapshot.id },
          output_summary: {
            holdingCount: input.snapshot.summary.holdingCount,
            provider: input.snapshot.dataFreshness.provider,
            capturedAt: input.snapshot.dataFreshness.capturedAt,
          },
          latency_ms: input.latencyMs,
          status: "success",
        },
      ]),
    });

    await supabaseFetch("ai_messages", {
      method: "POST",
      body: JSON.stringify([
        {
          thread_id: thread.id,
          role: "user",
          content: input.prompt,
          safety_labels: ["research_only"],
        },
        {
          thread_id: thread.id,
          role: "assistant",
          content: input.brief.summary,
          citations,
          safety_labels: [input.brief.safetyLabel],
        },
      ]),
    });

    const [brief] = await supabaseFetch<Array<{ id: string }>>("ai_briefs", {
      method: "POST",
      body: JSON.stringify([
        {
          user_id: profile.id,
          portfolio_id: isUuid(input.snapshot.id) ? input.snapshot.id : null,
          prompt_hash: promptHash(input.prompt),
          model: input.model,
          output_json: {
            ...input.brief,
            usage: input.tokenUsage ?? null,
          },
          citations,
          token_cost: null,
        },
      ]),
    });

    await supabaseFetch("usage_events", {
      method: "POST",
      body: JSON.stringify([
        {
          user_id: profile.id,
          feature: "portfolio_brief",
          count: 1,
          billing_period: billingPeriod(),
          metadata: {
            model: input.model,
            latencyMs: input.latencyMs,
            provider: input.snapshot.dataFreshness.provider,
          },
        },
      ]),
    });

    return { status: "persisted", threadId: thread.id, briefId: brief.id };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "AI persistence failed.",
    };
  }
}
