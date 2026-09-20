import type { CryptoCandle } from "@/lib/crypto-supertrend";

export type AdaptiveSupertrendPoint = {
  openTime: number;
  closeTime: number;
  close: number;
  upper: number;
  lower: number;
  trend: 1 | -1;
  buySignal: boolean;
  sellSignal: boolean;
};

export type AdaptiveSupertrendResult = {
  points: AdaptiveSupertrendPoint[];
  trend: 1 | -1;
  close: number;
  closeTime: number;
  nextFlipLevel: number;
  lastFlipLevel: number | null;
  lastFlipTime: number | null;
  lastFlipClose: number | null;
  sinceFlipPercent: number | null;
};

export const adaptiveSupertrendAnalysisTimeframes = ["1h", "4h", "1d", "1w", "1M"] as const;
export type AdaptiveSupertrendAnalysisTimeframe = (typeof adaptiveSupertrendAnalysisTimeframes)[number];

export type AdaptiveSupertrendTradeStats = {
  trades: number;
  wins: number;
  winRate: number | null;
  averageWinPercent: number | null;
  /** Arithmetic average across every completed trade. */
  averageTradePercent?: number | null;
  /** Geometric average across every completed trade, used by Adaptive Supertrend long ranking. */
  geometricAverageTradePercent?: number | null;
  /** Geometric average across winning trades, used by Adaptive Supertrend long dashboard text. */
  geometricAverageWinPercent?: number | null;
  returnsPercent: number[];
};

export type AdaptiveSupertrendBacktest = {
  result: AdaptiveSupertrendResult;
  long: AdaptiveSupertrendTradeStats;
  short: AdaptiveSupertrendTradeStats;
};

export type AdaptiveSupertrendCase = {
  timeframe: AdaptiveSupertrendAnalysisTimeframe;
  direction: 1 | -1;
  stats: AdaptiveSupertrendTradeStats;
  selection: "weekly" | "fallback";
};

export const ADAPTIVE_SUPERTREND_AUTO_PERIOD_MIN = 10;
export const ADAPTIVE_SUPERTREND_AUTO_PERIOD_MAX = 20;
export const ADAPTIVE_SUPERTREND_AUTO_MULTIPLIER = 3;
export const ADAPTIVE_SUPERTREND_AUTO_MIN_TRADES = 5;
export const ADAPTIVE_SUPERTREND_AUTO_MIN_WIN_RATE = 40;
export const ADAPTIVE_SUPERTREND_AUTO_SWITCH_MARGIN = 10;

export type AdaptiveSupertrendAutoSummary = {
  selectedPeriod: number | null;
  selectedMultiplier: number;
  selectionReady: boolean;
  minimumTrades: number;
  minimumWinRate: number;
  switchMarginPercent: number;
  completedBullishSections: number;
  winningBullishSections: number;
  winRatePercent: number | null;
  arithmeticAverageTradePercent: number | null;
  geometricAverageTradePercent: number | null;
  geometricAverageWinPercent: number | null;
};

export type AdaptiveSupertrendAutoAnalysis = {
  result: AdaptiveSupertrendResult;
  parameterMode: "auto";
  atrPeriod: number;
  atrMultiplier: number;
  auto: AdaptiveSupertrendAutoSummary;
};

function calculateRma(values: number[], period: number) {
  const result = new Array<number | null>(values.length).fill(null);
  if (values.length < period) {
    return result;
  }

  let seed = 0;
  for (let index = 0; index < period; index += 1) {
    seed += values[index];
  }

  let previous = seed / period;
  result[period - 1] = previous;

  for (let index = period; index < values.length; index += 1) {
    previous = (previous * (period - 1) + values[index]) / period;
    result[index] = previous;
  }

  return result;
}

function calculateSma(values: number[], period: number) {
  const result = new Array<number | null>(values.length).fill(null);
  if (values.length < period) {
    return result;
  }

  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) {
      sum -= values[index - period];
    }
    if (index >= period - 1) {
      result[index] = sum / period;
    }
  }

  return result;
}

export function calculateSimpleMovingAverage(candles: CryptoCandle[], period: number) {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("Moving-average period must be a positive integer.");
  }

  return calculateSma(candles.map((candle) => candle.close), period).map((value, index) => ({
    openTime: candles[index].openTime,
    value,
  }));
}

