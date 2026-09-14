// The monitor does several provider requests per selected market. Keep its
// default response small enough for a short-lived serverless function while
// allowing longer-running callers to request a bounded larger batch.
export const DEFAULT_CRYPTO_MONITOR_LIMIT = 20;
export const MAX_CRYPTO_MONITOR_LIMIT = 80;

export function normalizeCryptoMonitorLimit(value?: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CRYPTO_MONITOR_LIMIT;
  }
  return Math.min(MAX_CRYPTO_MONITOR_LIMIT, Math.max(DEFAULT_CRYPTO_MONITOR_LIMIT, Math.floor(parsed)));
}
