"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Globe2, MapPin } from "lucide-react";

import { countryLocation, geographyLabel, type GeographyItem } from "@/lib/investment-geography";

const GlobeScene = dynamic(() => import("@/components/investment-globe-scene"), { ssr: false });

type Props = {
  items: GeographyItem[];
  title: string;
  description: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  valueLabel?: string;
};

export function InvestmentGlobe({ items, title, description, selectedId, onSelect, valueLabel }: Props) {
  const [localId, setLocalId] = useState<string | undefined>();
  const [activityToken, setActivityToken] = useState(0);
  const activeId = selectedId ?? localId;
  const selected = items.find((item) => item.id === activeId);
  const countryItems = useMemo(() => items.filter((item) => item.scope === "country" && countryLocation(item.countryCode)), [items]);
  const globalItems = items.filter((item) => item.scope === "global");
  const unattributedItems = items.filter((item) => item.scope === "unattributed" || (item.scope === "country" && !countryLocation(item.countryCode)));
  const countries = new Set(countryItems.map((item) => item.countryCode?.toUpperCase())).size;
  const totalValue = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const countryValue = countryItems.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const countryBreakdown = useMemo(() => {
    const groups = new Map<string, { name: string; count: number; value: number }>();
    for (const item of countryItems) {
      const code = item.countryCode!.toUpperCase();
      const current = groups.get(code) ?? { name: countryLocation(code)!.name, count: 0, value: 0 };
      current.count += 1;
      current.value += item.value ?? 0;
      groups.set(code, current);
    }
    const otherGroups = [
      { name: "Global / cross-border", count: globalItems.length, value: globalItems.reduce((sum, item) => sum + (item.value ?? 0), 0) },
      { name: "Country not supplied", count: unattributedItems.length, value: unattributedItems.reduce((sum, item) => sum + (item.value ?? 0), 0) },
    ].filter((group) => group.count > 0);
    return [...groups.values(), ...otherGroups].sort((left, right) => totalValue > 0 ? right.value - left.value : right.count - left.count);
  }, [countryItems, globalItems, totalValue, unattributedItems]);

  function select(id: string) {
    setActivityToken((current) => current + 1);
    setLocalId(id);
    onSelect?.(id);
  }

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-white/[0.07] bg-[#081113]" aria-label={title}>
      <div className="grid lg:grid-cols-[minmax(15rem,0.9fr)_minmax(22rem,1.1fr)]">
        <div className="flex flex-col justify-between p-5 sm:p-7">
          <div>
            <div className="flex items-center gap-2 text-cyan-100/80"><Globe2 className="size-4" aria-hidden="true" /><h2 className="type-card-title text-xl text-white">{title}</h2></div>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">{description}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-y sm:grid-cols-4 border-white/[0.07] py-4">
              <div><p className="font-mono text-xl text-white">{countries}</p><p className="mt-1 text-xs text-zinc-400">Countries</p></div>
              <div><p className="font-mono text-xl text-cyan-100">{countryItems.length}</p><p className="mt-1 text-xs text-zinc-400">Country linked</p></div>
              <div><p className="font-mono text-xl text-cyan-100">{globalItems.length}</p><p className="mt-1 text-xs text-zinc-400">Global</p></div>
              <div><p className="font-mono text-xl text-zinc-300">{unattributedItems.length}</p><p className="mt-1 text-xs text-zinc-400">No country data</p></div>
            </div>
            {totalValue > 0 ? <p className="mt-4 text-xs text-zinc-400">{((countryValue / totalValue) * 100).toFixed(1)}% of {valueLabel ?? "value"} is country linked. Every asset is included in the breakdown below.</p> : null}
            {countryBreakdown.length > 0 ? <div className="mt-5 max-h-56 space-y-3 overflow-y-auto pr-1" aria-label="Complete geography breakdown">
              {countryBreakdown.map((country) => <div key={country.name} className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-1 text-xs"><span className="truncate text-cyan-50/80">{country.name}</span><span className="text-right font-mono text-cyan-100">{totalValue > 0 ? `${((country.value / totalValue) * 100).toFixed(1)}%` : country.count}</span><span className="col-span-2 h-1 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-cyan-200/70" style={{ width: `${totalValue > 0 ? (country.value / totalValue) * 100 : (country.count / Math.max(items.length, 1)) * 100}%` }} /></span></div>)}
            </div> : null}
          </div>
          <div className="mt-6 min-h-20 rounded-xl bg-white/[0.035] p-4" aria-live="polite">
            {selected ? <><p className="font-mono text-sm text-white">{selected.label}</p><p className="mt-1 text-sm text-cyan-100">{geographyLabel(selected)}</p><p className="mt-2 text-xs leading-5 text-zinc-400">{selected.basis ?? "Provider country metadata"}</p></> : <><p className="text-sm text-white">Select an asset or marker</p><p className="mt-1 text-xs leading-5 text-zinc-400">Rotate the globe to inspect locations. Listed country or issuer location does not equal underlying economic exposure.</p></>}
          </div>
        </div>
        <div className="relative min-h-[19rem] overflow-hidden border-t border-white/[0.06] bg-[radial-gradient(circle_at_50%_50%,#133136_0%,#091719_47%,#071012_75%)] lg:min-h-[24rem] lg:border-l lg:border-t-0">
          <GlobeScene items={items} selectedId={activeId} activityToken={activityToken} onSelect={select} />
          <div className="pointer-events-none absolute right-3 top-3 z-10 flex max-w-[11rem] flex-col gap-1.5 text-right text-[0.64rem]">
            {globalItems.length > 0 ? <span className="rounded-full border border-cyan-100/25 bg-[#10292c]/90 px-2.5 py-1 text-cyan-50">Cyan ring · Cross-border · {globalItems.length}</span> : null}
            {unattributedItems.length > 0 ? <span className="rounded-full border border-amber-100/25 bg-[#30271a]/90 px-2.5 py-1 text-amber-50">Amber ring · No country data · {unattributedItems.length}</span> : null}
          </div>
          <span className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-1.5 text-[0.65rem] text-zinc-400"><MapPin className="size-3 text-cyan-200" aria-hidden="true" /><span className="lg:hidden">Select an asset below to rotate</span><span className="hidden lg:inline">Drag to rotate · scroll to zoom</span></span>
        </div>
      </div>
      {items.length > 0 ? <div className="flex gap-2 overflow-x-auto border-t border-white/[0.06] px-5 py-3" aria-label="Asset geography selections">
        {items.map((item) => <button key={item.id} type="button" onClick={() => select(item.id)} aria-pressed={activeId === item.id} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 ${activeId === item.id ? "border-cyan-200/50 bg-cyan-200/10 text-cyan-50" : "border-white/10 text-cyan-50/65 hover:border-white/25 hover:text-white"}`} title={`${item.label}: ${geographyLabel(item)}`}>{item.label}<span className="ml-2 text-cyan-100/70">{item.scope === "global" ? "Global" : item.scope === "unattributed" ? "No country" : item.countryCode}</span></button>)}
      </div> : null}
      <p className="border-t border-white/[0.06] px-5 py-3 text-[0.68rem] leading-5 text-zinc-400">Geography is an issuer or provider location lens, not a measure of revenue, holdings, currency, or risk exposure. Crypto networks have no single country. Not financial advice.</p>
    </section>
  );
}