function buildAdaptiveSupertrendResult(points: AdaptiveSupertrendPoint[]): AdaptiveSupertrendResult {
  if (points.length < 2) {
    throw new Error("Adaptive Supertrend could not be calculated for this market.");
  }

  const latest = points.at(-1)!;
  let lastFlipIndex = -1;
  for (let index = points.length - 1; index > 0; index -= 1) {
    if (points[index].trend !== points[index - 1].trend) {
      lastFlipIndex = index;
      break;
    }
  }

  const lastFlip = lastFlipIndex >= 0 ? points[lastFlipIndex] : null;
  const previousPoint = lastFlipIndex > 0 ? points[lastFlipIndex - 1] : null;

  return {
    points,
    trend: latest.trend,
    close: latest.close,
    closeTime: latest.closeTime,
    nextFlipLevel: latest.trend === 1 ? latest.upper : latest.lower,
    lastFlipLevel: lastFlip
      ? lastFlip.trend === 1
        ? previousPoint?.lower ?? null
        : previousPoint?.upper ?? null
      : null,
    lastFlipTime: lastFlip?.openTime ?? null,
    lastFlipClose: lastFlip?.close ?? null,
    sinceFlipPercent:
      lastFlip?.close == null ? null : (latest.close / lastFlip.close - 1) * 100,
  };
}

export function calculateAdaptiveSupertrend(
  candles: CryptoCandle[],
  period = 10,
  multiplier = 3,
  useStandardAtr = true,
): AdaptiveSupertrendResult {
  if (candles.length < period + 2) {
    throw new Error("Not enough closed candles to calculate Adaptive Supertrend.");
  }

  const trueRanges = candles.map((candle, index) => {
    if (index === 0) {
      return candle.high - candle.low;
    }

    const previousClose = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });
  const atr = useStandardAtr ? calculateRma(trueRanges, period) : calculateSma(trueRanges, period);
  const points: AdaptiveSupertrendPoint[] = [];
  let previousUp: number | null = null;
  let previousDown: number | null = null;
  let previousTrend: 1 | -1 = 1;

  candles.forEach((candle, index) => {
    const currentAtr = atr[index];
    if (currentAtr == null) {
      return;
    }

    const source = (candle.high + candle.low) / 2;
    let up = source - multiplier * currentAtr;
    const previousUpValue = previousUp ?? up;
    const previousClose = index > 0 ? candles[index - 1].close : candle.close;
    if (previousClose > previousUpValue) {
      up = Math.max(up, previousUpValue);
    }

    let down = source + multiplier * currentAtr;
    const previousDownValue = previousDown ?? down;
    if (previousClose < previousDownValue) {
      down = Math.min(down, previousDownValue);
    }

    let trend = previousTrend;
    if (previousDown != null && previousTrend === -1 && candle.close > previousDown) {
      trend = 1;
    } else if (previousUp != null && previousTrend === 1 && candle.close < previousUp) {
      trend = -1;
    }

    const previousPoint = points.at(-1);
    points.push({
      openTime: candle.openTime,
      closeTime: candle.closeTime,
      close: candle.close,
      upper: up,
      lower: down,
      trend,
      buySignal: previousPoint != null && trend === 1 && previousPoint.trend === -1,
      sellSignal: previousPoint != null && trend === -1 && previousPoint.trend === 1,
    });

    previousUp = up;
    previousDown = down;
    previousTrend = trend;
  });

  return buildAdaptiveSupertrendResult(points);
}

function summarizeTrades(returnsPercent: number[]): AdaptiveSupertrendTradeStats {
  const winningReturns = returnsPercent.filter((tradeReturn) => tradeReturn > 0);
  const averageTradePercent = returnsPercent.length === 0
    ? null
    : returnsPercent.reduce((total, tradeReturn) => total + tradeReturn, 0) / returnsPercent.length;
  return {
    trades: returnsPercent.length,
    wins: winningReturns.length,
    winRate: returnsPercent.length === 0 ? null : (winningReturns.length / returnsPercent.length) * 100,
    averageWinPercent: winningReturns.length === 0
      ? null
      : winningReturns.reduce((total, tradeReturn) => total + tradeReturn, 0) / winningReturns.length,
    averageTradePercent,
    geometricAverageTradePercent: geometricAveragePercent(returnsPercent),
    geometricAverageWinPercent: geometricAveragePercent(winningReturns),
    returnsPercent,
  };
}

