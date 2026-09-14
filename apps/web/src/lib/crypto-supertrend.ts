export type CryptoCandle = {
  openTime: number;
  open: number;
  closeTime: number;
  high: number;
  low: number;
  close: number;
};

type SupertrendPoint = {
  trend: 1 | -1;
  upper: number;
  lower: number;
  close: number;
  closeTime: number;
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

export function calculateSupertrend(candles: CryptoCandle[], period = 10, multiplier = 3) {
  if (candles.length < period + 2) {
    throw new Error("Not enough closed candles to calculate Supertrend.");
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

  const atr = calculateRma(trueRanges, period);
  const points: SupertrendPoint[] = [];
  let previousUpper: number | null = null;
  let previousLower: number | null = null;
  let previousTrend: 1 | -1 = 1;

  candles.forEach((candle, index) => {
    const currentAtr = atr[index];
    if (currentAtr == null) {
      return;
    }

    const midpoint = (candle.high + candle.low) / 2;
    const basicUpper = midpoint - multiplier * currentAtr;
    const basicLower = midpoint + multiplier * currentAtr;
    const previousClose = index > 0 ? candles[index - 1].close : candle.close;

    const upper =
      previousUpper != null && previousClose > previousUpper
        ? Math.max(basicUpper, previousUpper)
        : basicUpper;
    const lower =
      previousLower != null && previousClose < previousLower
        ? Math.min(basicLower, previousLower)
        : basicLower;

    let currentTrend = previousTrend;
    if (previousLower != null && previousTrend === -1 && candle.close > previousLower) {
      currentTrend = 1;
    } else if (previousUpper != null && previousTrend === 1 && candle.close < previousUpper) {
      currentTrend = -1;
    }

    points.push({
      trend: currentTrend,
      upper,
      lower,
      close: candle.close,
      closeTime: candle.closeTime,
    });

    previousUpper = upper;
    previousLower = lower;
    previousTrend = currentTrend;
  });

  if (points.length < 2) {
    throw new Error("Supertrend could not be calculated for this market.");
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
  const nextFlipLevel = latest.trend === 1 ? latest.upper : latest.lower;
  const lastFlipLevel = lastFlip
    ? lastFlip.trend === 1
      ? previousPoint?.lower ?? null
      : previousPoint?.upper ?? null
    : null;

  return {
    trend: latest.trend,
    close: latest.close,
    closeTime: latest.closeTime,
    nextFlipLevel,
    lastFlipAt: lastFlip?.closeTime ?? null,
    lastFlipLevel,
    lastFlipClose: lastFlip?.close ?? null,
  };
}
