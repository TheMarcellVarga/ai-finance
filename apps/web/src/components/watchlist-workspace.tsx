"use client";

import { FormEvent, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Plus, Radar, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FinanceWatchlistResponse } from "@/lib/finance-api";

type Watchlist = FinanceWatchlistResponse["data"];
type WatchlistMeta = FinanceWatchlistResponse["meta"];

type WatchlistWorkspaceProps = {
  initialWatchlist?: Watchlist;
  initialMeta?: WatchlistMeta;
  initialError?: string;
};

type WatchlistRouteError = { error?: { message?: string } };

function routeErrorMessage(payload: FinanceWatchlistResponse | WatchlistRouteError, fallback: string) {
  return "error" in payload ? (payload.error?.message ?? fallback) : fallback;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Pending provider timestamp";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBps(value?: number) {
  if (value == null) {
    return "N/A";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value / 100).toFixed(1)}%`;
}

export function WatchlistWorkspace({ initialWatchlist, initialMeta, initialError }: WatchlistWorkspaceProps) {
  const [watchlist, setWatchlist] = useState<Watchlist | null>(initialWatchlist ?? null);
  const [meta, setMeta] = useState<WatchlistMeta | null>(initialMeta ?? null);
  const [ticker, setTicker] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const sortedItems = useMemo(() => {
    return [...(watchlist?.items ?? [])].sort((a, b) => {
      const left = Math.abs(a.asset.dailyChangeBps ?? 0);
      const right = Math.abs(b.asset.dailyChangeBps ?? 0);
      return right - left;
    });
  }, [watchlist]);

  const largestMove = sortedItems[0];
  const provider = watchlist?.dataFreshness.provider ?? meta?.provider ?? "market data provider";
  const freshness = watchlist?.dataFreshness.freshness ?? meta?.freshness ?? "provider-reported";
  const capturedAt = watchlist?.dataFreshness.capturedAt ?? meta?.capturedAt;

  async function refreshWatchlist() {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/finance/watchlist", { cache: "no-store" });
      const payload = (await response.json()) as FinanceWatchlistResponse | WatchlistRouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error(routeErrorMessage(payload, "The watchlist feed is unavailable."));
      }
      setWatchlist(payload.data);
      setMeta(payload.meta);
      setStatus("Watchlist refreshed from the finance API.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The watchlist feed is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticker.trim()) {
      setError("Enter a ticker before adding it to the watchlist.");
      return;
    }
    setAdding(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/finance/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase(), notes: notes.trim() || undefined }),
      });
      const payload = (await response.json()) as FinanceWatchlistResponse | WatchlistRouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error(routeErrorMessage(payload, "The ticker could not be added."));
      }
      setWatchlist(payload.data);
      setMeta(payload.meta);
      setTicker("");
      setNotes("");
      setStatus("Ticker added with provider freshness metadata.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The ticker could not be added.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Watchlist
            </p>
            <h1 className="type-display mt-6 text-3xl text-white sm:text-5xl">Market movement review</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Track provider-backed equities and ETFs with visible freshness, movement, and research notes. This surface supports monitoring and follow-up research only.
            </p>
          </div>
          <div className="glass-surface rounded-[1rem] p-5">
            <div className="flex items-start gap-3">
              <Radar className="mt-1 size-5 text-cyan-200" />
              <div>
                <p className="text-sm text-zinc-400">Largest move</p>
                <p className="mt-1 truncate font-mono text-2xl text-white">{largestMove?.asset.ticker ?? "N/A"}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {largestMove ? `${formatBps(largestMove.asset.dailyChangeBps)} provider-reported move` : "Refresh after starting the finance API."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="glass-surface rounded-[1.1rem] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-4 text-amber-200" />
            <div>
              <p className="text-sm font-medium text-white">Watchlist data is unavailable.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">No movement or price value is estimated while the provider feed is unavailable.</p>
            </div>
          </div>
        </section>
      ) : null}

      {status ? (
        <section className="rounded-[1rem] bg-emerald-200/8 p-4 text-sm text-emerald-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            {status}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.76fr_0.24fr]">
        <div className="glass-surface overflow-hidden rounded-[1.25rem]">
          <div className="flex flex-col gap-4 p-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="type-card-title text-xl text-white">{watchlist?.name ?? "Research watchlist"}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {provider} · {freshness} · {formatTimestamp(capturedAt)}
              </p>
            </div>
            <Button onClick={refreshWatchlist} disabled={loading} variant="outline" className="w-full sm:w-fit">
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              {loading ? "Refreshing" : "Refresh"}
            </Button>
          </div>

          <div className="divide-y divide-white/8">
            {sortedItems.length > 0 ? (
              sortedItems.map((item) => (
                <article key={item.id} className="grid gap-4 p-5 md:grid-cols-[0.72fr_0.16fr_0.12fr] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-mono text-lg text-white">{item.asset.ticker}</p>
                      <span className="rounded-full bg-white/[0.03] px-2 py-1 text-xs text-zinc-500">
                        {item.asset.exchange || item.asset.type}
                      </span>
                      {item.asset.sector ? (
                        <span className="rounded-full bg-cyan-200/8 px-2 py-1 text-xs text-cyan-100/80">
                          {item.asset.sector}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 truncate text-sm font-medium text-zinc-200">{item.asset.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{item.notes || "Review filing updates, price context, and portfolio fit before making any decision."}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Price</p>
                    <p className="mt-2 truncate font-mono text-lg text-white">{item.asset.displayPrice ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Move</p>
                    <p
                      className={`mt-2 font-mono text-lg ${
                        item.asset.dailyChangeBps == null ? "text-zinc-500" : item.asset.dailyChangeBps >= 0 ? "text-emerald-100" : "text-rose-100"
                      }`}
                    >
                      {formatBps(item.asset.dailyChangeBps)}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-8">
                <Search className="size-5 text-cyan-200" />
                <h2 className="mt-4 text-xl font-medium text-white">Start with a provider-backed ticker.</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  Add an equity or ETF to populate price, movement, source, and freshness metadata from the finance API.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <form onSubmit={addItem} className="glass-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-3">
              <Plus className="size-5 text-cyan-200" />
              <h2 className="type-card-title text-lg text-white">Add ticker</h2>
            </div>
            <label className="mt-5 block text-sm text-zinc-300" htmlFor="watchlist-ticker">
              Ticker
            </label>
            <input
              id="watchlist-ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              className="mt-2 h-10 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-sm text-white outline-none transition focus:border-cyan-200/40"
              aria-label="Ticker symbol, for example VTI"
            />
            <label className="mt-4 block text-sm text-zinc-300" htmlFor="watchlist-notes">
              Research note
            </label>
            <textarea
              id="watchlist-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm leading-6 text-white outline-none transition focus:border-cyan-200/40"
              aria-label="Research note"
            />
            <p className="mt-3 text-xs leading-5 text-zinc-500">Adding a ticker records research context only. It does not create an order or investment recommendation.</p>
            <Button disabled={adding} className="mt-5 w-full">
              <Plus className="size-4" />
              {adding ? "Adding" : "Add to watchlist"}
            </Button>
          </form>

          <div className="glass-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-3">
              <Activity className="size-5 text-cyan-200" />
              <h2 className="type-card-title text-lg text-white">Review rules</h2>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <p>Provider values carry visible timestamps and are not treated as real-time quotes.</p>
              <p>Movement explanations should be checked against filings, portfolio concentration, and stated assumptions.</p>
              <p>The workspace avoids buy, sell, hold, and suitability instructions.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
