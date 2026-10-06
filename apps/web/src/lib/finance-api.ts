import type { FinanceAssetCatalog } from "@/lib/asset-catalog";
import { loadDirectFreeAssetMonitor } from "@/lib/free-market-monitors";

export type FinanceAsset = {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  assetClass?: string;
  sector?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  currency?: string;
  mic?: string;
  isin?: string;
  cusip?: string;
  figi?: string;
  providerSymbol?: string;
  capturedAt?: string;
  freshness?: string;
  provider?: string;
  displayPrice?: string;
  dailyChangeBps?: number;
};

export type FinanceAssetSearchResponse = {
  data: FinanceAsset[];
  meta: {
    query?: string;
    assetClass?: string;
    countryCode?: string;
    region?: string;
    currency?: string;
    exchange?: string;
    coverage?: string;
    provider: string;
    freshness: string;
  };
};

export type FinanceAssetCatalogResponse = {
  data: FinanceAssetCatalog;
  meta: { provider: string; freshness: string; capturedAt: string };
};

export type MarketMonitorPoint = {
  timestamp: string;
  value: number;
};

export type MarketMonitorRow = {
  symbol: string;
  name: string;
  venue?: string;
  countryCode?: string;
  countrySource?: string;
  currency?: string;
  unit?: string;
  price: number;
  displayValue: string;
  dailyChangePercent: number;
  monthlyChangePercent: number;
  volume?: number;
  sparkline: MarketMonitorPoint[];
  provider: string;
  sourceUrl: string;
  capturedAt: string;
  isProxy?: boolean;
  proxyNote?: string;
  trend?: "bullish" | "bearish";
  atrPeriod?: number;
  atrMultiplier?: number;
  autoSelectionReady?: boolean;
  lastFlipAt?: string | null;
  nextFlipLevel?: number | null;
  distanceToFlipPercent?: number | null;
  sinceFlipPercent?: number | null;
  historyComplete?: boolean;
  signalInterval?: string;
  signalBasis?: "ohlc" | "close-derived";
  signalUnavailableReason?: string;
};

export type MarketMonitorResponse = {
  data: MarketMonitorRow[];
  meta: {
    assetClass: string;
    label: string;
    description: string;
    provider: string;
    providerLabel: string;
    freeApi: boolean;
    capturedAt: string;
    requestedMarkets: number;
    returnedMarkets: number;
    failedMarkets: number;
    coverage: string;
    quoteConvention: string;
    freshness: string;
    failureReasons: string[];
    interval?: string;
    signalMarkets?: number;
    availableClasses: Array<{
      id: string;
      label: string;
      description: string;
      coverage: string;
    }>;
  };
};

export type FinancePortfolioResponse = {
  data: {
    id: string;
    name: string;
    baseCurrency: string;
    visibility: string;
    holdings: Array<{
      id: string;
      asset: FinanceAsset;
      quantity: number;
      displayQuantity: string;
      displayAvgCost: string;
      marketValueCents: number;
      displayValue: string;
      weightBps: number;
      notes?: string;
    }>;
    transactions: Array<{
      id: string;
      assetTicker?: string;
      type: string;
      transactionDate: string;
      displayQuantity?: string;
      displayAmount: string;
    }>;
    summary: {
      totalValueCents: number;
      displayTotalValue: string;
      topConcentrationTicker: string;
      topConcentrationBps: number;
      holdingCount: number;
      reviewFlags: number;
    };
    allocation: Array<{ label: string; weightBps: number; status: string }>;
    dataFreshness: { provider: string; capturedAt: string; freshness: string };
  };
  meta: { provider: string; freshness: string; capturedAt: string };
};

type FinancePortfolioListResponse = {
  data: FinancePortfolioResponse["data"][];
  meta: FinancePortfolioResponse["meta"];
};

export type FinanceWatchlistResponse = {
  data: {
    id: string;
    name: string;
    items: Array<{
      id: string;
      asset: FinanceAsset;
      notes?: string;
    }>;
    dataFreshness: { provider: string; capturedAt: string; freshness: string };
  };
  meta: { provider: string; freshness: string; capturedAt: string };
};

type FinanceWatchlistListResponse = {
  data: FinanceWatchlistResponse["data"][];
  meta: FinanceWatchlistResponse["meta"];
};

export type IntradayChartResponse = {
  data: Array<{
    timestamp: string;
    closeCents: number;
    displayClose: string;
    volume?: number;
    provider: string;
  }>;
  meta: {
    provider: string;
    freshness: string;
    capturedAt: string;
    ticker?: string;
    interval?: string;
  };
};

export type FinanceUsageResponse = {
  data: {
    clerkUserId: string;
    period: string;
    plan: string;
    features: Array<{ feature: string; used: number; limit: number; status: string }>;
  };
};

const financeApiBaseUrl =
  process.env.FINANCE_API_BASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:8080";
const financeApiUnavailableMessage =
  "Market data is temporarily unavailable. Start local services with scripts/dev-local and refresh again shortly.";

export class FinanceApiUnavailableError extends Error {
  readonly code = "finance_api_unavailable";

  constructor(cause?: unknown) {
    super(financeApiUnavailableMessage, { cause });
    this.name = "FinanceApiUnavailableError";
  }
}

export class FinanceWorkspaceEmptyError extends Error {
  readonly code = "finance_workspace_empty";

