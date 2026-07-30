"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Ban,
  BookOpenCheck,
  Check,
  CircleStop,
  FileSearch,
  Link2,
  LoaderCircle,
  Minus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionReviewControls } from "@/components/section-review-controls";
import {
  analysisReviewEventSchema,
  deriveSectionReviewStates,
  type AnalysisReviewEvent,
} from "@/lib/ai/research-review";
import type {
  ResearchStreamEvent,
  StructuredResearchResult,
} from "@/lib/ai/structured-research";
import type { ResearchDocument } from "@/lib/research-api";

type StructuredResearchPanelProps = {
  workspaceId: string;
  readyDocuments: ResearchDocument[];
};

type RunState =
  | "idle"
  | "running"
  | "completed"
  | "partial"
  | "cancelled"
  | "failed";

type StageName =
  | "retrieval"
  | "generation"
  | "validation"
  | "repair"
  | "persistence";

type StageState = {
  name: StageName;
  status: "waiting" | "active" | "complete" | "skipped";
  latencyMs?: number;
  detail?: string;
};

type RunMetadata = {
  provider?: string;
  model?: string;
  mode?: "deterministic" | "live" | "degraded";
  persistence?: "supabase" | "memory";
  telemetry?: Record<string, unknown>;
};

const initialStages: StageState[] = [
  { name: "retrieval", status: "waiting" },
  { name: "generation", status: "waiting" },
  { name: "validation", status: "waiting" },
  { name: "repair", status: "waiting" },
  { name: "persistence", status: "waiting" },
];

const stageLabels: Record<StageName, string> = {
  retrieval: "Retrieve evidence",
  generation: "Generate sections",
  validation: "Validate structure",
  repair: "Repair if needed",
  persistence: "Store run",
};

