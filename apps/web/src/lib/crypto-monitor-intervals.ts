// These intervals are supported by both Binance spot klines and OKX history
// candles. Keeping the contract provider-neutral prevents a provider switch
// from silently changing the meaning of a Supertrend state.
export const cryptoMonitorIntervals = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
  "3d",
  "1w",
] as const;

export type CryptoMonitorInterval = (typeof cryptoMonitorIntervals)[number];

function isCryptoMonitorInterval(value: string): value is CryptoMonitorInterval {
  return cryptoMonitorIntervals.includes(value as CryptoMonitorInterval);
}

export function normalizeCryptoMonitorInterval(value?: string | null): CryptoMonitorInterval {
  return value && isCryptoMonitorInterval(value) ? value : "4h";
}
