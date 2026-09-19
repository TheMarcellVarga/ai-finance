"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, ArrowUpRight, BookOpenCheck, ChevronDown, Clock3, Database, ExternalLink, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { assetMonitorDefinitions } from "@/lib/asset-monitors";
import { cryptoMonitorIntervals, type CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
import type { MarketMonitorResponse, MarketMonitorRow } from "@/lib/finance-api";

type TrendFilter = "all" | "bullish" | "bearish" | "recent" | "near" | "unavailable";
type SortKey = "symbol" | "price" | "dailyChangePercent" | "trend" | "lastFlipAt" | "nextFlipLevel" | "distanceToFlipPercent" | "sinceFlipPercent" | "volume" | "assetClassLabel";
type SortDirection = "asc" | "desc";
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

function SortHeader({ column, active, direction, onSort, align = "left" }: { column: SortKey; active: boolean; direction: SortDirection; onSort: (column: SortKey) => void; align?: "left" | "right" }) {
  const Icon = active ? direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return <th className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`} aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" onClick={() => onSort(column)} className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35 ${active ? "text-cyan-100" : "text-zinc-600"}`}><span>{sortLabels[column]}</span><Icon className="size-3" aria-hidden="true" /></button></th>;
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
  const loadedOnce = useRef(false);

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

  const title = initialAssetClass === "all" ? "VargaTrend across every market." : `${assetMonitorDefinitions.find((item) => item.id === initialAssetClass)?.label ?? "Market"} VargaTrend map.`;

  return <div className="space-y-5">
    <section className="section-shell overflow-hidden rounded-[1.25rem] p-5 sm:p-7 lg:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><h1 className="type-display text-3xl text-white sm:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">The crypto monitor’s full research toolset now spans the configured asset universe: confirmed state, last flip, next flip level, distance, since-flip movement, timeframe controls, sorting, watch actions, and contextual study links.</p></div><div className="space-y-2 text-xs text-zinc-500 lg:text-right"><p className="inline-flex items-center gap-2"><Database className="size-3.5 text-cyan-200/70" />Provider-backed public data</p><p>Auto mode · ATR 10–20 × 3 · confirmed candles</p><p>Last refresh: {formatCapturedAt(metrics.latest)}</p><p>OHLC signals where available; close-derived FX bands are labelled.</p></div></div></section>

    <section className="grid grid-cols-2 overflow-hidden border-y border-white/[0.06] bg-black/10 lg:grid-cols-4"><div className="p-4 sm:p-5"><p className="text-xs text-zinc-500">Markets monitored</p><p className="mt-2 font-mono text-2xl text-white">{rows.length || "—"}</p><p className="mt-1 text-xs text-zinc-600">{new Set(rows.map((row) => row.assetClass)).size || "—"} classes loaded</p></div><div className="border-l border-white/[0.06] p-4 sm:p-5"><p className="text-xs text-zinc-500">Bullish</p><p className="mt-2 font-mono text-2xl text-emerald-100">{rows.length ? metrics.bullish : "—"}</p><p className="mt-1 text-xs text-zinc-600">Confirmed candle</p></div><div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-l lg:border-t-0"><p className="text-xs text-zinc-500">Bearish</p><p className="mt-2 font-mono text-2xl text-rose-100">{rows.length ? metrics.bearish : "—"}</p><p className="mt-1 text-xs text-zinc-600">Confirmed candle</p></div><button type="button" onClick={jumpToNearest} disabled={!metrics.nearest} className="border-l border-t border-white/[0.06] p-4 text-left hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200/35 disabled:cursor-default sm:p-5 lg:border-t-0"><p className="text-xs text-zinc-500">Nearest flip</p><p className="mt-2 truncate text-xl text-cyan-100">{metrics.nearest?.symbol ?? "—"}</p><p className="mt-1 text-xs text-zinc-600">{metrics.nearest ? `${metrics.nearest.distanceToFlipPercent!.toFixed(2)}% away` : "Waiting for signals"}</p></button></section>

    <section className="overflow-hidden rounded-[1rem] border border-white/[0.06] bg-[#080d0e]/96">
      <div className="grid gap-3 border-b border-white/[0.06] p-4 md:grid-cols-2 2xl:grid-cols-[minmax(14rem,1fr)_minmax(10rem,.65fr)_minmax(10rem,.65fr)_minmax(11rem,.75fr)_minmax(9rem,.6fr)_auto] 2xl:items-center">
        <label className="relative"><span className="sr-only">Search markets</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, name, or class" className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-white/[0.025] pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10" /></label>
        <label className="relative"><span className="sr-only">Asset class</span><select value={assetClass} onChange={(event) => { const next = event.target.value; setAssetClass(next); void loadMarkets(next, interval); }} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="all">All asset classes</option>{assetMonitorDefinitions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></label>
        <label className="flex items-center gap-2"><SlidersHorizontal className="size-4 shrink-0 text-zinc-600" /><span className="relative block min-w-0 flex-1"><select value={trendFilter} onChange={(event) => setTrendFilter(event.target.value as TrendFilter)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value="all">All states</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="recent">Recently flipped</option><option value="near">Within 1.5% of flip</option><option value="unavailable">Signal unavailable</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></span></label>
        <label className="relative"><span className="sr-only">Sort markets</span><select value={`${sortKey}:${sortDirection}`} onChange={(event) => applySortPreset(event.target.value)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-cyan-200/20 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40"><option value={`${sortKey}:${sortDirection}`}>Sort: {sortLabels[sortKey]} {sortDirection}</option><option value="volume:desc">Volume descending</option><option value="lastFlipAt:desc">Latest flip</option><option value="distanceToFlipPercent:asc">Nearest flip</option><option value="symbol:asc">Symbol ascending</option><option value="price:asc">Price ascending</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></label>
        <label className="relative"><span className="sr-only">Timeframe</span><select value={interval} onChange={(event) => { const next = event.target.value as CryptoMonitorInterval; setInterval(next); void loadMarkets(assetClass, next); }} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none focus:border-cyan-200/40">{cryptoMonitorIntervals.map((value) => <option key={value} value={value}>{intervalLabels[value]}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /></label>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void loadMarkets(assetClass, interval)} className="w-full border-cyan-200/20 bg-cyan-200/[0.04] text-cyan-100 hover:bg-cyan-200/15 2xl:w-fit"><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />{loading ? "Loading" : "Refresh"}</Button>
      </div>

      {status ? <p aria-live="polite" className="border-b border-white/[0.06] px-4 py-3 text-xs text-zinc-400">{status}</p> : null}
      {failures.length ? <p className="border-b border-amber-200/10 bg-amber-200/[0.025] px-4 py-3 text-xs text-amber-100/75">Unavailable now: {failures.join(", ")}. Successful classes remain visible.</p> : null}
      {loading && rows.length === 0 ? <div className="p-10 text-center"><RefreshCw className="mx-auto size-5 animate-spin text-cyan-200" /><p className="mt-4 text-sm text-zinc-400">Loading VargaTrend market states…</p></div> : null}
      {!loading && visibleRows.length === 0 ? <div className="p-10 text-center"><Search className="mx-auto size-5 text-cyan-200" /><p className="mt-4 text-sm text-zinc-400">No markets match this view.</p></div> : null}

      {visibleRows.length > 0 ? <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1240px] border-collapse text-left"><thead className="bg-white/[0.018] text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600"><tr><SortHeader column="symbol" active={sortKey === "symbol"} direction={sortDirection} onSort={handleSort} /><SortHeader column="assetClassLabel" active={sortKey === "assetClassLabel"} direction={sortDirection} onSort={handleSort} /><SortHeader column="price" active={sortKey === "price"} direction={sortDirection} onSort={handleSort} /><SortHeader column="dailyChangePercent" active={sortKey === "dailyChangePercent"} direction={sortDirection} onSort={handleSort} /><SortHeader column="trend" active={sortKey === "trend"} direction={sortDirection} onSort={handleSort} /><SortHeader column="lastFlipAt" active={sortKey === "lastFlipAt"} direction={sortDirection} onSort={handleSort} /><SortHeader column="nextFlipLevel" active={sortKey === "nextFlipLevel"} direction={sortDirection} onSort={handleSort} /><SortHeader column="distanceToFlipPercent" active={sortKey === "distanceToFlipPercent"} direction={sortDirection} onSort={handleSort} /><SortHeader column="sinceFlipPercent" active={sortKey === "sinceFlipPercent"} direction={sortDirection} onSort={handleSort} align="right" /><th className="px-4 py-2 text-right font-medium">Study</th></tr></thead><tbody>{visibleRows.map((row) => { const TrendIcon = row.trend === "bullish" ? ArrowUpRight : ArrowDownRight; const key = `${row.assetClass}:${row.symbol}`; return <tr key={key} data-universal-market={key} tabIndex={-1} className="border-t border-white/[0.05] hover:bg-white/[0.022] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-200/35"><td className="px-5 py-3.5"><div className="flex items-center gap-2"><a href={row.sourceUrl} target="_blank" rel="noreferrer" className="font-mono text-sm text-white hover:text-cyan-100">{row.symbol}</a><ExternalLink className="size-3 text-zinc-700" /></div><p className="mt-1 max-w-[13rem] truncate text-[0.67rem] text-zinc-600">{formatCompact(row.volume)} vol</p></td><td className="px-4 py-3.5 text-xs text-cyan-100/75"><Link href={classHref(row.assetClass)} className="hover:text-white">{row.assetClassLabel}</Link>{row.signalBasis === "close-derived" ? <p className="mt-1 text-[0.6rem] text-amber-100/60">Close-derived</p> : null}</td><td className="px-4 py-3.5 font-mono text-xs text-zinc-200">{row.displayValue || formatPrice(row.price, row.currency)}</td><td className={`px-4 py-3.5 font-mono text-xs ${row.dailyChangePercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{formatPercent(row.dailyChangePercent)}</td><td className="px-4 py-3.5">{row.trend ? <><span className={`inline-flex items-center gap-1 rounded-[0.55rem] border px-2 py-1 text-[0.66rem] font-medium uppercase ${trendClass(row.trend)}`}><TrendIcon className="size-3" />{row.trend}</span><p className="mt-1 text-[0.6rem] uppercase tracking-[0.08em] text-zinc-600">ATR {row.atrPeriod ?? 10} × {row.atrMultiplier ?? 3}</p></> : <span className="text-xs text-zinc-600" title={row.signalUnavailableReason}>Unavailable</span>}</td><td className="px-4 py-3.5"><Link href={studyHref(row, interval)} className="font-mono text-xs text-zinc-200 hover:text-cyan-100">{formatTimeAgo(row.lastFlipAt, row.historyComplete)}</Link><p className="mt-1 text-[0.65rem] text-zinc-600">Confirmed close</p></td><td className="px-4 py-3.5 font-mono text-xs text-zinc-200">{formatPrice(row.nextFlipLevel, row.currency)}</td><td className="px-4 py-3.5 font-mono text-xs text-cyan-100">{formatPercent(row.distanceToFlipPercent)}</td><td className={`px-4 py-3.5 text-right font-mono text-xs ${row.sinceFlipPercent == null ? "text-zinc-600" : row.sinceFlipPercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{formatPercent(row.sinceFlipPercent)}</td><td className="px-4 py-3.5 text-right"><div className="flex items-center justify-end gap-2"><Link href={studyHref(row, interval)} className="inline-flex items-center gap-1.5 rounded-[0.6rem] border border-cyan-200/15 bg-cyan-200/[0.035] px-2 py-1.5 text-[0.68rem] text-cyan-100/80 hover:text-white"><BookOpenCheck className="size-3.5" />Study</Link><Link href={`/app/learn/labs?market=${encodeURIComponent(row.symbol)}&state=${row.trend ?? "unavailable"}&timeframe=${interval}`} className="text-[0.68rem] text-zinc-400 hover:text-white">Lab</Link><button type="button" disabled={savedKeys.includes(key)} onClick={() => void watch(row)} className="text-[0.68rem] text-zinc-400 hover:text-white disabled:text-emerald-100">{savedKeys.includes(key) ? "Watched" : "Watch"}</button></div></td></tr>; })}</tbody></table></div>
      <div className="divide-y divide-white/[0.06] md:hidden">{visibleRows.map((row) => <article key={`${row.assetClass}:${row.symbol}`} className="p-4"><div className="flex items-start justify-between gap-4"><div><a href={row.sourceUrl} target="_blank" rel="noreferrer" className="font-mono text-sm text-white">{row.symbol}</a><p className="mt-1 text-xs text-zinc-500">{row.assetClassLabel}</p></div><span className={`rounded-[0.55rem] border px-2 py-1 text-[0.65rem] uppercase ${trendClass(row.trend)}`}>{row.trend ?? "Unavailable"}</span></div><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-[0.65rem] text-zinc-600">Price</p><p className="mt-1 truncate font-mono text-xs text-zinc-200">{row.displayValue}</p></div><div><p className="text-[0.65rem] text-zinc-600">Flip level</p><p className="mt-1 font-mono text-xs text-zinc-200">{formatPrice(row.nextFlipLevel, row.currency)}</p></div><div><p className="text-[0.65rem] text-zinc-600">Distance</p><p className="mt-1 font-mono text-xs text-cyan-100">{formatPercent(row.distanceToFlipPercent)}</p></div></div><div className="mt-4 flex items-center justify-between"><p className="text-xs text-zinc-500">Last flip · {formatTimeAgo(row.lastFlipAt, row.historyComplete)}</p><Link href={studyHref(row, interval)} className="text-xs text-cyan-100">Study state</Link></div></article>)}</div></> : null}
      <footer className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-3 text-[0.68rem] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>{visibleRows.length} visible markets · Auto ATR 10–20 × 3 · provider-bounded history.</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" />Closed-candle research indicators. Not financial advice.</span></footer>
    </section>
  </div>;
}
