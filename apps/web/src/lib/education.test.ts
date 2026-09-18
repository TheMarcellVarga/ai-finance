import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSupertrendAnatomy,
  calculateBacktestIntegrity,
  calculateExpectancy,
  calculatePositionSize,
  calculateRecoveryPercent,
  getAllLessons,
  learningModules,
} from "./education";
import { calculateVargaTrend } from "./varga-trend";

test("position size uses invalidation distance and all-in costs", () => {
  const result = calculatePositionSize({
    accountCapital: 10_000,
    entryPrice: 100,
    invalidationPrice: 95,
    riskPercent: 0.5,
    costPercent: 0.2,
  });

  assert.equal(result.permittedRisk, 50);
  assert.equal(result.riskPerUnit, 5);
  assert.equal(result.costPerUnit, 0.2);
  assert.equal(Number(result.maximumUnits.toFixed(4)), 9.6154);
  assert.equal(Number(result.estimatedAllInLoss.toFixed(2)), 50);
  assert.equal(result.bindingConstraint, "risk budget");
});

test("position size never implies leverage when a tight invalidation makes the risk budget permissive", () => {
  const result = calculatePositionSize({ accountCapital: 10_000, entryPrice: 100, invalidationPrice: 99.9, riskPercent: 0.5, costPercent: 0 });
  assert.equal(result.maximumUnits, 100);
  assert.equal(result.portfolioExposure, 10_000);
  assert.equal(result.bindingConstraint, "available capital");
});

test("calculation helpers remain finite for invalid numeric input", () => {
  const size = calculatePositionSize({ accountCapital: Number.NaN, entryPrice: Number.POSITIVE_INFINITY, invalidationPrice: 0, riskPercent: Number.NaN, costPercent: Number.NaN });
  const expectancy = calculateExpectancy({ winProbabilityPercent: Number.NaN, averageWinPercent: Number.POSITIVE_INFINITY, averageLossPercent: Number.NaN, costPercent: Number.NaN, observations: Number.NaN });
  assert.ok(Object.values(size).filter((value): value is number => typeof value === "number").every(Number.isFinite));
  assert.ok(Object.values(expectancy).filter((value): value is number => typeof value === "number").every(Number.isFinite));
});

test("expectancy includes costs and warns on small samples", () => {
  const result = calculateExpectancy({
    winProbabilityPercent: 45,
    averageWinPercent: 2,
    averageLossPercent: -1.5,
    costPercent: 0.2,
    observations: 20,
  });

  assert.equal(Number(result.grossExpectancyPercent.toFixed(4)), 0.075);
  assert.equal(Number(result.netExpectancyPercent.toFixed(4)), -0.125);
  assert.equal(Number(result.expectedValuePercent.toFixed(3)), -2.5);
  assert.equal(Number(result.breakEvenWinRatePercent.toFixed(2)), 48.57);
  assert.match(result.sampleWarning ?? "", /Fewer than 30/);
});

test("recovery math exposes nonlinear drawdown recovery", () => {
  assert.equal(Number(calculateRecoveryPercent(10).toFixed(1)), 11.1);
  assert.equal(Number(calculateRecoveryPercent(25).toFixed(1)), 33.3);
  assert.equal(Number(calculateRecoveryPercent(50).toFixed(1)), 100);
  assert.equal(Number(calculateRecoveryPercent(75).toFixed(1)), 300);
});

test("backtest integrity drag increases when assumptions become realistic", () => {
  const optimistic = calculateBacktestIntegrity({ headlineEdgePercent: 1, feeDragPercent: 0, spreadDragPercent: 0, slippageDragPercent: 0, executionDelayDragPercent: 0, survivorshipStatus: "unknown", overfitPenalty: 0 });
  const stressed = calculateBacktestIntegrity({ headlineEdgePercent: 1, feeDragPercent: 0.08, spreadDragPercent: 0.1, slippageDragPercent: 0.14, executionDelayDragPercent: 0.18, survivorshipStatus: "confirmed", overfitPenalty: 0.4 });
  assert.ok(stressed.adjustedEdgePercent < optimistic.adjustedEdgePercent);
  assert.ok(stressed.totalDragPercent > optimistic.totalDragPercent);
});

test("Supertrend anatomy produces ATR steps and an explicit event trail", () => {
  const steps = buildSupertrendAnatomy();
  assert.equal(steps.length, 8);
  assert.equal(steps[0].atr, null);
  assert.ok(steps[2].atr != null);
  assert.ok(steps.some((step) => step.event.includes("flip")));
});

test("Supertrend anatomy matches the deployed VargaTrend trace", () => {
  const steps = buildSupertrendAnatomy();
  const candles = steps.map((step, index) => ({ ...step.candle, openTime: index, closeTime: index + 1 }));
  const live = calculateVargaTrend(candles, 3, 1.8, true);
  assert.equal(live.points.length, steps.length - 2);
  live.points.forEach((point, pointIndex) => {
    const step = steps[pointIndex + 2];
    assert.equal(Number(step.finalUpper?.toFixed(8)), Number(point.upper.toFixed(8)));
    assert.equal(Number(step.finalLower?.toFixed(8)), Number(point.lower.toFixed(8)));
    assert.equal(step.trend, point.trend === 1 ? "bullish" : "bearish");
  });
});

test("curriculum includes complete lesson contracts across all nine modules", () => {
  const lessons = getAllLessons();
  assert.equal(learningModules.length, 9);
  assert.equal(lessons.length, 18);
  for (const lesson of lessons) {
    assert.ok(lesson.objective.length > 0);
    assert.ok(lesson.workedExample.length > 0);
    assert.ok(lesson.nextAction.length > 0);
    assert.ok(lesson.sources.length > 0);
    assert.ok(lesson.quiz.length >= 2);
    assert.ok(lesson.exercise.options.length >= 2);
    assert.equal(lesson.lastReviewedAt, "2026-09-18");
  }
});

test("curriculum topics cover the plan’s finance and safety requirements", () => {
  const topics = new Set(learningModules.flatMap((module) => module.topics));
  for (const topic of [
    "trading versus investing", "market risk", "exchange risk", "liquidity risk", "custody risk",
    "candles and returns", "trend versus momentum", "market breadth", "time since flip",
    "required data", "re-entry and cooldown", "volatility-adjusted sizing", "risk of ruin",
    "leverage and liquidation", "gap and execution risk", "multiple-testing bias", "minimum sample requirements",
    "profit factor", "volatility", "risk-adjusted return", "beta versus alpha", "statistical significance",
    "partial fills", "alert reliability", "counterparty risk", "sunk-cost behaviour", "live-practice boundary",
  ]) {
    assert.ok(topics.has(topic), `missing curriculum topic: ${topic}`);
  }
  for (const lesson of getAllLessons()) {
    const copy = JSON.stringify(lesson).toLowerCase();
    for (const phrase of ["you should buy", "buy now", "sell now", "guaranteed bullish move", "low-risk profit"]) {
      assert.equal(copy.includes(phrase), false, `unsafe phrase in ${lesson.slug}: ${phrase}`);
    }
    assert.ok(lesson.sources.every((source) => source.href.startsWith("https://")));
    const availableSourceLabels = new Set(lesson.sources.map((source) => source.label));
    for (const section of lesson.sections) {
      for (const sourceLabel of section.sourceLabels ?? []) {
        assert.ok(availableSourceLabels.has(sourceLabel), `direct source ${sourceLabel} is missing from ${lesson.slug}`);
      }
    }
  }
});
