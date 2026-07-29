import { NextResponse } from "next/server";

import {
  abortResearchRun,
  registerResearchRunController,
  unregisterResearchRunController,
} from "@/lib/ai/structured-research-cancellation";
import {
  analysisCancellationRequested,
  analysisPersistenceMode,
  createAnalysisRun,
  hashResearchPrompt,
  structuredResearchPersistenceReady,
  updateAnalysisRun,
  type AnalysisRunStatus,
} from "@/lib/ai/structured-research-persistence";
import {
  classifyStructuredResearchPrompt,
  createEvidenceOnlyPartial,
  RESEARCH_PROMPT_VERSION,
  RESEARCH_SCHEMA_VERSION,
  RESEARCH_WORKFLOW_VERSION,
  researchStreamEventSchema,
  structuredResearchRequestSchema,
  validateWithOneRepair,
  type GenerationInput,
  type GenerationUsage,
  type ResearchStreamEvent,
} from "@/lib/ai/structured-research";
import {
  createStructuredResearchGenerator,
  structuredResearchMode,
} from "@/lib/ai/structured-research-provider";
import { checkUsageLimit, recordUsageEvent } from "@/lib/billing/usage";
import {
  getResearchWorkspace,
  searchResearchEvidence,
} from "@/lib/research-api";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  authenticatedTokenFromRequest,
  authenticationRequiredResponse,
  isAuthenticationRequiredError,
} from "@/lib/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ workspaceId: string }> };
type StreamEventPayload<T = ResearchStreamEvent> = T extends ResearchStreamEvent
  ? Omit<T, "sequence" | "at" | "runId">
  : never;

class CancelledRunError extends Error {
  constructor() {
    super("Research run cancelled.");
    this.name = "AbortError";
  }
}

