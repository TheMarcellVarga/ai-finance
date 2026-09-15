import assert from "node:assert/strict";
import test from "node:test";

import type { CryptoCandle } from "./crypto-supertrend";
import {
  calculateSimpleMovingAverage,
  calculateVargaTrendAuto,
  calculateVargaTrendBacktest,
  selectVargaTrendCase,
  type VargaTrendBacktest,
} from "./varga-trend";

function alternatingCandles(length = 24): CryptoCandle[] {
  return Array.from({ length }, (_, index) => {
    const close = index % 2 === 0 ? 112 : 88;
    const open = index === 0 ? 100 : index % 2 === 0 ? 104 : 96;
    return {
      openTime: index * 60_000,
      closeTime: (index + 1) * 60_000 - 1,
      open,
      high: Math.max(open, close) + 1,
      low: Math.min(open, close) - 1,
      close,
    };
  });
}

function withStats(backtest: VargaTrendBacktest, side: "long" | "short", trades: number, wins: number, averageWinPercent: number) {
  return {
    ...backtest,
    [side]: {
      trades,
      wins,
      winRate: (wins / trades) * 100,
      averageWinPercent,
      returnsPercent: [],
    },
  };
}

test("executes confirmed flips at the next candle open and counts completed trades only", () => {
  const candles = alternatingCandles();
  const backtest = calculateVargaTrendBacktest(candles, 2, 0.1);
  const firstBuyIndex = backtest.result.points.findIndex((point) => point.buySignal);
  const laterSellIndex = backtest.result.points.findIndex((point, index) => index > firstBuyIndex && point.sellSignal);

  assert.ok(firstBuyIndex >= 0 && laterSellIndex > firstBuyIndex);
  const entryCandle = candles.find((candle) => candle.openTime === backtest.result.points[firstBuyIndex + 1].openTime)!;
  const exitCandle = candles.find((candle) => candle.openTime === backtest.result.points[laterSellIndex + 1].openTime)!;
  const expectedFirstLongReturn = (exitCandle.open / entryCandle.open - 1) * 100;

  assert.equal(backtest.long.returnsPercent[0], expectedFirstLongReturn);
  assert.equal(backtest.long.trades, backtest.long.returnsPercent.length);
  assert.ok(backtest.result.points.at(-1)?.buySignal || backtest.result.points.at(-1)?.sellSignal);
});

test("uses weekly for a qualified side even when a lower timeframe has a higher win rate", () => {
  const base = calculateVargaTrendBacktest(alternatingCandles(), 2, 0.1);
  const selected = selectVargaTrendCase({
    "1w": withStats(base, "long", 10, 5, 12),
    "1d": withStats(base, "long", 20, 18, 8),
  }, "long");

  assert.equal(selected?.timeframe, "1w");
  assert.equal(selected?.selection, "weekly");
});

test("falls back to the best qualified daily-or-lower timeframe and excludes monthly", () => {
  const base = calculateVargaTrendBacktest(alternatingCandles(), 2, 0.1);
  const selected = selectVargaTrendCase({
    "1w": withStats(base, "short", 4, 4, 20),
    "1M": withStats(base, "short", 50, 50, 40),
    "1d": withStats(base, "short", 8, 4, 9),
    "4h": withStats(base, "short", 8, 6, 6),
  }, "short");

  assert.equal(selected?.timeframe, "4h");
  assert.equal(selected?.selection, "fallback");
});

test("calculates SMA 50, 100 and 200 from closed prices", () => {
  const candles = Array.from({ length: 205 }, (_, index) => ({
    openTime: index,
    closeTime: index + 1,
    open: index + 1,
    high: index + 1,
    low: index + 1,
    close: index + 1,
  }));

  assert.equal(calculateSimpleMovingAverage(candles, 50)[49].value, 25.5);
  assert.equal(calculateSimpleMovingAverage(candles, 100)[99].value, 50.5);
  assert.equal(calculateSimpleMovingAverage(candles, 200)[199].value, 100.5);
});

test("auto mode selects only an eligible ATR period and exposes warm-up state", () => {
  const analysis = calculateVargaTrendAuto(alternatingCandles(240));

  assert.equal(analysis.parameterMode, "auto");
  assert.equal(analysis.auto.selectedMultiplier, 3);
  assert.ok(analysis.atrPeriod >= 10 && analysis.atrPeriod <= 20);
  assert.equal(analysis.auto.selectionReady, analysis.auto.selectedPeriod != null);

  if (analysis.auto.selectionReady) {
    assert.ok(analysis.auto.completedBullishSections >= analysis.auto.minimumTrades);
    assert.ok((analysis.auto.winRatePercent ?? 0) >= analysis.auto.minimumWinRate);
    assert.ok((analysis.auto.geometricAverageTradePercent ?? 0) > 0);
  }
});
