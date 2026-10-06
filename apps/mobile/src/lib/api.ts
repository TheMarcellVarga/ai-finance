export type MonitorRow = {
  symbol: string; name: string; price: number; displayValue?: string; provider?: string;
  capturedAt?: string; trend?: 'bullish' | 'bearish'; lastFlipAt?: string | null;
  nextFlipLevel?: number | null; signalBasis?: string; signalInterval?: string;
  historyComplete?: boolean; signalUnavailableReason?: string; isProxy?: boolean; proxyNote?: string;
};
export type MonitorResult = { data: MonitorRow[]; meta: {
  label?: string; provider?: string; providerLabel?: string; capturedAt?: string;
  failedMarkets?: number; failureReasons?: string[]; freshness?: string; coverage?: string;
} };
export type Portfolio = { id: string; name: string; baseCurrency: string; summary: {
  displayTotalValue: string; holdingCount: number; topConcentrationTicker: string; topConcentrationBps: number; reviewFlags: number;
}; dataFreshness: { provider: string; capturedAt: string; freshness: string } };
export type Preferences = { enabled: boolean; direction: 'bull' | 'bear' | 'both'; cadence: 'daily' | 'weekly'; emailEnabled: boolean; inAppEnabled: boolean };
export type Digest = { id: string; periodStart: string; periodEnd: string; direction: string; cadence: string;
  entries: { assetClass: string; symbol: string; name: string; direction: 'bull' | 'bear'; lastFlipAt: string; source: string; capturedAt: string; signalBasis: string }[];
  coverage: { scannedClasses: string[]; failedClasses: string[]; generatedAt: string }; emailSentAt: string | null;
};

const webUrl = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');
const apiUrl = process.env.EXPO_PUBLIC_FINANCE_API_URL?.replace(/\/$/, '');

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, headers: { Accept: 'application/json', ...init?.headers } });
    const payload = await response.json() as T & { error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || `Request failed (${response.status}).`);
    return payload;
  } finally { clearTimeout(timeout); }
}

export async function loadMonitor(assetClass: string): Promise<MonitorResult> {
  if (!webUrl) throw new Error('Market data URL is not configured.');
  if (assetClass === 'crypto') {
    const payload = await getJSON<{ data: { symbol: string; assetName: string; price: number; trend: 'bullish' | 'bearish'; lastFlipAt: string | null; nextFlipLevel: number; candleClosedAt: string; historyComplete: boolean }[]; meta: MonitorResult['meta'] }>(`${webUrl}/api/finance/crypto-monitor?interval=1d&limit=20`);
    return { data: payload.data.map(item => ({ symbol: item.symbol, name: item.assetName, price: item.price, trend: item.trend, lastFlipAt: item.lastFlipAt, nextFlipLevel: item.nextFlipLevel, capturedAt: item.candleClosedAt, historyComplete: item.historyComplete, signalBasis: 'ohlc', provider: payload.meta.provider })), meta: payload.meta };
  }
  return getJSON<MonitorResult>(`${webUrl}/api/finance/asset-monitor?class=${encodeURIComponent(assetClass)}&interval=1d`);
}

export async function privateRequest<T>(path: string, getToken: () => Promise<string | null>, init?: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error('Finance API URL is not configured.');
  const token = await getToken();
  if (!token) throw new Error('Your session expired. Please sign in again.');
  const payload = await getJSON<{ data: T }>(`${apiUrl}${path}`, { ...init, headers: {
    Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers,
  } });
  return payload.data;
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