function geometricAveragePercent(returnsPercent: number[]) {
  if (returnsPercent.length === 0) {
    return null;
  }

  const logSum = returnsPercent.reduce((total, tradeReturn) => {
    const grossReturn = 1 + tradeReturn / 100;
    return grossReturn > 0 ? total + Math.log(grossReturn) : Number.NEGATIVE_INFINITY;
  }, 0);

  return Number.isFinite(logSum)
    ? (Math.exp(logSum / returnsPercent.length) - 1) * 100
    : -100;
}

type AutoTradeClose = {
  openTime: number;
  returnPercent: number;
};

type AutoCandidate = {
  period: number;
  result: AdaptiveSupertrendResult;
  closeEvents: AutoTradeClose[];
};

type AutoCandidateScore = {
  candidate: AutoCandidate;
  returnsPercent: number[];
  winningReturnsPercent: number[];
};

function getLongTradeCloseEvents(candles: CryptoCandle[], result: AdaptiveSupertrendResult) {
  const candleByOpenTime = new Map(candles.map((candle) => [candle.openTime, candle]));
  const closeEvents: AutoTradeClose[] = [];
  let entryPrice: number | null = null;

  for (let index = 1; index < result.points.length; index += 1) {
    const confirmedPoint = result.points[index - 1];
    const executionPoint = result.points[index];
    const executionCandle = candleByOpenTime.get(executionPoint.openTime);
    if (!executionCandle) {
      continue;
    }

    if (confirmedPoint.buySignal) {
      entryPrice = executionCandle.open;
    } else if (confirmedPoint.sellSignal && entryPrice != null) {
      closeEvents.push({
        openTime: executionCandle.openTime,
        returnPercent: (executionCandle.open / entryPrice - 1) * 100,
      });
      entryPrice = null;
    }
  }

  return closeEvents;
}

function scoreAutoCandidate(candidate: AutoCandidate, returnsPercent: number[] = []) {
  const winningReturnsPercent = returnsPercent.filter((tradeReturn) => tradeReturn > 0);
  return {
    candidate,
    returnsPercent,
    winningReturnsPercent,
  } satisfies AutoCandidateScore;
}

function autoCandidateSummary(score: AutoCandidateScore) {
  const completedBullishSections = score.returnsPercent.length;
  const winningBullishSections = score.winningReturnsPercent.length;
  const winRatePercent = completedBullishSections > 0
    ? (winningBullishSections / completedBullishSections) * 100
    : null;
  const arithmeticAverageTradePercent = completedBullishSections > 0
    ? score.returnsPercent.reduce((total, tradeReturn) => total + tradeReturn, 0) / completedBullishSections
    : null;

  return {
    completedBullishSections,
    winningBullishSections,
    winRatePercent,
    arithmeticAverageTradePercent,
    geometricAverageTradePercent: geometricAveragePercent(score.returnsPercent),
    geometricAverageWinPercent: geometricAveragePercent(score.winningReturnsPercent),
  };
}

function isEligibleAutoCandidate(score: AutoCandidateScore) {
  const summary = autoCandidateSummary(score);
  return summary.completedBullishSections >= ADAPTIVE_SUPERTREND_AUTO_MIN_TRADES &&
    (summary.winRatePercent ?? 0) >= ADAPTIVE_SUPERTREND_AUTO_MIN_WIN_RATE &&
    (summary.geometricAverageTradePercent ?? 0) > 0;
}

function rankAutoCandidates(scores: AutoCandidateScore[], incumbentPeriod: number | null) {
  const eligible = scores.filter(isEligibleAutoCandidate);
  let best: AutoCandidateScore | null = null;

  for (const score of eligible) {
    if (!best) {
      best = score;
      continue;
    }

    const candidateSummary = autoCandidateSummary(score);
    const bestSummary = autoCandidateSummary(best);
    const candidateAverage = candidateSummary.geometricAverageTradePercent ?? -Infinity;
    const bestAverage = bestSummary.geometricAverageTradePercent ?? -Infinity;
    const candidateWinRate = candidateSummary.winRatePercent ?? -Infinity;
    const bestWinRate = bestSummary.winRatePercent ?? -Infinity;

    if (candidateAverage > bestAverage ||
      (candidateAverage === bestAverage && candidateWinRate > bestWinRate) ||
      (candidateAverage === bestAverage && candidateWinRate === bestWinRate && candidateSummary.completedBullishSections > bestSummary.completedBullishSections)) {
      best = score;
    }
  }

  const incumbent = incumbentPeriod == null
    ? null
    : eligible.find((score) => score.candidate.period === incumbentPeriod) ?? null;
  const incumbentAverage = incumbent ? autoCandidateSummary(incumbent).geometricAverageTradePercent ?? -Infinity : -Infinity;
  const bestAverage = best ? autoCandidateSummary(best).geometricAverageTradePercent ?? -Infinity : -Infinity;
  const keepIncumbent = incumbent != null &&
    (best == null || (best.candidate.period !== incumbentPeriod && bestAverage < incumbentAverage * (1 + ADAPTIVE_SUPERTREND_AUTO_SWITCH_MARGIN / 100)));

  return keepIncumbent ? incumbent : best;
}

