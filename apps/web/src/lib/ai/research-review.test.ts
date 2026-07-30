import assert from "node:assert/strict";
import test from "node:test";

import {
  appendAnalysisReviewEventSchema,
  deriveSectionReviewStates,
  type AnalysisReviewEvent,
} from "./research-review";

const runId = "11111111-1111-4111-8111-111111111111";
const outputSha256 = "a".repeat(64);

function event(
  index: number,
  values: Partial<AnalysisReviewEvent>,
): AnalysisReviewEvent {
  return {
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    requestId: `10000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    analysisRunId: runId,
    sectionKey: "executive_summary",
    eventType: "accepted",
    outputSha256,
    createdAt: `2026-07-30T00:00:0${index}.000Z`,
    ...values,
  };
}

test("a later edit invalidates the prior decision", () => {
  const firstEdit = event(1, {
    eventType: "edit_saved",
    sectionTitle: "Reviewed",
    sectionBody: "First human edit.",
  });
  const accepted = event(2, {
    eventType: "accepted",
    contentEventId: firstEdit.id,
  });
  const laterEdit = event(3, {
    eventType: "edit_saved",
    sectionTitle: "Revised",
    sectionBody: "Later human edit.",
  });

  const state = deriveSectionReviewStates([
    firstEdit,
    accepted,
    laterEdit,
  ]).get("executive_summary");
  assert.equal(state?.edit?.id, laterEdit.id);
  assert.equal(state?.decision, "unreviewed");
  assert.equal(state?.decisionEvent, null);
});

test("a stale decision cannot approve newer edited content", () => {
  const firstEdit = event(1, {
    eventType: "edit_saved",
    sectionTitle: "First",
    sectionBody: "First edit.",
  });
  const laterEdit = event(2, {
    eventType: "edit_saved",
    sectionTitle: "Second",
    sectionBody: "Second edit.",
  });
  const staleAcceptance = event(3, {
    eventType: "accepted",
    contentEventId: firstEdit.id,
  });

  const state = deriveSectionReviewStates([
    firstEdit,
    laterEdit,
    staleAcceptance,
  ]).get("executive_summary");
  assert.equal(state?.edit?.id, laterEdit.id);
  assert.equal(state?.decision, "unreviewed");
});

test("review request schema rejects model-controlled or mixed payloads", () => {
  assert.equal(
    appendAnalysisReviewEventSchema.safeParse({
      requestId: "22222222-2222-4222-8222-222222222222",
      sectionKey: "executive_summary",
      eventType: "accepted",
      userId: "model",
      sectionBody: "Injected model content.",
    }).success,
    false,
  );
});
