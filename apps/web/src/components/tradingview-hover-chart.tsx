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

import { VargaTrendChart } from "@/components/varga-trend-chart";
import type { CryptoChartPayload } from "@/lib/crypto-chart";
import type { CryptoMonitorInterval, CryptoMonitorProvider, CryptoMonitorRow, CryptoMonitorScope } from "@/lib/crypto-monitor";
import { getTradingViewChartUrl } from "@/lib/tradingview-url";
import { calculateVargaTrend, type VargaTrendResult } from "@/lib/varga-trend";

const HOVER_DELAY_MS = 1_000;
const CLOSE_GRACE_MS = 180;
const POPOVER_WIDTH = 432;
const POPOVER_HEIGHT = 330;
const VIEWPORT_GUTTER = 12;

type TradingViewHoverChartProps = {
  row: CryptoMonitorRow;
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

function TradingViewChartPopover({
  row,
  provider,
  interval,
  scope,
  position,
  onPointerEnter,
  onPointerLeave,
}: {
  row: CryptoMonitorRow;
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

  const trendResult = useMemo<VargaTrendResult | null>(() => {
    if (!chartPayload) {
      return null;
    }
    try {
      return calculateVargaTrend(chartPayload.data.candles);
    } catch {
      return null;
    }
  }, [chartPayload]);
  const dailyResult = useMemo<VargaTrendResult | null>(() => {
    if (!chartPayload || chartPayload.data.dailyCandles.length < 12) {
      return null;
    }
    try {
      return calculateVargaTrend(chartPayload.data.dailyCandles);
    } catch {
      return null;
    }
  }, [chartPayload]);
  const weeklyResult = useMemo<VargaTrendResult | null>(() => {
    if (!chartPayload || chartPayload.data.weeklyCandles.length < 12) {
      return null;
    }
    try {
      return calculateVargaTrend(chartPayload.data.weeklyCandles);
    } catch {
      return null;
    }
  }, [chartPayload]);
  const stance = trendResult && dailyResult && weeklyResult
    ? trendResult.trend === 1 && dailyResult.trend === 1 && weeklyResult.trend === 1
      ? "ALIGNED BULL"
      : trendResult.trend === -1 && dailyResult.trend === -1 && weeklyResult.trend === -1
        ? "ALIGNED BEAR"
        : "MIXED"
    : "MIXED";

  return createPortal(
    <aside
      className="fixed z-[90] overflow-hidden rounded-[1rem] border border-cyan-100/15 bg-[#081011]/[.98] shadow-[0_24px_80px_rgba(0,0,0,.55)] ring-1 ring-black/40"
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
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-zinc-500">VargaTrend · {interval}</p>
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
        <div className="relative h-[20rem] w-full overflow-hidden bg-[#0a1011]" aria-label="Loading VargaTrend chart" aria-busy="true">
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
            <p className="mt-3 text-xs text-zinc-300">VargaTrend data unavailable</p>
            <p className="mt-1 text-[0.68rem] text-zinc-600">{error}</p>
          </div>
        </div>
      ) : chartPayload && trendResult ? (
        <VargaTrendChart
          baseAsset={row.baseAsset}
          candles={chartPayload.data.candles}
          result={trendResult}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-2 text-[0.62rem] text-zinc-600">
        <span>{stance} · closed candles</span>
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