export function calculateAdaptiveSupertrendAuto(
  candles: CryptoCandle[],
  fallbackPeriod = ADAPTIVE_SUPERTREND_AUTO_PERIOD_MIN,
  fallbackMultiplier = ADAPTIVE_SUPERTREND_AUTO_MULTIPLIER,
): AdaptiveSupertrendAutoAnalysis {
  if (candles.length < fallbackPeriod + 2) {
    throw new Error("Not enough closed candles to calculate Adaptive Supertrend.");
  }

  const fallbackResult = calculateAdaptiveSupertrend(candles, fallbackPeriod, fallbackMultiplier, true);
  const candidates: AutoCandidate[] = [];
  for (let period = ADAPTIVE_SUPERTREND_AUTO_PERIOD_MIN; period <= ADAPTIVE_SUPERTREND_AUTO_PERIOD_MAX; period += 1) {
    if (candles.length < period + 2) {
      continue;
    }

    const result = calculateAdaptiveSupertrend(candles, period, ADAPTIVE_SUPERTREND_AUTO_MULTIPLIER, true);
    candidates.push({ period, result, closeEvents: getLongTradeCloseEvents(candles, result) });
  }

  const scores = candidates.map((candidate) => scoreAutoCandidate(candidate));
  const eventsByOpenTime = new Map<number, Array<{ score: AutoCandidateScore; event: AutoTradeClose }>>();
  for (const score of scores) {
    for (const event of score.candidate.closeEvents) {
      const events = eventsByOpenTime.get(event.openTime) ?? [];
      events.push({ score, event });
      eventsByOpenTime.set(event.openTime, events);
    }
  }

  let incumbentPeriod: number | null = null;
  const selectedPeriodByOpenTime = new Map<number, number | null>();
  for (let index = 0; index < fallbackResult.points.length; index += 1) {
    const fallbackPoint = fallbackResult.points[index];
    const events = eventsByOpenTime.get(fallbackPoint.openTime) ?? [];
    for (const { score, event } of events) {
      score.returnsPercent.push(event.returnPercent);
      if (event.returnPercent > 0) {
        score.winningReturnsPercent.push(event.returnPercent);
      }
    }

    // Pine re-ranks after every completed bullish section and again on the
    // final bar. Recording the incumbent at each bar preserves the script's
    // time-varying effective trend and prevents look-ahead from the final pick.
    if (events.length > 0 || index === fallbackResult.points.length - 1) {
      incumbentPeriod = rankAutoCandidates(scores, incumbentPeriod)?.candidate.period ?? null;
    }
    selectedPeriodByOpenTime.set(fallbackPoint.openTime, incumbentPeriod);
  }

  const selected = incumbentPeriod == null
    ? null
    : scores.find((score) => score.candidate.period === incumbentPeriod) ?? null;
  const candidatePointsByPeriod = new Map(
    candidates.map((candidate) => [
      candidate.period,
      new Map(candidate.result.points.map((point) => [point.openTime, point])),
    ]),
  );
  const effectivePoints: AdaptiveSupertrendPoint[] = [];
  for (const fallbackPoint of fallbackResult.points) {
    const selectedPeriod = selectedPeriodByOpenTime.get(fallbackPoint.openTime) ?? null;
    const selectedPoint = selectedPeriod == null
      ? null
      : candidatePointsByPeriod.get(selectedPeriod)?.get(fallbackPoint.openTime) ?? null;
    const point = selectedPoint ?? fallbackPoint;
    const previousPoint = effectivePoints.at(-1);
    effectivePoints.push({
      ...point,
      buySignal: previousPoint != null && point.trend === 1 && previousPoint.trend === -1,
      sellSignal: previousPoint != null && point.trend === -1 && previousPoint.trend === 1,
    });
  }

  const result = buildAdaptiveSupertrendResult(effectivePoints);
  const selectedSummary = selected ? autoCandidateSummary(selected) : null;

  return {
    result,
    parameterMode: "auto",
    atrPeriod: selected?.candidate.period ?? fallbackPeriod,
    atrMultiplier: selected?.candidate.period == null ? fallbackMultiplier : ADAPTIVE_SUPERTREND_AUTO_MULTIPLIER,
    auto: {
      selectedPeriod: selected?.candidate.period ?? null,
      selectedMultiplier: ADAPTIVE_SUPERTREND_AUTO_MULTIPLIER,
      selectionReady: selected != null,
      minimumTrades: ADAPTIVE_SUPERTREND_AUTO_MIN_TRADES,
      minimumWinRate: ADAPTIVE_SUPERTREND_AUTO_MIN_WIN_RATE,
      switchMarginPercent: ADAPTIVE_SUPERTREND_AUTO_SWITCH_MARGIN,
      completedBullishSections: selectedSummary?.completedBullishSections ?? 0,
      winningBullishSections: selectedSummary?.winningBullishSections ?? 0,
      winRatePercent: selectedSummary?.winRatePercent ?? null,
      arithmeticAverageTradePercent: selectedSummary?.arithmeticAverageTradePercent ?? null,
      geometricAverageTradePercent: selectedSummary?.geometricAverageTradePercent ?? null,
      geometricAverageWinPercent: selectedSummary?.geometricAverageWinPercent ?? null,
    },
  };
}

