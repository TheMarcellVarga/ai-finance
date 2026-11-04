"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { AdaptiveSupertrendChart } from "@/components/adaptive-supertrend-chart";
import type { CryptoChartPayload } from "@/lib/crypto-chart";
import type { CryptoMonitorInterval, CryptoMonitorProvider, CryptoMonitorRow, CryptoMonitorScope } from "@/lib/crypto-monitor";
import { getTradingViewChartUrl } from "@/lib/tradingview-url";
import {
  calculateAdaptiveSupertrendAuto,
  calculateAdaptiveSupertrend,
  calculateAdaptiveSupertrendBacktest,
  selectAdaptiveSupertrendCase,
  type AdaptiveSupertrendBacktest,
  type AdaptiveSupertrendCase,
  type AdaptiveSupertrendResult,
} from "@/lib/adaptive-supertrend";

const HOVER_DELAY_MS = 1_000;
const CLOSE_GRACE_MS = 180;
const POPOVER_WIDTH = 780;
const POPOVER_HEIGHT = 430;
const VIEWPORT_GUTTER = 12;

type TradingViewHoverChartProps = {
  row: Pick<CryptoMonitorRow, "symbol" | "baseAsset" | "quoteAsset">;
  provider: CryptoMonitorProvider;
  interval: CryptoMonitorInterval;
  scope: CryptoMonitorScope;
  children: ReactNode;
  as?: "div" | "tr";
  className?: string;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
  dataMarketRow?: string;
  dataUniversalMarket?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

function getTradingViewPair(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getTradingViewSymbol(provider: CryptoMonitorProvider, symbol: string) {
  const pair = getTradingViewPair(symbol);
  const exchange = provider === "okx" ? "OKX" : provider === "binance" ? "BINANCE" : provider.toUpperCase();
  return `${exchange}:${pair}`;
}

function getPopoverPosition(anchor: DOMRect): PopoverPosition {
  const width = Math.min(POPOVER_WIDTH, Math.max(280, window.innerWidth - VIEWPORT_GUTTER * 2));
  const left = Math.min(
    Math.max(VIEWPORT_GUTTER, anchor.left),
    Math.max(VIEWPORT_GUTTER, window.innerWidth - width - VIEWPORT_GUTTER),
  );
  const belowTop = anchor.bottom + VIEWPORT_GUTTER;
  const aboveTop = anchor.top - POPOVER_HEIGHT - VIEWPORT_GUTTER;
  const top = belowTop + POPOVER_HEIGHT <= window.innerHeight - VIEWPORT_GUTTER
    ? belowTop
    : Math.max(VIEWPORT_GUTTER, aboveTop);

  return { top, left, width };
}

function formatPrice(value: number | null) {
  if (value == null) return "—";
  const digits = value >= 1_000 ? 2 : value >= 1 ? 4 : value >= 0.01 ? 6 : 8;
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function formatPercent(value: number | null) {
  return value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCase(selected: AdaptiveSupertrendCase | null, side: "long" | "short") {
  if (!selected) return "Not enough completed trades";
  const active = side === "long" ? selected.direction === 1 : selected.direction === -1;
  const direction = selected.direction === 1 ? "BULL" : "BEAR";
  const winRate = selected.stats.winRate == null ? "—" : `${selected.stats.winRate.toFixed(1)}%`;
  const averageWin = side === "long"
    ? selected.stats.geometricAverageWinPercent ?? selected.stats.averageWinPercent
    : selected.stats.averageWinPercent;
  const averageTrade = side === "long"
    ? selected.stats.geometricAverageTradePercent ?? selected.stats.averageTradePercent
    : selected.stats.averageTradePercent ?? selected.stats.averageWinPercent;
  const averageWinText = averageWin == null ? "—" : `+${averageWin.toFixed(1)}%`;
  const averageTradeText = averageTrade == null ? "—" : `${averageTrade >= 0 ? "+" : ""}${averageTrade.toFixed(1)}%`;
  const tradeLabel = side === "long" ? "Geo avg trade" : "Avg trade";
  const winLabel = side === "long" ? "Geo avg win" : "Avg win";
  return `${selected.timeframe.toUpperCase()} ${direction} ${active ? "ACTIVE" : "WAIT"} · ${tradeLabel} ${averageTradeText} · WR ${winRate} · ${winLabel} ${averageWinText} (${selected.stats.trades})`;
}

function ResearchRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "bull" | "bear" | "neutral" }) {
  return (
    <div className="grid min-h-7 grid-cols-[6.2rem_minmax(0,1fr)] items-center border-b border-white/[0.06] last:border-b-0">
      <span className="px-2.5 text-[0.6rem] text-zinc-500">{label}</span>
      <span className={`border-l border-white/[0.06] px-2.5 text-right font-mono text-[0.58rem] ${tone === "bull" ? "text-emerald-300" : tone === "bear" ? "text-rose-300" : "text-zinc-300"}`}>
        {value}
      </span>
    </div>
  );
}

function TradingViewChartPopover({
  row,
  provider,
  interval,
  scope,
  position,
  onPointerEnter,
  onPointerLeave,
}: {
  row: Pick<CryptoMonitorRow, "symbol" | "baseAsset" | "quoteAsset">;
  provider: CryptoMonitorProvider;
  interval: CryptoMonitorInterval;
  scope: CryptoMonitorScope;
  position: PopoverPosition;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const tradingViewSymbol = useMemo(() => getTradingViewSymbol(provider, row.symbol), [provider, row.symbol]);
  const tradingViewChartUrl = useMemo(() => getTradingViewChartUrl(tradingViewSymbol), [tradingViewSymbol]);
  const [chartPayload, setChartPayload] = useState<CryptoChartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      provider,
      symbol: row.symbol,
      interval,
      scope,
    });

    fetch(`/api/finance/crypto-chart?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as CryptoChartPayload & { error?: { message?: string } };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Chart data is temporarily unavailable.");
        }
        setChartPayload(payload);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Chart data is temporarily unavailable.");
      });

    return () => controller.abort();
  }, [interval, provider, row.symbol, scope]);

  const chartHistory = useMemo(() => {
    if (!chartPayload) {
      return [];
    }
    return chartPayload.data.analysisCandles[interval as keyof typeof chartPayload.data.analysisCandles] ?? chartPayload.data.candles;
  }, [chartPayload, interval]);

  const trendAnalysis = useMemo(() => {
    if (chartHistory.length === 0) {
      return null;
    }
    try {
      return calculateAdaptiveSupertrendAuto(chartHistory);
    } catch {
      return null;
    }
  }, [chartHistory]);
  const trendResult = trendAnalysis?.result ?? null;
  const dailyResult = useMemo<AdaptiveSupertrendResult | null>(() => {
    if (!chartPayload || chartPayload.data.dailyCandles.length < 12) {
      return null;
    }
    try {
      return calculateAdaptiveSupertrend(chartPayload.data.dailyCandles);
    } catch {
      return null;
    }
  }, [chartPayload]);
  const weeklyResult = useMemo<AdaptiveSupertrendResult | null>(() => {
    if (!chartPayload || chartPayload.data.weeklyCandles.length < 12) {
      return null;
    }
    try {
      return calculateAdaptiveSupertrend(chartPayload.data.weeklyCandles);
    } catch {
      return null;
    }
  }, [chartPayload]);
  const backtests = useMemo<Partial<Record<"1h" | "4h" | "1d" | "1w" | "1M", AdaptiveSupertrendBacktest>>>(() => {
    if (!chartPayload) return {};
    const calculated: Partial<Record<"1h" | "4h" | "1d" | "1w" | "1M", AdaptiveSupertrendBacktest>> = {};
    for (const [timeframe, candles] of Object.entries(chartPayload.data.analysisCandles)) {
      if (candles.length < 12) continue;
      try {
        calculated[timeframe as keyof typeof calculated] = calculateAdaptiveSupertrendBacktest(candles);
      } catch {
        // An individual timeframe can be unavailable for newly listed assets.
      }
    }
    return calculated;
  }, [chartPayload]);
  const bestLong = useMemo(() => selectAdaptiveSupertrendCase(backtests, "long"), [backtests]);
  const bestShort = useMemo(() => selectAdaptiveSupertrendCase(backtests, "short"), [backtests]);
  const weeklyLong = backtests["1w"];
  const weeklyHistoryStart = chartPayload?.data.analysisCandles["1w"][0]?.openTime ?? null;
  const stance = trendResult && dailyResult && weeklyResult
    ? trendResult.trend === 1 && dailyResult.trend === 1 && weeklyResult.trend === 1
      ? "ALIGNED BULL"
      : trendResult.trend === -1 && dailyResult.trend === -1 && weeklyResult.trend === -1
        ? "ALIGNED BEAR"
        : "MIXED"
    : "MIXED";

  return createPortal(
    <aside
      className="fixed z-[90] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-[1rem] border border-cyan-100/15 bg-[#081011]/[.98] shadow-[0_24px_80px_rgba(0,0,0,.55)] ring-1 ring-black/40"
      style={{ top: position.top, left: position.left, width: position.width }}
      role="dialog"
      aria-label={`${row.baseAsset} chart preview`}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      onFocus={onPointerEnter}
      onBlur={onPointerLeave}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-white">{row.baseAsset}<span className="text-zinc-600">/{row.quoteAsset}</span></p>
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-zinc-500">Adaptive Supertrend research inspector · {interval}</p>
        </div>
        <a
          href={tradingViewChartUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.55rem] border border-white/10 px-2.5 py-1.5 text-[0.68rem] text-zinc-400 transition-colors hover:border-cyan-200/25 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
        >
          Full chart
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>

      {!chartPayload && !error ? (
        <div className="relative h-[20rem] w-full overflow-hidden bg-[#0a1011]" aria-label="Loading Adaptive Supertrend chart" aria-busy="true">
          <div className="absolute inset-x-6 bottom-8 flex h-32 items-end gap-1 opacity-70" aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => (
              <span key={index} className="flex-1 animate-pulse rounded-t-sm bg-cyan-200/10" style={{ height: `${20 + ((index * 17) % 68)}%` }} />
            ))}
          </div>
          <div className="absolute inset-x-5 top-5 h-px animate-pulse bg-white/10" aria-hidden="true" />
        </div>
      ) : error ? (
        <div className="grid h-[20rem] place-items-center bg-[#0a1011] px-8 text-center">
          <div>
            <AlertTriangle className="mx-auto size-5 text-amber-200/75" aria-hidden="true" />
            <p className="mt-3 text-xs text-zinc-300">Adaptive Supertrend data unavailable</p>
            <p className="mt-1 text-[0.68rem] text-zinc-600">{error}</p>
          </div>
        </div>
      ) : chartPayload && trendResult ? (
        <div className="grid md:grid-cols-[minmax(0,1fr)_19rem]">
          <AdaptiveSupertrendChart
            baseAsset={row.baseAsset}
            candles={chartHistory}
            result={trendResult}
            rateDecisions={chartPayload.data.rateDecisions}
          />
          <div className="border-t border-white/[0.07] bg-white/[0.018] md:border-l md:border-t-0">
            <ResearchRow label="Trend" value={trendResult.trend === 1 ? "BULLISH" : "BEARISH"} tone={trendResult.trend === 1 ? "bull" : "bear"} />
            <ResearchRow
              label="Mode"
              value={trendAnalysis?.auto.selectionReady
                ? `AUTO · ATR ${trendAnalysis.atrPeriod} × ${trendAnalysis.atrMultiplier} · ${trendAnalysis.auto.completedBullishSections} sections · ${trendAnalysis.auto.minimumTrades}+ / ${trendAnalysis.auto.minimumWinRate}% WR`
                : `AUTO WARM-UP · fallback ATR ${trendAnalysis?.atrPeriod ?? 10} × ${trendAnalysis?.atrMultiplier ?? 3} · needs ${chartPayload?.meta.analysis.autoMinimumTrades ?? 5}+ / ${chartPayload?.meta.analysis.autoMinimumWinRate ?? 40}% WR`}
            />
            <ResearchRow label="Confirm" value="CLOSED CANDLE" />
            <ResearchRow label="Next flip" value={formatPrice(trendResult.nextFlipLevel)} />
            <ResearchRow label="Last flip" value={formatPrice(trendResult.lastFlipLevel)} />
            <ResearchRow label="Flip date" value={trendResult.lastFlipTime == null ? "—" : new Date(trendResult.lastFlipTime).toISOString().slice(0, 10)} />
            <ResearchRow label="Since flip" value={formatPercent(trendResult.sinceFlipPercent)} tone={(trendResult.sinceFlipPercent ?? 0) >= 0 ? "bull" : "bear"} />
            <ResearchRow label="Weekly" value={weeklyResult ? `${weeklyResult.trend === 1 ? "BULLISH" : "BEARISH"} · CUSTOM ATR` : "—"} tone={weeklyResult?.trend === 1 ? "bull" : weeklyResult ? "bear" : "neutral"} />
            <ResearchRow label="Daily" value={dailyResult ? `${dailyResult.trend === 1 ? "BULLISH" : "BEARISH"} · CUSTOM ATR` : "—"} tone={dailyResult?.trend === 1 ? "bull" : dailyResult ? "bear" : "neutral"} />
            <ResearchRow label="Stance" value={stance} tone={stance === "ALIGNED BULL" ? "bull" : stance === "ALIGNED BEAR" ? "bear" : "neutral"} />
            <ResearchRow
              label="Weekly bull"
              value={weeklyLong ? `${weeklyLong.result.trend === 1 ? "ACTIVE" : "WAIT"} · WR ${weeklyLong.long.winRate == null ? "—" : `${weeklyLong.long.winRate.toFixed(1)}%`} · Geo avg trade ${weeklyLong.long.geometricAverageTradePercent == null ? "—" : `${weeklyLong.long.geometricAverageTradePercent >= 0 ? "+" : ""}${weeklyLong.long.geometricAverageTradePercent.toFixed(1)}%`} · Geo avg win ${weeklyLong.long.geometricAverageWinPercent == null ? "—" : `+${weeklyLong.long.geometricAverageWinPercent.toFixed(1)}%`} (${weeklyLong.long.trades})` : "Not enough history"}
              tone={weeklyLong?.result.trend === 1 ? "bull" : "neutral"}
            />
            <ResearchRow label="Best long TF" value={formatCase(bestLong, "long")} tone={bestLong?.direction === 1 ? "bull" : "neutral"} />
            <ResearchRow label="Best short TF" value={formatCase(bestShort, "short")} tone={bestShort?.direction === -1 ? "bear" : "neutral"} />
            <ResearchRow
              label="Lifetime best bull"
              value={trendAnalysis?.auto.selectionReady
                ? `ATR ${trendAnalysis.atrPeriod} × ${trendAnalysis.atrMultiplier} · Geo avg ${trendAnalysis.auto.geometricAverageTradePercent == null ? "—" : `${trendAnalysis.auto.geometricAverageTradePercent >= 0 ? "+" : ""}${trendAnalysis.auto.geometricAverageTradePercent.toFixed(1)}%`} · WR ${trendAnalysis.auto.winRatePercent == null ? "—" : `${trendAnalysis.auto.winRatePercent.toFixed(1)}%`} · ${trendAnalysis.auto.winningBullishSections}/${trendAnalysis.auto.completedBullishSections}`
                : "No positive setup meets the warm-up thresholds"}
            />
            <ResearchRow
              label="Current opt dir"
              value={trendAnalysis?.auto.selectionReady ? trendResult.trend === 1 ? "BULLISH" : "BEARISH" : "—"}
              tone={trendResult?.trend === 1 ? "bull" : trendResult ? "bear" : "neutral"}
            />
            <ResearchRow
              label="Bull history"
              value={trendAnalysis?.auto.geometricAverageTradePercent == null
                ? "—"
                : `Geo avg ${trendAnalysis.auto.geometricAverageTradePercent >= 0 ? "+" : ""}${trendAnalysis.auto.geometricAverageTradePercent.toFixed(1)}% · Arithmetic avg ${trendAnalysis.auto.arithmeticAverageTradePercent == null ? "—" : `${trendAnalysis.auto.arithmeticAverageTradePercent >= 0 ? "+" : ""}${trendAnalysis.auto.arithmeticAverageTradePercent.toFixed(1)}%`} · Geo winner ${trendAnalysis.auto.geometricAverageWinPercent == null ? "—" : `+${trendAnalysis.auto.geometricAverageWinPercent.toFixed(1)}%`}`}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-2 text-[0.62rem] text-zinc-600">
        <span>
          Auto ATR {chartPayload?.meta.analysis.atrPeriodMin ?? 10}–{chartPayload?.meta.analysis.atrPeriodMax ?? 20} × {chartPayload?.meta.analysis.atrMultiplier ?? 3} · provider-bounded history · in-sample research · 1H / 4H / 1D / 1W / 1M · weekly history from {weeklyHistoryStart == null ? "—" : new Date(weeklyHistoryStart).toISOString().slice(0, 10)} · next-candle-open simulation · excludes fees, slippage and funding · not financial advice
        </span>
        <a className="shrink-0 text-zinc-500 transition-colors hover:text-cyan-100" href={tradingViewChartUrl} target="_blank" rel="noreferrer">
          Open TradingView
        </a>
      </div>
    </aside>,
    document.body,
  );
}

export function TradingViewHoverChart({
  row,
  provider,
  interval,
  scope,
  children,
  as = "div",
  className,
  role,
  tabIndex,
  ariaLabel,
  dataMarketRow,
  dataUniversalMarket,
  onClick,
  onKeyDown,
}: TradingViewHoverChartProps) {
  const targetRef = useRef<HTMLElement | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = targetRef.current?.getBoundingClientRect();
    if (anchor) {
      setPosition(getPopoverPosition(anchor));
    }
  }, []);

  const openPreview = useCallback(() => {
    clearHoverTimer();
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, clearHoverTimer, updatePosition]);

  const beginHover = useCallback(() => {
    clearCloseTimer();
    if (open || hoverTimerRef.current) {
      return;
    }

    hoverTimerRef.current = setTimeout(openPreview, HOVER_DELAY_MS);
  }, [clearCloseTimer, open, openPreview]);

  const closePreview = useCallback(() => {
    clearHoverTimer();
    clearCloseTimer();
    setOpen(false);
    setPosition(null);
  }, [clearCloseTimer, clearHoverTimer]);

  const scheduleClose = useCallback(() => {
    clearHoverTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(closePreview, CLOSE_GRACE_MS);
  }, [clearCloseTimer, clearHoverTimer, closePreview]);

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => () => {
    clearHoverTimer();
    clearCloseTimer();
  }, [clearCloseTimer, clearHoverTimer]);

  const popover = open && position ? (
    <TradingViewChartPopover
      key={`${scope}:${provider}:${row.symbol}:${interval}`}
      row={row}
      provider={provider}
      interval={interval}
      scope={scope}
      position={position}
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
    />
  ) : null;

  const triggerProps = {
    ref: (node: HTMLElement | null) => {
      targetRef.current = node;
    },
    className,
    role,
    tabIndex,
    "aria-label": ariaLabel,
    "data-market-row": dataMarketRow,
    "data-universal-market": dataUniversalMarket,
    onClick,
    onKeyDown,
    onMouseEnter: beginHover,
    onMouseLeave: scheduleClose,
    onFocus: beginHover,
    onBlur: scheduleClose,
    title: "Keep the pointer here for 1 second to preview the chart",
  };

  return (
    <>
      {as === "tr" ? <tr {...triggerProps}>{children}</tr> : <div {...triggerProps}>{children}</div>}
      {popover}
    </>
  );
}