function isCancellation(error: unknown) {
  return (
    error instanceof CancelledRunError ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function sanitizedFailure(error: unknown) {
  if (error instanceof SyntaxError) {
    return {
      code: "provider_output_invalid_json",
      message: "The generation provider returned invalid structured output.",
      retryable: true,
    };
  }
  return {
    code: "structured_generation_failed",
    message:
      error instanceof Error && error.message.includes("not found")
        ? error.message
        : "The structured research run could not be completed.",
    retryable: true,
  };
}

function terminalTelemetry(input: {
  provider: string;
  model: string;
  mode: string;
  promptVersion: string;
  schemaVersion: string;
  workflowVersion: string;
  retrievalRunId: string;
  retrievedChunkIds: string[];
  usage: GenerationUsage;
  repairAttempted: boolean;
  repairSucceeded: boolean;
  stageTimings: Record<string, number>;
  totalLatencyMs: number;
}) {
  return {
    provider: input.provider,
    model: input.model,
    mode: input.mode,
    promptVersion: input.promptVersion,
    schemaVersion: input.schemaVersion,
    workflowVersion: input.workflowVersion,
    retrievalRunId: input.retrievalRunId,
    retrievedChunkIds: input.retrievedChunkIds,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    totalTokens: input.usage.totalTokens,
    estimatedCostUsd: input.usage.estimatedCostUsd,
    repairAttempted: input.repairAttempted,
    repairSucceeded: input.repairSucceeded,
    stageTimingsMs: input.stageTimings,
    totalLatencyMs: input.totalLatencyMs,
  };
}

export async function POST(request: Request, context: RouteContext) {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
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

  const parsedRequest = structuredResearchRequestSchema.safeParse(parsedBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message:
            "The research question and document scope must match the structured workflow contract.",
        },
      },
      { status: 400 },
    );
  }

  const safety = classifyStructuredResearchPrompt(parsedRequest.data.query);
  if (!safety.safe) {
    return NextResponse.json(
      {
        error: {
          code: "research_boundary",
          message: safety.reason,
        },
      },
      { status: 422 },
    );
  }

  let authToken: string;
  try {
    authToken = await authenticatedTokenFromRequest(request);
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return authenticationRequiredResponse();
    }
    throw error;
  }

  const { workspaceId } = await context.params;
  const rateLimit = await checkRateLimit({
    key: `ai:structured_research:${hashResearchPrompt(authToken)}`,
    windowSeconds: 60,
    max: 8,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Structured research requests are temporarily rate-limited.",
          resetAt: rateLimit.resetAt,
        },
      },
      { status: 429 },
    );
  }

  const usageGate = await checkUsageLimit({
    authToken,
    feature: "structured_research",
  });
  if (!usageGate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "entitlement_limit_reached",
          message: usageGate.message,
          plan: usageGate.plan,
          used: usageGate.used,
          limit: usageGate.limit,
        },
      },
      { status: 402 },
    );
  }

  if (!structuredResearchPersistenceReady()) {
    return NextResponse.json(
      {
        error: {
          code: "analysis_persistence_not_configured",
          message:
            "Durable Supabase persistence is required for structured research in production.",
        },
      },
      { status: 503 },
    );
  }

  const provider = createStructuredResearchGenerator();
  if (!provider.generator) {
    return NextResponse.json(
      {
        error: {
          code: "live_ai_not_configured",
          message: provider.error,
          provider: structuredResearchMode(),
        },
      },
      { status: 503 },
    );
  }

  try {
    await getResearchWorkspace(workspaceId, authToken);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "research_workspace_not_found",
          message: "Research workspace was not found.",
        },
      },
      { status: 404 },
    );
  }

  let created: Awaited<ReturnType<typeof createAnalysisRun>>;
  try {
    created = await createAnalysisRun({
      authToken,
      workspaceId,
      retryOfRunId: parsedRequest.data.retryOfRunId,
      prompt: parsedRequest.data.query,
      workflowVersion: RESEARCH_WORKFLOW_VERSION,
      promptVersion: RESEARCH_PROMPT_VERSION,
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      descriptor: provider.generator.descriptor,
      selectedDocumentIds: parsedRequest.data.documentIds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "analysis_run_not_created",
          message:
            error instanceof Error && error.message.includes("retry")
              ? "The analysis selected for retry was not found."
              : "The structured research run could not be created.",
        },
      },
      { status: 404 },
    );
  }

  const runId = created.run.id;
  const generator = provider.generator;
  const encoder = new TextEncoder();
  const runController = new AbortController();
  const onRequestAbort = () => {
    runController.abort(
      new DOMException("The client ended the research stream.", "AbortError"),
    );
  };
  request.signal.addEventListener("abort", onRequestAbort, { once: true });
  registerResearchRunController(runId, runController);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = performance.now();
      const stageTimings: Record<string, number> = {};
      let sequence = 0;
      let streamOpen = true;

      const emit = (event: StreamEventPayload) => {
        const parsed = researchStreamEventSchema.parse({
          ...event,
          sequence: ++sequence,
          at: new Date().toISOString(),
          runId,
        });
        if (streamOpen) {
          controller.enqueue(encoder.encode(`${JSON.stringify(parsed)}\n`));
        }
      };

      const patch = (
        status: AnalysisRunStatus,
        values: Parameters<typeof updateAnalysisRun>[0]["patch"] = {},
      ) =>
        updateAnalysisRun({
          authToken,
          workspaceId,
          runId,
          patch: { status, ...values },
        });

      const checkCancelled = async () => {
        if (
          runController.signal.aborted ||
          (await analysisCancellationRequested({
            authToken,
            workspaceId,
            runId,
          }))
        ) {
          throw new CancelledRunError();
        }
      };

      const beginStage = async (
        stage: "retrieval" | "generation" | "validation" | "repair" | "persistence",
        status: AnalysisRunStatus,
      ) => {
        await checkCancelled();
        await patch(status);
        emit({ type: "stage.started", stage });
        return performance.now();
      };

      const endStage = (
        stage: "retrieval" | "generation" | "validation" | "repair" | "persistence",
        stageStartedAt: number,
        detail?: string,
      ) => {
        const latencyMs = Math.max(
          0,
          Math.round(performance.now() - stageStartedAt),
        );
        stageTimings[stage] = latencyMs;
        emit({ type: "stage.completed", stage, latencyMs, detail });
      };

      try {
        emit({
          type: "run.created",
          workflow: "earnings_review",
          provider: generator.descriptor.provider,
          model: generator.descriptor.model,
          mode: generator.descriptor.mode,
          persistence: created.persistence,
        });

        const retrievalStartedAt = await beginStage("retrieval", "retrieving");
        const retrieval = await searchResearchEvidence(
          workspaceId,
          authToken,
          {
            query: parsedRequest.data.query,
            limit: 8,
            documentIds: parsedRequest.data.documentIds,
          },
        );
        if (
          retrieval.status < 200 ||
          retrieval.status > 299 ||
          !("data" in retrieval.payload)
        ) {
          throw new Error(
            "error" in retrieval.payload
              ? retrieval.payload.error.message
              : "Evidence retrieval failed.",
          );
        }
        const search = retrieval.payload.data;
        if (search.results.length === 0) {
          throw new Error(
            "No relevant evidence was found in the selected document scope.",
          );
        }
        await patch("retrieving", {
          retrievalRunId: search.diagnostics.runId,
          retrievedChunkIds: search.results.map((item) => item.chunkId),
        });
        endStage(
          "retrieval",
          retrievalStartedAt,
          `${search.results.length} evidence passages retrieved.`,
        );

        const generationInput: GenerationInput = {
          query: parsedRequest.data.query,
          evidence: search.results,
          diagnostics: search.diagnostics,
          retrievedAt: new Date().toISOString(),
        };

        let result;
        let validationIssues: { path: string; code: string }[] = [];
        let repairAttempted = false;
        let repairSucceeded = false;
        let usage: GenerationUsage = {
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          estimatedCostUsd: null,
        };
        let terminalStatus: "completed" | "partial" = "completed";

        try {
          const generationStartedAt = await beginStage(
            "generation",
            "generating",
          );
          const candidate = await generator.generate(
            generationInput,
            runController.signal,
          );
          endStage("generation", generationStartedAt);

          const validationStartedAt = await beginStage(
            "validation",
            "validating",
          );
          let repairStartedAt: number | null = null;
          const outcome = await validateWithOneRepair(
            candidate,
            (invalidCandidate, issues) =>
              generator.repair(
                generationInput,
                invalidCandidate,
                issues,
                runController.signal,
              ),
            async () => {
              endStage(
                "validation",
                validationStartedAt,
                "Initial output requires one repair attempt.",
              );
              repairStartedAt = await beginStage("repair", "repairing");
            },
            generationInput.evidence,
          );

          if (repairStartedAt !== null) {
            endStage(
              "repair",
              repairStartedAt,
              outcome.status === "valid"
                ? "Structured output repaired."
                : "Repair exhausted. Preserving a partial result.",
            );
          } else {
            endStage("validation", validationStartedAt);
          }

          usage = outcome.usage;
          validationIssues = outcome.issues;
          repairAttempted = outcome.repairAttempted;
          repairSucceeded = outcome.repairSucceeded;
          if (outcome.status === "valid") {
            result = outcome.result;
          } else {
            terminalStatus = "partial";
            result = createEvidenceOnlyPartial(
              generationInput,
              "Structured validation failed after one repair attempt.",
            );
          }
        } catch (error) {
          if (isCancellation(error)) throw error;
          terminalStatus = "partial";
          result = createEvidenceOnlyPartial(
            generationInput,
            "The generation provider failed. Retrieved evidence was preserved without a complete interpretation.",
          );
          validationIssues = [
            { path: "generation", code: "provider_failure" },
          ];
        }

        for (const section of result.sections) {
          await checkCancelled();
          emit({ type: "section.completed", section });
        }

        const persistenceStartedAt = await beginStage(
          "persistence",
          "persisting",
        );
        const totalLatencyMs = Math.max(
          0,
          Math.round(performance.now() - startedAt),
        );
        await patch(terminalStatus, {
          provider: generator.descriptor.provider,
          model: generator.descriptor.model,
          mode:
            terminalStatus === "partial" &&
            validationIssues.some((issue) => issue.code === "provider_failure")
              ? "degraded"
              : generator.descriptor.mode,
          output: result,
          validationIssues,
          repairAttempted,
          repairSucceeded,
          usage,
          stageTimings,
          totalLatencyMs,
          eventCount: sequence + 2,
          lastEventSequence: sequence + 2,
          completedAt: new Date().toISOString(),
        });
        await recordUsageEvent({
          authToken,
          feature: "structured_research",
          metadata: {
            workflow: "earnings_review",
            runId,
            status: terminalStatus,
            provider: generator.descriptor.provider,
            model: generator.descriptor.model,
            promptVersion: RESEARCH_PROMPT_VERSION,
            schemaVersion: RESEARCH_SCHEMA_VERSION,
            retrievedChunkCount: search.results.length,
            totalLatencyMs,
          },
        });
        endStage("persistence", persistenceStartedAt);
        const completedLatencyMs = Math.max(
          0,
          Math.round(performance.now() - startedAt),
        );
        await patch(terminalStatus, {
          stageTimings,
          totalLatencyMs: completedLatencyMs,
          eventCount: sequence + 1,
          lastEventSequence: sequence + 1,
        });

        const telemetry = terminalTelemetry({
          provider: generator.descriptor.provider,
          model: generator.descriptor.model,
          mode:
            terminalStatus === "partial" &&
            validationIssues.some((issue) => issue.code === "provider_failure")
              ? "degraded"
              : generator.descriptor.mode,
          promptVersion: RESEARCH_PROMPT_VERSION,
          schemaVersion: RESEARCH_SCHEMA_VERSION,
          workflowVersion: RESEARCH_WORKFLOW_VERSION,
          retrievalRunId: search.diagnostics.runId,
          retrievedChunkIds: search.results.map((item) => item.chunkId),
          usage,
          repairAttempted,
          repairSucceeded,
          stageTimings,
          totalLatencyMs: completedLatencyMs,
        });
        emit(
          terminalStatus === "completed"
            ? { type: "run.completed", result, telemetry }
            : { type: "run.partial", result, telemetry },
        );
      } catch (error) {
        if (isCancellation(error)) {
          const now = new Date().toISOString();
          await updateAnalysisRun({
            authToken,
            workspaceId,
            runId,
            patch: {
              status: "cancelled",
              cancelRequestedAt: now,
              completedAt: now,
              stageTimings,
              totalLatencyMs: Math.max(
                0,
                Math.round(performance.now() - startedAt),
              ),
              eventCount: sequence + 1,
              lastEventSequence: sequence + 1,
            },
          });
          emit({
            type: "run.cancelled",
            reason: "The user cancelled this research run.",
          });
        } else {
          const failure = sanitizedFailure(error);
          await updateAnalysisRun({
            authToken,
            workspaceId,
            runId,
            patch: {
              status: "failed",
              validationIssues: [
                { path: "runtime", code: failure.code },
              ],
              stageTimings,
              totalLatencyMs: Math.max(
                0,
                Math.round(performance.now() - startedAt),
              ),
              eventCount: sequence + 1,
              lastEventSequence: sequence + 1,
              completedAt: new Date().toISOString(),
            },
          });
          emit({ type: "run.failed", error: failure });
        }
      } finally {
        unregisterResearchRunController(runId);
        request.signal.removeEventListener("abort", onRequestAbort);
        streamOpen = false;
        try {
          controller.close();
        } catch {
          // The client may already have closed the stream.
        }
      }
    },
    cancel() {
      abortResearchRun(runId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "x-aperture-run-id": runId,
      "x-aperture-persistence": analysisPersistenceMode(),
    },
  });
}
