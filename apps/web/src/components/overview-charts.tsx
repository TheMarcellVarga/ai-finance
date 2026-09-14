"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Radar } from "lucide-react";
import { useMemo, useState } from "react";

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
  provider?: string;
  capturedAt?: string;
  portfolioEmpty?: boolean;
  watchlistEmpty?: boolean;
};

const allocationColors = ["#a5f3fc", "#67e8f9", "#5eead4", "#fcd34d", "#94a3b8", "#c4b5fd"];

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

export function OverviewCharts({ allocation, watchlist, provider = "market data provider", capturedAt, portfolioEmpty = false, watchlistEmpty = false }: OverviewChartsProps) {
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
                  <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-zinc-500">
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

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Current snapshot · {provider} · {formatSnapshot(capturedAt)}. Allocation is a research signal, not a recommendation.
        </p>
      </div>

      <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-white">
              <Radar className="size-4 text-amber-100" />
              Monitor movement
            </div>
            <h2 className="type-card-title mt-3 text-2xl text-white">What changed today</h2>
          </div>
          <Link className="overview-link" href="/app/monitors">
            Details
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {movementItems.length ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-[3.8rem_1fr_3.5rem] items-center gap-3 text-[0.62rem] uppercase tracking-[0.14em] text-zinc-600">
              <span>Symbol</span>
              <span className="text-center">Relative move</span>
              <span className="text-right">Move</span>
            </div>
            {movementItems.map((item) => {
              const value = item.dailyChangeBps;
              const width = movementWidth(value, movementMax) / 2;
              const isPositive = (value ?? 0) >= 0;
              return (
                <div key={item.id} className="grid grid-cols-[3.8rem_1fr_3.5rem] items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-white">{item.ticker}</p>
                    <p className="truncate text-[0.65rem] text-zinc-600">{item.name}</p>
                  </div>
                  <div className="relative h-7 rounded-[0.6rem] bg-white/[0.035]" aria-label={`${item.ticker} ${formatMove(value)} provider-reported movement`}>
                    <span className="absolute inset-y-1/2 left-1/2 w-px -translate-y-1/2 bg-white/20" aria-hidden="true" />
                    {value == null ? (
                      <span className="absolute inset-y-1/2 left-1/2 w-8 -translate-y-1/2 border-t border-dashed border-white/20" aria-hidden="true" />
                    ) : (
                      <span
                        className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-full ${isPositive ? "bg-cyan-200/85" : "bg-amber-200/85"}`}
                        style={isPositive ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-xs ${value == null ? "text-zinc-600" : isPositive ? "text-cyan-100" : "text-amber-100"}`}>{formatMove(value)}</p>
                    <p className="mt-1 truncate font-mono text-[0.62rem] text-zinc-600">{item.displayPrice ?? "N/A"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 rounded-[1rem] bg-amber-100/[0.035] p-4 text-sm leading-6 text-amber-50/75">
            {watchlistEmpty ? "Add a ticker to build your watchlist from provider-backed prices. No sample symbols are inserted." : "Watchlist movement will appear when the provider-backed feed is available."}
          </p>
        )}

        <p className="mt-6 text-xs leading-5 text-zinc-500">Bars are scaled to the largest absolute move in this snapshot. They show market context, not a trade signal.</p>
      </div>
    </section>
  );
}
