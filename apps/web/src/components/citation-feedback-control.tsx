"use client";

import { useState } from "react";
import { Flag, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AnalysisReviewEvent } from "@/lib/ai/research-review";
import type { ResearchSection } from "@/lib/ai/structured-research";

type CitationFeedbackControlProps = {
  workspaceId: string;
  runId: string;
  sectionKey: ResearchSection["key"] | null;
  citationChunkId: string;
  existingFlags: number;
  onEvent: (event: AnalysisReviewEvent) => void;
};

export function CitationFeedbackControl({
  workspaceId,
  runId,
  sectionKey,
  citationChunkId,
  existingFlags,
  onEvent,
}: CitationFeedbackControlProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFeedback() {
    if (!sectionKey || note.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspaceId)}/analyses/${encodeURIComponent(runId)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            sectionKey,
            eventType: "citation_flagged",
            citationChunkId,
            note: note.trim(),
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: AnalysisReviewEvent;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Citation feedback could not be stored.",
        );
      }
      onEvent(payload.data);
      setNote("");
      setOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Citation feedback could not be stored.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 border-t border-white/7 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.68rem] text-zinc-500">
          {existingFlags > 0
            ? `${existingFlags} human citation issue ${existingFlags === 1 ? "report" : "reports"} recorded`
            : "No citation issue reported"}
        </p>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={!sectionKey}
          onClick={() => setOpen((current) => !current)}
        >
          <Flag className="size-3" />
          Flag incorrect citation
        </Button>
      </div>
      {!sectionKey ? (
        <p className="mt-2 text-[0.65rem] leading-5 text-zinc-600">
          Select this source from a claim before recording feedback.
        </p>
      ) : null}
      {open ? (
        <div className="mt-3">
          <label
            htmlFor={`citation-feedback-${citationChunkId}`}
            className="text-[0.68rem] text-zinc-400"
          >
            What does not match the claim or source?
          </label>
          <textarea
            id={`citation-feedback-${citationChunkId}`}
            value={note}
            rows={3}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15"
          />
          <Button
            type="button"
            size="xs"
            className="mt-2"
            disabled={submitting || note.trim().length === 0}
            onClick={() => void submitFeedback()}
          >
            {submitting ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : (
              <Flag className="size-3" />
            )}
            Record feedback
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs leading-5 text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
