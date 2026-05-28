"use client";

import { useState } from "react";
import { BookmarkPlus, CheckCircle2, Loader2, Play, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type AiActionPanelProps = {
  title: string;
  description: string;
  generateEndpoint?: string;
  generatePayload?: Record<string, unknown>;
  saveTitle: string;
  saveSourceType: "portfolio_brief" | "filing_summary" | "goal_plan" | "risk_explainer";
  citationCount: number;
};

type RouteResult = {
  data?: unknown;
  meta?: {
    mode?: string;
    toolRuns?: Array<{ name?: string; status?: string; provider?: string; freshness?: string }>;
  };
  error?: { message?: string };
};

function readableMode(mode?: string) {
  if (!mode) {
    return "Route response received.";
  }
  return mode === "deterministic-fixture" ? "Local deterministic demo response received." : `${mode} response received.`;
}

export function AiActionPanel({
  title,
  description,
  generateEndpoint,
  generatePayload,
  saveTitle,
  saveSourceType,
  citationCount,
}: AiActionPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"generate" | "save" | null>(null);

  async function generate() {
    if (!generateEndpoint || !generatePayload) {
      return;
    }
    setBusy("generate");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(generateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePayload),
      });
      const payload = (await response.json()) as RouteResult;
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "The AI route could not complete the request.");
      }
      const toolSummary = payload.meta?.toolRuns?.map((tool) => `${tool.name ?? "tool"}:${tool.status ?? "done"}`).join(", ");
      setMessage(`${readableMode(payload.meta?.mode)}${toolSummary ? ` Tools: ${toolSummary}.` : ""}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The AI route could not complete the request.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/research/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: saveTitle, sourceType: saveSourceType, citationCount }),
      });
      const payload = (await response.json()) as RouteResult;
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "The research save route could not complete the request.");
      }
      setMessage("Research save accepted with entitlement, rate-limit, usage, and audit checks.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The research save route could not complete the request.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="glass-surface rounded-[1.25rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-5 text-cyan-200" />
            <h2 className="type-card-title text-xl text-white">{title}</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {generateEndpoint ? (
            <Button onClick={generate} disabled={busy !== null} variant="outline">
              {busy === "generate" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run route
            </Button>
          ) : null}
          <Button onClick={save} disabled={busy !== null}>
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />}
            Save research
          </Button>
        </div>
      </div>
      {message ? (
        <div className="mt-4 flex items-start gap-2 rounded-[0.9rem] border border-emerald-200/15 bg-emerald-200/8 p-3 text-sm leading-6 text-emerald-50">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{message}</p>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-[0.9rem] border border-amber-200/20 bg-amber-200/8 p-3 text-sm leading-6 text-amber-50">
          {error}
        </div>
      ) : null}
    </section>
  );
}
