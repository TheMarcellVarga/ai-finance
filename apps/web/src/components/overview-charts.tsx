"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Radar } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  movementScale,
  movementWidth,
  normalizeAllocationData,
  totalWeightBps,
  type AllocationChartInput,
  type MovementChartInput,
} from "@/components/overview-chart-utils";

type WatchlistChartItem = MovementChartInput & {
  id: string;
  name: string;
  displayPrice?: string;
};

type OverviewChartsProps = {
  allocation: AllocationChartInput[];
  watchlist: WatchlistChartItem[];
  portfolioProvider?: string;
  portfolioCapturedAt?: string;
  movementProvider?: string;
  movementCapturedAt?: string;
  portfolioEmpty?: boolean;
  watchlistEmpty?: boolean;
  movementSource?: "watchlist" | "market";
};

const allocationColors = ["#a5f3fc", "#67e8f9", "#5eead4", "#fcd34d", "#94a3b8", "#c4b5fd"];
const movementGridClassName = [
  "grid grid-cols-[minmax(5.5rem,1fr)_minmax(5rem,1.15fr)_4.75rem]",
  "items-center gap-3 sm:grid-cols-[minmax(7rem,1fr)_minmax(7rem,1.35fr)_5.5rem] sm:gap-4",
].join(" ");

function percentFromBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

function formatMove(value?: number) {
  if (value == null) {
    return "N/A";
  }
  const move = value / 100;
  return `${move > 0 ? "+" : ""}${move.toFixed(1)}%`;
}

