// The monitor does several provider requests per selected market. Keep the
// default at the largest bounded batch supported by the serverless route.
export const DEFAULT_CRYPTO_MONITOR_LIMIT = 80;
export const MAX_CRYPTO_MONITOR_LIMIT = 80;

export function normalizeCryptoMonitorLimit(value?: string | null) {
  if (value == null || value.trim() === "") {
    return DEFAULT_CRYPTO_MONITOR_LIMIT;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CRYPTO_MONITOR_LIMIT;
  }
  return Math.min(MAX_CRYPTO_MONITOR_LIMIT, Math.max(20, Math.floor(parsed)));
}
