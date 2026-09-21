"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarketMonitorResponse, MarketMonitorRow } from "@/lib/finance-api";
import { assetMonitorDefinitions, getAssetMonitorDefinition } from "@/lib/asset-monitors";

type AssetMonitorWorkspaceProps = {
  assetClass: string;
  initialPayload?: MarketMonitorResponse;
  initialError?: string;
};

type RouteError = { error?: { message?: string } };
type SortMode = "move" | "month" | "symbol";
type UnifiedSortMode = "move" | "class" | "symbol";

type UnifiedMarketRow = MarketMonitorRow & {
  assetClass: string;
  assetClassLabel: string;
  detailHref: string;
};

type CryptoMonitorRoutePayload = {
  data: Array<{
    symbol: string;
    assetName: string;
    quoteAsset: string;
    price: number;
    dailyChangePercent: number;
    quoteVolume: number;
    researchUrl: string;
    candleClosedAt: string;
  }>;
  meta: {
    provider: string;
    providerLabel: string;
    capturedAt: string;
  };
};

function formatPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatCapturedAt(value?: string) {
  if (!value) return "Awaiting provider";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatVolume(value?: number) {
  if (!value || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function changeClass(value: number) {
  return value > 0 ? "text-emerald-100" : value < 0 ? "text-rose-100" : "text-zinc-400";
}

function formatOptionalPercent(value: number | null) {
  return value == null ? "—" : formatPercent(value);
}

function MiniSparkline({ row }: { row: MarketMonitorRow }) {
  const width = 118;
  const height = 32;
  const padding = 3;
  const values = row.sparkline.map((point) => point.value).filter(Number.isFinite);
  if (values.length < 2) {
    return <span className="font-mono text-[0.65rem] text-zinc-700">No history</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = row.dailyChangePercent >= 0 ? "#a7f3d0" : "#fecdd3";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-[7.4rem]" role="img" aria-label={`${row.symbol} recent price path`}>
      <path d={`M ${points}`} fill="none" stroke={stroke} strokeOpacity="0.82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ValuePair({ row }: { row: MarketMonitorRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-mono text-sm text-zinc-100">{row.displayValue}</p>
      <p className="mt-1 truncate text-[0.68rem] text-zinc-600">{row.unit || row.currency || "Provider quote"}</p>
    </div>
  );
}

function MonitorRowActions({
  row,
  onWatch,
  saved,
  saving,
}: {
  row: MarketMonitorRow;
  onWatch: (row: MarketMonitorRow) => void;
  saved: boolean;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onWatch(row)}
        disabled={saved || saving}
        className="inline-flex h-8 items-center gap-1.5 rounded-[0.6rem] border border-white/10 bg-white/[0.02] px-2.5 text-[0.68rem] text-zinc-400 transition-colors hover:border-cyan-200/25 hover:bg-cyan-200/[0.06] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30 disabled:cursor-default disabled:opacity-80"
      >
        {saved ? <Check className="size-3.5 text-emerald-200" aria-hidden="true" /> : <BookmarkPlus className="size-3.5" aria-hidden="true" />}
        {saved ? "Pinned" : saving ? "Saving" : "Watch"}
      </button>
      <a
        href={row.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="grid size-8 place-items-center rounded-[0.6rem] border border-white/10 text-zinc-600 transition-colors hover:border-cyan-200/25 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
        aria-label={`Open ${row.symbol} public source`}
      >
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

export function AssetMonitorWorkspace({ assetClass, initialPayload, initialError }: AssetMonitorWorkspaceProps) {
  const definition = getAssetMonitorDefinition(assetClass) ?? assetMonitorDefinitions[0];
  const [payload, setPayload] = useState<MarketMonitorResponse | null>(initialPayload ?? null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("move");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [savedSymbols, setSavedSymbols] = useState<string[]>([]);
  const [savingSymbols, setSavingSymbols] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const loadMonitor = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/finance/asset-monitor?class=${encodeURIComponent(assetClass)}`, { cache: "no-store" });
      const data = (await response.json()) as MarketMonitorResponse | RouteError;
      if (!response.ok || !("data" in data)) {
        throw new Error("error" in data ? data.error?.message : "The asset-class monitor is unavailable.");
      }
      setPayload(data);
      setStatus("Monitor refreshed from the public data source.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The asset-class monitor is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [assetClass]);

  async function watchRow(row: MarketMonitorRow) {
    if (savedSymbols.includes(row.symbol) || savingSymbols.includes(row.symbol)) return;
    setSavingSymbols((current) => [...current, row.symbol]);
    setStatus(null);
    try {
      const response = await fetch("/api/finance/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: row.symbol, notes: `${definition.label} monitor · ${row.proxyNote || "public market reference"}` }),
      });
      const data = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(data.error?.message ?? "The monitor item could not be pinned.");
      }
      setSavedSymbols((current) => [...current, row.symbol]);
      setStatus(`${row.symbol} added to the research watchlist.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The monitor item could not be pinned.");
    } finally {
      setSavingSymbols((current) => current.filter((symbol) => symbol !== row.symbol));
    }
  }

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();
    return [...(payload?.data ?? [])]
      .filter((row) => !normalizedQuery || `${row.symbol} ${row.name}`.toUpperCase().includes(normalizedQuery))
      .sort((left, right) => {
        if (sort === "month") return right.monthlyChangePercent - left.monthlyChangePercent;
        if (sort === "symbol") return left.symbol.localeCompare(right.symbol);
        return Math.abs(right.dailyChangePercent) - Math.abs(left.dailyChangePercent);
      });
  }, [payload, query, sort]);

  const metrics = useMemo(() => {
    const allRows = payload?.data ?? [];
    const up = allRows.filter((row) => row.dailyChangePercent > 0).length;
    const down = allRows.filter((row) => row.dailyChangePercent < 0).length;
    const largest = [...allRows].sort((left, right) => Math.abs(right.dailyChangePercent) - Math.abs(left.dailyChangePercent))[0];
    return { up, down, largest };
  }, [payload]);

  return (
    <div className="space-y-5">
      <section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/80">
              <span className="grid size-5 place-items-center rounded-[0.45rem] border border-cyan-200/20 bg-cyan-200/[0.05] text-[0.72rem] text-cyan-100">{definition.icon}</span>
              Asset class monitor
            </div>
            <h1 className="type-display mt-5 text-3xl text-white sm:text-5xl">{definition.label} market map</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">{payload?.meta.description ?? definition.description} Read the table as public market context, not as a trade instruction.</p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-zinc-500 lg:items-end">
            <span className="inline-flex items-center gap-2 font-mono text-zinc-300"><Database className="size-3.5 text-cyan-200/70" aria-hidden="true" />Free public · {payload?.meta.providerLabel ?? "market data"}</span>
            <span>{payload?.meta.coverage ?? definition.coverage}</span>
            <span className="inline-flex items-center gap-1.5 text-cyan-100/75"><ShieldCheck className="size-3.5" aria-hidden="true" />{payload?.meta.quoteConvention ?? "Provider quote convention"}</span>
            <span>Last refresh: {formatCapturedAt(payload?.meta.capturedAt)}</span>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Asset class monitors">
        {assetMonitorDefinitions.map((item) => (
          <Link key={item.id} href={item.href} className={`flex shrink-0 items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-xs transition-colors ${item.id === assetClass ? "border-cyan-200/30 bg-cyan-200/[0.08] text-cyan-50" : "border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:border-cyan-200/20 hover:text-zinc-200"}`}>
            <span className="font-mono text-cyan-100/70">{item.icon}</span>{item.label}<ChevronRight className="size-3 text-zinc-700" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <section className="grid grid-cols-2 overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-[#090e0f]/95 lg:grid-cols-4">
        <div className="p-4 sm:p-5"><p className="text-xs text-zinc-500">Markets scanned</p><p className="mt-2 font-mono text-2xl text-white">{payload?.meta.returnedMarkets ?? "—"}</p><p className="mt-1 text-xs text-zinc-600">Of {payload?.meta.requestedMarkets ?? "—"} configured references</p></div>
        <div className="border-l border-white/[0.06] p-4 sm:p-5"><p className="text-xs text-zinc-500">Up on prior</p><p className="mt-2 font-mono text-2xl text-emerald-100">{payload ? metrics.up : "—"}</p><p className="mt-1 text-xs text-zinc-600">Reference session</p></div>
        <div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-l lg:border-t-0"><p className="text-xs text-zinc-500">Down on prior</p><p className="mt-2 font-mono text-2xl text-rose-100">{payload ? metrics.down : "—"}</p><p className="mt-1 text-xs text-zinc-600">Reference session</p></div>
        <div className="border-l border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0"><p className="text-xs text-zinc-500">Largest move</p><p className="mt-2 truncate font-mono text-2xl text-cyan-100">{metrics.largest?.symbol ?? "—"}</p><p className={`mt-1 font-mono text-xs ${metrics.largest ? changeClass(metrics.largest.dailyChangePercent) : "text-zinc-600"}`}>{metrics.largest ? formatPercent(metrics.largest.dailyChangePercent) : "Waiting for data"}</p></div>
      </section>

      <section className="overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-[#080d0e]/96 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="grid gap-3 border-b border-white/[0.06] p-4 sm:grid-cols-[minmax(14rem,1fr)_12rem_auto] sm:items-center">
          <label className="relative block"><span className="sr-only">Search {definition.label}</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${definition.label.toLowerCase()}...`} className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-white/[0.025] pl-9 pr-3 font-mono text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10" /></label>
          <label className="relative block"><span className="sr-only">Sort {definition.label}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-8 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="move">Sort: largest move</option><option value="month">Sort: 3-month move</option><option value="symbol">Sort: symbol</option></select><ChevronRight className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-zinc-600" aria-hidden="true" /></label>
          <Button type="button" variant="outline" size="sm" className="w-full border-cyan-200/20 bg-cyan-200/[0.04] text-cyan-100 hover:bg-cyan-200/15 sm:w-fit" disabled={loading} onClick={() => void loadMonitor()}><RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />{loading ? "Refreshing" : "Refresh"}</Button>
        </div>

        {error ? <div className="flex items-start gap-3 p-6"><span className="mt-1 size-2 shrink-0 rounded-full bg-amber-200" /><div><h2 className="text-sm font-medium text-white">Monitor data unavailable</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{error}</p><Button type="button" className="mt-4" size="sm" variant="outline" onClick={() => void loadMonitor()}>Try again</Button></div></div> : null}
        {status ? <p className="border-b border-white/[0.06] px-4 py-3 text-xs text-emerald-100/80">{status}</p> : null}

        {!error && !payload ? <div className="p-8 text-center"><RefreshCw className="mx-auto size-5 animate-pulse text-cyan-200" aria-hidden="true" /><h2 className="mt-4 text-lg text-white">Loading the public monitor</h2><p className="mt-2 text-sm text-zinc-500">Fetching the configured {definition.label.toLowerCase()} references.</p></div> : null}
        {!error && payload && rows.length === 0 ? <div className="p-8 text-center"><Search className="mx-auto size-5 text-cyan-200" aria-hidden="true" /><h2 className="mt-4 text-lg text-white">No references match this view</h2><p className="mt-2 text-sm text-zinc-500">Clear the search to restore the full monitor.</p></div> : null}

        {payload && rows.length > 0 ? (
          <>
            <div className="market-table hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] border-collapse text-left"><thead className="bg-white/[0.018] text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600"><tr><th className="px-5 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">Value</th><th className="px-4 py-3 font-medium">1d</th><th className="px-4 py-3 font-medium">3m</th><th className="px-4 py-3 font-medium">Path</th><th className="px-4 py-3 font-medium">Venue / source</th><th className="px-5 py-3 text-right font-medium">Research</th></tr></thead><tbody>{rows.map((row) => <tr key={row.symbol} className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.022]"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="min-w-0"><p className="font-mono text-sm text-white">{row.symbol}</p><p className="mt-1 max-w-[15rem] truncate text-xs text-zinc-500">{row.name}</p></div>{row.isProxy ? <span className="rounded-[0.45rem] border border-amber-200/15 bg-amber-200/[0.04] px-1.5 py-1 text-[0.6rem] uppercase tracking-[0.1em] text-amber-100/70">proxy</span> : null}</div></td><td className="px-4 py-4"><ValuePair row={row} /></td><td className={`px-4 py-4 font-mono text-xs ${changeClass(row.dailyChangePercent)}`}>{formatPercent(row.dailyChangePercent)}</td><td className={`px-4 py-4 font-mono text-xs ${changeClass(row.monthlyChangePercent)}`}>{formatPercent(row.monthlyChangePercent)}</td><td className="px-4 py-4"><MiniSparkline row={row} /></td><td className="px-4 py-4"><p className="max-w-[13rem] truncate text-xs text-zinc-400">{row.venue || row.provider}</p><p className="mt-1 text-[0.68rem] text-zinc-600">{row.proxyNote || formatVolume(row.volume) !== "—" ? row.proxyNote || `${formatVolume(row.volume)} volume` : "Public source"}</p></td><td className="px-5 py-4"><MonitorRowActions row={row} onWatch={watchRow} saved={savedSymbols.includes(row.symbol)} saving={savingSymbols.includes(row.symbol)} /></td></tr>)}</tbody></table>
            </div>
            <div className="divide-y divide-white/[0.06] md:hidden">{rows.map((row) => <article key={row.symbol} className="space-y-4 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-mono text-sm text-white">{row.symbol}</p>{row.isProxy ? <span className="rounded-[0.45rem] border border-amber-200/15 bg-amber-200/[0.04] px-1.5 py-1 text-[0.6rem] uppercase tracking-[0.1em] text-amber-100/70">proxy</span> : null}</div><p className="mt-1 truncate text-xs text-zinc-500">{row.name}</p></div><MonitorRowActions row={row} onWatch={watchRow} saved={savedSymbols.includes(row.symbol)} saving={savingSymbols.includes(row.symbol)} /></div><div className="grid grid-cols-2 gap-4"><div><p className="text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600">Value</p><div className="mt-2"><ValuePair row={row} /></div></div><div><p className="text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600">1d / 3m</p><p className={`mt-2 font-mono text-sm ${changeClass(row.dailyChangePercent)}`}>{formatPercent(row.dailyChangePercent)} <span className="text-zinc-700">/</span> <span className={changeClass(row.monthlyChangePercent)}>{formatPercent(row.monthlyChangePercent)}</span></p></div></div><div className="flex items-center justify-between gap-4"><MiniSparkline row={row} /><span className="truncate text-right text-[0.68rem] text-zinc-600">{row.proxyNote || row.venue || row.provider}</span></div></article>)}</div>
          </>
        ) : null}

        <footer className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-3 text-[0.68rem] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>{rows.length} visible reference{rows.length === 1 ? "" : "s"}. {payload?.meta.failedMarkets ? `${payload.meta.failedMarkets} unavailable from the public source.` : ""}</span><span>Daily / delayed public data · not financial advice.</span></footer>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]"><div className="section-shell rounded-[1.1rem] p-5 sm:p-6"><p className="type-label text-xs uppercase text-cyan-100/75">Read the boundary</p><h2 className="type-card-title mt-3 text-2xl text-white">Monitor the market. Research the instrument.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Prices, levels, and paths come from free public sources. Proxies are marked because they do not represent private NAV, contract terms, or a suitability conclusion.</p></div><div className="glass-surface rounded-[1.1rem] p-5 sm:p-6"><p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Next layer</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/app/portfolio" className="rounded-[0.7rem] border border-white/10 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-cyan-200/25 hover:text-cyan-50">Portfolio context</Link><Link href="/app/research" className="rounded-[0.7rem] border border-white/10 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-cyan-200/25 hover:text-cyan-50">Source research</Link></div></div></section>
    </div>
  );
}

export function UnifiedMarketTable() {
  const [rows, setRows] = useState<UnifiedMarketRow[]>([]);
  const [query, setQuery] = useState("");
  const [assetClass, setAssetClass] = useState("all");
  const [sort, setSort] = useState<UnifiedSortMode>("move");
  const [loading, setLoading] = useState(true);
  const [failedClasses, setFailedClasses] = useState<string[]>([]);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [savingKeys, setSavingKeys] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const loadEverything = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    const standardDefinitions = assetMonitorDefinitions.filter((definition) => definition.id !== "crypto");
    const standardRequests = standardDefinitions.map(async (definition) => {
      const response = await fetch(`/api/finance/asset-monitor?class=${encodeURIComponent(definition.id)}`, { cache: "no-store" });
      const payload = (await response.json()) as MarketMonitorResponse | RouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error(definition.id);
      }
      return payload.data.map((row): UnifiedMarketRow => ({
        ...row,
        assetClass: definition.id,
        assetClassLabel: definition.label,
        detailHref: definition.href,
      }));
    });

    const cryptoRequest = (async () => {
      const response = await fetch("/api/finance/crypto-monitor?interval=1d&limit=10", { cache: "no-store" });
      const payload = (await response.json()) as CryptoMonitorRoutePayload | RouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error("crypto");
      }
      return payload.data.map((row): UnifiedMarketRow => ({
        symbol: row.symbol,
        name: row.assetName,
        currency: row.quoteAsset,
        price: row.price,
        displayValue: new Intl.NumberFormat("en-US", { maximumFractionDigits: row.price >= 1 ? 2 : 6 }).format(row.price),
        dailyChangePercent: row.dailyChangePercent,
        monthlyChangePercent: 0,
        volume: row.quoteVolume,
        sparkline: [],
        provider: payload.meta.providerLabel,
        sourceUrl: row.researchUrl,
        capturedAt: row.candleClosedAt || payload.meta.capturedAt,
        assetClass: "crypto",
        assetClassLabel: "Digital assets",
        detailHref: `/app/crypto-monitor?market=${encodeURIComponent(row.symbol)}`,
      }));
    })();

    const settled = await Promise.allSettled([...standardRequests, cryptoRequest]);
    const nextRows = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    const failures = settled.flatMap((result, index) => {
      if (result.status === "fulfilled") return [];
      return [index < standardDefinitions.length ? standardDefinitions[index].label : "Digital assets"];
    });
    setRows(nextRows);
    setFailedClasses(failures);
    setStatus(nextRows.length > 0 ? `${nextRows.length} market references refreshed.` : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadEverything(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadEverything]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();
    return rows
      .filter((row) => assetClass === "all" || row.assetClass === assetClass)
      .filter((row) => !normalizedQuery || `${row.symbol} ${row.name} ${row.assetClassLabel}`.toUpperCase().includes(normalizedQuery))
      .sort((left, right) => {
        if (sort === "class") return left.assetClassLabel.localeCompare(right.assetClassLabel) || left.symbol.localeCompare(right.symbol);
        if (sort === "symbol") return left.symbol.localeCompare(right.symbol);
        return Math.abs(right.dailyChangePercent) - Math.abs(left.dailyChangePercent);
      });
  }, [assetClass, query, rows, sort]);

  const loadedClasses = new Set(rows.map((row) => row.assetClass)).size;
  const latestCapture = [...rows].sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0]?.capturedAt;

  async function watchRow(row: UnifiedMarketRow) {
    const key = `${row.assetClass}:${row.symbol}`;
    if (savedKeys.includes(key) || savingKeys.includes(key)) return;
    setSavingKeys((current) => [...current, key]);
    setStatus(null);
    try {
      const response = await fetch("/api/finance/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: row.symbol, notes: `${row.assetClassLabel} mega table · ${row.proxyNote || "public market reference"}` }),
      });
      const payload = (await response.json()) as RouteError;
      if (!response.ok) throw new Error(payload.error?.message ?? "The market reference could not be watched.");
      setSavedKeys((current) => [...current, key]);
      setStatus(`${row.symbol} added to the watchlist.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The market reference could not be watched.");
    } finally {
      setSavingKeys((current) => current.filter((item) => item !== key));
    }
  }

  return (
    <div className="space-y-5">
      <section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="workspace-hero-glow" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="type-display text-4xl text-white sm:text-6xl">The whole market, one table.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300/80">Search, filter, sort, and watch configured references across every supported asset class. Open a class only when you need its deeper monitor.</p>
          </div>
          <div className="max-w-sm text-xs leading-5 text-zinc-500 lg:text-right">
            Public and delayed provider data. Proxies are labelled. Coverage reflects configured references, not every instrument in existence.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 overflow-hidden border-y border-white/[0.06] bg-black/10">
        <div className="px-3 py-4 sm:px-5"><p className="text-xs text-zinc-500">References</p><p className="mt-2 font-mono text-xl text-white sm:text-2xl">{rows.length || "—"}</p></div>
        <div className="border-x border-white/[0.06] px-3 py-4 sm:px-5"><p className="text-xs text-zinc-500">Classes</p><p className="mt-2 font-mono text-xl text-cyan-100 sm:text-2xl">{loadedClasses || "—"}</p></div>
        <div className="px-3 py-4 sm:px-5"><p className="text-xs text-zinc-500">Freshness</p><p className="mt-2 text-xs text-white sm:text-sm">{latestCapture ? formatCapturedAt(latestCapture) : "Loading"}</p></div>
      </section>

      <section className="overflow-hidden rounded-[1rem] border border-white/[0.06] bg-[#080d0e]/96">
        <div className="grid gap-3 border-b border-white/[0.06] p-4 lg:grid-cols-[minmax(15rem,1fr)_14rem_12rem_auto] lg:items-center">
          <label className="relative block"><span className="sr-only">Search all market references</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, name, or class" className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-white/[0.025] pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10" /></label>
          <label className="relative block"><span className="sr-only">Filter by asset class</span><select value={assetClass} onChange={(event) => setAssetClass(event.target.value)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-8 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="all">All asset classes</option>{assetMonitorDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" /></label>
          <label className="relative block"><span className="sr-only">Sort market table</span><select value={sort} onChange={(event) => setSort(event.target.value as UnifiedSortMode)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-8 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="move">Largest daily move</option><option value="class">Asset class</option><option value="symbol">Symbol</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" /></label>
          <Button type="button" variant="outline" size="sm" className="w-full border-cyan-200/20 bg-cyan-200/[0.04] text-cyan-100 hover:bg-cyan-200/15 lg:w-fit" disabled={loading} onClick={() => void loadEverything()}><RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />{loading ? "Loading all" : "Refresh all"}</Button>
        </div>

        {status ? <p aria-live="polite" className="border-b border-white/[0.06] px-4 py-3 text-xs text-zinc-400">{status}</p> : null}
        {failedClasses.length > 0 ? <p className="border-b border-amber-200/10 bg-amber-200/[0.025] px-4 py-3 text-xs text-amber-100/75">Unavailable now: {failedClasses.join(", ")}. The rest of the table remains usable.</p> : null}
        {loading && rows.length === 0 ? <div className="p-10 text-center"><RefreshCw className="mx-auto size-5 animate-spin text-cyan-200" aria-hidden="true" /><p className="mt-4 text-sm text-zinc-400">Loading every configured market class…</p></div> : null}
        {!loading && visibleRows.length === 0 ? <div className="p-10 text-center"><Search className="mx-auto size-5 text-cyan-200" aria-hidden="true" /><p className="mt-4 text-sm text-zinc-400">No market reference matches this filter.</p></div> : null}

        {visibleRows.length > 0 ? <>
          <div className="market-table hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1060px] border-collapse text-left">
              <thead className="sticky top-0 bg-[#0b1112] text-[0.68rem] uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-5 py-3 font-medium">Instrument</th><th className="px-4 py-3 font-medium">Class</th><th className="px-4 py-3 font-medium">Value</th><th className="px-4 py-3 font-medium">1d</th><th className="px-4 py-3 font-medium">3m</th><th className="px-4 py-3 font-medium">Path</th><th className="px-4 py-3 font-medium">Source</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead>
              <tbody>{visibleRows.map((row) => { const key = `${row.assetClass}:${row.symbol}`; const monthlyChange = row.assetClass === "crypto" ? null : row.monthlyChangePercent; return <tr key={key} className="border-t border-white/[0.05] hover:bg-white/[0.022]"><td className="px-5 py-4"><Link href={row.detailHref} className="font-mono text-sm text-white hover:text-cyan-100">{row.symbol}</Link><p className="mt-1 max-w-[16rem] truncate text-xs text-zinc-500">{row.name}</p></td><td className="px-4 py-4"><span className="text-xs text-cyan-100/80">{row.assetClassLabel}</span>{row.isProxy ? <p className="mt-1 text-[0.65rem] text-amber-100/60">Proxy</p> : null}</td><td className="px-4 py-4"><ValuePair row={row} /></td><td className={`px-4 py-4 font-mono text-xs ${changeClass(row.dailyChangePercent)}`}>{formatPercent(row.dailyChangePercent)}</td><td className={`px-4 py-4 font-mono text-xs ${monthlyChange == null ? "text-zinc-600" : changeClass(monthlyChange)}`}>{formatOptionalPercent(monthlyChange)}</td><td className="px-4 py-4"><MiniSparkline row={row} /></td><td className="px-4 py-4"><p className="max-w-[11rem] truncate text-xs text-zinc-400">{row.provider}</p><p className="mt-1 text-[0.68rem] text-zinc-600">{row.currency || row.unit || "Public reference"}</p></td><td className="px-5 py-4"><MonitorRowActions row={row} onWatch={() => void watchRow(row)} saved={savedKeys.includes(key)} saving={savingKeys.includes(key)} /></td></tr>; })}</tbody>
            </table>
          </div>
          <div className="divide-y divide-white/[0.06] md:hidden">{visibleRows.map((row) => { const key = `${row.assetClass}:${row.symbol}`; const monthlyChange = row.assetClass === "crypto" ? null : row.monthlyChangePercent; return <article key={key} className="p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><Link href={row.detailHref} className="font-mono text-sm text-white">{row.symbol}</Link><p className="mt-1 truncate text-xs text-zinc-500">{row.name}</p></div><span className="shrink-0 text-[0.68rem] text-cyan-100/70">{row.assetClassLabel}</span></div><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-[0.65rem] text-zinc-600">Value</p><p className="mt-1 truncate font-mono text-xs text-zinc-200">{row.displayValue}</p></div><div><p className="text-[0.65rem] text-zinc-600">1d</p><p className={`mt-1 font-mono text-xs ${changeClass(row.dailyChangePercent)}`}>{formatPercent(row.dailyChangePercent)}</p></div><div><p className="text-[0.65rem] text-zinc-600">3m</p><p className={`mt-1 font-mono text-xs ${monthlyChange == null ? "text-zinc-600" : changeClass(monthlyChange)}`}>{formatOptionalPercent(monthlyChange)}</p></div></div><div className="mt-4 flex items-center justify-between gap-4"><MiniSparkline row={row} /><MonitorRowActions row={row} onWatch={() => void watchRow(row)} saved={savedKeys.includes(key)} saving={savingKeys.includes(key)} /></div></article>; })}</div>
        </> : null}

        <footer className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-3 text-[0.68rem] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>{visibleRows.length} visible of {rows.length} loaded references.</span><span>Public and delayed data · research support · not financial advice.</span></footer>
      </section>
    </div>
  );
}
