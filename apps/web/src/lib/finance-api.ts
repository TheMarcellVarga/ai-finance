export type FinancePortfolioResponse = {
  data: {
    id: string;
    name: string;
    baseCurrency: string;
    visibility: string;
    holdings: Array<{
      id: string;
      asset: {
        ticker: string;
        name: string;
        exchange: string;
        type: string;
        sector?: string;
        capturedAt?: string;
        freshness?: string;
        provider?: string;
        displayPrice?: string;
        dailyChangeBps?: number;
      };
      quantity: number;
      displayQuantity: string;
      displayAvgCost: string;
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
      asset: {
        ticker: string;
        name: string;
        exchange: string;
        type: string;
        sector?: string;
        capturedAt?: string;
        freshness?: string;
        provider?: string;
        displayPrice?: string;
        dailyChangeBps?: number;
      };
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

const financeApiBaseUrl =
  process.env.FINANCE_API_BASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:8080";
const financeApiUnavailableMessage =
  "Market data is temporarily unavailable. Start local services with scripts/dev-local and refresh again shortly.";

const starterHoldings = [
  { ticker: "AAPL", quantity: 10, averageCostCents: 0, notes: "Core technology holding for concentration review." },
  { ticker: "MSFT", quantity: 4, averageCostCents: 0, notes: "Software and cloud exposure." },
  { ticker: "NVDA", quantity: 6, averageCostCents: 0, notes: "Semiconductor exposure for risk review." },
];

const starterWatchlistAssets = ["AAPL", "MSFT", "NVDA"];

export class FinanceApiUnavailableError extends Error {
  readonly code = "finance_api_unavailable";

  constructor(cause?: unknown) {
    super(financeApiUnavailableMessage, { cause });
    this.name = "FinanceApiUnavailableError";
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
  if (existingResponse.ok) {
    const listPayload = existingPayload as FinancePortfolioListResponse;
    const existingPortfolio = listPayload.data?.[0];
    if (existingPortfolio) {
      return {
        data: existingPortfolio,
        meta: listPayload.meta,
      };
    }
  }

  const response = await financeFetch(`${financeApiBaseUrl}/v1/portfolios`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Core research portfolio",
      baseCurrency: "USD",
      initialHoldings: starterHoldings,
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

async function createStarterWatchlist(authToken: string) {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/watchlists`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Research watchlist",
      initialAssets: starterWatchlistAssets,
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
  return createStarterWatchlist(authToken);
}

export async function addRealProviderWatchlistItem(ticker: string, notes: string | undefined, authToken: string): Promise<FinanceWatchlistResponse> {
  const current = await loadRealProviderWatchlist(authToken);
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
