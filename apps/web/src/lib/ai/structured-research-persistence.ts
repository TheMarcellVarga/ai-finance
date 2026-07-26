import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type {
  GenerationDescriptor,
  GenerationUsage,
  StructuredResearchResult,
  ValidationIssue,
} from "@/lib/ai/structured-research";
import { decodeJwtSubject } from "@/lib/server/identity";
import {
  ensureProfileForClerkUser,
  supabaseRestFetch,
  supabaseServerConfigured,
} from "@/lib/server/supabase-rest";

export type AnalysisRunStatus =
  | "queued"
  | "retrieving"
  | "generating"
  | "validating"
  | "repairing"
  | "completed"
  | "partial"
  | "cancelled"
  | "failed";

export type AnalysisRunRecord = {
  id: string;
  userId: string;
  workspaceId: string;
  retryOfRunId: string | null;
  workflow: "earnings_review";
  workflowVersion: string;
  status: AnalysisRunStatus;
  promptSha256: string;
  promptVersion: string;
  schemaVersion: string;
  provider: string;
  model: string;
  mode: GenerationDescriptor["mode"];
  selectedDocumentIds: string[];
  retrievalRunId: string | null;
  retrievedChunkIds: string[];
  output: StructuredResearchResult | null;
  validationIssues: ValidationIssue[];
  repairAttempted: boolean;
  repairSucceeded: boolean;
  usage: GenerationUsage;
  stageTimings: Record<string, number>;
  totalLatencyMs: number | null;
  eventCount: number;
  lastEventSequence: number;
  cancelRequestedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RunPatch = Partial<
  Pick<
    AnalysisRunRecord,
    | "status"
    | "provider"
    | "model"
    | "mode"
    | "retrievalRunId"
    | "retrievedChunkIds"
    | "output"
    | "validationIssues"
    | "repairAttempted"
    | "repairSucceeded"
    | "usage"
    | "stageTimings"
    | "totalLatencyMs"
    | "eventCount"
    | "lastEventSequence"
    | "cancelRequestedAt"
    | "startedAt"
    | "completedAt"
  >
>;

type SupabaseRunRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  retry_of_run_id: string | null;
  workflow: "earnings_review";
  workflow_version: string;
  status: AnalysisRunStatus;
  prompt_sha256: string;
  prompt_version: string;
  schema_version: string;
  provider: string;
  model: string;
  mode: GenerationDescriptor["mode"];
  selected_document_ids: string[];
  retrieval_run_id: string | null;
  retrieved_chunk_ids: string[];
  output_json: StructuredResearchResult | null;
  validation_issues: ValidationIssue[];
  repair_attempted: boolean;
  repair_succeeded: boolean;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | string | null;
  stage_timings: Record<string, number>;
  total_latency_ms: number | null;
  event_count: number;
  last_event_sequence: number;
  cancel_requested_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MemoryState = {
  runs: Map<string, AnalysisRunRecord>;
};

declare global {
  var __apertureStructuredResearchMemory: MemoryState | undefined;
}

const memory =
  globalThis.__apertureStructuredResearchMemory ??
  (globalThis.__apertureStructuredResearchMemory = {
    runs: new Map<string, AnalysisRunRecord>(),
  });

export type AnalysisPersistenceMode = "supabase" | "memory";

export function analysisPersistenceMode(): AnalysisPersistenceMode {
  return supabaseServerConfigured() ? "supabase" : "memory";
}

export function structuredResearchPersistenceReady() {
  return supabaseServerConfigured() || process.env.NODE_ENV !== "production";
}

export function hashResearchPrompt(prompt: string) {
  return createHash("sha256")
    .update(prompt.replace(/\s+/g, " ").trim())
    .digest("hex");
}

function fromRow(row: SupabaseRunRow): AnalysisRunRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    retryOfRunId: row.retry_of_run_id,
    workflow: row.workflow,
    workflowVersion: row.workflow_version,
    status: row.status,
    promptSha256: row.prompt_sha256,
    promptVersion: row.prompt_version,
    schemaVersion: row.schema_version,
    provider: row.provider,
    model: row.model,
    mode: row.mode,
    selectedDocumentIds: row.selected_document_ids,
    retrievalRunId: row.retrieval_run_id,
    retrievedChunkIds: row.retrieved_chunk_ids,
    output: row.output_json,
    validationIssues: row.validation_issues,
    repairAttempted: row.repair_attempted,
    repairSucceeded: row.repair_succeeded,
    usage: {
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      estimatedCostUsd:
        row.estimated_cost_usd === null
          ? null
          : Number(row.estimated_cost_usd),
    },
    stageTimings: row.stage_timings,
    totalLatencyMs: row.total_latency_ms,
    eventCount: row.event_count,
    lastEventSequence: row.last_event_sequence,
    cancelRequestedAt: row.cancel_requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function patchForDatabase(patch: RunPatch) {
  const body: Record<string, unknown> = {};
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.provider !== undefined) body.provider = patch.provider;
  if (patch.model !== undefined) body.model = patch.model;
  if (patch.mode !== undefined) body.mode = patch.mode;
  if (patch.retrievalRunId !== undefined)
    body.retrieval_run_id = patch.retrievalRunId;
  if (patch.retrievedChunkIds !== undefined)
    body.retrieved_chunk_ids = patch.retrievedChunkIds;
  if (patch.output !== undefined) body.output_json = patch.output;
  if (patch.validationIssues !== undefined)
    body.validation_issues = patch.validationIssues;
  if (patch.repairAttempted !== undefined)
    body.repair_attempted = patch.repairAttempted;
  if (patch.repairSucceeded !== undefined)
    body.repair_succeeded = patch.repairSucceeded;
  if (patch.usage !== undefined) {
    body.input_tokens = patch.usage.inputTokens;
    body.output_tokens = patch.usage.outputTokens;
    body.total_tokens = patch.usage.totalTokens;
    body.estimated_cost_usd = patch.usage.estimatedCostUsd;
  }
  if (patch.stageTimings !== undefined)
    body.stage_timings = patch.stageTimings;
  if (patch.totalLatencyMs !== undefined)
    body.total_latency_ms = patch.totalLatencyMs;
  if (patch.eventCount !== undefined) body.event_count = patch.eventCount;
  if (patch.lastEventSequence !== undefined)
    body.last_event_sequence = patch.lastEventSequence;
  if (patch.cancelRequestedAt !== undefined)
    body.cancel_requested_at = patch.cancelRequestedAt;
  if (patch.startedAt !== undefined) body.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) body.completed_at = patch.completedAt;
  return body;
}

