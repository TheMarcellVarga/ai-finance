"use client";

import { useMemo, useState } from "react";
import {
  Check,
  FilePenLine,
  LoaderCircle,
  RefreshCw,
  Save,
  ShieldAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  reviewStateForSection,
  type AnalysisReviewEvent,
} from "@/lib/ai/research-review";
import type { ResearchSection } from "@/lib/ai/structured-research";

type SectionReviewControlsProps = {
  workspaceId: string;
  runId: string;
  section: ResearchSection;
  events: AnalysisReviewEvent[];
  disabled?: boolean;
  onEvent: (event: AnalysisReviewEvent) => void;
  onRegenerate: (sectionKey: ResearchSection["key"]) => void;
};

function responseError(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return fallback;
}

export function SectionReviewControls({
  workspaceId,
  runId,
  section,
  events,
  disabled,
  onEvent,
  onRegenerate,
}: SectionReviewControlsProps) {
  const review = useMemo(
    () => reviewStateForSection(events, section.key),
    [events, section.key],
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body);
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function appendReview(
    event:
      | {
          eventType: "edit_saved";
          sectionTitle: string;
          sectionBody: string;
        }
      | {
          eventType: "accepted" | "rejected";
          contentEventId?: string;
          note?: string;
        },
  ) {
    setBusyAction(event.eventType);
    setError(null);
    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspaceId)}/analyses/${encodeURIComponent(runId)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            sectionKey: section.key,
            ...event,
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: AnalysisReviewEvent;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          responseError(payload, "The review action could not be stored."),
        );
      }
      onEvent(payload.data);
      setNote("");
      if (event.eventType === "edit_saved") setEditing(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The review action could not be stored.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  const statusLabel =
    review.decision === "accepted"
      ? "Human accepted"
      : review.decision === "rejected"
        ? "Human rejected"
        : "Awaiting human decision";

  return (
    <div className="mt-5 border-t border-white/7 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className={
              review.decision === "accepted"
                ? "inline-flex items-center gap-2 text-xs font-medium text-emerald-100"
                : review.decision === "rejected"
                  ? "inline-flex items-center gap-2 text-xs font-medium text-rose-100"
                  : "inline-flex items-center gap-2 text-xs font-medium text-amber-100"
            }
          >
            {review.decision === "accepted" ? (
              <Check className="size-3.5" />
            ) : review.decision === "rejected" ? (
              <X className="size-3.5" />
            ) : (
              <ShieldAlert className="size-3.5" />
            )}
            {statusLabel}
          </p>
          <p className="mt-1 text-[0.68rem] leading-5 text-zinc-600">
            {review.edit
              ? "Decision applies to the latest user-edited version."
              : "Decision applies to the immutable raw AI section."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || Boolean(busyAction)}
            onClick={() => {
              if (!editing) {
                setTitle(review.edit?.sectionTitle ?? section.title);
                setBody(review.edit?.sectionBody ?? section.body);
              }
              setEditing((current) => !current);
            }}
          >
            <FilePenLine className="size-3.5" />
            {editing ? "Close edit" : review.edit ? "Revise edit" : "Edit"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={disabled || Boolean(busyAction)}
            onClick={() =>
              void appendReview({
                eventType: "accepted",
                contentEventId: review.edit?.id,
                note: note.trim() || undefined,
              })
            }
          >
            {busyAction === "accepted" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabled || Boolean(busyAction)}
            onClick={() =>
              void appendReview({
                eventType: "rejected",
                contentEventId: review.edit?.id,
                note: note.trim() || undefined,
              })
            }
          >
            {busyAction === "rejected" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || Boolean(busyAction)}
            onClick={() => onRegenerate(section.key)}
          >
            <RefreshCw className="size-3.5" />
            Regenerate section
          </Button>
        </div>
      </div>

      {review.edit ? (
        <div className="mt-4 border-l-2 border-violet-200/35 pl-4">
          <p className="text-[0.68rem] font-medium text-violet-100">
            User-edited draft
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-100">
            {review.edit.sectionTitle}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-300">
            {review.edit.sectionBody}
          </p>
          <p className="mt-2 text-[0.65rem] text-zinc-600">
            The raw AI wording remains above and is never overwritten.
          </p>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-4 grid gap-3">
          <div>
            <label
              htmlFor={`review-title-${section.key}`}
              className="text-xs text-zinc-300"
            >
              Edited section title
            </label>
            <input
              id={`review-title-${section.key}`}
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15"
            />
          </div>
          <div>
            <label
              htmlFor={`review-body-${section.key}`}
              className="text-xs text-zinc-300"
            >
              Edited section body
            </label>
            <textarea
              id={`review-body-${section.key}`}
              value={body}
              rows={5}
              maxLength={12000}
              onChange={(event) => setBody(event.target.value)}
              className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15"
            />
          </div>
          <div>
            <Button
              type="button"
              size="sm"
              disabled={
                Boolean(busyAction) ||
                title.trim().length === 0 ||
                body.trim().length === 0
              }
              onClick={() =>
                void appendReview({
                  eventType: "edit_saved",
                  sectionTitle: title.trim(),
                  sectionBody: body.trim(),
                })
              }
            >
              {busyAction === "edit_saved" ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Save separate edit
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <label
          htmlFor={`review-note-${section.key}`}
          className="text-[0.68rem] text-zinc-500"
        >
          Reviewer note (optional)
        </label>
        <input
          id={`review-note-${section.key}`}
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Record what you checked or why the section was rejected."
          className="mt-2 h-9 w-full rounded-lg border border-white/8 bg-black/20 px-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-200/10"
        />
      </div>

      <p className="mt-3 text-[0.65rem] leading-5 text-zinc-600">
        AI output cannot approve itself. Regeneration creates a new run and
        does not inherit this decision.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-xs leading-5 text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
