"use client";

import { useMemo, useState } from "react";
import { BarChart3, Database, Plus, RefreshCw, Search, ShieldCheck, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";

type Holding = {
  ticker: string;
  name: string;
  sector: string;
  quantity: number;
  price: number;
  averageCost: number;
  changeBps: number;
};

const seedHoldings: Holding[] = [
  { ticker: "NVDA", name: "NVIDIA Corporation", sector: "Technology", quantity: 420, price: 135.57, averageCost: 118.2, changeBps: 118 },
  { ticker: "MSFT", name: "Microsoft Corporation", sector: "Technology", quantity: 120, price: 460.39, averageCost: 405.1, changeBps: 31 },
  { ticker: "VTI", name: "Vanguard Total Stock Market ETF", sector: "Diversified", quantity: 185, price: 305.18, averageCost: 281.42, changeBps: 24 },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", quantity: 90, price: 271.12, averageCost: 238.84, changeBps: -18 },
  { ticker: "BND", name: "Vanguard Total Bond Market ETF", sector: "Fixed Income", quantity: 320, price: 72.44, averageCost: 73.1, changeBps: -5 },
];

const emptyHoldings: Holding[] = [];

const watchlist = [
  ["AAPL", "Apple Inc.", "+0.42%", "Technology"],
  ["NVDA", "NVIDIA Corporation", "+1.18%", "Technology"],
  ["MSFT", "Microsoft Corporation", "+0.31%", "Technology"],
  ["VTI", "Vanguard Total Stock Market ETF", "+0.24%", "Diversified"],
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function percentFromBps(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

export function PortfolioWorkspace() {
  const [created, setCreated] = useState(false);
  const holdings = created ? seedHoldings : emptyHoldings;

  const summary = useMemo(() => {
    const total = holdings.reduce((sum, holding) => sum + holding.quantity * holding.price, 0);
    const allocation = holdings.reduce<Record<string, number>>((acc, holding) => {
      acc[holding.sector] = (acc[holding.sector] ?? 0) + holding.quantity * holding.price;
      return acc;
    }, {});
    const rows = Object.entries(allocation)
      .map(([label, value]) => ({
        label,
        value,
        weightBps: total > 0 ? Math.round((value / total) * 10000) : 0,
      }))
      .sort((a, b) => b.weightBps - a.weightBps);
    const topHolding = holdings
      .map((holding) => ({
        ...holding,
        value: holding.quantity * holding.price,
        weightBps: total > 0 ? Math.round(((holding.quantity * holding.price) / total) * 10000) : 0,
      }))
      .sort((a, b) => b.weightBps - a.weightBps)[0];

    return { total, allocation: rows, topHolding };
  }, [holdings]);

  return (
    <div className="space-y-6">
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Phase 4 workspace
            </p>
            <h1 className="type-display mt-6 text-3xl text-white sm:text-5xl">
              Portfolio decision-support cockpit
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Create a deterministic demo portfolio, review holdings, inspect concentration, and track a watchlist with cached market-data freshness. Research output remains decision support, not advice.
            </p>
          </div>
          <Button onClick={() => setCreated(true)} disabled={created} size="lg" className="w-full sm:w-fit">
            <Plus className="size-4" />
            {created ? "Demo portfolio loaded" : "Create demo portfolio"}
          </Button>
        </div>
      </section>

      {!created ? (
        <section className="glass-surface rounded-[1.25rem] p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Create", "Seed an owner-scoped research portfolio with curated US equities and ETFs."],
              ["Review", "Inspect allocation, holdings, watchlist movement, and stale-data labels."],
              ["Protect", "Backend routes enforce Clerk identity and return 404 across owner boundaries."],
            ].map(([title, body], index) => (
              <div key={title} className="rounded-[1rem] bg-black/18 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="font-mono text-xs text-cyan-100">0{index + 1}</p>
                <h2 className="type-card-title mt-4 text-xl text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Portfolio value", money(summary.total), "cached close"],
              ["Top concentration", summary.topHolding ? `${summary.topHolding.ticker} ${percentFromBps(summary.topHolding.weightBps)}` : "None", "review flag"],
              ["Holdings", String(holdings.length), "curated universe"],
              ["Freshness", "May 22, 2026", "demo-seed"],
            ].map(([label, value, meta]) => (
              <div key={label} className="glass-surface rounded-[1rem] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                <p className="mt-3 font-mono text-2xl font-light text-white">{value}</p>
                <p className="mt-2 text-xs text-cyan-100/70">{meta}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-white">
                    <WalletCards className="size-4 text-cyan-200" />
                    Holdings
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Values use cached demo close prices.</p>
                </div>
                <Button variant="outline" size="sm">
                  <Search className="size-3.5" />
                  Asset search
                </Button>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                    <tr>
                      <th className="py-3 font-normal">Asset</th>
                      <th className="py-3 font-normal">Qty</th>
                      <th className="py-3 font-normal">Last</th>
                      <th className="py-3 font-normal">Value</th>
                      <th className="py-3 font-normal">Weight</th>
                      <th className="py-3 font-normal">Move</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {holdings.map((holding) => {
                      const value = holding.quantity * holding.price;
                      const weight = summary.total > 0 ? (value / summary.total) * 100 : 0;
                      return (
                        <tr key={holding.ticker} className="text-zinc-300">
                          <td className="py-4">
                            <span className="block font-mono text-white">{holding.ticker}</span>
                            <span className="mt-1 block text-xs text-zinc-500">{holding.name}</span>
                          </td>
                          <td className="py-4 font-mono">{holding.quantity}</td>
                          <td className="py-4 font-mono">{money(holding.price)}</td>
                          <td className="py-4 font-mono text-white">{money(value)}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                                <span className="block h-full rounded-full bg-cyan-200/80" style={{ width: `${Math.min(weight, 100)}%` }} />
                              </span>
                              <span className="font-mono text-xs">{weight.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className={holding.changeBps >= 0 ? "py-4 font-mono text-emerald-200" : "py-4 font-mono text-amber-200"}>
                            {holding.changeBps >= 0 ? "+" : ""}
                            {percentFromBps(holding.changeBps)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 rounded-[1rem] bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-white">Recent transactions</p>
                  <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Seeded ledger</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {holdings.slice(0, 4).map((holding) => (
                    <div key={`txn-${holding.ticker}`} className="flex items-center justify-between gap-3 rounded-[0.85rem] bg-white/[0.035] px-3 py-2 text-xs">
                      <span>
                        <span className="block font-mono text-zinc-200">{holding.ticker}</span>
                        <span className="mt-0.5 block text-zinc-600">Buy - May 1, 2026</span>
                      </span>
                      <span className="font-mono text-zinc-300">{money(holding.quantity * holding.averageCost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-sm text-white">
                  <BarChart3 className="size-4 text-cyan-200" />
                  Allocation
                </div>
                <div className="mt-5 space-y-4">
                  {summary.allocation.map((row) => (
                    <div key={row.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400">{row.label}</span>
                        <span className={row.weightBps >= 3500 ? "font-mono text-amber-100" : "font-mono text-zinc-300"}>
                          {percentFromBps(row.weightBps)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={row.weightBps >= 3500 ? "h-full rounded-full bg-amber-200/80" : "h-full rounded-full bg-cyan-200/80"} style={{ width: `${row.weightBps / 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <RefreshCw className="size-4 text-cyan-200" />
                    Watchlist
                  </div>
                  <span className="rounded-full bg-cyan-200/8 px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-cyan-100">Cached</span>
                </div>
                <div className="mt-4 space-y-2">
                  {watchlist.map(([ticker, name, move, sector]) => (
                    <div key={ticker} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-[0.9rem] bg-black/18 px-3 py-3">
                      <span className="font-mono text-sm text-white">{ticker}</span>
                      <span className="min-w-0 text-xs text-zinc-400">
                        <span className="block truncate">{name}</span>
                        <span className="mt-0.5 block text-zinc-600">{sector}</span>
                      </span>
                      <span className="font-mono text-xs text-emerald-200">{move}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="glass-surface rounded-[1rem] p-5">
              <div className="flex items-start gap-3">
                <Database className="mt-1 size-4 text-cyan-200" />
                <p className="text-sm leading-6 text-zinc-400">
                  Market values use deterministic cached demo data from <span className="font-mono text-zinc-200">demo-seed</span>, captured May 22, 2026 at 21:00 UTC. Provider failures should keep this display usable with stale-data disclosure.
                </p>
              </div>
            </div>
            <div className="glass-surface rounded-[1rem] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 size-4 text-cyan-200" />
                <p className="text-sm leading-6 text-zinc-400">
                  This workspace supports research and scenario review only. It does not execute trades, provide personalized advice, or make buy/sell/hold recommendations.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