async function resolveOwner(authToken: string) {
  const clerkUserId = decodeJwtSubject(authToken);
  if (!supabaseServerConfigured()) return clerkUserId;
  return (await ensureProfileForClerkUser({ clerkUserId })).id;
}

async function assertSupabaseWorkspaceOwner(userId: string, workspaceId: string) {
  const rows = await supabaseRestFetch<Array<{ id: string }>>(
    `research_workspaces?id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
  );
  if (rows.length !== 1) {
    throw new Error("Research workspace was not found.");
  }
}

export async function createAnalysisRun(input: {
  authToken: string;
  workspaceId: string;
  retryOfRunId?: string;
  prompt: string;
  workflowVersion: string;
  promptVersion: string;
  schemaVersion: string;
  descriptor: GenerationDescriptor;
  selectedDocumentIds: string[];
}) {
  const userId = await resolveOwner(input.authToken);
  const now = new Date().toISOString();

  if (supabaseServerConfigured()) {
    await assertSupabaseWorkspaceOwner(userId, input.workspaceId);
    if (input.retryOfRunId) {
      const prior = await supabaseRestFetch<Array<{ id: string }>>(
        `research_analysis_runs?id=eq.${encodeURIComponent(input.retryOfRunId)}&user_id=eq.${encodeURIComponent(userId)}&workspace_id=eq.${encodeURIComponent(input.workspaceId)}&select=id&limit=1`,
      );
      if (prior.length !== 1) {
        throw new Error("The analysis selected for retry was not found.");
      }
    }

    const [row] = await supabaseRestFetch<SupabaseRunRow[]>(
      "research_analysis_runs",
      {
        method: "POST",
        body: JSON.stringify([
          {
            user_id: userId,
            workspace_id: input.workspaceId,
            retry_of_run_id: input.retryOfRunId ?? null,
            workflow: "earnings_review",
            workflow_version: input.workflowVersion,
            status: "queued",
            prompt_sha256: hashResearchPrompt(input.prompt),
            prompt_version: input.promptVersion,
            schema_version: input.schemaVersion,
            provider: input.descriptor.provider,
            model: input.descriptor.model,
            mode: input.descriptor.mode,
            selected_document_ids: input.selectedDocumentIds,
            started_at: now,
          },
        ]),
      },
    );
    return { run: fromRow(row), persistence: "supabase" as const };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Durable structured research persistence is required.");
  }
  if (input.retryOfRunId) {
    const prior = memory.runs.get(input.retryOfRunId);
    if (
      !prior ||
      prior.userId !== userId ||
      prior.workspaceId !== input.workspaceId
    ) {
      throw new Error("The analysis selected for retry was not found.");
    }
  }

  const run: AnalysisRunRecord = {
    id: randomUUID(),
    userId,
    workspaceId: input.workspaceId,
    retryOfRunId: input.retryOfRunId ?? null,
    workflow: "earnings_review",
    workflowVersion: input.workflowVersion,
    status: "queued",
    promptSha256: hashResearchPrompt(input.prompt),
    promptVersion: input.promptVersion,
    schemaVersion: input.schemaVersion,
    provider: input.descriptor.provider,
    model: input.descriptor.model,
    mode: input.descriptor.mode,
    selectedDocumentIds: [...input.selectedDocumentIds],
    retrievalRunId: null,
    retrievedChunkIds: [],
    output: null,
    validationIssues: [],
    repairAttempted: false,
    repairSucceeded: false,
    usage: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
    },
    stageTimings: {},
    totalLatencyMs: null,
    eventCount: 0,
    lastEventSequence: 0,
    cancelRequestedAt: null,
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  memory.runs.set(run.id, run);
  return { run, persistence: "memory" as const };
}

export async function readAnalysisRun(input: {
  authToken: string;
  workspaceId: string;
  runId: string;
}) {
  const userId = await resolveOwner(input.authToken);
  if (supabaseServerConfigured()) {
    const rows = await supabaseRestFetch<SupabaseRunRow[]>(
      `research_analysis_runs?id=eq.${encodeURIComponent(input.runId)}&user_id=eq.${encodeURIComponent(userId)}&workspace_id=eq.${encodeURIComponent(input.workspaceId)}&select=*&limit=1`,
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }
  const run = memory.runs.get(input.runId);
  return run && run.userId === userId && run.workspaceId === input.workspaceId
    ? run
    : null;
}

export async function updateAnalysisRun(input: {
  authToken: string;
  workspaceId: string;
  runId: string;
  patch: RunPatch;
}) {
  const userId = await resolveOwner(input.authToken);
  if (supabaseServerConfigured()) {
    const rows = await supabaseRestFetch<SupabaseRunRow[]>(
      `research_analysis_runs?id=eq.${encodeURIComponent(input.runId)}&user_id=eq.${encodeURIComponent(userId)}&workspace_id=eq.${encodeURIComponent(input.workspaceId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(patchForDatabase(input.patch)),
      },
    );
    if (!rows[0]) throw new Error("Research analysis run was not found.");
    return fromRow(rows[0]);
  }

  const current = memory.runs.get(input.runId);
  if (
    !current ||
    current.userId !== userId ||
    current.workspaceId !== input.workspaceId
  ) {
    throw new Error("Research analysis run was not found.");
  }
  const updated: AnalysisRunRecord = {
    ...current,
    ...input.patch,
    usage: input.patch.usage ?? current.usage,
    stageTimings: input.patch.stageTimings ?? current.stageTimings,
    updatedAt: new Date().toISOString(),
  };
  memory.runs.set(updated.id, updated);
  return updated;
}

export async function requestAnalysisCancellation(input: {
  authToken: string;
  workspaceId: string;
  runId: string;
}) {
  const run = await readAnalysisRun(input);
  if (!run) return null;
  if (["completed", "partial", "cancelled", "failed"].includes(run.status)) {
    return run;
  }
  const now = new Date().toISOString();
  return updateAnalysisRun({
    ...input,
    patch: {
      status: "cancelled",
      cancelRequestedAt: now,
      completedAt: now,
    },
  });
}

export async function analysisCancellationRequested(input: {
  authToken: string;
  workspaceId: string;
  runId: string;
}) {
  const run = await readAnalysisRun(input);
  return !run || Boolean(run.cancelRequestedAt) || run.status === "cancelled";
}

