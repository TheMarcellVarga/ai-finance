"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Bitcoin,
  ChevronDown,
  Clock3,
  Database,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TradingViewHoverChart } from "@/components/tradingview-hover-chart";
import type {
  CryptoMonitorInterval,
  CryptoMonitorPayload,
  CryptoMonitorProvider,
  CryptoMonitorRow,
  CryptoMonitorScope,
  CryptoTrend,
} from "@/lib/crypto-monitor";

type TrendFilter = "all" | CryptoTrend | "recent" | "near";
type SortMode = "volume" | "recent" | "distance" | "symbol" | "price";
type SortKey =
  | "symbol"
  | "price"
  | "dailyChangePercent"
  | "trend"
  | "lastFlipAt"
  | "nextFlipLevel"
  | "distanceToFlipPercent"
  | "sinceFlipPercent"
  | "quoteVolume";
type SortDirection = "asc" | "desc";
type SortState = { key: SortKey; direction: SortDirection };
type RouteError = { error?: { message?: string } };

type CryptoMonitorWorkspaceProps = {
  initialPayload?: CryptoMonitorPayload;
  initialError?: string;
};

const COINMARKETCAP_SEARCH_URL = "https://coinmarketcap.com/coins/?q=";
let clientNow = Date.now();

function subscribeToClock(onChange: () => void) {
  const interval = window.setInterval(() => {
    clientNow = Date.now();
    onChange();
  }, 60_000);
  return () => window.clearInterval(interval);
}

const getClientNow = () => clientNow;
const getHydrated = () => true;
const getNotHydrated = () => false;
const noopSubscribe = () => () => {};

const intervalOptions: Array<{ value: CryptoMonitorInterval; label: string }> = [
  { value: "1m", label: "1 min" },
  { value: "3m", label: "3 min" },
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "2h", label: "2 hours" },
  { value: "4h", label: "4 hours" },
  { value: "6h", label: "6 hours" },
  { value: "12h", label: "12 hours" },
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "1w", label: "1 week" },
];

const defaultProviderOptions: Array<{ id: CryptoMonitorProvider; label: string; source: "native" | "ccxt" }> = [
  { id: "okx", label: "OKX Singapore", source: "native" },
];

const sortPresets: Record<SortMode, SortState> = {
  volume: { key: "quoteVolume", direction: "desc" },
  recent: { key: "lastFlipAt", direction: "desc" },
  distance: { key: "distanceToFlipPercent", direction: "asc" },
  symbol: { key: "symbol", direction: "asc" },
  price: { key: "price", direction: "asc" },
};

const sortLabels: Record<SortKey, string> = {
  symbol: "Market",
  price: "Price",
  dailyChangePercent: "24h",
  trend: "State",
  lastFlipAt: "Last flip",
  nextFlipLevel: "Flip level",
  distanceToFlipPercent: "Distance",
  sinceFlipPercent: "Since flip",
  quoteVolume: "Volume",
};

function SelectChevron() {
  return <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />;
}

function presetForSort(sort: SortState): SortMode | "custom" {
  const match = (Object.entries(sortPresets) as Array<[SortMode, SortState]>).find(
    ([, preset]) => preset.key === sort.key && preset.direction === sort.direction,
  );
  return match?.[0] ?? "custom";
}

function compareNullable(left: number | null, right: number | null, direction: SortDirection) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return direction === "asc" ? left - right : right - left;
}

function compareRows(left: CryptoMonitorRow, right: CryptoMonitorRow, sort: SortState) {
  if (sort.key === "symbol") {
    const result = left.baseAsset.localeCompare(right.baseAsset);
    return sort.direction === "asc" ? result : -result;
  }

  if (sort.key === "trend") {
    const result = left.trend.localeCompare(right.trend);
    return sort.direction === "asc" ? result : -result;
  }

  if (sort.key === "lastFlipAt") {
    return compareNullable(
      left.lastFlipAt ? new Date(left.lastFlipAt).getTime() : null,
      right.lastFlipAt ? new Date(right.lastFlipAt).getTime() : null,
      sort.direction,
    );
  }

  const leftValue = left[sort.key] as number | null;
  const rightValue = right[sort.key] as number | null;
  return compareNullable(leftValue, rightValue, sort.direction);
}