export function calculateAdaptiveSupertrendBacktest(
  candles: CryptoCandle[],
  period = 10,
  multiplier = 3,
  useStandardAtr = true,
): AdaptiveSupertrendBacktest {
  const result = calculateAdaptiveSupertrend(candles, period, multiplier, useStandardAtr);
  const candleByOpenTime = new Map(candles.map((candle) => [candle.openTime, candle]));
  const longReturns: number[] = [];
  const shortReturns: number[] = [];
  let longEntry: number | null = null;
  let shortEntry: number | null = null;

  for (let index = 1; index < result.points.length; index += 1) {
    const confirmedPoint = result.points[index - 1];
    const executionCandle = candleByOpenTime.get(result.points[index].openTime);
    if (!executionCandle) {
      continue;
    }

    if (confirmedPoint.buySignal) {
      if (shortEntry != null) {
        shortReturns.push((1 - executionCandle.open / shortEntry) * 100);
        shortEntry = null;
      }
      longEntry = executionCandle.open;
    } else if (confirmedPoint.sellSignal) {
      if (longEntry != null) {
        longReturns.push((executionCandle.open / longEntry - 1) * 100);
        longEntry = null;
      }
      shortEntry = executionCandle.open;
    }
  }

  return {
    result,
    long: summarizeTrades(longReturns),
    short: summarizeTrades(shortReturns),
  };
}

export function selectAdaptiveSupertrendCase(
  backtests: Partial<Record<AdaptiveSupertrendAnalysisTimeframe, AdaptiveSupertrendBacktest>>,
  side: "long" | "short",
  weeklyMinimumTrades = 10,
  fallbackMinimumTrades = 5,
): AdaptiveSupertrendCase | null {
  const candidates = (["1h", "4h", "1d", "1w"] as const)
    .flatMap((timeframe) => {
      const backtest = backtests[timeframe];
      if (!backtest) return [];

      const stats = backtest[side];
      const minimumTrades = timeframe === "1w" ? weeklyMinimumTrades : fallbackMinimumTrades;
      const averageTrade = side === "long"
        ? stats.geometricAverageTradePercent ?? stats.averageTradePercent ?? stats.averageWinPercent
        : stats.averageTradePercent ?? stats.averageWinPercent;
      const reliable = stats.trades >= minimumTrades &&
        stats.wins > 0 &&
        (averageTrade ?? 0) > 0;

      return reliable ? [{ timeframe, backtest, averageTrade: averageTrade ?? 0 }] : [];
    })
    .sort((left, right) => {
      if (right.averageTrade !== left.averageTrade) return right.averageTrade - left.averageTrade;
      const winRateDifference = (right.backtest[side].winRate ?? -1) - (left.backtest[side].winRate ?? -1);
      if (winRateDifference !== 0) return winRateDifference;
      return right.backtest[side].trades - left.backtest[side].trades;
    });

  const selected = candidates[0];
  return selected
    ? {
        timeframe: selected.timeframe,
        direction: selected.backtest.result.trend,
        stats: selected.backtest[side],
        selection: selected.timeframe === "1w" ? "weekly" : "fallback",
      }
    : null;
}
