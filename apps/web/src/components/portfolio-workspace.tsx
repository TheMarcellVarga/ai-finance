"use client";

import type { FormEvent, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Gauge, Layers3, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AssetPicker } from "@/components/asset-picker";
import { WorkspaceWaveAccent } from "@/components/workspace-wave-accent";

type Asset = {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  assetClass?: string;
  sector?: string;
  countryCode?: string;
  country?: string;
  currency?: string;
  capturedAt?: string;
  freshness?: string;
  provider?: string;
  displayPrice?: string;
  dailyChangeBps?: number;
};

type Holding = {
  id: string;
  asset: Asset;
  quantity: number;
  displayQuantity: string;
  displayAvgCost: string;
  marketValueCents: number;
  displayValue: string;
  weightBps: number;
  notes?: string;
};

type Portfolio = {
  id: string;
  name: string;
  baseCurrency: string;
  holdings: Holding[];
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

type PortfolioResponse = {
  data: Portfolio;
  meta: { provider: string; freshness: string; capturedAt: string };
};

type IntradayChart = {
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

function percentFromBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

function assetClassLabel(asset: Asset) {
  return (asset.assetClass ?? asset.type).replaceAll("_", " ");
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Pending provider timestamp";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function compactTime(value?: string) {
  if (!value) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoneyFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function holdingValueCents(holding: Holding) {
  return holding.marketValueCents;
}

function chartPath(points: IntradayChart["data"], width = 640, height = 190) {
  if (points.length < 2) {
    return "";
  }
  const values = points.map((point) => point.closeCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.closeCents - min) / spread) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function chartAreaPath(points: IntradayChart["data"], width = 640, height = 190) {
  const line = chartPath(points, width, height);
  if (!line) {
    return "";
  }
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function chartCoords(points: IntradayChart["data"], width = 640, height = 190) {
  if (points.length < 2) {
    return [];
  }
  const values = points.map((point) => point.closeCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  return points.map((point, index) => ({
    x: (index / (points.length - 1)) * width,
    y: height - ((point.closeCents - min) / spread) * height,
  }));
}

type PortfolioWorkspaceProps = {
  initialPortfolio?: Portfolio;
  initialMeta?: PortfolioResponse["meta"];
  initialChart?: IntradayChart;
  initialChartError?: string;
  initialError?: string;
  initialInterval?: string;
  initialSelectedTicker?: string;
};

export function PortfolioWorkspace({ initialPortfolio, initialMeta, initialChart, initialChartError, initialError, initialInterval, initialSelectedTicker }: PortfolioWorkspaceProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(initialPortfolio ?? null);
  const [meta, setMeta] = useState<PortfolioResponse["meta"] | null>(initialMeta ?? null);
  const [chart, setChart] = useState<IntradayChart | null>(initialChart ?? null);
  const [chartError, setChartError] = useState<string | null>(initialChartError ?? null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(initialSelectedTicker ?? initialChart?.meta.ticker ?? initialPortfolio?.summary.topConcentrationTicker ?? "");
  const [interval, setInterval] = useState(initialInterval ?? initialChart?.meta.interval ?? "5min");
  const [chartMode, setChartMode] = useState<"price" | "volume">("price");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [liveRefresh, setLiveRefresh] = useState(false);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [riskLens, setRiskLens] = useState<"concentration" | "income" | "review">("concentration");
  const [portfolioName, setPortfolioName] = useState("");
  const [holdingTicker, setHoldingTicker] = useState("");
  const [holdingQuantity, setHoldingQuantity] = useState("");
  const [holdingAverageCost, setHoldingAverageCost] = useState("");
  const [holdingNotes, setHoldingNotes] = useState("");
  const [mutating, setMutating] = useState(false);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);

  const holdings = useMemo(() => portfolio?.holdings ?? [], [portfolio]);
  const providerLabel = portfolio?.dataFreshness.provider ?? meta?.provider ?? "market data provider";
  const freshnessLabel = portfolio?.dataFreshness.freshness ?? meta?.freshness ?? "provider-reported";
  const chartLine = chart ? chartPath(chart.data) : "";
  const chartArea = chart ? chartAreaPath(chart.data) : "";
  const chartPoints = chart ? chartCoords(chart.data) : [];
  const chartStart = chart?.data[0];
  const chartEnd = chart?.data[chart.data.length - 1];
  const hoveredPoint = chart && hoverIndex !== null ? chart.data[hoverIndex] : chartEnd;
  const hoveredCoord = hoverIndex !== null ? chartPoints[hoverIndex] : chartPoints[chartPoints.length - 1];
  const chartMoveBps =
    chartStart && chartEnd && chartStart.closeCents > 0
      ? Math.round(((chartEnd.closeCents - chartStart.closeCents) / chartStart.closeCents) * 10000)
      : 0;

  const topHolding = useMemo(() => {
    return [...holdings].sort((a, b) => b.weightBps - a.weightBps)[0];
  }, [holdings]);
  const selectedHolding = holdings.find((holding) => holding.asset.ticker === selectedTicker) ?? topHolding;
  const portfolioValueCents = holdings.reduce((sum, holding) => sum + holdingValueCents(holding), 0);
  const contributionBps = portfolioValueCents > 0 ? Math.round((monthlyContribution * 100 * 10000) / portfolioValueCents) : 0;
  const largestAfterContributionBps =
    portfolioValueCents > 0 && topHolding
      ? Math.round((holdingValueCents(topHolding) * 10000) / (portfolioValueCents + monthlyContribution * 100))
      : 0;

  async function loadChart(ticker: string, nextInterval = interval) {
    setSelectedTicker(ticker);
    setInterval(nextInterval);
    setChartLoading(true);
    setChartError(null);
    try {
      const params = new URLSearchParams({ ticker, interval: nextInterval });
      const response = await fetch(`/api/finance/intraday?${params}`);
      const payload = (await response.json()) as IntradayChart | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        const errorPayload = payload as { error?: { message?: string } };
        throw new Error(errorPayload.error?.message ?? "Intraday market data is unavailable.");
      }
      setChart(payload);
      setHoverIndex(null);
    } catch (requestError) {
      setChartError(requestError instanceof Error ? requestError.message : "Intraday market data is unavailable.");
    } finally {
      setChartLoading(false);
    }
  }

  async function loadRealPortfolio() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/portfolio", { cache: "no-store" });
      const payload = (await response.json()) as PortfolioResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        const errorPayload = payload as { error?: { message?: string } };
        throw new Error(errorPayload.error?.message ?? "The real finance API request failed.");
      }
      setPortfolio(payload.data);
      setMeta(payload.meta);
      const nextTicker = payload.data.summary.topConcentrationTicker || selectedTicker;
      await loadChart(nextTicker, interval);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Market data is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function submitHolding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number.parseInt(holdingQuantity, 10);
    const averageCost = holdingAverageCost.trim() ? Number.parseFloat(holdingAverageCost) : 0;
    if (!holdingTicker.trim() || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(averageCost) || averageCost < 0) {
      setError("Enter a valid ticker, whole-share quantity, and optional non-negative average cost.");
      return;
    }
    if (!portfolio && !portfolioName.trim()) {
      setError("Name the portfolio before adding its first holding.");
      return;
    }

    setMutating(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: portfolio ? "add_holding" : "create",
          portfolioId: portfolio?.id,
          name: portfolioName.trim(),
          ticker: holdingTicker.trim().toUpperCase(),
          quantity,
          averageCostCents: Math.round(averageCost * 100),
          notes: holdingNotes.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as PortfolioResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error?.message ?? "The holding could not be added." : "The holding could not be added.");
      }
      setPortfolio(payload.data);
      setMeta(payload.meta);
      const ticker = holdingTicker.trim().toUpperCase();
      setSelectedTicker(ticker);
      setHoldingTicker("");
      setHoldingQuantity("");
      setHoldingAverageCost("");
      setHoldingNotes("");
      await loadChart(ticker, interval);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The holding could not be added.");
    } finally {
      setMutating(false);
    }
  }

  useEffect(() => {
    if (!liveRefresh) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadRealPortfolio();
    }, 90000);
    return () => window.clearInterval(timer);
  });

  function handleChartPointer(event: MouseEvent<HTMLDivElement>) {
    if (!chart || chart.data.length < 2 || !chartWrapRef.current) {
      return;
    }
    const bounds = chartWrapRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    setHoverIndex(Math.round(ratio * (chart.data.length - 1)));
  }

  return (
    <div className="space-y-6">
      <section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <WorkspaceWaveAccent className="pointer-events-none absolute right-4 top-3 hidden sm:block lg:right-8 lg:top-5" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Portfolio
            </p>
            <h1 className="type-display mt-6 text-3xl text-white sm:text-5xl">Portfolio intelligence</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Monitor live market values, concentration, allocation, and intraday movement for a research portfolio.
            </p>
          </div>
          <Button onClick={loadRealPortfolio} disabled={loading} size="lg" className="w-full sm:w-fit">
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            {loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {["Portfolio view", "Risk lens", "Income lens"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRiskLens(label === "Income lens" ? "income" : label === "Risk lens" ? "review" : "concentration")}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    (label === "Portfolio view" && riskLens === "concentration") ||
                    (label === "Risk lens" && riskLens === "review") ||
                    (label === "Income lens" && riskLens === "income")
                      ? "border-cyan-200/50 bg-cyan-200/12 text-cyan-50"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
          ))}
          <button
            type="button"
            onClick={() => setLiveRefresh((value) => !value)}
            className={`ml-0 rounded-full border px-3 py-1.5 text-xs transition sm:ml-2 ${
              liveRefresh ? "border-emerald-200/50 bg-emerald-200/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            {liveRefresh ? "Live refresh on" : "Live refresh off"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="glass-surface rounded-[1.25rem] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-4 text-amber-200" />
            <div>
              <p className="text-sm font-medium text-white">Market data is temporarily unavailable.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">Refresh again shortly. No estimated or fabricated prices are shown while the feed is unavailable.</p>
            </div>
          </div>
        </section>
      ) : null}

      <form onSubmit={submitHolding} className="section-shell rounded-[1.25rem] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Plus className="size-5 text-cyan-200" />
          <div>
            <h2 className="type-card-title text-xl text-white">{portfolio ? "Add a holding" : "Build your real portfolio"}</h2>
            <p className="mt-1 text-sm text-zinc-400">Enter your own position; Aperture supplies only the provider quote and freshness metadata.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
          {!portfolio ? (
            <label className="text-sm text-zinc-300">
              Portfolio name
              <input value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} maxLength={80} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 text-base text-white outline-none focus:border-cyan-200/40" required />
            </label>
          ) : null}
          <AssetPicker
            value={holdingTicker}
            onChange={setHoldingTicker}
            inputId="portfolio-asset"
            label="Global asset"
            description="Search provider-backed instruments across asset classes and ISO country codes."
          />
          <label className="text-sm text-zinc-300">
            Whole shares
            <input type="number" inputMode="numeric" min="1" max="1000000" step="1" value={holdingQuantity} onChange={(event) => setHoldingQuantity(event.target.value)} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-base text-white outline-none focus:border-cyan-200/40" required />
          </label>
          <label className="text-sm text-zinc-300">
            Average cost (optional)
            <input type="number" inputMode="decimal" min="0" step="0.01" value={holdingAverageCost} onChange={(event) => setHoldingAverageCost(event.target.value)} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-base text-white outline-none focus:border-cyan-200/40" />
          </label>
          <label className="text-sm text-zinc-300">
            Research note (optional)
            <input value={holdingNotes} onChange={(event) => setHoldingNotes(event.target.value)} maxLength={180} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 text-base text-white outline-none focus:border-cyan-200/40" />
          </label>
        </div>
        <Button type="submit" disabled={mutating} className="mt-5 w-full sm:w-fit">
          <Plus className="size-4" />
          {mutating ? "Checking provider" : portfolio ? "Add holding" : "Create portfolio"}
        </Button>
      </form>

      {!portfolio ? (
        <section className="glass-surface rounded-[1.25rem] p-6">
          <h2 className="type-card-title text-xl text-white">No holdings yet</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Your dashboard, planner, and risk review stay empty until you provide a real position. No sample holdings or estimated prices are inserted.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {[
              ["Total value", portfolio.summary.displayTotalValue, `Market data: ${providerLabel}`],
              ["Selected", selectedHolding ? `${selectedHolding.asset.ticker} ${selectedHolding.asset.displayPrice ?? ""}` : "None", selectedHolding ? `${percentFromBps(selectedHolding.weightBps)} portfolio weight` : "Choose a holding"],
              ["Positions", String(portfolio.summary.holdingCount), portfolio.baseCurrency],
              ["As of", formatTimestamp(portfolio.dataFreshness.capturedAt), liveRefresh ? "Auto refresh every 90s" : freshnessLabel],
            ].map(([label, value, detail]) => (
              <div key={label} className="glass-surface rounded-[1rem] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{label}</p>
                <p className="mt-3 font-mono text-2xl font-light text-white">{value}</p>
                <p className="mt-2 text-xs text-cyan-100/70">{detail}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-white">
                    <WalletCards className="size-4 text-cyan-200" />
                    Holdings
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">Latest available prices with source freshness.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadRealPortfolio} disabled={loading}>
                  <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                  Refresh
                </Button>
              </div>
              <div className="mt-5 space-y-3 md:hidden">
                {holdings.map((holding) => (
                  <button
                    key={`mobile-${holding.id}`}
                    type="button"
                    onClick={() => void loadChart(holding.asset.ticker, interval)}
                    className={`w-full rounded-[0.95rem] border p-4 text-left transition ${
                      selectedTicker === holding.asset.ticker
                        ? "border-cyan-200/35 bg-cyan-200/[0.07]"
                        : "border-white/8 bg-black/18 hover:bg-black/26"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-mono text-base text-white">{holding.asset.ticker}</span>
                        <span className="mt-1 block truncate text-xs text-zinc-400">{holding.asset.name}</span>
                        <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.12em] text-cyan-100/60">{assetClassLabel(holding.asset)}{holding.asset.countryCode ? ` · ${holding.asset.countryCode}` : ""}</span>
                      </span>
                      <span className={(holding.asset.dailyChangeBps ?? 0) >= 0 ? "font-mono text-sm text-emerald-200" : "font-mono text-sm text-amber-200"}>
                        {(holding.asset.dailyChangeBps ?? 0) >= 0 ? "+" : ""}
                        {percentFromBps(holding.asset.dailyChangeBps ?? 0)}
                      </span>
                    </span>
                    <span className="mt-4 grid grid-cols-3 gap-3">
                      <span>
                        <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-zinc-400">Value</span>
                        <span className="mt-1 block font-mono text-sm text-white">{holding.displayValue}</span>
                      </span>
                      <span>
                        <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-zinc-400">Weight</span>
                        <span className="mt-1 block font-mono text-sm text-zinc-300">{percentFromBps(holding.weightBps)}</span>
                      </span>
                      <span>
                        <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-zinc-400">Last</span>
                        <span className="mt-1 block truncate font-mono text-sm text-zinc-300">{holding.asset.displayPrice ?? "N/A"}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <caption className="sr-only">
                    Current portfolio holdings. Select an asset name to load its price history.
                  </caption>
                  <thead className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                    <tr>
                      <th className="py-3 font-normal">Asset</th>
                      <th className="py-3 font-normal">Qty</th>
                      <th className="py-3 font-normal">Last</th>
                      <th className="py-3 font-normal">Value</th>
                      <th className="py-3 font-normal">Weight</th>
                      <th className="py-3 font-normal">Move</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {holdings.map((holding) => (
                      <tr
                        key={holding.id}
                        className={`text-zinc-300 transition hover:bg-white/[0.035] ${
                          selectedTicker === holding.asset.ticker ? "bg-cyan-200/[0.055] text-cyan-50" : ""
                        }`}
                      >
                        <td className="py-4">
                          <button
                            type="button"
                            onClick={() => void loadChart(holding.asset.ticker, interval)}
                            aria-label={`Load ${holding.asset.name} price history`}
                            className="rounded text-left hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                          >
                            <span className="block font-mono text-white">{holding.asset.ticker}</span>
                            <span className="mt-1 block text-xs text-zinc-400">{holding.asset.name}</span>
                            <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.12em] text-cyan-100/60">{assetClassLabel(holding.asset)}{holding.asset.countryCode ? ` · ${holding.asset.countryCode}` : ""}</span>
                          </button>
                        </td>
                        <td className="py-4 font-mono">{holding.displayQuantity}</td>
                        <td className="py-4 font-mono">{holding.asset.displayPrice ?? "Provider pending"}</td>
                        <td className="py-4 font-mono text-white">{holding.displayValue}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                              <span className="block h-full rounded-full bg-cyan-200/80" style={{ width: `${Math.min(holding.weightBps / 100, 100)}%` }} />
                            </span>
                            <span className="font-mono text-xs">{percentFromBps(holding.weightBps)}</span>
                          </div>
                        </td>
                        <td className={(holding.asset.dailyChangeBps ?? 0) >= 0 ? "py-4 font-mono text-emerald-200" : "py-4 font-mono text-amber-200"}>
                          {(holding.asset.dailyChangeBps ?? 0) >= 0 ? "+" : ""}
                          {percentFromBps(holding.asset.dailyChangeBps ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 hidden gap-3 md:grid md:grid-cols-3">
                {holdings.map((holding) => (
                  <a
                    key={`quick-${holding.id}`}
                    href={`/app/portfolio?ticker=${encodeURIComponent(holding.asset.ticker)}&interval=${encodeURIComponent(interval)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      void loadChart(holding.asset.ticker, interval);
                    }}
                    className={`rounded-[0.9rem] border px-3 py-3 text-left transition ${
                      selectedTicker === holding.asset.ticker
                        ? "border-cyan-200/40 bg-cyan-200/10"
                        : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="block font-mono text-sm text-white">{holding.asset.ticker}</span>
                    <span className="mt-1 block text-xs text-zinc-400">{holding.displayValue}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-white">
                      <Activity className="size-4 text-cyan-200" />
                      Market pulse
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {selectedTicker} · {interval} bars · {chartMode}
                    </p>
                  </div>
                  <div className="text-right">
                    {hoveredPoint ? <span className="block font-mono text-sm text-white">{hoveredPoint.displayClose}</span> : null}
                    {hoveredPoint ? <span className="mt-1 block text-xs text-zinc-400">{compactTime(hoveredPoint.timestamp)}</span> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {["5min", "15min", "30min"].map((choice) => (
                    <a
                      key={choice}
                      href={`/app/portfolio?ticker=${encodeURIComponent(selectedTicker)}&interval=${encodeURIComponent(choice)}`}
                      onClick={(event) => {
                        event.preventDefault();
                        void loadChart(selectedTicker, choice);
                      }}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        interval === choice ? "border-cyan-200/50 bg-cyan-200/12 text-cyan-50" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                      }`}
                    >
                      {choice}
                    </a>
                  ))}
                  {(["price", "volume"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setChartMode(choice)}
                    className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                        chartMode === choice ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                  {chartLoading ? <span className="ml-auto text-xs text-cyan-100">Loading feed</span> : null}
                </div>
                {chart && chart.data.length > 1 ? (
                  <div className="mt-5">
                    <div
                      ref={chartWrapRef}
                      onMouseMove={handleChartPointer}
                      onMouseLeave={() => setHoverIndex(null)}
                      className="relative h-[13.75rem] overflow-hidden rounded-[1rem] bg-black/18 p-3"
                    >
                      <svg viewBox="0 0 640 220" role="img" aria-label={`${chart.meta.ticker ?? "Asset"} intraday price chart`} className="h-full w-full">
                        <defs>
                          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgb(165 243 252)" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="rgb(165 243 252)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0, 1, 2, 3].map((line) => (
                          <line key={line} x1="0" x2="640" y1={20 + line * 54} y2={20 + line * 54} stroke="rgba(255,255,255,0.07)" />
                        ))}
                        <path d={chartArea} fill="url(#chart-fill)" transform="translate(0 15)" />
                        <path d={chartLine} fill="none" stroke="rgb(165 243 252)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" transform="translate(0 15)" />
                        {chartMode === "volume"
                          ? chart.data.map((point, index) => {
                              const maxVolume = Math.max(...chart.data.map((row) => row.volume ?? 0), 1);
                              const barHeight = ((point.volume ?? 0) / maxVolume) * 70;
                              const x = (index / Math.max(chart.data.length - 1, 1)) * 620 + 8;
                              return <rect key={`${point.timestamp}-${index}`} x={x} y={205 - barHeight} width="4" height={barHeight} fill="rgba(165,243,252,0.3)" />;
                            })
                          : null}
                        {hoveredCoord && hoveredPoint ? (
                          <g transform="translate(0 15)">
                            <line x1={hoveredCoord.x} x2={hoveredCoord.x} y1="0" y2="190" stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
                            <circle cx={hoveredCoord.x} cy={hoveredCoord.y} r="5" fill="rgb(165 243 252)" stroke="rgb(8 12 14)" strokeWidth="3" />
                          </g>
                        ) : null}
                      </svg>
                      {hoveredPoint ? (
                        <div className="pointer-events-none absolute left-4 top-4 rounded-[0.8rem] bg-black/70 px-3 py-2 text-xs shadow-2xl backdrop-blur">
                          <span className="block font-mono text-white">{hoveredPoint.displayClose}</span>
                          <span className="mt-1 block text-zinc-400">{compactTime(hoveredPoint.timestamp)}</span>
                          <span className="mt-1 block text-zinc-400">Vol {new Intl.NumberFormat("en-US").format(hoveredPoint.volume ?? 0)}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className={chartMoveBps >= 0 ? "font-mono text-emerald-200" : "font-mono text-amber-200"}>
                        {chartMoveBps >= 0 ? "+" : ""}
                        {percentFromBps(chartMoveBps)} today
                      </span>
                      <span className="text-zinc-400">Updated {formatTimestamp(chart.meta.capturedAt)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1rem] bg-black/18 p-4 text-sm leading-6 text-zinc-400">
                    {chartError ?? "Intraday chart is unavailable from the market data feed right now."}
                  </div>
                )}
              </div>

              <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm text-white">
                  <BarChart3 className="size-4 text-cyan-200" />
                  Allocation
                </div>
                <div className="mt-5 space-y-4">
                  {portfolio.allocation.map((row) => (
                    <div key={row.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400">{row.label}</span>
                        <span className={row.status === "review" ? "font-mono text-amber-100" : "font-mono text-zinc-300"}>{percentFromBps(row.weightBps)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={row.status === "review" ? "h-full rounded-full bg-amber-200/80" : "h-full rounded-full bg-cyan-200/80"} style={{ width: `${row.weightBps / 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-white">
                <SlidersHorizontal className="size-4 text-cyan-200" />
                Scenario controls
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Monthly contribution</span>
                    <span className="font-mono text-white">{formatMoneyFromCents(monthlyContribution * 100)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="250"
                    value={monthlyContribution}
                    onChange={(event) => setMonthlyContribution(Number(event.target.value))}
                    className="w-full accent-cyan-200"
                    aria-label="Monthly contribution"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["concentration", "Concentration"],
                    ["income", "Cash flow"],
                    ["review", "Review"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRiskLens(value as typeof riskLens)}
                    className={`rounded-[0.85rem] border px-3 py-2 text-xs transition ${
                        riskLens === value ? "border-cyan-200/45 bg-cyan-200/10 text-cyan-50" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-white">
                {riskLens === "income" ? <WalletCards className="size-4 text-cyan-200" /> : riskLens === "review" ? <Gauge className="size-4 text-cyan-200" /> : <Layers3 className="size-4 text-cyan-200" />}
                Wealth lens
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1rem] bg-black/18 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Contribution weight</p>
                  <p className="mt-3 font-mono text-xl text-white">{percentFromBps(contributionBps)}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">New monthly cash compared with current portfolio value.</p>
                </div>
                <div className="rounded-[1rem] bg-black/18 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Largest after cash</p>
                  <p className="mt-3 font-mono text-xl text-white">{percentFromBps(largestAfterContributionBps)}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">Concentration if new cash is left unallocated for review.</p>
                </div>
                <div className="rounded-[1rem] bg-black/18 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Review queue</p>
                  <p className="mt-3 font-mono text-xl text-white">{portfolio.summary.reviewFlags}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">Flags are risk prompts, not recommendations.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {riskLens === "income"
                  ? "Use the cash-flow lens to understand how new savings compare with the current account before making any allocation decision."
                  : riskLens === "review"
                    ? "The review lens highlights concentration and data freshness so research starts with the highest-impact questions."
                    : "The concentration lens shows whether portfolio weight is dominated by one holding before any new contribution is allocated."}
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="glass-surface rounded-[1rem] p-5">
              <div className="flex items-start gap-3">
                <BarChart3 className="mt-1 size-4 text-cyan-200" />
                <p className="text-sm leading-6 text-zinc-400">
                  Market values are source-backed and time-stamped. If a feed fails, the workspace shows the outage instead of substituting estimates.
                </p>
              </div>
            </div>
            <div className="glass-surface rounded-[1rem] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-4 text-cyan-200" />
                <p className="text-sm leading-6 text-zinc-400">
                  This workspace supports research and scenario review only. It does not execute trades, provide personalized advice, or make buy/sell/hold recommendations.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
