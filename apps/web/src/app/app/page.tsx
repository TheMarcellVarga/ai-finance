import {
  CircleGauge,
  Radar,
  WalletCards,
} from "lucide-react";

import {
  FinanceWorkspaceEmptyError,
  loadFreeAssetMonitor,
  loadFinanceUsage,
  loadRealProviderPortfolio,
  loadRealProviderWatchlist,
} from "@/lib/finance-api";
import { authenticatedSessionToken } from "@/lib/server/identity";
import { OverviewCharts } from "@/components/overview-charts";

export const dynamic = "force-dynamic";

const unavailableValue = "N/A";

function percentFromBps(value?: number) {
  if (value == null) {
    return unavailableValue;
  }
  return `${(value / 100).toFixed(1)}%`;
}

function formatMove(value?: number) {
  if (value == null) {
    return unavailableValue;
  }
  const move = value / 100;
  return `${move > 0 ? "+" : ""}${move.toFixed(1)}%`;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Awaiting provider";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function loadOverviewData(authToken: string) {
  const [portfolioResult, watchlistResult, financeUsageResult] = await Promise.allSettled([
    loadRealProviderPortfolio(authToken),
    loadRealProviderWatchlist(authToken),
    loadFinanceUsage(authToken),
  ]);

  const financeUsage = financeUsageResult.status === "fulfilled" ? financeUsageResult.value.data : null;
  const watchlist = watchlistResult.status === "fulfilled" ? watchlistResult.value.data : null;
  let market: Awaited<ReturnType<typeof loadFreeAssetMonitor>> | null = null;
  if (!watchlist?.items.length) {
    try {
      market = await loadFreeAssetMonitor("equities");
    } catch {
      market = null;
    }
  }

  return {
    portfolio: portfolioResult.status === "fulfilled" ? portfolioResult.value.data : null,
    watchlist,
    portfolioEmpty: portfolioResult.status === "rejected" && portfolioResult.reason instanceof FinanceWorkspaceEmptyError,
    watchlistEmpty: watchlistResult.status === "rejected" && watchlistResult.reason instanceof FinanceWorkspaceEmptyError,
    financeUsage,
    marketDataAvailable: financeUsageResult.status === "fulfilled",
    market,
  };
}

export default async function AppOverviewPage() {
  const authToken = await authenticatedSessionToken();
  const { portfolio, portfolioEmpty, watchlist, watchlistEmpty, marketDataAvailable, market } = await loadOverviewData(authToken);
  const topHolding = portfolio ? [...portfolio.holdings].sort((left, right) => right.weightBps - left.weightBps)[0] : undefined;
  const watchlistItems = watchlist ? [...watchlist.items].sort(
    (left, right) => Math.abs(right.asset.dailyChangeBps ?? 0) - Math.abs(left.asset.dailyChangeBps ?? 0),
  ) : undefined;
  const largestMove = watchlistItems?.[0];
  const marketItems = market?.data
    .map((item) => ({
      id: `market-${item.symbol}`,
      ticker: item.symbol,
      name: item.name,
      displayPrice: item.displayValue,
      dailyChangeBps: Math.round(item.dailyChangePercent * 100),
    }))
    .sort((left, right) => Math.abs(right.dailyChangeBps) - Math.abs(left.dailyChangeBps)) ?? [];
  const movementItems = watchlistItems?.length
    ? watchlistItems.map((item) => ({
      id: item.id,
      ticker: item.asset.ticker,
      name: item.asset.name,
      displayPrice: item.asset.displayPrice,
      dailyChangeBps: item.asset.dailyChangeBps,
    }))
    : marketItems;
  const movementFocus = largestMove
    ? { ticker: largestMove.asset.ticker, dailyChangeBps: largestMove.asset.dailyChangeBps, source: "watchlist" as const }
    : marketItems[0]
      ? { ticker: marketItems[0].ticker, dailyChangeBps: marketItems[0].dailyChangeBps, source: "market" as const }
      : null;
  const summaryMetrics = [
    {
      label: "Portfolio value",
      value: portfolio?.summary.displayTotalValue ?? unavailableValue,
      detail: portfolio ? `${portfolio.summary.holdingCount} source-backed positions` : portfolioEmpty ? "Add your first real holding" : "Finance API unavailable",
      icon: WalletCards,
      tone: "cyan",
    },
    {
      label: "Concentration",
      value: topHolding ? percentFromBps(topHolding.weightBps) : unavailableValue,
      detail: topHolding ? `${topHolding.asset.ticker} largest allocation` : portfolioEmpty ? "No portfolio data entered" : "Awaiting portfolio snapshot",
      icon: CircleGauge,
      tone: portfolio && portfolio.summary.reviewFlags > 0 ? "amber" : "cyan",
    },
    {
      label: movementFocus?.source === "market" ? "Market focus" : "Watchlist focus",
      value: movementFocus?.ticker ?? unavailableValue,
      detail: movementFocus
        ? `${formatMove(movementFocus.dailyChangeBps)} ${movementFocus.source === "market" ? "public-market move" : "watchlist move"}`
        : watchlistEmpty ? "Awaiting public market feed" : "Awaiting market feed",
      icon: Radar,
      tone: "cyan",
    },

  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 py-2">
        <div><h1 className="type-display text-3xl text-white sm:text-4xl">Overview</h1><p className="mt-3 text-sm text-zinc-400">Your holdings, allocation, and market context.</p></div>
        <p className="text-xs text-zinc-400">{portfolio ? `${portfolio.dataFreshness.provider} · ${formatTimestamp(portfolio.dataFreshness.capturedAt)}` : marketDataAvailable ? "Portfolio service connected" : "Portfolio service unavailable"}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {summaryMetrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className={`overview-metric glass-surface rounded-[1rem] p-5 overview-metric-${tone}`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">{label}</p>
              <Icon className={`size-4 ${tone === "amber" ? "text-amber-100/80" : "text-cyan-100/80"}`} />
            </div>
            <p className="mt-5 min-w-0 truncate font-mono text-2xl font-light text-white">{value}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{detail}</p>
          </article>
        ))}
      </section>

      <OverviewCharts
        allocation={portfolio?.allocation ?? []}
        watchlist={movementItems}
        portfolioProvider={portfolio?.dataFreshness.provider}
        portfolioCapturedAt={portfolio?.dataFreshness.capturedAt}
        movementProvider={watchlist?.dataFreshness.provider ?? market?.meta.providerLabel}
        movementCapturedAt={watchlist?.dataFreshness.capturedAt ?? market?.meta.capturedAt}
        portfolioEmpty={portfolioEmpty}
        watchlistEmpty={watchlistEmpty && marketItems.length === 0}
        movementSource={watchlistItems?.length ? "watchlist" : "market"}
      />

      <section className="section-shell rounded-[1.1rem] p-5">
        <p className="max-w-3xl text-xs leading-5 text-zinc-400">
          Aperture supports market research, financial organization, and scenario planning. It does not execute trades, provide personalized investment advice, or promise outcomes.
        </p>
      </section>
    </div>
  );
}
