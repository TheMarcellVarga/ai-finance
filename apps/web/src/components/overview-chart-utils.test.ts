import assert from "node:assert/strict";
import test from "node:test";

import {
  movementScale,
  movementWidth,
  normalizeAllocationData,
  totalWeightBps,
} from "./overview-chart-utils";

test("normalizes allocation into visible sectors and an other bucket", () => {
  const data = normalizeAllocationData([
    { label: "Technology", weightBps: 5200, status: "review" },
    { label: "Healthcare", weightBps: 2100, status: "ok" },
    { label: "Industrials", weightBps: 1500, status: "ok" },
    { label: "Energy", weightBps: 800, status: "ok" },
    { label: "Utilities", weightBps: 300, status: "ok" },
    { label: "Materials", weightBps: 100, status: "ok" },
  ], 4);

  assert.deepEqual(data.map((item) => item.label), ["Technology", "Healthcare", "Industrials", "Energy", "Other"]);
  assert.equal(totalWeightBps(data), 10000);
  assert.equal(data.at(-1)?.weightBps, 400);
});

test("ignores empty allocation values", () => {
  const data = normalizeAllocationData([
    { label: "Empty", weightBps: 0, status: "ok" },
    { label: "Cash", weightBps: 2500, status: "ok" },
  ]);

  assert.deepEqual(data.map((item) => item.label), ["Cash"]);
});

test("scales signed movement bars against the largest reported move", () => {
  const items = [
    { ticker: "AAA", dailyChangeBps: 125 },
    { ticker: "BBB", dailyChangeBps: -250 },
    { ticker: "CCC" },
  ];

  assert.equal(movementScale(items), 250);
  assert.equal(movementWidth(125, movementScale(items)), 50);
  assert.equal(movementWidth(-250, movementScale(items)), 100);
  assert.equal(movementWidth(undefined, movementScale(items)), 0);
});
