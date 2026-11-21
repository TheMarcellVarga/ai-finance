"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Globe2, MapPin } from "lucide-react";

import { GeographyReview } from "@/components/geography-review";
import { Button } from "@/components/ui/button";
import { geographyLabel, type GeographyItem } from "@/lib/investment-geography";
import { countryRegion, globeRegions, groupGeography, type GlobeRegion } from "@/lib/investment-globe-data";

const GlobeScene = dynamic(() => import("@/components/investment-globe-scene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400" role="status">Loading globe…</div>,
});

class GlobeBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function formatSnapshot(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Timestamp unavailable" : new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}

type Props = {
  items: GeographyItem[];
  title: string;
  description: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  valueLabel?: string;
  focusToken?: number;
};

export function InvestmentGlobe({ items, title, description, selectedId, onSelect, valueLabel, focusToken = 0 }: Props) {
  const breakdownId = useId();
  const regionStripRef = useRef<HTMLDivElement>(null);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const [localId, setLocalId] = useState<string | undefined>();
  const [activityToken, setActivityToken] = useState(0);
  const activeId = selectedId ?? localId;
  const selectedItem = items.find((item) => item.id === activeId);
  const selectionKey = JSON.stringify([activeId, selectedItem?.scope, selectedItem?.countryCode, focusToken]);
  const [regionView, setRegionView] = useState<{ region: GlobeRegion; selectionKey: string }>({ region: "global", selectionKey });
  const region = regionView.selectionKey === selectionKey ? regionView.region : selectedItem?.scope === "country" ? countryRegion(selectedItem.countryCode) ?? "global" : "global";
  // Preserve manual region browsing until an external selection or resolved location changes.
  // Reconcile during render so a parent selection never paints behind a stale filter.
  if (regionView.selectionKey !== selectionKey) setRegionView({ region, selectionKey });
  function setRegion(nextRegion: GlobeRegion) { setRegionView({ region: nextRegion, selectionKey }); }
  const selected = selectedItem && (region === "global" || selectedItem.scope !== "country" || countryRegion(selectedItem.countryCode) === region) ? selectedItem : undefined;
  const groups = useMemo(() => groupGeography(items), [items]);
  const countryGroups = groups.filter((group) => group.countryCode);
  const visibleGroups = groups.filter((group) => !group.countryCode || region === "global" || countryRegion(group.countryCode) === region);
  const reviewCounts = { mapped: 0, crossBorder: 0, unattributed: 0 };
  let latestSnapshot = "";
  for (const group of visibleGroups) {
    const theme = group.countryCode ? "mapped" : group.id === "global" ? "crossBorder" : "unattributed";
    reviewCounts[theme] += group.items.length;
    for (const item of group.items) {
      if (!item.capturedAt) continue;
      const capturedAt = Date.parse(item.capturedAt);
      if (Number.isFinite(capturedAt)) {
        const timestamp = new Date(capturedAt).toISOString();
        if (timestamp > latestSnapshot) latestSnapshot = timestamp;
      }
    }
  }
  const totalValue = groups.reduce((sum, group) => sum + group.value, 0);
  const regionLabel = globeRegions.find((entry) => entry.id === region)!.label;

  useEffect(() => {
    const strip = regionStripRef.current;
    const active = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!strip || !active) return;
    const stripBox = strip.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    const delta = activeBox.left < stripBox.left ? activeBox.left - stripBox.left : activeBox.right > stripBox.right ? activeBox.right - stripBox.right : 0;
    if (delta) strip.scrollTo({ left: strip.scrollLeft + delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [region, selectionKey]);

  const unavailableScene = <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center" role="status"><p className="max-w-sm text-sm leading-6 text-zinc-300">The 3D globe is unavailable. Your locations and assets are still available in the list.</p><Button variant="outline" size="lg" type="button" onClick={() => { setSceneUnavailable(false); setSceneGeneration((value) => value + 1); }}>Retry globe</Button></div>;

  function select(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (item?.scope === "country") setRegion(countryRegion(item.countryCode) ?? "global");
    else setRegion("global");
    setActivityToken((current) => current + 1);
    setLocalId(id);
    onSelect?.(id);
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[1rem] border border-white/[0.07] bg-[#080d0e]" aria-label={title}>
      <header className="px-5 pt-6 sm:px-7 sm:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-card-title text-xl text-white">{title}</h2>
          <p className="flex items-center gap-2 text-xs text-zinc-400"><Globe2 className="size-4 text-cyan-200" aria-hidden="true" />{countryGroups.length} {countryGroups.length === 1 ? "country" : "countries"}<span aria-hidden="true">·</span>{items.length} {items.length === 1 ? "asset" : "assets"}</p>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
        <div ref={regionStripRef} className="mt-5 flex gap-1 overflow-x-auto pb-2" role="group" aria-label="Globe region">
          {globeRegions.map((entry) => <Button key={entry.id} variant="ghost" size="lg" type="button" aria-pressed={region === entry.id} onClick={() => { setRegion(entry.id); setActivityToken((value) => value + 1); }} className={`min-h-11 shrink-0 rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${region === entry.id ? "bg-cyan-200/10 text-cyan-50 hover:bg-cyan-200/15" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>{entry.label}</Button>)}
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(16rem,1fr)]">
        <div className="investment-globe-viewport relative isolate h-[23rem] overflow-hidden sm:h-[31rem] lg:h-[34rem]">
          {sceneUnavailable ? unavailableScene : <GlobeBoundary key={sceneGeneration} fallback={unavailableScene}><GlobeScene items={items} selectedId={activeId} region={region} activityToken={activityToken + focusToken} onSelect={select} onUnavailable={() => setSceneUnavailable(true)} /></GlobeBoundary>}
          <p className="pointer-events-none absolute bottom-4 left-5 right-5 flex items-center justify-center gap-2 text-xs text-zinc-400"><MapPin className="size-3.5 text-cyan-200" aria-hidden="true" /><span className="investment-globe-touch-hint">Choose a region or asset to explore</span><span className="investment-globe-drag-hint">Drag to explore · select a country or asset</span></p>
        </div>
        <div className="flex min-w-0 flex-col border-t border-white/[0.07] px-5 py-5 sm:px-7 lg:border-t-0 lg:pl-2">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 id={breakdownId} tabIndex={-1} className="scroll-mt-40 rounded text-base font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring xl:scroll-mt-6">
              {region === "global" ? "All locations" : regionLabel}
            </h3>
            <span className="text-xs text-zinc-400">{totalValue > 0 ? `% of ${valueLabel ?? "value"}` : "Assets"}</span>
          </div>
          <div className="max-h-64 overflow-y-auto lg:max-h-72 lg:overscroll-contain" aria-label="Geography breakdown">
            {visibleGroups.length === 0 ? <p className="py-5 text-sm leading-6 text-zinc-400">{items.length === 0 ? "No assets available in this view yet." : "No assets mapped to this region. Choose Global to see all locations."}</p> : visibleGroups.map((group) => {
              const active = group.items.some((item) => item.id === activeId);
              return <button key={group.id} type="button" onClick={() => select(group.items[0].id)} aria-pressed={active} className={`flex min-h-12 w-full items-center gap-3 border-b border-white/[0.055] py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${active ? "text-cyan-100" : "text-zinc-300 hover:text-white"}`}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-medium ${active ? "bg-cyan-200/15" : "bg-white/[0.06]"}`}>{group.countryCode ?? (group.id === "global" ? <Globe2 className="size-4" aria-hidden="true" /> : "—")}</span>
                <span className="min-w-0 flex-1 truncate">{group.name}</span><span className="font-mono text-xs tabular-nums">{totalValue > 0 ? `${((group.value / totalValue) * 100).toFixed(1)}%` : group.items.length}</span><ChevronRight className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
              </button>;
            })}
          </div>
          {region !== "global" && groups.some((group) => !group.countryCode) ? <p className="mt-3 text-xs leading-5 text-zinc-400">Cross-border and unlocated assets stay visible in every region.</p> : null}
          <div className="mt-auto break-words pt-6" aria-live="polite">
            {selected ? <><p className="text-lg font-medium text-white">{selected.label}</p><p className="mt-1 text-sm text-cyan-100">{geographyLabel(selected)}</p>{Number.isFinite(selected.dailyChangePercent) ? <p className={`mt-2 font-mono text-sm tabular-nums ${selected.dailyChangePercent! >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{selected.dailyChangePercent! >= 0 ? "+" : ""}{selected.dailyChangePercent!.toFixed(2)}% <span className="font-sans text-xs text-zinc-400">24h</span></p> : null}<p className="mt-2 text-xs leading-5 text-zinc-400">{selected.basis}</p>{selected.provider ? <p className="mt-1 text-xs leading-5 text-zinc-400">Source: {selected.provider}</p> : null}{selected.capturedAt ? <p className="mt-1 text-xs leading-5 text-zinc-400">Snapshot: <time dateTime={selected.capturedAt}>{formatSnapshot(selected.capturedAt)}</time></p> : null}{selected.freshness ? <p className="mt-1 text-xs leading-5 text-zinc-400">Freshness: {selected.freshness}</p> : null}</> : <><p className="text-sm text-white">{items.length ? "Explore a location" : "Your geography starts here"}</p><p className="mt-2 text-xs leading-5 text-zinc-400">{items.length ? "Select a country to highlight it on the globe, or choose an asset below." : "Assets appear here when they are available in this view. No country locations have been assumed."}</p></>}
          </div>
        </div>
      </div>
      {items.length > 0 ? <details className="group border-t border-white/[0.07] open:bg-white/[0.018]">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-medium text-zinc-200 hover:bg-white/[0.025] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-7 [&::-webkit-details-marker]:hidden">All assets <span className="ml-auto font-mono text-xs text-zinc-400">{items.length}</span><ChevronDown className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
        <div className="grid max-h-64 gap-1 overflow-y-auto px-5 pb-4 sm:grid-cols-2 sm:px-7 xl:grid-cols-3" aria-label="Asset geography selections">{items.map((item) => <button key={item.id} type="button" onClick={() => select(item.id)} aria-pressed={activeId === item.id} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${activeId === item.id ? "bg-cyan-200/10 text-cyan-50" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}><span className="truncate">{item.label}</span><span className="max-w-[60%] truncate text-xs text-zinc-400">{item.scope === "global" ? "Cross-border" : item.scope === "unattributed" ? "No country" : geographyLabel(item)}</span></button>)}</div>
      </details> : null}
      <GeographyReview counts={reviewCounts} breakdownId={breakdownId} capturedAt={latestSnapshot || undefined} />
      <p className="border-t border-white/[0.07] px-5 py-4 text-xs leading-5 text-zinc-400 sm:px-7">Geography reflects reported issuer, registration, or listing location, not underlying economic exposure. Crypto networks have no single country. Not financial advice.</p>
    </section>
  );
}