function errorMessage(payload: unknown, fallback: string) {
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

function formatLatency(value: unknown) {
  return typeof value === "number" ? `${value.toLocaleString()} ms` : "Not reported";
}

function formatTokenCount(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "Not reported";
}

const evidenceStrengthLabels = {
  strong: "Strong source coverage",
  moderate: "Multiple passages",
  limited: "Single passage",
  unsupported: "Unsupported",
} as const;

const coverageLabels = {
  complete: "All material findings mapped",
  partial: "Some material findings unsupported",
  none: "No material findings supported",
} as const;

export function StructuredResearchPanel({
  workspaceId,
  readyDocuments,
}: StructuredResearchPanelProps) {
  const [query, setQuery] = useState(
    "What changed in operating performance, and which disclosed risks require closer review?",
  );
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [stages, setStages] = useState(initialStages);
  const [sections, setSections] = useState<
    StructuredResearchResult["sections"]
  >([]);
  const [result, setResult] = useState<StructuredResearchResult | null>(null);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<RunMetadata>({});
  const [error, setError] = useState<string | null>(null);
  const [reviewEvents, setReviewEvents] = useState<AnalysisReviewEvent[]>([]);
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedDocuments = useMemo(
    () =>
      selectedDocumentIds.length === 0
        ? readyDocuments
        : readyDocuments.filter((document) =>
            selectedDocumentIds.includes(document.id),
          ),
    [readyDocuments, selectedDocumentIds],
  );
  const activeCitation = useMemo(
    () =>
      result?.citations.find(
        (citation) => citation.chunkId === activeCitationId,
      ) ??
      result?.citations[0] ??
      null,
    [activeCitationId, result],
  );
  const sectionReviewStates = useMemo(
    () => deriveSectionReviewStates(reviewEvents),
    [reviewEvents],
  );
  const acceptedSectionCount = useMemo(
    () =>
      result?.sections.filter(
        (section) =>
          sectionReviewStates.get(section.key)?.decision === "accepted",
      ).length ?? 0,
    [result, sectionReviewStates],
  );

  useEffect(() => {
    if (!runId || !result) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/research/workspaces/${encodeURIComponent(workspaceId)}/analyses/${encodeURIComponent(runId)}/reviews`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as {
          data?: unknown;
          error?: { message?: string };
        };
        if (!response.ok || !payload.data) {
          throw new Error(
            payload.error?.message ?? "Human review history could not be loaded.",
          );
        }
        setReviewEvents(analysisReviewEventSchema.array().parse(payload.data));
        setReviewLoadError(null);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setReviewLoadError(
          requestError instanceof Error
            ? requestError.message
            : "Human review history could not be loaded.",
        );
      }
    })();
    return () => controller.abort();
  }, [result, runId, workspaceId]);

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((value) => value !== documentId)
        : [...current, documentId],
    );
  }

  function updateStage(
    name: StageName,
    patch: Partial<Omit<StageState, "name">>,
  ) {
    setStages((current) =>
      current.map((stage) =>
        stage.name === name ? { ...stage, ...patch } : stage,
      ),
    );
  }

  function consumeEvent(event: ResearchStreamEvent) {
    if (event.type === "run.created") {
      setRunId(event.runId);
      setMetadata({
        provider: event.provider,
        model: event.model,
        mode: event.mode,
        persistence: event.persistence,
      });
      return;
    }
    if (event.type === "stage.started") {
      updateStage(event.stage, { status: "active" });
      return;
    }
    if (event.type === "stage.completed") {
      updateStage(event.stage, {
        status: "complete",
        latencyMs: event.latencyMs,
        detail: event.detail,
      });
      return;
    }
    if (event.type === "section.completed") {
      setSections((current) => [
        ...current.filter((section) => section.key !== event.section.key),
        event.section,
      ]);
      return;
    }
    if (event.type === "run.completed") {
      setResult(event.result);
      setActiveCitationId(event.result.citations[0]?.chunkId ?? null);
      setStages((current) =>
        current.map((stage) =>
          stage.name === "repair" && stage.status === "waiting"
            ? { ...stage, status: "skipped", detail: "Not needed" }
            : stage,
        ),
      );
      setMetadata((current) => ({
        ...current,
        telemetry: event.telemetry,
      }));
      setRunState("completed");
      return;
    }
    if (event.type === "run.partial") {
      setResult(event.result);
      setActiveCitationId(event.result.citations[0]?.chunkId ?? null);
      setMetadata((current) => ({
        ...current,
        mode: "degraded",
        telemetry: event.telemetry,
      }));
      setRunState("partial");
      return;
    }
    if (event.type === "run.cancelled") {
      setRunState("cancelled");
      setError(event.reason);
      return;
    }
    if (event.type === "run.failed") {
      setRunState("failed");
      setError(event.error.message);
    }
  }

  async function runAnalysis(
    retryOfRunId?: string,
    regenerateSectionKey?: StructuredResearchResult["sections"][number]["key"],
  ) {
    if (query.trim().length < 2 || readyDocuments.length === 0) return;
    setRunState("running");
    setRunId(null);
    setStages(initialStages);
    setSections([]);
    setResult(null);
    setActiveCitationId(null);
    setMetadata({});
    setError(null);
    setReviewEvents([]);
    setReviewLoadError(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspaceId)}/analyses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflow: "earnings_review",
            query: query.trim(),
            documentIds: selectedDocumentIds,
            retryOfRunId,
            regenerateSectionKey,
          }),
          signal: abortController.signal,
        },
      );

      const responseRunId = response.headers.get("x-aperture-run-id");
      if (responseRunId) setRunId(responseRunId);

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          errorMessage(
            payload,
            "The structured research run could not be started.",
          ),
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          consumeEvent(JSON.parse(line) as ResearchStreamEvent);
        }
        if (done) break;
      }
      if (buffer.trim()) {
        consumeEvent(JSON.parse(buffer) as ResearchStreamEvent);
      }
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        setRunState((current) =>
          current === "running" ? "cancelled" : current,
        );
      } else {
        setRunState("failed");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The structured research run could not be completed.",
        );
      }
    } finally {
      abortRef.current = null;
    }
  }

  async function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAnalysis();
  }

  async function cancelAnalysis() {
    if (!runId) return;
    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspaceId)}/analyses/${encodeURIComponent(runId)}/cancel`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          errorMessage(payload, "The research run could not be cancelled."),
        );
      }
      abortRef.current?.abort();
      setRunState("cancelled");
      setError("The research run was cancelled and stored.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The research run could not be cancelled.",
      );
    }
  }

  const showRunProgress = runState !== "idle";
  const canRetry =
    Boolean(runId) &&
    (runState === "partial" ||
      runState === "cancelled" ||
      runState === "failed");

  function addReviewEvent(event: AnalysisReviewEvent) {
    setReviewEvents((current) => [
      ...current.filter((item) => item.id !== event.id),
      event,
    ]);
  }

  return (
    <section className="glass-surface overflow-hidden rounded-[1.25rem]">
      <div className="grid lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <div className="border-b border-white/7 p-5 sm:p-6 lg:border-r lg:border-b-0">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 size-5 text-cyan-100" />
            <div>
              <h2 className="type-card-title text-xl text-white">
                Structured earnings review
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">
                Turn retrieved document evidence into validated research
                sections with stored run telemetry.
              </p>
            </div>
          </div>

          <form onSubmit={submitAnalysis} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="structured-research-query"
                className="block text-sm text-zinc-200"
              >
                Research question
              </label>
              <textarea
                id="structured-research-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                rows={4}
                minLength={2}
                maxLength={500}
                disabled={runState === "running"}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15 disabled:opacity-60"
              />
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Ask about reported changes, operating signals, or disclosed
                risks. Trade instructions and suitability advice are outside
                this workflow.
              </p>
            </div>

            <fieldset>
              <legend className="text-sm text-zinc-200">Document scope</legend>
              <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                <label className="shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.length === 0}
                    onChange={() => setSelectedDocumentIds([])}
                    disabled={runState === "running"}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs text-zinc-300 peer-checked:border-cyan-200/35 peer-checked:bg-cyan-200/8 peer-checked:text-cyan-50 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-200/60">
                    All ready sources
                  </span>
                </label>
                {readyDocuments.map((document) => (
                  <label
                    key={document.id}
                    className="shrink-0 cursor-pointer snap-start"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.includes(document.id)}
                      onChange={() => toggleDocument(document.id)}
                      disabled={runState === "running"}
                      className="peer sr-only"
                    />
                    <span className="inline-flex h-9 max-w-64 items-center truncate rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs text-zinc-400 peer-checked:border-cyan-200/35 peer-checked:bg-cyan-200/8 peer-checked:text-cyan-50 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-200/60">
                      {document.title}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {selectedDocuments.length} ready source
                {selectedDocuments.length === 1 ? "" : "s"} in scope
              </p>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                size="lg"
                disabled={
                  runState === "running" ||
                  readyDocuments.length === 0 ||
                  query.trim().length < 2
                }
              >
                <FileSearch className="size-4" />
                {runState === "running" ? "Reviewing" : "Run review"}
              </Button>
              {runState === "running" ? (
                <Button
                  type="button"
                  size="lg"
                  variant="destructive"
                  onClick={() => void cancelAnalysis()}
                  disabled={!runId}
                >
                  <CircleStop className="size-4" />
                  Cancel run
                </Button>
              ) : null}
              {canRetry ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => void runAnalysis(runId ?? undefined)}
                >
                  <RotateCcw className="size-4" />
                  Retry run
                </Button>
              ) : null}
            </div>
          </form>

          <div
            aria-live="polite"
            className="mt-5 min-h-6 text-sm leading-6"
          >
            {error ? (
              <p
                className={
                  runState === "cancelled"
                    ? "text-amber-100"
                    : "text-rose-100"
                }
              >
                {error}
              </p>
            ) : runState === "completed" ? (
              <p className="text-emerald-100">
                Structured review completed and stored.
              </p>
            ) : runState === "partial" ? (
              <p className="text-amber-100">
                The run is partial. Review the preserved evidence before
                retrying.
              </p>
            ) : null}
          </div>
        </div>

        <div aria-busy={runState === "running"} className="min-h-[32rem]">
          {!showRunProgress ? (
            <div className="grid min-h-[32rem] place-items-center p-8 text-center">
              <div className="max-w-sm">
                <FileSearch className="mx-auto size-8 text-zinc-700" />
                <h3 className="mt-4 text-sm font-medium text-zinc-200">
                  Ready for a structured review
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  The workflow retrieves private evidence first, then validates
                  each generated section before storing the result.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-white/7 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {runState === "running"
                        ? "Review in progress"
                        : runState === "completed"
                          ? "Review complete"
                          : runState === "partial"
                            ? "Partial review"
                            : runState === "cancelled"
                              ? "Review cancelled"
                              : "Review failed"}
                    </p>
                    <p className="mt-1 font-mono text-[0.68rem] text-zinc-600">
                      {runId ?? "Creating run"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-300">
                    {metadata.mode === "live"
                      ? "Live provider"
                      : metadata.mode === "degraded"
                        ? "Degraded result"
                        : "Local deterministic mode"}
                  </span>
                </div>

                <ol
                  aria-label="Research workflow progress"
                  className="mt-4 grid gap-2 sm:grid-cols-5"
                >
                  {stages.map((stage) => (
                    <li
                      key={stage.name}
                      className="rounded-lg border border-white/7 bg-black/18 px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        {stage.status === "complete" ? (
                          <Check className="size-3.5 text-emerald-200" />
                        ) : stage.status === "skipped" ? (
                          <Minus className="size-3.5 text-zinc-600" />
                        ) : stage.status === "active" ? (
                          <LoaderCircle className="size-3.5 animate-spin text-cyan-100" />
                        ) : (
                          <span className="size-3.5 rounded-full border border-white/15" />
                        )}
                        <span className="text-[0.7rem] text-zinc-300">
                          {stageLabels[stage.name]}
                        </span>
                      </div>
                      {stage.latencyMs !== undefined ? (
                        <p className="mt-2 font-mono text-[0.62rem] text-zinc-600">
                          {stage.latencyMs} ms
                        </p>
                      ) : stage.status === "skipped" ? (
                        <p className="mt-2 text-[0.62rem] text-zinc-600">
                          Not needed
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>

              {runState === "running" && sections.length === 0 ? (
                <div className="space-y-0">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse border-b border-white/7 p-5 sm:p-6"
                    >
                      <div className="h-3 w-40 rounded bg-white/8" />
                      <div className="mt-4 h-3 w-full rounded bg-white/6" />
                      <div className="mt-2 h-3 w-4/5 rounded bg-white/6" />
                    </div>
                  ))}
                </div>
              ) : sections.length > 0 ? (
                <div>
                  {sections.map((section) => (
                    <article
                      key={section.key}
                      className="border-b border-white/7 p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-medium text-white">
                          {section.title}
                        </h3>
                        <span
                          className={
                            section.status === "complete"
                              ? "text-xs text-emerald-100"
                              : "text-xs text-amber-100"
                          }
                        >
                          {section.status === "complete"
                            ? "Validated"
                            : "Partial"}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
                        {section.body}
                      </p>
                      {section.claims.length > 0 ? (
                        <div className="mt-5 space-y-4">
                          {section.claims.map((claim) => (
                            <div
                              key={claim.id}
                              className={
                                claim.supportStatus === "unsupported"
                                  ? "border-l-2 border-amber-300/55 pl-4"
                                  : "border-l-2 border-cyan-200/25 pl-4"
                              }
                            >
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span
                                  className={
                                    claim.supportStatus === "unsupported"
                                      ? "inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-amber-100"
                                      : "inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-cyan-100"
                                  }
                                >
                                  {claim.supportStatus === "unsupported" ? (
                                    <AlertTriangle className="size-3.5" />
                                  ) : (
                                    <ShieldCheck className="size-3.5" />
                                  )}
                                  {
                                    evidenceStrengthLabels[
                                      claim.evidenceStrength
                                    ]
                                  }
                                </span>
                                {claim.material ? (
                                  <span className="text-[0.65rem] text-zinc-600">
                                    Material finding
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm leading-7 text-zinc-200">
                                {claim.text}
                              </p>
                              {claim.supportStatus === "supported" ? (
                                <div
                                  aria-label={`Citations for ${claim.id}`}
                                  className="mt-3 flex flex-wrap gap-2"
                                >
                                  {claim.evidenceChunkIds.map(
                                    (chunkId, index) => {
                                      const citation = result?.citations.find(
                                        (item) => item.chunkId === chunkId,
                                      );
                                      return (
                                        <button
                                          key={chunkId}
                                          type="button"
                                          aria-controls="structured-evidence-inspector"
                                          aria-pressed={
                                            activeCitation?.chunkId === chunkId
                                          }
                                          disabled={!citation}
                                          onClick={() =>
                                            setActiveCitationId(chunkId)
                                          }
                                          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 text-[0.68rem] text-zinc-300 transition-colors hover:border-cyan-200/30 hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/65 disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:border-cyan-200/45 aria-pressed:bg-cyan-200/8 aria-pressed:text-cyan-50"
                                        >
                                          <Link2 className="size-3" />
                                          {citation
                                            ? `${citation.documentTitle}, p.${citation.pageNumber}`
                                            : `Evidence ${index + 1}`}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              ) : (
                                <p className="mt-3 inline-flex items-center gap-2 text-xs leading-5 text-amber-100">
                                  <AlertTriangle className="size-3.5 shrink-0" />
                                  Unsupported material finding. Do not treat
                                  this statement as established.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {runId && result ? (
                        <SectionReviewControls
                          key={`${runId}:${section.key}`}
                          workspaceId={workspaceId}
                          runId={runId}
                          section={section}
                          events={reviewEvents}
                          disabled={runState === "running"}
                          onEvent={addReviewEvent}
                          onRegenerate={(sectionKey) =>
                            void runAnalysis(runId, sectionKey)
                          }
                        />
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : runState === "cancelled" || runState === "failed" ? (
                <div className="grid min-h-64 place-items-center p-8 text-center">
                  <div className="max-w-sm">
                    {runState === "cancelled" ? (
                      <Ban className="mx-auto size-7 text-amber-200" />
                    ) : (
                      <AlertTriangle className="mx-auto size-7 text-rose-200" />
                    )}
                    <p className="mt-4 text-sm leading-6 text-zinc-400">
                      {runState === "cancelled"
                        ? "No downstream sections will be generated for this run."
                        : "The run stopped before a structured result was available."}
                    </p>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="grid gap-px border-t border-white/7 bg-white/7 md:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.75fr)]">
                  <div
                    id="structured-evidence-inspector"
                    aria-live="polite"
                    className="bg-zinc-950/95 p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                          <BookOpenCheck className="size-4 text-cyan-100" />
                          Evidence inspector
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Select a claim citation to inspect its stored source
                          excerpt and page.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg text-white">
                          {result.citationCoverage.percentage}%
                        </p>
                        <p className="text-[0.65rem] text-zinc-500">
                          claim coverage
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1">
                      {result.citations.map((citation, index) => (
                        <button
                          key={citation.chunkId}
                          type="button"
                          aria-pressed={
                            activeCitation?.chunkId === citation.chunkId
                          }
                          onClick={() =>
                            setActiveCitationId(citation.chunkId)
                          }
                          className="shrink-0 snap-start rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-left transition-colors hover:border-cyan-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/65 aria-pressed:border-cyan-200/45 aria-pressed:bg-cyan-200/8"
                        >
                          <span className="block text-[0.68rem] text-zinc-300">
                            Source {index + 1}
                          </span>
                          <span className="mt-0.5 block max-w-48 truncate text-[0.62rem] text-zinc-600">
                            {citation.documentTitle}, page{" "}
                            {citation.pageNumber}
                          </span>
                        </button>
                      ))}
                    </div>

                    {activeCitation ? (
                      <figure className="mt-4 border-l-2 border-cyan-200/30 pl-4">
                        <figcaption>
                          <p className="text-xs font-medium text-zinc-200">
                            {activeCitation.documentTitle}
                          </p>
                          <p className="mt-1 text-[0.68rem] text-zinc-500">
                            Page {activeCitation.pageNumber}
                            {activeCitation.sectionLabel
                              ? ` | ${activeCitation.sectionLabel}`
                              : ""}{" "}
                            | {activeCitation.sourceLocator}
                          </p>
                        </figcaption>
                        <blockquote className="mt-3 text-sm leading-7 text-zinc-300">
                          “{activeCitation.excerpt}”
                        </blockquote>
                        <p className="mt-3 text-[0.65rem] leading-5 text-zinc-600">
                          This excerpt is the bounded evidence snapshot stored
                          with the active analysis run.
                        </p>
                      </figure>
                    ) : null}
                  </div>
                  <div className="bg-zinc-950/95 p-5">
                    <h3 className="text-xs font-medium text-zinc-200">
                      Trust and run details
                    </h3>
                    <div className="mt-3 border-b border-white/7 pb-4">
                      <p
                        className={
                          result.citationCoverage.state === "complete"
                            ? "text-xs text-emerald-100"
                            : "text-xs text-amber-100"
                        }
                      >
                        {coverageLabels[result.citationCoverage.state]}
                      </p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-zinc-600">
                        {
                          result.citationCoverage.supportedMaterialClaims
                        }{" "}
                        of {result.citationCoverage.materialClaims} material
                        findings have retrieved support.
                      </p>
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.68rem]">
                      <dt className="text-zinc-600">Provider</dt>
                      <dd className="truncate text-right font-mono text-zinc-300">
                        {metadata.provider ?? "Not reported"}
                      </dd>
                      <dt className="text-zinc-600">Model</dt>
                      <dd className="truncate text-right font-mono text-zinc-300">
                        {metadata.model ?? "Not reported"}
                      </dd>
                      <dt className="text-zinc-600">Total tokens</dt>
                      <dd className="text-right font-mono text-zinc-300">
                        {formatTokenCount(metadata.telemetry?.totalTokens)}
                      </dd>
                      <dt className="text-zinc-600">Total latency</dt>
                      <dd className="text-right font-mono text-zinc-300">
                        {formatLatency(metadata.telemetry?.totalLatencyMs)}
                      </dd>
                      <dt className="text-zinc-600">Persistence</dt>
                      <dd className="text-right font-mono text-zinc-300">
                        {metadata.persistence ?? "Not reported"}
                      </dd>
                      <dt className="text-zinc-600">Human review</dt>
                      <dd className="text-right font-mono text-zinc-300">
                        {acceptedSectionCount}/{result.sections.length} accepted
                      </dd>
                    </dl>
                    {reviewLoadError ? (
                      <p role="alert" className="mt-4 text-xs leading-5 text-rose-100">
                        {reviewLoadError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-white/7 px-5 py-4 sm:px-6">
        <p className="text-xs leading-5 text-zinc-500">
          Results are research support, not financial advice. Check source
          context, freshness, assumptions, and unsupported interpretations
          before using a finding in a decision.
        </p>
      </div>
    </section>
  );
}
