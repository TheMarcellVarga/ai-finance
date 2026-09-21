"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Database,
  ExternalLink,
  Globe2,
  Layers3,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { assetClassOptions, type FinanceAssetCatalog } from "@/lib/asset-catalog";
import type { FinanceAsset, FinanceAssetSearchResponse } from "@/lib/finance-api";

type SortMode = "relevance" | "class" | "country" | "price";
type RouteError = { error?: { message?: string } };

type GlobalAssetMonitorWorkspaceProps = {
  initialCatalog?: FinanceAssetCatalog;
  initialError?: string;
};

function formatAssetClass(asset: FinanceAsset) {
  const value = asset.assetClass ?? asset.type;
  const match = assetClassOptions.find(([id]) => id === value);
  return match?.[1] ?? value.replaceAll("_", " ");
}

function formatMove(value?: number) {
  if (value == null) {
    return "N/A";
  }
  const percent = value / 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function moveClass(value?: number) {
  if (value == null) {
    return "text-zinc-500";
  }
  return value >= 0 ? "text-emerald-100" : "text-rose-100";
}

function formatCountry(asset: FinanceAsset) {
  return asset.countryCode || asset.country || "—";
}

function formatCatalogClassCount(value: number) {
  return `${value} class${value === 1 ? "" : "es"}`;
}

function SelectChevron() {
  return <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" />;
}

function AssetResultRow({ asset }: { asset: FinanceAsset }) {
  const researchHref = `/app/research?ticker=${encodeURIComponent(asset.ticker)}`;

  return (
    <tr className="border-t border-white/[0.05] transition-colors hover:bg-white/[0.022]">
      <td className="px-5 py-4 align-top">
        <div className="min-w-0">
          <a href={researchHref} className="inline-flex items-center gap-2 font-mono text-sm text-white hover:text-cyan-100">
            {asset.ticker}
            <ExternalLink className="size-3 text-zinc-700" aria-hidden="true" />
          </a>
          <p className="mt-1 max-w-[22rem] truncate text-xs text-zinc-500">{asset.name || "Provider name unavailable"}</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex rounded-[0.55rem] border border-cyan-200/15 bg-cyan-200/[0.045] px-2 py-1 text-[0.66rem] uppercase tracking-[0.08em] text-cyan-100/80">
          {formatAssetClass(asset)}
        </span>
      </td>
      <td className="px-4 py-4 text-xs text-zinc-300">
        <p>{formatCountry(asset)}</p>
        <p className="mt-1 text-[0.68rem] text-zinc-600">{asset.region || "Global coverage"}</p>
      </td>
      <td className="px-4 py-4 text-xs text-zinc-400">{asset.exchange || asset.mic || "Provider pending"}</td>
      <td className="px-4 py-4 font-mono text-xs text-zinc-300">{asset.currency || "—"}</td>
      <td className="px-4 py-4 font-mono text-xs text-zinc-200">{asset.displayPrice || "N/A"}</td>
      <td className={`px-5 py-4 text-right font-mono text-xs ${moveClass(asset.dailyChangeBps)}`}>{formatMove(asset.dailyChangeBps)}</td>
    </tr>
  );
}

function AssetResultCard({ asset }: { asset: FinanceAsset }) {
  return (
    <article className="border-b border-white/[0.06] p-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <a href={`/app/research?ticker=${encodeURIComponent(asset.ticker)}`} className="inline-flex items-center gap-2 font-mono text-sm text-white hover:text-cyan-100">
            {asset.ticker}
            <ExternalLink className="size-3 text-zinc-700" aria-hidden="true" />
          </a>
          <p className="mt-1 truncate text-xs text-zinc-500">{asset.name || "Provider name unavailable"}</p>
        </div>
        <span className="shrink-0 rounded-[0.55rem] border border-cyan-200/15 bg-cyan-200/[0.045] px-2 py-1 text-[0.62rem] uppercase tracking-[0.08em] text-cyan-100/80">
          {formatAssetClass(asset)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-zinc-600">Country</p>
          <p className="mt-1 text-zinc-300">{formatCountry(asset)}</p>
        </div>
        <div>
          <p className="text-zinc-600">Price</p>
          <p className="mt-1 font-mono text-zinc-200">{asset.displayPrice || "N/A"}</p>
        </div>
        <div>
          <p className="text-zinc-600">1d</p>
          <p className={`mt-1 font-mono ${moveClass(asset.dailyChangeBps)}`}>{formatMove(asset.dailyChangeBps)}</p>
        </div>
      </div>
      <p className="mt-3 text-[0.68rem] text-zinc-600">{[asset.exchange, asset.currency, asset.provider].filter(Boolean).join(" · ") || "Provider metadata pending"}</p>
    </article>
  );
}

export function GlobalAssetMonitorWorkspace({ initialCatalog, initialError }: GlobalAssetMonitorWorkspaceProps) {
  const [catalog] = useState<FinanceAssetCatalog | null>(initialCatalog ?? null);
  const [query, setQuery] = useState("");
  const [assetClass, setAssetClass] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [exchange, setExchange] = useState("");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [results, setResults] = useState<FinanceAsset[]>([]);
  const [meta, setMeta] = useState<FinanceAssetSearchResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const classes = [
    { id: "", label: "All asset classes", description: "" },
    ...(catalog?.assetClasses.length
      ? catalog.assetClasses
      : assetClassOptions.slice(1).map(([id, label]) => ({ id, label, description: "" }))),
  ];

  const sortedResults = useMemo(() => {
    const next = [...results];
    if (sort === "class") {
      return next.sort((left, right) => formatAssetClass(left).localeCompare(formatAssetClass(right)));
    }
    if (sort === "country") {
      return next.sort((left, right) => formatCountry(left).localeCompare(formatCountry(right)));
    }
    if (sort === "price") {
      return next.sort((left, right) => (right.displayPrice || "").localeCompare(left.displayPrice || ""));
    }
    return next;
  }, [results, sort]);

  const representedClasses = new Set(results.map((asset) => asset.assetClass ?? asset.type).filter(Boolean)).size;
  const representedCountries = new Set(results.map((asset) => asset.countryCode ?? asset.country).filter(Boolean)).size;

  async function searchAssets(event?: FormEvent) {
    event?.preventDefault();
    if (query.trim().length < 1) {
      setError("Enter a ticker, identifier, or asset name to search the provider-backed universe.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query.trim(), limit: "20" });
      if (assetClass) params.set("assetClass", assetClass);
      if (countryCode.trim()) params.set("countryCode", countryCode.trim().toUpperCase());
      if (currency.trim()) params.set("currency", currency.trim().toUpperCase());
      if (exchange.trim()) params.set("exchange", exchange.trim());

      const response = await fetch(`/api/finance/assets/search?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as FinanceAssetSearchResponse | RouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error?.message : "The asset search is unavailable.");
      }
      setResults(payload.data);
      setMeta(payload.meta);
      if (payload.data.length === 0) {
        setError("No provider-backed assets matched those filters.");
      }
    } catch (requestError) {
      setResults([]);
      setMeta(null);
      setError(requestError instanceof Error ? requestError.message : "The asset search is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setAssetClass("");
    setCountryCode("");
    setCurrency("");
    setExchange("");
    setResults([]);
    setMeta(null);
    setError(null);
  }

  return (
    <div className="space-y-5">
      <section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/80">
              <Layers3 className="size-4" aria-hidden="true" />
              Global asset universe
            </div>
            <h1 className="type-display mt-5 text-3xl text-white sm:text-5xl">Research every market in one view.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              Search provider-backed instruments across equities, funds, fixed income, derivatives, currencies, commodities, real estate, cash-like assets, and digital assets.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-zinc-500 lg:items-end">
            <span className="inline-flex items-center gap-2 font-mono text-zinc-300">
              <Database className="size-3.5 text-cyan-200/70" aria-hidden="true" />
              {meta?.provider || "Provider-backed"} asset data
            </span>
            <span>{catalog?.countryCoverage.scope || "Coverage depends on the configured provider"}</span>
            <span className="inline-flex items-center gap-1.5 text-cyan-100/75">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {catalog?.assetClasses.length || classes.length - 1} canonical classes · {catalog?.countryCoverage.standard || "ISO country filters"}
            </span>
            <span>{meta?.freshness || "Search when you need a current provider snapshot"}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-[#090e0f]/95 lg:grid-cols-4">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-zinc-500">Matches</p>
          <p className="mt-2 font-mono text-2xl text-white">{results.length || "—"}</p>
          <p className="mt-1 text-xs text-zinc-600">Provider results</p>
        </div>
        <div className="border-l border-white/[0.06] p-4 sm:p-5">
          <p className="text-xs text-zinc-500">Classes represented</p>
          <p className="mt-2 font-mono text-2xl text-cyan-100">{representedClasses || "—"}</p>
          <p className="mt-1 text-xs text-zinc-600">Across this search</p>
        </div>
        <div className="border-t border-white/[0.06] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <p className="text-xs text-zinc-500">Countries represented</p>
          <p className="mt-2 font-mono text-2xl text-cyan-100">{representedCountries || "—"}</p>
          <p className="mt-1 text-xs text-zinc-600">Provider metadata</p>
        </div>
        <div className="border-l border-t border-white/[0.06] p-4 sm:p-5 lg:border-t-0">
          <p className="text-xs text-zinc-500">Catalog</p>
          <p className="mt-2 truncate text-2xl text-white">{formatCatalogClassCount(catalog?.assetClasses.length || classes.length - 1)}</p>
          <p className="mt-1 text-xs text-zinc-600">Versioned taxonomy</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.25rem] border border-white/[0.06] bg-[#080d0e]/96 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <form onSubmit={searchAssets} className="grid gap-3 border-b border-white/[0.06] p-4 lg:grid-cols-[minmax(16rem,1.3fr)_minmax(12rem,0.8fr)_minmax(8rem,0.55fr)_minmax(8rem,0.55fr)_minmax(9rem,0.65fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search global assets</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search BTC, Toyota, gold, fund name..."
              className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-white/[0.025] pl-9 pr-3 font-mono text-sm text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10"
            />
          </label>

          <label className="relative block min-w-0">
            <span className="sr-only">Filter by asset class</span>
            <select value={assetClass} onChange={(event) => setAssetClass(event.target.value)} className="h-10 w-full appearance-none rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 pr-8 text-sm text-zinc-200 outline-none focus:border-cyan-200/40" aria-label="Filter by asset class">
              {classes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <SelectChevron />
          </label>

          <label className="relative block">
            <span className="sr-only">Filter by ISO country</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
            <input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} maxLength={2} placeholder="Country" className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-[#0c1213] pl-9 pr-2 font-mono text-sm text-zinc-200 uppercase outline-none placeholder:normal-case placeholder:text-zinc-700 focus:border-cyan-200/40" aria-label="Filter by ISO country code" />
          </label>

          <label className="relative block">
            <span className="sr-only">Filter by currency</span>
            <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} placeholder="Currency" className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 font-mono text-sm text-zinc-200 uppercase outline-none placeholder:normal-case placeholder:text-zinc-700 focus:border-cyan-200/40" aria-label="Filter by currency" />
          </label>

          <label className="relative block">
            <span className="sr-only">Filter by exchange</span>
            <input value={exchange} onChange={(event) => setExchange(event.target.value)} placeholder="Exchange" className="h-10 w-full rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-cyan-200/40" aria-label="Filter by exchange" />
          </label>

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={loading} size="sm" className="border border-cyan-200/20 bg-cyan-200/[0.08] text-cyan-50 hover:bg-cyan-200/[0.15]">
              <Search className={loading ? "size-4 animate-pulse" : "size-4"} aria-hidden="true" />
              {loading ? "Searching" : "Search"}
            </Button>
            {(results.length > 0 || query || assetClass || countryCode || currency || exchange) ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearSearch} className="text-zinc-500 hover:text-zinc-200">Clear</Button>
            ) : null}
          </div>
        </form>

        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <SlidersHorizontal className="size-3.5 text-zinc-600" aria-hidden="true" />
            <span>{results.length > 0 ? `${results.length} provider-backed matches` : "Choose a class or search a ticker to begin"}</span>
          </div>
          <label className="relative flex items-center gap-2 text-xs text-zinc-500">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-8 appearance-none rounded-[0.6rem] border border-white/10 bg-[#0c1213] px-2 pr-7 text-xs text-zinc-300 outline-none focus:border-cyan-200/40" aria-label="Sort asset results">
              <option value="relevance">Relevance</option>
              <option value="class">Asset class</option>
              <option value="country">Country</option>
              <option value="price">Price</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
          </label>
        </div>

        {error ? (
          <div className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-200" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-medium text-white">Asset search unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p>
            </div>
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-[0.8rem] border border-cyan-200/15 bg-cyan-200/[0.045] text-cyan-100">
                <Globe2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg text-white">The global asset view starts with a real search.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Select any class, add an ISO country or currency filter, and search by a ticker, identifier, or name. Results stay tied to the configured market-data provider.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {classes.slice(0, 14).map((item) => (
                <button key={item.id} type="button" onClick={() => setAssetClass(item.id)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${assetClass === item.id ? "border-cyan-200/40 bg-cyan-200/10 text-cyan-50" : "border-white/10 bg-white/[0.02] text-cyan-50/65 hover:border-cyan-200/25 hover:text-zinc-200"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="market-table hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-white/[0.018] text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Asset <ArrowUpDown className="ml-1 inline size-3" aria-hidden="true" /></th>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 font-medium">Exchange</th>
                    <th className="px-4 py-3 font-medium">Currency</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 text-right font-medium">1d <ArrowDown className="ml-1 inline size-3" aria-hidden="true" /></th>
                  </tr>
                </thead>
                <tbody>{sortedResults.map((asset) => <AssetResultRow key={`${asset.provider ?? "provider"}:${asset.ticker}:${asset.exchange}`} asset={asset} />)}</tbody>
              </table>
            </div>
            <div className="md:hidden">{sortedResults.map((asset) => <AssetResultCard key={`${asset.provider ?? "provider"}:${asset.ticker}:${asset.exchange}`} asset={asset} />)}</div>
          </>
        )}

        <footer className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-3 text-[0.68rem] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>{catalog?.currencyStandard || "ISO 4217 currency filters"}. Provider coverage is explicit.</span>
          <span className="inline-flex items-center gap-1.5"><Database className="size-3" aria-hidden="true" />Search results are provider-reported. Not financial advice.</span>
        </footer>
      </section>
    </div>
  );
}
