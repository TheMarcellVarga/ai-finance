import { PortfolioWorkspace } from "@/components/portfolio-workspace";
import { loadIntradayChart, loadRealProviderPortfolio } from "@/lib/finance-api";

export const dynamic = "force-dynamic";

type PortfolioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const params = (await searchParams) ?? {};
  const requestedTicker = firstParam(params.ticker)?.toUpperCase();
  const requestedInterval = firstParam(params.interval) ?? "5min";
  let payload: Awaited<ReturnType<typeof loadRealProviderPortfolio>> | null = null;
  let chart: Awaited<ReturnType<typeof loadIntradayChart>> | null = null;
  let initialError: string | undefined;
  let initialChartError: string | undefined;

  try {
    payload = await loadRealProviderPortfolio();
    const topHolding = [...payload.data.holdings].sort((a, b) => b.weightBps - a.weightBps)[0];
    const selectedHolding =
      payload.data.holdings.find((holding) => holding.asset.ticker === requestedTicker) ?? topHolding;
    if (selectedHolding) {
      try {
        chart = await loadIntradayChart(selectedHolding.asset.ticker, requestedInterval);
      } catch (error) {
        initialChartError = error instanceof Error ? error.message : "Intraday chart is unavailable.";
      }
    }
  } catch (error) {
    initialError = error instanceof Error ? error.message : "The real finance API request failed.";
  }

  return (
    <PortfolioWorkspace
      initialError={initialError}
      initialChart={chart ?? undefined}
      initialChartError={initialChartError}
      initialInterval={requestedInterval}
      initialMeta={payload?.meta}
      initialPortfolio={payload?.data}
      initialSelectedTicker={requestedTicker}
    />
  );
}
