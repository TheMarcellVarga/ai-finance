import type { CryptoCandle } from "@/lib/crypto-supertrend";

export type VargaTrendPoint = {
  openTime: number;
  closeTime: number;
  close: number;
  upper: number;
  lower: number;
  trend: 1 | -1;
  buySignal: boolean;
  sellSignal: boolean;
};

export type VargaTrendResult = {
  points: VargaTrendPoint[];
  trend: 1 | -1;
  close: number;
  closeTime: number;
  nextFlipLevel: number;
  lastFlipLevel: number | null;
  lastFlipTime: number | null;
  lastFlipClose: number | null;
  sinceFlipPercent: number | null;
};

export const vargaTrendAnalysisTimeframes = ["1h", "4h", "1d", "1w", "1M"] as const;
export type VargaTrendAnalysisTimeframe = (typeof vargaTrendAnalysisTimeframes)[number];

export type VargaTrendTradeStats = {
  trades: number;
  wins: number;
  winRate: number | null;
  averageWinPercent: number | null;
  returnsPercent: number[];
};

export type VargaTrendBacktest = {
  result: VargaTrendResult;
  long: VargaTrendTradeStats;
  short: VargaTrendTradeStats;
};

export type VargaTrendCase = {
  timeframe: VargaTrendAnalysisTimeframe;
  direction: 1 | -1;
  stats: VargaTrendTradeStats;
  selection: "weekly" | "fallback";
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

export function calculateVargaTrend(
  candles: CryptoCandle[],
  period = 10,
  multiplier = 3,
  useStandardAtr = true,
): VargaTrendResult {
  if (candles.length < period + 2) {
    throw new Error("Not enough closed candles to calculate VargaTrend.");
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
  const points: VargaTrendPoint[] = [];
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

  if (points.length < 2) {
    throw new Error("VargaTrend could not be calculated for this market.");
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

function summarizeTrades(returnsPercent: number[]): VargaTrendTradeStats {
  const winningReturns = returnsPercent.filter((tradeReturn) => tradeReturn > 0);
  return {
    trades: returnsPercent.length,
    wins: winningReturns.length,
    winRate: returnsPercent.length === 0 ? null : (winningReturns.length / returnsPercent.length) * 100,
    averageWinPercent: winningReturns.length === 0
      ? null
      : winningReturns.reduce((total, tradeReturn) => total + tradeReturn, 0) / winningReturns.length,
    returnsPercent,
  };
}

export function calculateVargaTrendBacktest(
  candles: CryptoCandle[],
  period = 10,
  multiplier = 3,
  useStandardAtr = true,
): VargaTrendBacktest {
  const result = calculateVargaTrend(candles, period, multiplier, useStandardAtr);
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

export function selectVargaTrendCase(
  backtests: Partial<Record<VargaTrendAnalysisTimeframe, VargaTrendBacktest>>,
  side: "long" | "short",
  weeklyMinimumTrades = 10,
  fallbackMinimumTrades = 5,
): VargaTrendCase | null {
  const weekly = backtests["1w"];
  if (weekly && weekly[side].trades >= weeklyMinimumTrades) {
    return {
      timeframe: "1w",
      direction: weekly.result.trend,
      stats: weekly[side],
      selection: "weekly",
    };
  }

  const candidates = (["1d", "4h", "1h"] as const)
    .flatMap((timeframe) => {
      const backtest = backtests[timeframe];
      return backtest && backtest[side].trades >= fallbackMinimumTrades
        ? [{ timeframe, backtest }]
        : [];

    })
    .sort((left, right) => {
      const winRateDifference = (right.backtest[side].winRate ?? -1) - (left.backtest[side].winRate ?? -1);
      if (winRateDifference !== 0) return winRateDifference;
      return (right.backtest[side].averageWinPercent ?? -1) - (left.backtest[side].averageWinPercent ?? -1);
    });

  const selected = candidates[0];
  return selected
    ? {
        timeframe: selected.timeframe,
        direction: selected.backtest.result.trend,
        stats: selected.backtest[side],
        selection: "fallback",
      }
    : null;
}
