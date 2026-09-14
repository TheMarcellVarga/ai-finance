import assert from "node:assert/strict";
import test from "node:test";

import { calculateSupertrend, type CryptoCandle } from "./crypto-supertrend";

function candlesFromCloses(closes: number[]): CryptoCandle[] {
  return closes.map((close, index) => ({
    openTime: index * 60_000,
    open: close,
    closeTime: (index + 1) * 60_000 - 1,
    high: close + 1,
    low: close - 1,
    close,
  }));
}

test("calculates the active flip level from the confirmed trend", () => {
  const result = calculateSupertrend(
    candlesFromCloses([100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112]),
    3,
    2,
  );

  assert.equal(result.trend, 1);
  assert.ok(result.nextFlipLevel < result.close);
});

test("records the most recent bearish flip", () => {
  const result = calculateSupertrend(
    candlesFromCloses([100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 104, 99, 94]),
    3,
    2,
  );

  assert.equal(result.trend, -1);
  assert.ok(result.lastFlipAt != null);
  assert.ok(result.lastFlipLevel != null);
  assert.ok(result.nextFlipLevel > result.close);
});
