import assert from "node:assert/strict";
import test from "node:test";

import { selectRecentConfirmedFlips } from "./flip-digest-selection";

test("selects only recent confirmed flips in the requested direction", () => {
  const start = new Date("2026-09-25T00:00:00Z");
  const end = new Date("2026-09-26T00:00:00Z");
  const base = { assetClass: "equities", name: "Example", source: "Yahoo", signalBasis: "ohlc", capturedAt: "2026-09-25T23:00:00Z", confirmedClosedCandle: true };
  const candidates = [
    { ...base, symbol: "A", trend: "bullish" as const, lastFlipAt: "2026-09-25T12:00:00Z" },
    { ...base, symbol: "B", trend: "bearish" as const, lastFlipAt: "2026-09-25T13:00:00Z" },
    { ...base, symbol: "C", trend: "bullish" as const, lastFlipAt: "2026-09-24T12:00:00Z" },
    { ...base, symbol: "D", trend: "bullish" as const, lastFlipAt: "2026-09-25T12:00:00Z", confirmedClosedCandle: false },
  ];
  assert.deepEqual(selectRecentConfirmedFlips(candidates, "bull", start, end).map((entry) => entry.symbol), ["A"]);
  assert.deepEqual(selectRecentConfirmedFlips(candidates, "bear", start, end).map((entry) => entry.symbol), ["B"]);
  assert.deepEqual(selectRecentConfirmedFlips(candidates, "both", start, end).map((entry) => entry.symbol), ["B", "A"]);
});
