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
