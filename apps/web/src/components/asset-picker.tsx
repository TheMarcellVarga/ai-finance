"use client";

import { useState } from "react";
import { Globe2, Search, X } from "lucide-react";

import type { FinanceAsset } from "@/lib/finance-api";
import { assetClassOptions } from "@/lib/asset-catalog";

type AssetPickerProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (asset: FinanceAsset) => void;
  label?: string;
  description?: string;
  inputId?: string;
};

function formatAssetClass(value?: string) {
  return value ? value.replaceAll("_", " ") : "asset";
}

export function AssetPicker({ value, onChange, onSelect, label = "Asset", description, inputId = "asset-picker" }: AssetPickerProps) {
  const [assetClass, setAssetClass] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [results, setResults] = useState<FinanceAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const query = value.trim();
    if (query.length < 1) {
      setError("Enter a symbol or company/fund name first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, limit: "8" });
      if (assetClass) params.set("assetClass", assetClass);
      if (countryCode.trim()) params.set("countryCode", countryCode.trim().toUpperCase());
      const response = await fetch(`/api/finance/assets/search?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: FinanceAsset[]; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Global asset search is unavailable.");
      }
      setResults(payload.data);
      if (payload.data.length === 0) {
        setError("No provider-backed match was found for those filters.");
      }
    } catch (requestError) {
      setResults([]);
      setError(requestError instanceof Error ? requestError.message : "Global asset search is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function select(asset: FinanceAsset) {
    onChange(asset.ticker);
    onSelect?.(asset);
    setResults([]);
    setError(null);
  }

  return (
    <div className="min-w-0">
      <div role="search">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className="text-sm text-zinc-300">{label}</label>
          {results.length > 0 ? (
            <button type="button" onClick={() => setResults([])} className="text-xs text-zinc-400 hover:text-zinc-200" aria-label="Close asset search results">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-base text-white outline-none focus:border-cyan-200/40"
            placeholder="Ticker, ISIN, or fund name"
            autoComplete="off"
            required
          />
          <button type="button" onClick={() => void search()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-[0.75rem] border border-cyan-200/20 bg-cyan-200/10 px-3 text-xs text-cyan-50 transition hover:bg-cyan-200/15 disabled:opacity-50" aria-label="Search provider-backed assets">
            <Search className={loading ? "size-4 animate-pulse" : "size-4"} />
            <span className="hidden sm:inline">{loading ? "Searching" : "Search"}</span>
          </button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <select value={assetClass} onChange={(event) => setAssetClass(event.target.value)} className="h-9 rounded-[0.65rem] border border-white/10 bg-zinc-950/70 px-2 text-xs text-zinc-300 outline-none focus:border-cyan-200/40" aria-label="Filter by asset class">
            {assetClassOptions.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
          </select>
          <label className="relative">
            <Globe2 className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-zinc-400" />
            <input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} maxLength={2} className="h-9 w-full rounded-[0.65rem] border border-white/10 bg-zinc-950/70 pl-7 pr-2 font-mono text-xs text-zinc-300 outline-none focus:border-cyan-200/40" placeholder="ISO country" aria-label="Filter by ISO country code" />
          </label>
        </div>
        {description ? <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p> : null}
      </div>
      {error ? <p className="mt-2 text-xs leading-5 text-amber-100/80">{error}</p> : null}
      {results.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-[0.85rem] border border-white/10 bg-zinc-950/90">
          {results.map((asset) => (
            <button key={`${asset.provider ?? "provider"}:${asset.ticker}:${asset.exchange}`} type="button" onClick={() => select(asset)} className="block w-full border-b border-white/8 px-3 py-3 text-left last:border-0 hover:bg-white/[0.05]">
              <span className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-white">{asset.ticker}</span>
                <span className="text-[0.65rem] uppercase tracking-[0.12em] text-cyan-100/70">{formatAssetClass(asset.assetClass ?? asset.type)}</span>
              </span>
              <span className="mt-1 block truncate text-xs text-zinc-400">{asset.name}</span>
              <span className="mt-1 block truncate text-[0.68rem] text-zinc-400">{[asset.exchange, asset.countryCode, asset.currency].filter(Boolean).join(" · ") || "Provider metadata pending"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
