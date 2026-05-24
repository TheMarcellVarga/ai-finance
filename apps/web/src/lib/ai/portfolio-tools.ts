import "server-only";

import type { FinancePortfolioResponse } from "@/lib/finance-api";
import type { PortfolioSnapshot } from "@/lib/ai/portfolio-brief";

const financeApiBaseUrl = process.env.FINANCE_API_BASE_URL ?? "http://127.0.0.1:8080";
const devToken = process.env.FINANCE_API_DEV_TOKEN ?? "dev:user_demo";

function selectAuthToken(requestAuthorization?: string | null) {
  if (requestAuthorization?.startsWith("Bearer ")) {
    return requestAuthorization.slice("Bearer ".length).trim();
  }
  return devToken;
}

function snapshotFromPortfolio(payload: FinancePortfolioResponse): PortfolioSnapshot {
  const portfolio = payload.data;

  return {
    id: portfolio.id,
    name: portfolio.name,
    baseCurrency: portfolio.baseCurrency,
    summary: portfolio.summary,
    holdings: portfolio.holdings.map((holding) => ({
      ticker: holding.asset.ticker,
      name: holding.asset.name,
      sector: holding.asset.sector,
      displayValue: holding.displayValue,
      displayPrice: holding.asset.displayPrice,
      weightBps: holding.weightBps,
      freshness: holding.asset.freshness,
      capturedAt: holding.asset.capturedAt,
      provider: holding.asset.provider,
    })),
    allocation: portfolio.allocation,
    dataFreshness: portfolio.dataFreshness,
  };
}

export async function getPortfolioSnapshot(input: {
  portfolioId?: string;
  requestAuthorization?: string | null;
}): Promise<PortfolioSnapshot> {
  const authToken = selectAuthToken(input.requestAuthorization);
  const response = await fetch(`${financeApiBaseUrl}/v1/portfolios`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Finance API returned ${response.status}.`);
  }

  const portfolios = payload?.data as FinancePortfolioResponse["data"][] | undefined;
  const selectedPortfolio = input.portfolioId
    ? portfolios?.find((portfolio) => portfolio.id === input.portfolioId)
    : portfolios?.[0];

  if (!selectedPortfolio) {
    throw new Error("No owner-scoped portfolio snapshot is available for the current user.");
  }

  return snapshotFromPortfolio({
    data: selectedPortfolio,
    meta: payload.meta,
  } as FinancePortfolioResponse);
}