function SortableHeader({
  column,
  label,
  sort,
  onSort,
  align = "left",
}: {
  column: SortKey;
  label: string;
  sort: SortState;
  onSort: (column: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === column;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const SortIcon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35 ${align === "right" ? "justify-end" : "justify-start"} ${active ? "text-cyan-100" : "text-zinc-600"}`}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <SortIcon className={`size-3 ${active ? "text-cyan-200" : "text-zinc-700"}`} aria-hidden="true" />
      </button>
    </th>
  );
}

function formatPrice(value: number) {
  const maximumFractionDigits = value >= 1_000 ? 2 : value >= 1 ? 4 : value >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number | null, digits = 2) {
  if (value == null) {
    return "N/A";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}%`;
}

function formatTimeAgo(value: string | null, historyComplete: boolean, now: number) {
  if (!value) {
    return historyComplete ? "No recorded flip" : "Outside loaded history";
  }

  const elapsed = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCapturedAt(value: string | undefined, localTime: boolean) {
  if (!value) {
    return "Waiting for provider";
  }

  const date = new Date(value);
  if (!localTime) {
    // Keep the initial server/client render independent of ICU punctuation and timezone.
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pad = (part: number) => String(part).padStart(2, "0");
    const hours = date.getUTCHours();
    const meridiem = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${hour12}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${meridiem} UTC`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function isRecentFlip(value: string | null, interval: CryptoMonitorInterval, now: number) {
  if (!value) {
    return false;
  }

  const intervalHours: Record<CryptoMonitorInterval, number> = {
    "1m": 1 / 60,
    "3m": 3 / 60,
    "5m": 5 / 60,
    "15m": 0.25,
    "30m": 0.5,
    "1h": 1,
    "2h": 2,
    "4h": 4,
    "6h": 6,
    "12h": 12,
    "1d": 24,
    "3d": 72,
    "1w": 7 * 24,
  };
  const recentWindow = intervalHours[interval] * 6 * 60 * 60 * 1_000;
  return now - new Date(value).getTime() <= recentWindow;
}

function trendClasses(trend: CryptoTrend) {
  return trend === "bullish"
    ? "border-emerald-300/15 bg-emerald-300/8 text-emerald-100"
    : "border-rose-300/15 bg-rose-300/8 text-rose-100";
}

function getResearchUrl(row: Pick<CryptoMonitorRow, "baseAsset" | "researchUrl">) {
  return row.researchUrl || `${COINMARKETCAP_SEARCH_URL}${encodeURIComponent(row.baseAsset)}`;
}

function getMarketRowKey(symbol: string) {
  return symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function CryptoAssetIcon({
  baseAsset,
  iconUrl,
  size,
}: {
  baseAsset: string;
  iconUrl: string | null;
  size: "size-8" | "size-9";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.035]`}
      aria-hidden="true"
    >
      {iconUrl && !imageFailed ? (
        <Image
          src={iconUrl}
          alt=""
          width={36}
          height={36}
          sizes="36px"
          className="size-full object-contain"
          loading="lazy"
          unoptimized
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="font-mono text-[0.62rem] text-zinc-400">{baseAsset.slice(0, 3)}</span>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-px bg-white/[0.04]" aria-label="Loading crypto markets">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="grid grid-cols-[1.1fr_0.8fr_0.65fr_0.9fr_0.85fr] gap-4 bg-[#0a0f10] px-5 py-4">
          {Array.from({ length: 5 }, (_, cell) => (
            <span
              key={cell}
              className="h-4 animate-pulse rounded bg-white/[0.055]"
              style={{ width: `${54 + ((index + cell) % 4) * 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MarketRowMobile({ row, now }: { row: CryptoMonitorRow; now: number }) {
  const TrendIcon = row.trend === "bullish" ? ArrowUpRight : ArrowDownRight;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CryptoAssetIcon baseAsset={row.baseAsset} iconUrl={row.iconUrl} size="size-9" />
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-white">{row.baseAsset}<span className="text-zinc-600">/{row.quoteAsset}</span></p>
            <p className="mt-1 font-mono text-xs text-zinc-500">{formatCompactCurrency(row.quoteVolume)} volume</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className={`inline-flex items-center gap-1 rounded-[0.55rem] border px-2 py-1 text-[0.68rem] font-medium uppercase ${trendClasses(row.trend)}`}>
            <TrendIcon className="size-3" />
            {row.trend}
          </span>
          <ExternalLink className="mt-1 size-3.5 shrink-0 text-zinc-600" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
        <div>
          <p className="text-zinc-600">Price</p>
          <p className="mt-1 font-mono text-zinc-200">{formatPrice(row.price)}</p>
        </div>
        <div>
          <p className="text-zinc-600">Last flip</p>
          <p className="mt-1 font-mono text-zinc-200">{formatTimeAgo(row.lastFlipAt, row.historyComplete, now)}</p>
        </div>
        <div>
          <p className="text-zinc-600">Flip level</p>
          <p className="mt-1 font-mono text-zinc-200">{formatPrice(row.nextFlipLevel)}</p>
        </div>
        <div>
          <p className="text-zinc-600">Distance</p>
          <p className="mt-1 font-mono text-zinc-200">{row.distanceToFlipPercent.toFixed(2)}%</p>
        </div>
      </div>
    </>
  );

  return (
    <a
      data-market-row={getMarketRowKey(row.symbol)}
      href={getResearchUrl(row)}
      target="_blank"
      rel="noreferrer"
      className="block border-b border-white/[0.06] px-4 py-4 transition-colors hover:bg-white/[0.022] focus-visible:bg-white/[0.04] focus-visible:outline-none last:border-b-0"
      aria-label={`Open ${row.baseAsset} research page`}
    >
      {content}
    </a>
  );
}

export function CryptoMonitorWorkspace({ initialPayload, initialError }: CryptoMonitorWorkspaceProps) {
  const [payload, setPayload] = useState<CryptoMonitorPayload | null>(initialPayload ?? null);
  const [provider, setProvider] = useState<CryptoMonitorProvider>(initialPayload?.meta.provider ?? "okx");
  const [singaporeOnly, setSingaporeOnly] = useState(initialPayload?.meta.scope !== "global");
  const [interval, setInterval] = useState<CryptoMonitorInterval>("4h");
  const [query, setQuery] = useState("");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [sort, setSort] = useState<SortState>(sortPresets.volume);
  const [loading, setLoading] = useState(!initialPayload && !initialError);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const autoLoadStartedRef = useRef(Boolean(initialPayload || initialError));
  const jumpTargetSymbolRef = useRef<string | null>(null);
  const [jumpRequest, setJumpRequest] = useState(0);
  const initialNow = initialPayload?.meta.capturedAt ? Date.parse(initialPayload.meta.capturedAt) : 0;
  const localTimeReady = useSyncExternalStore(noopSubscribe, getHydrated, getNotHydrated);
  const now = useSyncExternalStore(subscribeToClock, getClientNow, () => initialNow);
  const providerOptions = useMemo(
    () => payload?.meta.availableProviders ?? defaultProviderOptions,
    [payload],
  );

  /*
   * The server snapshot is the provider capture time. Once hydrated, the clock
   * store gives relative labels the current browser time without setState in an
   * effect or a server/client render race.
   */

  const scope: CryptoMonitorScope = singaporeOnly ? "singapore_mas_dpt" : "global";

  const loadMarkets = useCallback(async (
    selectedProvider: CryptoMonitorProvider,
    selectedInterval: CryptoMonitorInterval,
    selectedScope: CryptoMonitorScope,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/finance/crypto-monitor?provider=${encodeURIComponent(selectedProvider)}&interval=${selectedInterval}&scope=${selectedScope}&limit=80`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as CryptoMonitorPayload | RouteError;

      if (!response.ok || !("data" in data)) {
        throw new Error("error" in data ? data.error?.message : "Crypto market data is unavailable.");
      }

      setPayload(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Crypto market data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScopeChange = useCallback((checked: boolean) => {
    const nextScope: CryptoMonitorScope = checked ? "singapore_mas_dpt" : "global";
    const nextProvider = checked ? "okx" : provider;
    setSingaporeOnly(checked);
    setProvider(nextProvider);
    void loadMarkets(nextProvider, interval, nextScope);
  }, [interval, loadMarkets, provider]);

  useEffect(() => {
    if (initialPayload || initialError || autoLoadStartedRef.current) {
      return;
    }

    autoLoadStartedRef.current = true;
    queueMicrotask(() => {
      void loadMarkets(provider, interval, scope);
    });
  }, [initialError, initialPayload, interval, loadMarkets, provider, scope]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();
    const filtered = (payload?.data ?? []).filter((row) => {
      if (normalizedQuery && !row.symbol.includes(normalizedQuery) && !row.baseAsset.includes(normalizedQuery)) {
        return false;
      }
      if (trendFilter === "bullish" || trendFilter === "bearish") {
        return row.trend === trendFilter;
      }
      if (trendFilter === "recent") {
        return isRecentFlip(row.lastFlipAt, interval, now);
      }
      if (trendFilter === "near") {
        return row.distanceToFlipPercent <= 1.5;
      }
      return true;
    });

    return filtered.sort((left, right) => compareRows(left, right, sort) || left.baseAsset.localeCompare(right.baseAsset));
  }, [interval, now, payload, query, sort, trendFilter]);

  const handleHeaderSort = useCallback((column: SortKey) => {
    setSort((current) => ({
      key: column,
      direction: current.key === column
        ? current.direction === "asc" ? "desc" : "asc"
        : column === "symbol" || column === "distanceToFlipPercent" || column === "price" ? "asc" : "desc",
    }));
  }, []);

  const metrics = useMemo(() => {
    const allRows = payload?.data ?? [];
    const bullish = allRows.filter((row) => row.trend === "bullish").length;
    const bearish = allRows.length - bullish;
    const nearest = [...allRows].sort((left, right) => left.distanceToFlipPercent - right.distanceToFlipPercent)[0];
    const newest = [...allRows]
      .filter((row) => row.lastFlipAt)
      .sort((left, right) => new Date(right.lastFlipAt!).getTime() - new Date(left.lastFlipAt!).getTime())[0];
    return { bullish, bearish, nearest, newest };
  }, [payload]);

  useEffect(() => {
    const jumpTargetSymbol = jumpTargetSymbolRef.current;
    if (!jumpTargetSymbol) {
      return;
    }

    const targetKey = getMarketRowKey(jumpTargetSymbol);
    const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-market-row="${targetKey}"]`))
      .find((element) => element.getClientRects().length > 0);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    target.focus({ preventScroll: true });
    jumpTargetSymbolRef.current = null;
  }, [jumpRequest, rows]);

  const handleNearestFlipClick = useCallback(() => {
    if (!metrics.nearest) {
      return;
    }

    if (!rows.some((row) => row.symbol === metrics.nearest?.symbol)) {
      setQuery("");
      setTrendFilter("all");
    }
    jumpTargetSymbolRef.current = metrics.nearest.symbol;
    setJumpRequest((request) => request + 1);
  }, [metrics.nearest, rows]);

  return (
    <div className="space-y-5">
      <section className="section-shell overflow-hidden rounded-[1.25rem] p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/80">
              <Bitcoin className="size-4" />
              Crypto research monitor
            </div>
            <h1 className="type-display mt-5 text-3xl text-white sm:text-5xl">VargaTrend market map</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              Compare confirmed VargaTrend states across the most liquid {payload?.meta.providerLabel ?? provider} dollar-quoted spot markets. Hover a market for the multi-timeframe long and short research record. Signals are descriptive indicators, not trade instructions.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-zinc-500 lg:items-end">
            <span className="inline-flex items-center gap-2 font-mono text-zinc-300">
              <Database className="size-3.5 text-cyan-200/70" />
              Free public {payload?.meta.providerLabel ?? provider} data
            </span>
            <span>{payload?.meta.universe ?? "Loading market universe"}</span>
            <span className="inline-flex items-center gap-1.5 text-cyan-100/75">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {payload?.meta.scopeLabel ?? "Singapore / MAS-authorised DPT providers"} {singaporeOnly ? "· default" : "· global view"}
            </span>
            <span>Last refresh: {formatCapturedAt(payload?.meta.capturedAt, localTimeReady)}</span>
            {payload && payload.meta.failedMarkets > 0 ? (
              <span className="text-amber-200/80">
                {payload.meta.failedMarkets} selected market{payload.meta.failedMarkets === 1 ? "" : "s"} unavailable from this provider
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-[#090e0f]/95 lg:grid-cols-4">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-zinc-500">Markets scanned</p>
          <p className="mt-2 font-mono text-2xl text-white">{payload?.meta.returnedMarkets ?? "--"}</p>
          <p className="mt-1 text-xs text-zinc-600">Top dollar-quoted markets</p>
        </div>
        <div className="border-l border-white/[0.06] p-4 sm:p-5">
          <p className="text-xs text-zinc-500">Bullish</p>
          <p className="mt-2 font-mono text-2xl text-emerald-100">{payload ? metrics.bullish : "--"}</p>
          <p className="mt-1 text-xs text-zinc-600">Confirmed candle</p>
        </div>
        <div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <p className="text-xs text-zinc-500">Bearish</p>
          <p className="mt-2 font-mono text-2xl text-rose-100">{payload ? metrics.bearish : "--"}</p>
          <p className="mt-1 text-xs text-zinc-600">Confirmed candle</p>
        </div>
        <button
          type="button"
          className="group border-l border-t border-white/[0.06] p-4 text-left transition-colors hover:bg-cyan-200/[0.035] focus-visible:bg-cyan-200/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200/35 disabled:cursor-default disabled:hover:bg-transparent sm:p-5 lg:border-t-0"
          onClick={handleNearestFlipClick}
          disabled={!metrics.nearest}
          aria-label={metrics.nearest ? `Jump to ${metrics.nearest.baseAsset} nearest flip level` : "Nearest flip level unavailable"}
        >
          <p className="text-xs text-zinc-500">Nearest flip level</p>
          <p className="mt-2 truncate text-2xl text-cyan-100 group-hover:text-cyan-50">{metrics.nearest?.assetName ?? "--"}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {metrics.nearest ? `${metrics.nearest.distanceToFlipPercent.toFixed(2)}% away` : "Waiting for data"}
          </p>
        </button>
      </section>

      <section className="overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-[#080d0e]/96 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="grid gap-3 border-b border-white/[0.06] p-4 lg:grid-cols-2 2xl:grid-cols-[minmax(15rem,1.1fr)_minmax(10rem,0.8fr)_minmax(14.25rem,1fr)_minmax(32rem,1.55fr)] 2xl:items-center">
          <label className="relative block">
            <span className="sr-only">Search crypto markets</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search BTC, ETH, SOL..."
              className="h-9 w-full rounded-[0.65rem] border border-white/8 bg-white/[0.025] pl-9 pr-3 font-mono text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10"
            />
          </label>

          <label className="flex min-w-0 items-center gap-2">
            <span className="sr-only">Filter by trend</span>
            <SlidersHorizontal className="size-4 shrink-0 text-zinc-600" />
            <span className="relative block min-w-[10.5rem]">
              <select
                value={trendFilter}
                onChange={(event) => setTrendFilter(event.target.value as TrendFilter)}
                className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none transition-colors focus:border-cyan-200/40 focus:ring-2 focus:ring-cyan-200/10"
              >
                <option value="all">All states</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
                <option value="recent">Recently flipped</option>
                <option value="near">Within 1.5% of flip</option>
              </select>
              <SelectChevron />
            </span>
          </label>

          <label className="relative block min-w-[14.25rem]">
            <span className="sr-only">Sort crypto markets</span>
            <select
              value={presetForSort(sort)}
              onChange={(event) => {
                const mode = event.target.value as SortMode;
                setSort(sortPresets[mode]);
              }}
              className="h-10 w-full appearance-none rounded-[0.7rem] border border-cyan-200/20 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-200/50 focus:ring-2 focus:ring-cyan-200/10"
            >
              {presetForSort(sort) === "custom" ? (
                <option value="custom" disabled>
                  Sort: {sortLabels[sort.key]} {sort.direction === "asc" ? "ascending" : "descending"}
                </option>
              ) : null}
              <option value="volume">Sort: Volume descending</option>
              <option value="recent">Sort: Latest flip</option>
              <option value="distance">Sort: Nearest flip</option>
              <option value="symbol">Sort: Symbol ascending</option>
              <option value="price">Sort: Price ascending</option>
            </select>
            <SelectChevron />
          </label>

          <div className="flex min-w-0 flex-wrap items-center gap-2 2xl:grid 2xl:grid-cols-[minmax(10.25rem,1fr)_minmax(8.75rem,0.9fr)_minmax(8.75rem,0.9fr)_2.5rem]">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-[0.7rem] border border-cyan-200/15 bg-cyan-200/[0.035] px-3 text-xs text-cyan-50/85" title="Limit the monitor to Singapore-based or MAS-authorised public crypto providers">
              <input
                type="checkbox"
                checked={singaporeOnly}
                onChange={(event) => handleScopeChange(event.target.checked)}
                className="size-4 shrink-0 cursor-pointer accent-cyan-200 [color-scheme:dark]"
              />
              <span className="truncate">Singapore / MAS only</span>
            </label>
            <label className="min-w-0 flex-1 2xl:min-w-0">
              <span className="sr-only">Crypto data provider</span>
              <span className="relative block">
                <select
                  value={provider}
                  onChange={(event) => {
                    const nextProvider = event.target.value as CryptoMonitorProvider;
                    setProvider(nextProvider);
                    void loadMarkets(nextProvider, interval, scope);
                  }}
                  className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none transition-colors focus:border-cyan-200/40 focus:ring-2 focus:ring-cyan-200/10"
                >
                  {providerOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <SelectChevron />
              </span>
            </label>
            <label className="min-w-[8.75rem] flex-1 2xl:min-w-0">
              <span className="sr-only">VargaTrend timeframe</span>
              <span className="relative block">
                <select
                  value={interval}
                  onChange={(event) => {
                    const nextInterval = event.target.value as CryptoMonitorInterval;
                    setInterval(nextInterval);
                    void loadMarkets(provider, nextInterval, scope);
                  }}
                  className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-9 text-sm text-zinc-200 outline-none transition-colors focus:border-cyan-200/40 focus:ring-2 focus:ring-cyan-200/10"
                >
                  {intervalOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <SelectChevron />
              </span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-cyan-200/20 bg-cyan-200/[0.04] text-cyan-100 hover:border-cyan-200/30 hover:bg-cyan-200/15 hover:text-white"
              disabled={loading}
              onClick={() => void loadMarkets(provider, interval, scope)}
              aria-label="Refresh crypto markets"
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-200" />
            <div>
              <h2 className="text-sm font-medium text-white">Market scan unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p>
              <Button className="mt-4" size="sm" variant="outline" onClick={() => void loadMarkets(provider, interval, scope)}>
                Try again
              </Button>
            </div>
          </div>
        ) : loading && !payload ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="mx-auto size-5 text-cyan-200" />
            <h2 className="mt-4 text-lg text-white">No markets match this view</h2>
            <p className="mt-2 text-sm text-zinc-500">Clear the search or choose another trend filter.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[940px] border-collapse text-left">
                <thead className="bg-white/[0.018] text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600">
                  <tr>
                    <SortableHeader column="symbol" label="Market" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="price" label="Price" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="dailyChangePercent" label="24h" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="trend" label="State" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="lastFlipAt" label="Last flip" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="nextFlipLevel" label="Flip level" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="distanceToFlipPercent" label="Distance" sort={sort} onSort={handleHeaderSort} />
                    <SortableHeader column="sinceFlipPercent" label="Since flip" sort={sort} onSort={handleHeaderSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const TrendIcon = row.trend === "bullish" ? ArrowUpRight : ArrowDownRight;
                    const researchUrl = getResearchUrl(row);
                    return (
                      <TradingViewHoverChart
                        key={row.symbol}
                        as="tr"
                        row={row}
                        provider={provider}
                        interval={interval}
                        scope={scope}
                        className="group cursor-pointer border-t border-white/[0.05] transition-colors hover:bg-white/[0.022] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                        dataMarketRow={getMarketRowKey(row.symbol)}
                        role="link"
                        tabIndex={0}
                        ariaLabel={`Open ${row.baseAsset} research page`}
                        onClick={() => window.open(researchUrl, "_blank", "noopener,noreferrer")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            window.open(researchUrl, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <CryptoAssetIcon baseAsset={row.baseAsset} iconUrl={row.iconUrl} size="size-8" />
                            <div className="min-w-0">
                              <p className="font-mono text-sm text-white">{row.baseAsset}<span className="text-zinc-600">/{row.quoteAsset}</span></p>
                              <p className="mt-1 font-mono text-[0.67rem] text-zinc-600">{formatCompactCurrency(row.quoteVolume)} vol</p>
                            </div>
                            <ExternalLink className="size-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-cyan-200" aria-hidden="true" />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-zinc-200">{formatPrice(row.price)}</td>
                        <td className={`px-4 py-3.5 font-mono text-xs ${row.dailyChangePercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>
                          {formatPercent(row.dailyChangePercent)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-[0.55rem] border px-2 py-1 text-[0.66rem] font-medium uppercase ${trendClasses(row.trend)}`}>
                            <TrendIcon className="size-3" />
                            {row.trend}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs text-zinc-200">{formatTimeAgo(row.lastFlipAt, row.historyComplete, now)}</p>
                          <p className="mt-1 text-[0.65rem] text-zinc-600">Confirmed close</p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-zinc-200">{formatPrice(row.nextFlipLevel)}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-cyan-100">{row.distanceToFlipPercent.toFixed(2)}%</td>
                        <td className={`px-5 py-3.5 text-right font-mono text-xs ${row.sinceFlipPercent == null ? "text-zinc-600" : row.sinceFlipPercent >= 0 ? "text-emerald-100" : "text-rose-100"}`}>
                          {formatPercent(row.sinceFlipPercent)}
                        </td>
                      </TradingViewHoverChart>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden">
              {rows.map((row) => <MarketRowMobile key={row.symbol} row={row} now={now} />)}
            </div>
          </>
        )}

        <footer className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-3 text-[0.68rem] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>{rows.length} visible markets. VargaTrend ATR {payload?.meta.atrPeriod ?? 10} × {payload?.meta.atrMultiplier ?? 3}.</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3" />Values use closed candles. Not financial advice.</span>
        </footer>
      </section>
    </div>
  );
}
