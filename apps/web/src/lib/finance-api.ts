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

const financeApiBaseUrl = process.env.FINANCE_API_BASE_URL ?? "http://127.0.0.1:8080";
const devToken = process.env.FINANCE_API_DEV_TOKEN ?? "dev:user_demo";

const starterHoldings = [
  { ticker: "AAPL", quantity: 10, averageCostCents: 0, notes: "Core technology holding for concentration review." },
  { ticker: "MSFT", quantity: 4, averageCostCents: 0, notes: "Software and cloud exposure." },
  { ticker: "NVDA", quantity: 6, averageCostCents: 0, notes: "Semiconductor exposure for risk review." },
];

async function financeFetch(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network request failed";
    throw new Error(
      `Finance API is not reachable at ${financeApiBaseUrl}. Start local services with scripts/dev-local. Cause: ${reason}`,
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

export async function loadRealProviderPortfolio(): Promise<FinancePortfolioResponse> {
  const response = await financeFetch(`${financeApiBaseUrl}/v1/portfolios`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${devToken}`,
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
