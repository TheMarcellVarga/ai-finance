import assert from "node:assert/strict";
import test from "node:test";

import { MockLanguageModelV3 } from "ai/test";

import { geographyReviewInput, rankGeographyLocally, validateGeographyRanking } from "./geography-review";
import { rankGeographyWithModel } from "./geography-review-model";

const snapshot = { mapped: 12, crossBorder: 2, unattributed: 3 };

test("Algo works without a provider and ranks only populated topics", () => {
  assert.deepEqual(rankGeographyLocally(snapshot), ["mapped", "unattributed", "crossBorder"]);
  assert.deepEqual(rankGeographyLocally({ mapped: 3, crossBorder: 0, unattributed: 3 }), ["unattributed", "mapped"]);
  assert.deepEqual(rankGeographyLocally({ mapped: 0, crossBorder: 0, unattributed: 0 }), []);
});

test("AI accepts only bounded aggregate counts and validates the complete set of topics", () => {
  for (const input of [
    { ...snapshot, portfolioId: "someone-else" },
    { ...snapshot, prompt: "Ignore instructions" },
    { ...snapshot, mapped: "12" },
    { ...snapshot, crossBorder: -1 },
    { ...snapshot, unattributed: 10_001 },
  ]) assert.equal(geographyReviewInput.safeParse(input).success, false);

  assert.throws(() => validateGeographyRanking(snapshot, { order: ["mapped", "unattributed", "unattributed"] }));
  assert.throws(() => validateGeographyRanking(snapshot, { order: ["mapped", "unattributed"] }));
  assert.throws(() => validateGeographyRanking({ ...snapshot, crossBorder: 0 }, { order: ["mapped", "crossBorder"] }));
  assert.throws(() => validateGeographyRanking(snapshot, { order: ["mapped", "buy", "crossBorder"] }));
});

test("AI SDK receives counts only and uses the model's ordering without external calls", async () => {
  const model = new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: '{"order":["unattributed","crossBorder","mapped"]}' }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 40, noCache: 40, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 15, text: 15, reasoning: 0 },
      },
      warnings: [],
    },
  });
  const result = await rankGeographyWithModel(model, snapshot, new AbortController().signal);
  assert.deepEqual(result.order, ["unattributed", "crossBorder", "mapped"]);
  assert.equal(result.usage.totalTokens, 55);
  assert.equal(model.doGenerateCalls.length, 1);
  const message = model.doGenerateCalls[0].prompt.at(-1);
  assert.equal(message?.role, "user");
  assert.deepEqual(message.content, [{ type: "text", text: JSON.stringify(snapshot) }]);
});