  constructor(resource: "portfolio" | "watchlist") {
    super(`No ${resource} exists yet. Add your own ${resource === "portfolio" ? "holding" : "ticker"} to begin.`);
    this.name = "FinanceWorkspaceEmptyError";
  }
}

async function financeFetch(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw new FinanceApiUnavailableError(
      error instanceof Error ? new Error(`${financeApiBaseUrl} fetch failed: ${error.message}`) : new Error(`${financeApiBaseUrl} fetch failed`),
    );
  }
}

function parseFinancePayload(text: string) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Finance API returned a non-JSON response.");
  }
}

export async function searchRealProviderAssets(input: {
  query: string;
  assetClass?: string;
  countryCode?: string;
  region?: string;
  currency?: string;
  exchange?: string;
  limit?: number;
}): Promise<FinanceAssetSearchResponse> {
  const params = new URLSearchParams({ q: input.query.trim() });
  for (const [key, value] of Object.entries(input)) {
    if (key !== "query" && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const response = await financeFetch(`${financeApiBaseUrl}/v1/assets/search?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinanceAssetSearchResponse;
}

export async function loadRealProviderAssetCatalog(): Promise<FinanceAssetCatalogResponse> {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/assets/catalog`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinanceAssetCatalogResponse;
}

export async function loadFreeAssetMonitor(assetClass: string): Promise<MarketMonitorResponse> {
  try {
    const response = await financeFetch(`${financeApiBaseUrl}/v1/market-monitors/${encodeURIComponent(assetClass)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    const payload = parseFinancePayload(text);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `Market monitor returned ${response.status}.`);
    }
    return payload as MarketMonitorResponse;
  } catch (financeApiError) {
    try {
      return await loadDirectFreeAssetMonitor(assetClass);
    } catch {
      throw financeApiError;
    }
  }
}

export async function loadRealProviderPortfolio(authToken: string): Promise<FinancePortfolioResponse> {
  const existingResponse = await financeFetch(`${financeApiBaseUrl}/v1/portfolios`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    cache: "no-store",
  });

  const existingText = await existingResponse.text();
  const existingPayload = parseFinancePayload(existingText);
  if (!existingResponse.ok) {
    throw new Error(existingPayload?.error?.message ?? `Finance API returned ${existingResponse.status}.`);
  }
  const listPayload = existingPayload as FinancePortfolioListResponse;
  const existingPortfolio = listPayload.data?.[0];
  if (!existingPortfolio) {
    throw new FinanceWorkspaceEmptyError("portfolio");
  }
  return { data: existingPortfolio, meta: listPayload.meta };
}

export async function createRealProviderPortfolio(input: {
  name: string;
  ticker: string;
  quantity: number;
  averageCostCents?: number;
  notes?: string;
}, authToken: string): Promise<FinancePortfolioResponse> {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/portfolios`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      baseCurrency: "USD",
      initialHoldings: [{
        ticker: input.ticker,
        quantity: input.quantity,
        averageCostCents: input.averageCostCents ?? 0,
        notes: input.notes ?? "",
      }],
    }),
    cache: "no-store",
  });

  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinancePortfolioResponse;
}

export async function addRealProviderHolding(input: {
  portfolioId: string;
  ticker: string;
  quantity: number;
  averageCostCents?: number;
  notes?: string;
}, authToken: string): Promise<FinancePortfolioResponse> {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/portfolios/${encodeURIComponent(input.portfolioId)}/holdings`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticker: input.ticker,
      quantity: input.quantity,
      averageCostCents: input.averageCostCents ?? 0,
      notes: input.notes ?? "",
    }),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinancePortfolioResponse;
}

export async function loadIntradayChart(ticker: string, interval = "5min"): Promise<IntradayChartResponse> {
  const params = new URLSearchParams({ interval });
  const response = await financeFetch(`${financeApiBaseUrl}/v1/assets/${encodeURIComponent(ticker)}/intraday?${params}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as IntradayChartResponse;
}

export async function loadFinanceUsage(authToken: string): Promise<FinanceUsageResponse> {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/usage`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinanceUsageResponse;
}

async function listWatchlists(authToken: string) {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/watchlists`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinanceWatchlistListResponse;
}

async function createWatchlistWithAsset(ticker: string, notes: string | undefined, authToken: string) {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/watchlists`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Research watchlist",
      initialAssets: [ticker],
    }),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinanceWatchlistResponse;
}

export async function loadRealProviderWatchlist(authToken: string): Promise<FinanceWatchlistResponse> {
  const listPayload = await listWatchlists(authToken);
  const existingWatchlist = listPayload.data?.[0];
  if (existingWatchlist) {
    return {
      data: existingWatchlist,
      meta: listPayload.meta,
    };
  }
  throw new FinanceWorkspaceEmptyError("watchlist");
}

export async function addRealProviderWatchlistItem(ticker: string, notes: string | undefined, authToken: string): Promise<FinanceWatchlistResponse> {
  let current: FinanceWatchlistResponse;
  try {
    current = await loadRealProviderWatchlist(authToken);
  } catch (error) {
    if (error instanceof FinanceWorkspaceEmptyError) {
      return createWatchlistWithAsset(ticker, notes, authToken);
    }
    throw error;
  }
  const response = await financeFetch(`${financeApiBaseUrl}/v1/watchlists/${encodeURIComponent(current.data.id)}/items`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticker, notes }),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = parseFinancePayload(text);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }
  return payload as FinanceWatchlistResponse;
}