function formatSnapshot(value?: string) {
  if (!value) {
    return "Provider timestamp pending";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function OverviewCharts({ allocation, watchlist, portfolioProvider = "market data provider", portfolioCapturedAt, movementProvider = "market data provider", movementCapturedAt, portfolioEmpty = false, watchlistEmpty = false, movementSource = "watchlist" }: OverviewChartsProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false });
  const updateScrollEdges = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    setScrollEdges({ top: table.scrollTop > 1, bottom: table.scrollTop + table.clientHeight < table.scrollHeight - 1 });
  }, []);
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    updateScrollEdges();
    const observer = new ResizeObserver(updateScrollEdges);
    observer.observe(table);
    for (const child of table.children) observer.observe(child);
    return () => observer.disconnect();
  }, [updateScrollEdges, watchlist]);
  const [activeAllocationIndex, setActiveAllocationIndex] = useState<number | null>(null);
  const allocationData = useMemo(() => normalizeAllocationData(allocation), [allocation]);
  const allocationTotal = totalWeightBps(allocationData);
  const movementItems = useMemo(
    () => [...watchlist].sort((left, right) => Math.abs(right.dailyChangeBps ?? 0) - Math.abs(left.dailyChangeBps ?? 0)).slice(0, 5),
    [watchlist],
  );
  const movementMax = movementScale(movementItems);
  const circumference = 2 * Math.PI * 45;

  const allocationSegments = allocationData.map((item, index) => {
    const share = allocationTotal > 0 ? item.weightBps / allocationTotal : 0;
    const dash = share * circumference;
    const offset = allocationData.slice(0, index).reduce((total, previous) => {
      return total + (allocationTotal > 0 ? previous.weightBps / allocationTotal : 0) * circumference;
    }, 0);
    return { ...item, index, dash, offset, share };
  });

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-white">
              <BarChart3 className="size-4 text-cyan-200" />
              Portfolio composition
            </div>
            <h2 className="type-card-title mt-3 text-2xl text-white">Where the weight sits</h2>
          </div>
          <Link className="overview-link" href="/app/portfolio">
            Details
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {allocationSegments.length ? (
          <div className="mt-6 grid gap-6 md:grid-cols-[12rem_1fr] md:items-center">
            <div className="relative mx-auto size-44 sm:size-48">
              <svg viewBox="0 0 120 120" role="img" aria-label="Portfolio allocation by sector" className="size-full -rotate-90">
                <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
                {allocationSegments.map((segment) => (
                  <circle
                    key={segment.label}
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke={allocationColors[segment.colorIndex % allocationColors.length]}
                    strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                    strokeDashoffset={-segment.offset}
                    strokeOpacity={activeAllocationIndex == null || activeAllocationIndex === segment.index ? 1 : 0.28}
                    strokeWidth={activeAllocationIndex === segment.index ? 14 : 12}
                    pathLength={circumference}
                  />
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="font-mono text-2xl font-light text-white">
                    {activeAllocationIndex == null ? percentFromBps(allocationTotal) : percentFromBps(allocationData[activeAllocationIndex]?.weightBps ?? 0)}
                  </p>
                  <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-zinc-400">
                    {activeAllocationIndex == null ? "allocated" : allocationData[activeAllocationIndex]?.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2" aria-label="Allocation legend">
              {allocationData.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={activeAllocationIndex === index}
                  onMouseEnter={() => setActiveAllocationIndex(index)}
                  onMouseLeave={() => setActiveAllocationIndex(null)}
                  onFocus={() => setActiveAllocationIndex(index)}
                  onBlur={() => setActiveAllocationIndex(null)}
                  className={`flex w-full items-center gap-3 rounded-[0.8rem] border px-3 py-2.5 text-left transition ${
                    activeAllocationIndex === index ? "border-cyan-200/30 bg-cyan-200/[0.07]" : "border-transparent hover:border-white/10 hover:bg-white/[0.035]"
                  }`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{item.label}</span>
                  <span className="font-mono text-xs text-zinc-400">{percentFromBps(item.weightBps)}</span>
                  {item.status === "review" ? <span className="text-[0.62rem] uppercase tracking-[0.12em] text-amber-100/80">Review</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-[1rem] bg-amber-100/[0.035] p-4 text-sm leading-6 text-amber-50/75">
            {portfolioEmpty ? "Add your first real holding to populate portfolio value, allocation, goals, and risk. No sample positions are inserted." : "Portfolio values are hidden while the local finance API is unavailable. No estimated prices are substituted."}
          </p>
        )}

        <p className="mt-6 text-xs leading-5 text-zinc-400">
          {portfolioEmpty
            ? "Portfolio snapshot pending · add a holding to calculate owner-scoped value and allocation."
            : `Current snapshot · ${portfolioProvider} · ${formatSnapshot(portfolioCapturedAt)}. Allocation is a research signal, not a recommendation.`}
        </p>
      </div>

      <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-white">
              <Radar className="size-4 text-amber-100" />
              {movementSource === "market" ? "Market movement" : "Monitor movement"}
            </div>
            <h2 className="type-card-title mt-3 text-2xl text-white">What changed today</h2>
          </div>
          <Link className="overview-link" href="/app/monitors">
            Details
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {movementItems.length ? (
          <div className="relative mt-7">
          <div ref={tableRef} onScroll={updateScrollEdges} className="market-table-scroll xl:max-h-[max(10rem,calc(100dvh-37rem))] xl:overflow-y-scroll" tabIndex={0} role="region" aria-label="Market movement table">
            <div className={`${movementGridClassName} border-b border-white/10 pb-3 text-[0.62rem] uppercase tracking-[0.14em] text-zinc-400`}>
              <span>Symbol</span>
              <span className="text-center">Relative move <span className="sr-only">from zero</span></span>
              <span className="text-right">Move</span>
            </div>
            {movementItems.map((item) => {
              const value = item.dailyChangeBps;
              const width = movementWidth(value, movementMax) / 2;
              const isPositive = (value ?? 0) >= 0;
              return (
                <div key={item.id} className={`${movementGridClassName} min-h-16 border-b border-white/[0.06] py-3 last:border-0`}>
                  <div className="min-w-0">
                    <p className="truncate whitespace-nowrap font-mono text-sm font-medium text-white" title={item.ticker}>{item.ticker}</p>
                    <p className="truncate text-[0.7rem] text-zinc-400" title={item.name}>{item.name}</p>
                  </div>
                  <div className="relative h-8" aria-label={`${item.ticker} ${formatMove(value)} provider-reported movement`}>
                    <span className="absolute inset-x-0 top-1/2 h-px bg-white/[0.08]" aria-hidden="true" />
                    <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-white/30" aria-hidden="true" />
                    {value == null ? (
                      <span className="absolute inset-y-1/2 left-1/2 w-8 -translate-y-1/2 border-t border-dashed border-white/20" aria-hidden="true" />
                    ) : (
                      <span
                        className={`absolute top-1/2 h-1.5 -translate-y-1/2 ${isPositive ? "rounded-r-full bg-cyan-200/90" : "rounded-l-full bg-amber-200/90"}`}
                        style={isPositive ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm tabular-nums ${value == null ? "text-zinc-400" : isPositive ? "text-cyan-100" : "text-amber-100"}`}>{formatMove(value)}</p>
                    <p className="mt-1 truncate font-mono text-[0.68rem] text-zinc-400" title={item.displayPrice ?? "N/A"}>{item.displayPrice ?? "N/A"}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {scrollEdges.top && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#171c1b] to-transparent" />}
          {scrollEdges.bottom && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#171c1b] to-transparent" />}
          </div>
        ) : (
          <p className="mt-6 rounded-[1rem] bg-amber-100/[0.035] p-4 text-sm leading-6 text-amber-50/75">
            {watchlistEmpty ? "Market movement will appear when the provider-backed feed is available." : "Watchlist movement will appear when the provider-backed feed is available."}
          </p>
        )}

        <p className="mt-6 text-xs leading-5 text-zinc-400">
          {movementProvider} · {formatSnapshot(movementCapturedAt)}. Bars are scaled to the largest absolute move in this {movementSource === "market" ? "public market" : "watchlist"} snapshot. They show market context, not a trade signal.
        </p>
      </div>
    </section>
  );
}
