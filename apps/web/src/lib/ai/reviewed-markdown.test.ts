import assert from "node:assert/strict";
import test from "node:test";

import { createDeterministicEarningsReview } from "./structured-research";
import { buildReviewedMarkdown } from "./reviewed-markdown";
import type { AnalysisReviewEvent } from "./research-review";
import type { EvidenceResult, RetrievalDiagnostics } from "../research-api";

const runId = "11111111-1111-4111-8111-111111111111";
const chunkId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";
const retrievalRunId = "44444444-4444-4444-8444-444444444444";
const evidence: EvidenceResult[] = [{
  chunkId,
  documentId,
  documentTitle: "Quarterly filing",
  pageNumber: 7,
  sequence: 0,
  snippet: "Revenue increased while supplier concentration remained a disclosed risk.",
  sourceLocator: "page:7",
  headingPath: ["Results"],
  chunkerVersion: "page-window-v1",
  embeddingProvider: "local",
  embeddingModel: "hash-embedding-v1",
  embeddingVersion: "1",
  vectorSimilarity: 0.8,
  lexicalScore: 0.7,
  combinedScore: 0.03,
}];
const diagnostics: RetrievalDiagnostics = {
  runId: retrievalRunId,
  querySha256: "a".repeat(64),
  filters: { workspaceId: "55555555-5555-4555-8555-555555555555", documentIds: [] },
  chunkerVersion: "page-window-v1",
  embedding: {
    provider: "local",
    model: "hash-embedding-v1",
    version: "1",
    dimensions: 1536,
    externalCalls: false,
  },
  requestedLimit: 8,
  candidateCount: 1,
  resultCount: 1,
  duplicatesSuppressed: 0,
  stageTimingsMs: { total: 1 },
};
const result = createDeterministicEarningsReview({
  query: "What changed?",
  evidence,
  diagnostics,
  retrievedAt: "2026-07-30T00:00:00.000Z",
});

function event(
  id: string,
  values: Partial<AnalysisReviewEvent>,
): AnalysisReviewEvent {
  return {
    id,
    requestId: id.replace(/^1/, "9"),
    analysisRunId: runId,
    sectionKey: "executive_summary",
    eventType: "accepted",
    outputSha256: "a".repeat(64),
    createdAt: "2026-07-30T00:00:00.000Z",
    ...values,
  };
}

test("reviewed export keeps accepted edits distinct and preserves evidence", () => {
  const editId = "10000000-0000-4000-8000-000000000001";
  const events: AnalysisReviewEvent[] = [
    event(editId, {
      eventType: "edit_saved",
      sectionTitle: "Human summary",
      sectionBody: "Reviewed wording with <unsafe> HTML.",
    }),
    event("10000000-0000-4000-8000-000000000002", {
      eventType: "accepted",
      contentEventId: editId,
      note: "Compared with page 7.",
    }),
    event("10000000-0000-4000-8000-000000000003", {
      eventType: "citation_flagged",
      citationChunkId: chunkId,
      note: "Needs a narrower excerpt.",
    }),
  ];
  const exported = buildReviewedMarkdown({
    runId,
    result,
    events,
    exportedAt: "2026-07-30T01:00:00.000Z",
  });
  assert.match(exported.markdown, /Human summary/);
  assert.match(exported.markdown, /Accepted user edit/);
  assert.match(exported.markdown, /Quarterly filing, page 7/);
  assert.match(exported.markdown, /1 human issue report/);
  assert.doesNotMatch(exported.markdown, /<unsafe>/);
  assert.equal(exported.fullyReviewed, false);
});
