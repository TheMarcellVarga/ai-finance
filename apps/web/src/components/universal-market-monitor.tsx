"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, ArrowUpRight, BookOpenCheck, Check, ChevronDown, Clock3, Database, ExternalLink, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { assetMonitorDefinitions } from "@/lib/asset-monitors";
import { cryptoMonitorIntervals, type CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
import type { MarketMonitorResponse, MarketMonitorRow } from "@/lib/finance-api";

type TrendFilter = "all" | "bullish" | "bearish" | "recent" | "near" | "unavailable";
type SortKey = "symbol" | "price" | "dailyChangePercent" | "trend" | "lastFlipAt" | "nextFlipLevel" | "distanceToFlipPercent" | "sinceFlipPercent" | "volume" | "assetClassLabel";
type SortDirection = "asc" | "desc";
type ColumnKey = "market" | "class" | "price" | "dailyChangePercent" | "trend" | "lastFlipAt" | "nextFlipLevel" | "distanceToFlipPercent" | "sinceFlipPercent" | "study";
type RouteError = { error?: { message?: string } };

type UniversalRow = MarketMonitorRow & {
  assetClass: string;
  assetClassLabel: string;
};

type CryptoPayload = {
  data: Array<{
    symbol: string;
    baseAsset: string;
    assetName: string;
    quoteAsset: string;
    price: number;
    dailyChangePercent: number;
    quoteVolume: number;
    trend: "bullish" | "bearish";
    atrPeriod: number;
    atrMultiplier: number;
    autoSelectionReady: boolean;
    lastFlipAt: string | null;
    nextFlipLevel: number;
    distanceToFlipPercent: number;
    sinceFlipPercent: number | null;
    candleClosedAt: string;
    historyComplete: boolean;
    researchUrl: string;
  }>;
  meta: { provider: string; providerLabel: string; capturedAt: string; failedMarkets: number };
};

const intervalLabels: Record<CryptoMonitorInterval, string> = {
  "1m": "1 min", "3m": "3 min", "5m": "5 min", "15m": "15 min", "30m": "30 min",
  "1h": "1 hour", "2h": "2 hours", "4h": "4 hours", "6h": "6 hours", "12h": "12 hours",
  "1d": "1 day", "3d": "3 days", "1w": "1 week",
};

const intervalMs: Record<CryptoMonitorInterval, number> = {
  "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
  "1h": 3_600_000, "2h": 7_200_000, "4h": 14_400_000, "6h": 21_600_000, "12h": 43_200_000,
  "1d": 86_400_000, "3d": 259_200_000, "1w": 604_800_000,
};

const sortLabels: Record<SortKey, string> = {
  symbol: "Market", price: "Price", dailyChangePercent: "24h", trend: "State", lastFlipAt: "Last flip",
  nextFlipLevel: "Flip level", distanceToFlipPercent: "Distance", sinceFlipPercent: "Since flip", volume: "Volume", assetClassLabel: "Class",
};

const columnOptions: Array<{ key: ColumnKey; label: string; description: string }> = [
  { key: "market", label: "Market", description: "Symbol and volume" },
  { key: "class", label: "Class", description: "Asset taxonomy" },
  { key: "price", label: "Price", description: "Latest provider value" },
  { key: "dailyChangePercent", label: "24h", description: "Daily movement" },
  { key: "trend", label: "State", description: "Confirmed trend and ATR" },
  { key: "lastFlipAt", label: "Last flip", description: "Most recent confirmed flip" },
  { key: "nextFlipLevel", label: "Flip level", description: "Next level to monitor" },
  { key: "distanceToFlipPercent", label: "Distance", description: "Distance to flip" },
  { key: "sinceFlipPercent", label: "Since flip", description: "Movement since flip" },
  { key: "study", label: "Study", description: "Study, lab, and watch actions" },
];

const defaultVisibleColumns: Record<ColumnKey, boolean> = {
  market: true,
  class: true,
  price: true,
  dailyChangePercent: true,
  trend: true,
  lastFlipAt: true,
  nextFlipLevel: true,
  distanceToFlipPercent: true,
  sinceFlipPercent: true,
  study: true,
};

const columnWeights: Record<ColumnKey, number> = {
  market: 2.05,
  class: 1.1,
  price: 1,
  dailyChangePercent: 0.78,
  trend: 1.12,
  lastFlipAt: 1,
  nextFlipLevel: 1.08,
  distanceToFlipPercent: 0.78,
  sinceFlipPercent: 0.88,
  study: 0.94,
};

function formatPrice(value: number | null | undefined, currency = "USD") {
  if (value == null || !Number.isFinite(value)) return "—";
  const maximumFractionDigits = value >= 1_000 ? 2 : value >= 1 ? 4 : value >= 0.01 ? 6 : 8;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits }).format(value);
  } catch {
    return `${value.toFixed(maximumFractionDigits)} ${currency}`;
  }
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCompact(value: number | undefined) {
  return value == null ? "—" : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatCapturedAt(value?: string) {
  if (!value) return "Awaiting provider";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

function formatTimeAgo(value: string | null | undefined, complete?: boolean) {
  if (!value) return complete ? "Outside history" : "Warming up";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
}

function isRecent(row: UniversalRow, interval: CryptoMonitorInterval) {
  return row.lastFlipAt != null && Date.now() - new Date(row.lastFlipAt).getTime() <= intervalMs[interval] * 3;
}

function compareNullable(left: number | null | undefined, right: number | null | undefined, direction: SortDirection) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return direction === "asc" ? left - right : right - left;
}

function compareRows(left: UniversalRow, right: UniversalRow, key: SortKey, direction: SortDirection) {
  if (key === "symbol" || key === "trend" || key === "assetClassLabel") {
    const result = String(left[key] ?? "").localeCompare(String(right[key] ?? ""));
    return direction === "asc" ? result : -result;
  }
  if (key === "lastFlipAt") {
    return compareNullable(left.lastFlipAt ? Date.parse(left.lastFlipAt) : null, right.lastFlipAt ? Date.parse(right.lastFlipAt) : null, direction);
  }
  return compareNullable(left[key] as number | null | undefined, right[key] as number | null | undefined, direction);
}

function trendClass(trend?: "bullish" | "bearish") {
  return trend === "bullish" ? "border-emerald-200/20 bg-emerald-200/[0.05] text-emerald-100" : trend === "bearish" ? "border-rose-200/20 bg-rose-200/[0.05] text-rose-100" : "border-white/10 bg-white/[0.02] text-zinc-500";
}

function SortHeader({ column, active, direction, onSort, align = "left", label = sortLabels[column] }: { column: SortKey; active: boolean; direction: SortDirection; onSort: (column: SortKey) => void; align?: "left" | "right"; label?: string }) {
  const Icon = active ? direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return <th className={`px-2 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`} aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" onClick={() => onSort(column)} className={`inline-flex min-h-7 max-w-full items-center gap-1 rounded-md px-1 text-[0.62rem] uppercase tracking-[0.08em] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35 ${active ? "text-cyan-100" : "text-zinc-600"}`}><span className="truncate">{label}</span><Icon className="size-2.5 shrink-0" aria-hidden="true" /></button></th>;
}

function studyHref(row: UniversalRow, interval: CryptoMonitorInterval, lesson = "supertrend-anatomy") {
  const params = new URLSearchParams({ market: row.symbol, state: row.trend ?? "unavailable", timeframe: interval, flipLevel: row.nextFlipLevel?.toString() ?? "unavailable", capturedAt: row.capturedAt });
  return `/app/learn/market-structure/${lesson}?${params}`;
}

function classHref(assetClass: string) {
  return assetMonitorDefinitions.find((definition) => definition.id === assetClass)?.href ?? "/app/monitors";
}

export function UniversalMarketMonitor({ initialAssetClass = "all" }: { initialAssetClass?: string }) {
  const [rows, setRows] = useState<UniversalRow[]>([]);
  const [assetClass, setAssetClass] = useState(initialAssetClass);
  const [interval, setInterval] = useState<CryptoMonitorInterval>(initialAssetClass === "all" ? "1d" : "4h");
  const [query, setQuery] = useState("");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>(initialAssetClass === "all" ? "assetClassLabel" : "volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(defaultVisibleColumns);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!columnsMenuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setColumnsMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [columnsMenuOpen]);

  const loadMarkets = useCallback(async (selectedClass: string, selectedInterval: CryptoMonitorInterval) => {
    setLoading(true);
    setStatus(null);
    const definitions = assetMonitorDefinitions.filter((definition) => selectedClass === "all" || definition.id === selectedClass);
    const settled = await Promise.allSettled(definitions.map(async (definition): Promise<UniversalRow[]> => {
      if (definition.id === "crypto") {
        const response = await fetch(`/api/finance/crypto-monitor?interval=${selectedInterval}&limit=${selectedClass === "all" ? 20 : 80}`, { cache: "no-store" });
        const payload = (await response.json()) as CryptoPayload | RouteError;
        if (!response.ok || !("data" in payload)) throw new Error("error" in payload ? payload.error?.message ?? definition.label : definition.label);
        return payload.data.map((row) => ({
          symbol: row.symbol, name: row.assetName, currency: row.quoteAsset, price: row.price,
          displayValue: formatPrice(row.price, row.quoteAsset), dailyChangePercent: row.dailyChangePercent, monthlyChangePercent: 0,
          volume: row.quoteVolume, sparkline: [], provider: payload.meta.providerLabel, sourceUrl: row.researchUrl, capturedAt: row.candleClosedAt || payload.meta.capturedAt,
          trend: row.trend, atrPeriod: row.atrPeriod, atrMultiplier: row.atrMultiplier, autoSelectionReady: row.autoSelectionReady,
          lastFlipAt: row.lastFlipAt, nextFlipLevel: row.nextFlipLevel, distanceToFlipPercent: row.distanceToFlipPercent,
          sinceFlipPercent: row.sinceFlipPercent, historyComplete: row.historyComplete, signalInterval: selectedInterval, signalBasis: "ohlc",
          assetClass: definition.id, assetClassLabel: definition.label,
        }));
      }
      const response = await fetch(`/api/finance/asset-monitor?class=${encodeURIComponent(definition.id)}&interval=${selectedInterval}`, { cache: "no-store" });
      const payload = (await response.json()) as MarketMonitorResponse | RouteError;
      if (!response.ok || !("data" in payload)) throw new Error("error" in payload ? payload.error?.message ?? definition.label : definition.label);
      return payload.data.map((row) => ({ ...row, assetClass: definition.id, assetClassLabel: definition.label }));
    }));
    setRows(settled.flatMap((result) => result.status === "fulfilled" ? result.value : []));
    setFailures(settled.flatMap((result, index) => result.status === "rejected" ? [definitions[index].label] : []));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    queueMicrotask(() => void loadMarkets(initialAssetClass, initialAssetClass === "all" ? "1d" : "4h"));
  }, [initialAssetClass, loadMarkets]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    return rows.filter((row) => {
      if (normalized && !`${row.symbol} ${row.name} ${row.assetClassLabel}`.toUpperCase().includes(normalized)) return false;
      if (trendFilter === "bullish" || trendFilter === "bearish") return row.trend === trendFilter;
      if (trendFilter === "recent") return isRecent(row, interval);
      if (trendFilter === "near") return row.distanceToFlipPercent != null && row.distanceToFlipPercent <= 1.5;
      if (trendFilter === "unavailable") return !row.trend;
      return true;
    }).sort((left, right) => compareRows(left, right, sortKey, sortDirection) || left.symbol.localeCompare(right.symbol));
  }, [interval, query, rows, sortDirection, sortKey, trendFilter]);

  const metrics = useMemo(() => {
    const signaled = rows.filter((row) => row.trend);
    return {
      bullish: signaled.filter((row) => row.trend === "bullish").length,
      bearish: signaled.filter((row) => row.trend === "bearish").length,
      nearest: [...signaled].filter((row) => row.distanceToFlipPercent != null).sort((left, right) => left.distanceToFlipPercent! - right.distanceToFlipPercent!)[0],
      latest: [...rows].sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0]?.capturedAt,
    };
  }, [rows]);

  function handleSort(column: SortKey) {
    setSortDirection((current) => sortKey === column ? current === "asc" ? "desc" : "asc" : column === "symbol" || column === "price" || column === "distanceToFlipPercent" ? "asc" : "desc");
    setSortKey(column);
  }

  function applySortPreset(value: string) {
    const [key, direction] = value.split(":") as [SortKey, SortDirection];
    setSortKey(key);
    setSortDirection(direction);
  }

  const visibleColumnKeys = useMemo(() => columnOptions.filter((column) => visibleColumns[column.key]), [visibleColumns]);
  const visibleColumnCount = visibleColumnKeys.length;
  const visibleColumnWeight = visibleColumnKeys.reduce((total, column) => total + columnWeights[column.key], 0);

  function toggleColumn(column: ColumnKey) {
    if (column === "market") return;
    setVisibleColumns((current) => ({ ...current, [column]: !current[column] }));
  }

  function resetColumns() {
    setVisibleColumns(defaultVisibleColumns);
  }

  function jumpToNearest() {
    if (!metrics.nearest) return;
    setQuery("");
    setTrendFilter("all");
    window.setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-universal-market="${CSS.escape(`${metrics.nearest!.assetClass}:${metrics.nearest!.symbol}`)}"]`);
      row?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      row?.focus({ preventScroll: true });
    }, 0);
  }

  async function watch(row: UniversalRow) {
    const key = `${row.assetClass}:${row.symbol}`;
    const response = await fetch("/api/finance/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: row.symbol, notes: `${row.assetClassLabel} · ${row.trend ?? "signal unavailable"} · ${interval}` }) });
    if (response.ok) {
      setSavedKeys((current) => [...current, key]);
      setStatus(`${row.symbol} added to the watchlist.`);
    } else {
      const payload = (await response.json()) as RouteError;
      setStatus(payload.error?.message ?? "The market could not be added to the watchlist.");
    }
  }

  const title = initialAssetClass === "all" ? "Adaptive Supertrend across every market." : `${assetMonitorDefinitions.find((item) => item.id === initialAssetClass)?.label ?? "Market"} Adaptive Supertrend map.`;

  return <div className="space-y-5">
    <section className="section-shell overflow-hidden rounded-[1.25rem] p-4 sm:p-6 md:p-7 lg:p-8"><div className="flex flex-col gap-4 md:gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><h1 className="type-display text-3xl text-white sm:text-4xl md:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 sm:mt-4">Closed-candle trend states and flip levels across the configured market universe.</p></div><div className="flex max-w-xl flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-zinc-500 lg:justify-end lg:text-right"><p className="inline-flex items-center gap-2"><Database className="size-3.5 text-cyan-200/70" />Provider-backed public data</p><span className="text-zinc-700" aria-hidden="true">·</span><p>Refresh: {formatCapturedAt(metrics.latest)}</p><p className="hidden w-full md:block">ATR 10-20 x 3 · confirmed candles · OHLC where available; FX bands close-derived.</p></div></div></section>

    <section className="grid grid-cols-2 overflow-hidden border-y border-white/[0.06] bg-black/10 lg:grid-cols-4"><div className="p-4 sm:p-5"><p className="text-xs text-zinc-500">Markets monitored</p><p className="mt-2 font-mono text-2xl text-white">{rows.length || "—"}</p><p className="mt-1 text-xs text-zinc-600">{new Set(rows.map((row) => row.assetClass)).size || "—"} classes loaded</p></div><div className="border-l border-white/[0.06] p-4 sm:p-5"><p className="text-xs text-zinc-500">Bullish</p><p className="mt-2 font-mono text-2xl text-emerald-100">{rows.length ? metrics.bullish : "—"}</p><p className="mt-1 text-xs text-zinc-600">Confirmed candle</p></div><div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-l lg:border-t-0"><p className="text-xs text-zinc-500">Bearish</p><p className="mt-2 font-mono text-2xl text-rose-100">{rows.length ? metrics.bearish : "—"}</p><p className="mt-1 text-xs text-zinc-600">Confirmed candle</p></div><button type="button" onClick={jumpToNearest} disabled={!metrics.nearest} className="border-l border-t border-white/[0.06] p-4 text-left hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200/35 disabled:cursor-default sm:p-5 lg:border-t-0"><p className="text-xs text-zinc-500">Nearest flip</p><p className="mt-2 truncate text-xl text-cyan-100">{metrics.nearest?.symbol ?? "—"}</p><p className="mt-1 text-xs text-zinc-600">{metrics.nearest ? `${metrics.nearest.distanceToFlipPercent!.toFixed(2)}% away` : "Waiting for signals"}</p></button></section>

    <section className="relative overflow-hidden rounded-[1rem] border border-white/[0.06] bg-[#080d0e]/96">
      <div className="relative border-b border-white/[0.06]">
        <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(10rem,1.45fr)_minmax(8rem,1fr)_minmax(8.5rem,1fr)_minmax(8.5rem,1fr)_minmax(6rem,.8fr)_auto]">
          <label className="relative min-w-0"><span className="sr-only">Search markets</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, name, or class" className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-white/[0.025] pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10" /></label>
          <label className="flex min-w-0 items-center gap-2"><SlidersHorizontal className="size-4 shrink-0 text-zinc-600" /><span className="relative block min-w-0 flex-1"><span className="sr-only">Filter by market state</span><select value={trendFilter} onChange={(event) => setTrendFilter(event.target.value as TrendFilter)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="all">All states</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="recent">Recently flipped</option><option value="near">Within 1.5% of flip</option><option value="unavailable">Signal unavailable</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></span></label>
          <label className="relative min-w-0"><span className="sr-only">Sort markets</span><select value={`${sortKey}:${sortDirection}`} onChange={(event) => applySortPreset(event.target.value)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-cyan-200/20 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value={`${sortKey}:${sortDirection}`}>Sort: {sortLabels[sortKey]} {sortDirection}</option><option value="volume:desc">Volume descending</option><option value="lastFlipAt:desc">Latest flip</option><option value="distanceToFlipPercent:asc">Nearest flip</option><option value="symbol:asc">Symbol ascending</option><option value="price:asc">Price ascending</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></label>
          <label className="relative min-w-0"><span className="sr-only">Asset class</span><select value={assetClass} onChange={(event) => { const next = event.target.value; setAssetClass(next); void loadMarkets(next, interval); }} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="all">All asset classes</option>{assetMonitorDefinitions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></label>
          <label className="relative min-w-0"><span className="sr-only">Timeframe</span><select value={interval} onChange={(event) => { const next = event.target.value as CryptoMonitorInterval; setInterval(next); void loadMarkets(assetClass, next); }} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40">{cryptoMonitorIntervals.map((value) => <option key={value} value={value}>{intervalLabels[value]}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></label>
          <div className="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-1">
            <button type="button" aria-expanded={columnsMenuOpen} aria-controls="market-column-visibility" onClick={() => setColumnsMenuOpen((current) => !current)} className="inline-flex h-10 items-center gap-2 rounded-[0.7rem] border border-white/10 bg-white/[0.025] px-3 text-xs text-zinc-300 transition-colors hover:border-cyan-200/25 hover:bg-cyan-200/[0.05] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"><SlidersHorizontal aria-hidden="true" className="size-3.5 text-cyan-100/80" /><span>Columns</span><span className="font-mono text-[0.65rem] text-zinc-500">{visibleColumnCount}/{columnOptions.length}</span></button>
            <Button type="button" variant="outline" size="icon" aria-label={loading ? "Loading markets" : "Refresh markets"} title={loading ? "Loading markets" : "Refresh markets"} disabled={loading} onClick={() => void loadMarkets(assetClass, interval)} className="h-10 w-10 border-cyan-200/20 bg-cyan-200/[0.04] p-0 text-cyan-100 hover:bg-cyan-200/15"><RefreshCw aria-hidden="true" className={loading ? "size-4 animate-spin" : "size-4"} /></Button>
          </div>
        </div>
        {columnsMenuOpen ? <div id="market-column-visibility" role="dialog" aria-label="Choose visible market columns" className="absolute right-3 top-[calc(100%+0.55rem)] z-30 w-[min(19rem,calc(100vw-1.5rem))] rounded-[0.9rem] border border-white/10 bg-[#0c1213] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-3"><div><p className="text-sm font-medium text-white">Visible columns</p><p className="mt-1 text-[0.68rem] leading-5 text-zinc-500">Keep the table focused on the fields you review most.</p></div><button type="button" onClick={resetColumns} className="shrink-0 text-[0.68rem] text-cyan-100/80 hover:text-white">Reset</button></div>
          <div className="mt-2 grid gap-1">{columnOptions.map((column) => <label key={column.key} className={`flex items-center gap-3 rounded-[0.65rem] px-2 py-2 ${column.key === "market" ? "cursor-default opacity-65" : "cursor-pointer hover:bg-white/[0.04]"}`}><input type="checkbox" checked={visibleColumns[column.key]} disabled={column.key === "market"} onChange={() => toggleColumn(column.key)} className="size-3.5 accent-cyan-200" /><span className="min-w-0"><span className="block text-xs text-zinc-200">{column.label}</span><span className="block truncate text-[0.62rem] text-zinc-600">{column.description}</span></span>{visibleColumns[column.key] ? <Check aria-hidden="true" className="ml-auto size-3.5 shrink-0 text-cyan-100" /> : null}</label>)}</div>
        </div> : null}
      </div>

      {status ? <p aria-live="polite" className="border-b border-white/[0.06] px-4 py-3 text-xs text-zinc-400">{status}</p> : null}
      {failures.length ? <p className="border-b border-amber-200/10 bg-amber-200/[0.025] px-4 py-3 text-xs text-amber-100/75">Unavailable now: {failures.join(", ")}. Successful classes remain visible.</p> : null}
      {loading && rows.length === 0 ? <div className="p-10 text-center"><RefreshCw className="mx-auto size-5 animate-spin text-cyan-200" /><p className="mt-4 text-sm text-zinc-400">Loading Adaptive Supertrend market states...</p></div> : null}
      {!loading && visibleRows.length === 0 ? <div className="p-10 text-center"><Search className="mx-auto size-5 text-cyan-200" /><p className="mt-4 text-sm text-zinc-400">No markets match this view.</p></div> : null}

      {visibleRows.length > 0 ? <><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[760px] table-fixed border-collapse text-left"><colgroup>{visibleColumnKeys.map((column) => <col key={column.key} style={{ width: `${(columnWeights[column.key] / visibleColumnWeight) * 100}%` }} />)}</colgroup><thead className="bg-white/[0.018] text-zinc-600"><tr>
        {visibleColumns.market ? <SortHeader column="symbol" label="Market" active={sortKey === "symbol"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.class ? <SortHeader column="assetClassLabel" label="Class" active={sortKey === "assetClassLabel"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.price ? <SortHeader column="price" label="Price" active={sortKey === "price"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.dailyChangePercent ? <SortHeader column="dailyChangePercent" label="24h" active={sortKey === "dailyChangePercent"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.trend ? <SortHeader column="trend" label="State" active={sortKey === "trend"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.lastFlipAt ? <SortHeader column="lastFlipAt" label="Last flip" active={sortKey === "lastFlipAt"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.nextFlipLevel ? <SortHeader column="nextFlipLevel" label="Flip level" active={sortKey === "nextFlipLevel"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.distanceToFlipPercent ? <SortHeader column="distanceToFlipPercent" label="Distance" active={sortKey === "distanceToFlipPercent"} direction={sortDirection} onSort={handleSort} /> : null}
        {visibleColumns.sinceFlipPercent ? <SortHeader column="sinceFlipPercent" label="Since" active={sortKey === "sinceFlipPercent"} direction={sortDirection} onSort={handleSort} align="right" /> : null}
        {visibleColumns.study ? <th className="px-2 py-2 text-right text-[0.62rem] font-medium uppercase tracking-[0.08em]">Study</th> : null}
      </tr></thead><tbody>{visibleRows.map((row) => { const TrendIcon = row.trend === "bullish" ? ArrowUpRight : ArrowDownRight; const key = `${row.assetClass}:${row.symbol}`; return <tr key={key} data-universal-market={key} tabIndex={-1} className="border-t border-white/[0.05] hover:bg-white/[0.022] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-200/35">
        {visibleColumns.market ? <td className="px-2 py-2.5 align-middle"><div className="flex min-w-0 items-center gap-1.5"><a href={row.sourceUrl} target="_blank" rel="noreferrer" className="truncate font-mono text-[0.74rem] text-white hover:text-cyan-100">{row.symbol}</a><ExternalLink className="size-2.5 shrink-0 text-zinc-700" /></div><p className="mt-0.5 truncate text-[0.58rem] text-zinc-600">{formatCompact(row.volume)} vol</p></td> : null}
        {visibleColumns.class ? <td className="px-2 py-2.5 align-middle text-[0.64rem] text-cyan-100/75"><Link href={classHref(row.assetClass)} className="block truncate hover:text-white" title={row.assetClassLabel}>{row.assetClassLabel}</Link>{row.signalBasis === "close-derived" ? <p className="mt-0.5 truncate text-[0.54rem] text-amber-100/60">Close-derived</p> : null}</td> : null}
        {visibleColumns.price ? <td className="truncate px-2 py-2.5 align-middle font-mono text-[0.67rem] text-zinc-200" title={row.displayValue || formatPrice(row.price, row.currency)}>{row.displayValue || formatPrice(row.price, row.currency)}</td> : null}
        {visibleColumns.dailyChangePercent ? <td className={`px-2 py-2.5 align-middle font-mono text-[0.67rem] ${row.dailyChangePercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{formatPercent(row.dailyChangePercent)}</td> : null}
        {visibleColumns.trend ? <td className="px-2 py-2.5 align-middle">{row.trend ? <><span className={`inline-flex max-w-full items-center gap-1 rounded-[0.45rem] border px-1.5 py-0.5 text-[0.56rem] font-medium uppercase ${trendClass(row.trend)}`}><TrendIcon className="size-2.5 shrink-0" />{row.trend}</span><p className="mt-0.5 truncate text-[0.52rem] uppercase tracking-[0.06em] text-zinc-600">ATR {row.atrPeriod ?? 10} x {row.atrMultiplier ?? 3}</p></> : <span className="text-[0.64rem] text-zinc-600" title={row.signalUnavailableReason}>Unavailable</span>}</td> : null}
        {visibleColumns.lastFlipAt ? <td className="px-2 py-2.5 align-middle"><Link href={studyHref(row, interval)} className="whitespace-nowrap font-mono text-[0.64rem] text-zinc-200 hover:text-cyan-100">{formatTimeAgo(row.lastFlipAt, row.historyComplete)}</Link><p className="mt-0.5 truncate text-[0.54rem] text-zinc-600">Confirmed close</p></td> : null}
        {visibleColumns.nextFlipLevel ? <td className="truncate px-2 py-2.5 align-middle font-mono text-[0.64rem] text-zinc-200" title={formatPrice(row.nextFlipLevel, row.currency)}>{formatPrice(row.nextFlipLevel, row.currency)}</td> : null}
        {visibleColumns.distanceToFlipPercent ? <td className="px-2 py-2.5 align-middle font-mono text-[0.64rem] text-cyan-100">{formatPercent(row.distanceToFlipPercent)}</td> : null}
        {visibleColumns.sinceFlipPercent ? <td className={`px-2 py-2.5 text-right align-middle font-mono text-[0.64rem] ${row.sinceFlipPercent == null ? "text-zinc-600" : row.sinceFlipPercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{formatPercent(row.sinceFlipPercent)}</td> : null}
        {visibleColumns.study ? <td className="px-1.5 py-2.5 align-middle"><div className="flex items-center justify-end gap-1"><Link href={studyHref(row, interval)} aria-label={`Study ${row.symbol} state`} title="Study state" className="grid size-7 shrink-0 place-items-center rounded-[0.45rem] border border-cyan-200/15 bg-cyan-200/[0.035] text-cyan-100/80 hover:text-white"><BookOpenCheck className="size-3.5" /></Link><Link href={`/app/learn/labs?market=${encodeURIComponent(row.symbol)}&state=${row.trend ?? "unavailable"}&timeframe=${interval}`} className="px-0.5 text-[0.6rem] text-zinc-400 hover:text-white">Lab</Link><button type="button" disabled={savedKeys.includes(key)} onClick={() => void watch(row)} className="px-0.5 text-[0.6rem] text-zinc-400 hover:text-white disabled:text-emerald-100" title={savedKeys.includes(key) ? "Already watched" : "Add to watchlist"}>{savedKeys.includes(key) ? "Saved" : "Watch"}</button></div></td> : null}
      </tr>; })}</tbody></table></div>
      <div className="divide-y divide-white/[0.06] lg:hidden">{visibleRows.map((row) => <article key={`${row.assetClass}:${row.symbol}`} className="p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><a href={row.sourceUrl} target="_blank" rel="noreferrer" className="font-mono text-sm text-white">{row.symbol}</a>{visibleColumns.class ? <p className="mt-1 truncate text-xs text-zinc-500">{row.assetClassLabel}</p> : null}</div>{visibleColumns.trend ? <span className={`shrink-0 rounded-[0.55rem] border px-2 py-1 text-[0.65rem] uppercase ${trendClass(row.trend)}`}>{row.trend ?? "Unavailable"}</span> : null}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{visibleColumns.price ? <div><p className="text-[0.65rem] text-zinc-600">Price</p><p className="mt-1 truncate font-mono text-xs text-zinc-200">{row.displayValue}</p></div> : null}{visibleColumns.dailyChangePercent ? <div><p className="text-[0.65rem] text-zinc-600">24h</p><p className={`mt-1 font-mono text-xs ${row.dailyChangePercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{formatPercent(row.dailyChangePercent)}</p></div> : null}{visibleColumns.lastFlipAt ? <div><p className="text-[0.65rem] text-zinc-600">Last flip</p><p className="mt-1 truncate font-mono text-xs text-zinc-200">{formatTimeAgo(row.lastFlipAt, row.historyComplete)}</p></div> : null}{visibleColumns.nextFlipLevel ? <div><p className="text-[0.65rem] text-zinc-600">Flip level</p><p className="mt-1 truncate font-mono text-xs text-zinc-200">{formatPrice(row.nextFlipLevel, row.currency)}</p></div> : null}{visibleColumns.distanceToFlipPercent ? <div><p className="text-[0.65rem] text-zinc-600">Distance</p><p className="mt-1 font-mono text-xs text-cyan-100">{formatPercent(row.distanceToFlipPercent)}</p></div> : null}{visibleColumns.sinceFlipPercent ? <div><p className="text-[0.65rem] text-zinc-600">Since flip</p><p className="mt-1 font-mono text-xs text-zinc-200">{formatPercent(row.sinceFlipPercent)}</p></div> : null}</div><div className="mt-4 flex items-center justify-between gap-3"><p className="truncate text-xs text-zinc-500">{formatCompact(row.volume)} volume</p>{visibleColumns.study ? <Link href={studyHref(row, interval)} className="inline-flex items-center gap-1.5 text-xs text-cyan-100"><BookOpenCheck className="size-3.5" />Study state</Link> : null}</div></article>)}</div></> : null}
      <footer className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-3 text-[0.68rem] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>{visibleRows.length} visible markets · {visibleColumnCount} of {columnOptions.length} columns shown.</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" />Closed-candle research indicators. Not financial advice.</span></footer>
    </section>
  </div>;
}
