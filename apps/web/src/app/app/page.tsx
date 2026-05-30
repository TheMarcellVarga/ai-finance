import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CircleGauge,
  Clock3,
  Goal,
  Radar,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { getUsageSummaryForToken } from "@/lib/billing/usage";
import {
  loadRealProviderPortfolio,
  loadRealProviderWatchlist,
} from "@/lib/finance-api";

export const dynamic = "force-dynamic";

const fallbackDevToken = process.env.FINANCE_API_DEV_TOKEN ?? "dev:user_demo";

function percentFromBps(value?: number) {
  return `${((value ?? 0) / 100).toFixed(1)}%`;
}

function formatMove(value?: number) {
  const move = (value ?? 0) / 100;
  return `${move > 0 ? "+" : ""}${move.toFixed(1)}%`;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Awaiting provider";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function loadOverviewData() {
  const [portfolioResult, watchlistResult, usageResult] = await Promise.allSettled([
    loadRealProviderPortfolio(),
    loadRealProviderWatchlist(),
    getUsageSummaryForToken(fallbackDevToken),
  ]);

  return {
    portfolio: portfolioResult.status === "fulfilled" ? portfolioResult.value.data : null,
    watchlist: watchlistResult.status === "fulfilled" ? watchlistResult.value.data : null,
    usage: usageResult.status === "fulfilled" ? usageResult.value : null,
    marketDataAvailable: portfolioResult.status === "fulfilled" || watchlistResult.status === "fulfilled",
  };
}

export default async function AppOverviewPage() {
  const { portfolio, watchlist, usage, marketDataAvailable } = await loadOverviewData();
  const topHolding = portfolio ? [...portfolio.holdings].sort((left, right) => right.weightBps - left.weightBps)[0] : undefined;
  const watchlistItems = watchlist ? [...watchlist.items].sort(
    (left, right) => Math.abs(right.asset.dailyChangeBps ?? 0) - Math.abs(left.asset.dailyChangeBps ?? 0),
  ) : undefined;
  const largestMove = watchlistItems?.[0];
  const aiUsage = usage?.features.find((feature) => feature.feature === "portfolio_brief");

  const summaryMetrics = [
    {
      label: "Portfolio value",
      value: portfolio?.summary.displayTotalValue ?? "--",
      detail: portfolio ? `${portfolio.summary.holdingCount} source-backed positions` : "Finance API unavailable",
      icon: WalletCards,
      tone: "cyan",
    },
    {
      label: "Concentration",
      value: topHolding ? percentFromBps(topHolding.weightBps) : "--",
      detail: topHolding ? `${topHolding.asset.ticker} largest allocation` : "Awaiting portfolio snapshot",
      icon: CircleGauge,
      tone: portfolio && portfolio.summary.reviewFlags > 0 ? "amber" : "cyan",
    },
    {
      label: "Watchlist focus",
      value: largestMove?.asset.ticker ?? "--",
      detail: largestMove ? `${formatMove(largestMove.asset.dailyChangeBps)} provider-reported move` : "Awaiting market feed",
      icon: Radar,
      tone: "cyan",
    },
    {
      label: "Research usage",
      value: aiUsage ? `${aiUsage.used}/${aiUsage.limit}` : "--",
      detail: usage ? `${usage.entitlements.label} plan · ${usage.period}` : "Usage service unavailable",
      icon: Sparkles,
      tone: "amber",
    },
  ];

  const researchAreas = [
    {
      href: "/app/research",
      eyebrow: "Research room",
      title: "Source-backed briefings",
      body: "Review filing highlights, retrieved evidence, citations, and follow-up questions.",
      icon: BookOpenCheck,
      meta: "Citations visible",
    },
    {
      href: "/app/goals",
      eyebrow: "Goal intelligence",
      title: "Scenario planning",
      body: "Track milestones and contribution scenarios without return promises or suitability claims.",
      icon: Goal,
      meta: "Education focused",
    },
    {
      href: "/app/risk",
      eyebrow: "Risk review",
      title: "Allocation context",
      body: "Surface concentration signals, assumptions, and the questions worth researching next.",
      icon: ShieldCheck,
      meta: portfolio ? `${portfolio.summary.reviewFlags} review flags` : "Snapshot pending",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="workspace-hero-glow" aria-hidden="true" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_20rem] xl:items-end">
          <div className="max-w-3xl">
            <p className="type-label inline-flex rounded-[0.9rem] border border-cyan-200/10 bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Overview
            </p>
            <h1 className="type-display mt-6 text-4xl text-white sm:text-5xl">Your research day, composed.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300/80">
              A quiet summary of portfolio context, watchlist movement, saved research, goal scenarios, and risk review.
            </p>
          </div>
          <div className="workspace-sync rounded-[1rem] border border-white/10 bg-black/18 p-4">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${marketDataAvailable ? "bg-cyan-200 shadow-[0_0_0_6px_rgba(103,232,249,0.08)]" : "bg-amber-200 shadow-[0_0_0_6px_rgba(253,230,138,0.08)]"}`} />
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-zinc-500">Workspace pulse</p>
                <p className="mt-2 text-sm text-zinc-100">
                  {marketDataAvailable ? "Source-aware context is ready." : "Local market services are offline."}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {portfolio ? `${portfolio.dataFreshness.provider} · ${formatTimestamp(portfolio.dataFreshness.capturedAt)}` : "Start local services to restore provider-backed values."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className={`overview-metric glass-surface rounded-[1rem] p-5 overview-metric-${tone}`}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">{label}</p>
              <Icon className={`size-4 ${tone === "amber" ? "text-amber-100/80" : "text-cyan-100/80"}`} />
            </div>
            <p className="mt-5 font-mono text-2xl font-light text-white">{value}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="type-label text-xs uppercase text-cyan-100/75">Portfolio</p>
              <h2 className="type-card-title mt-3 text-2xl text-white">Allocation review</h2>
            </div>
            <Link className="overview-link" href="/app/portfolio">
              Open portfolio
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {portfolio ? (
            <div className="mt-6 space-y-4">
              {portfolio.allocation.slice(0, 5).map((item) => (
                <div key={item.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 sm:grid-cols-[9rem_1fr_3.5rem]">
                  <span className="truncate text-xs text-zinc-400">{item.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <span
                      className={`block h-full rounded-full ${item.status === "review" ? "bg-amber-200/80" : "bg-cyan-200/75"}`}
                      style={{ width: `${Math.min(item.weightBps / 100, 100)}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-zinc-300">{percentFromBps(item.weightBps)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-[1rem] border border-amber-100/10 bg-amber-100/[0.035] p-4 text-sm leading-6 text-zinc-400">
              Portfolio values are hidden while the local finance API is unavailable. No estimated prices are substituted.
            </p>
          )}
        </div>

        <div className="section-shell rounded-[1.25rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="type-label text-xs uppercase text-amber-100/75">Watchlist</p>
              <h2 className="type-card-title mt-3 text-2xl text-white">Movement review</h2>
            </div>
            <Link className="overview-link" href="/app/watchlist">
              Open watchlist
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {watchlistItems?.length ? (
            <div className="mt-5 divide-y divide-white/8">
              {watchlistItems.slice(0, 4).map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-white">{item.asset.ticker}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{item.asset.name}</p>
                  </div>
                  <p className="font-mono text-sm text-zinc-300">{item.asset.displayPrice ?? "--"}</p>
                  <p className={`font-mono text-sm ${(item.asset.dailyChangeBps ?? 0) >= 0 ? "text-cyan-100" : "text-amber-100"}`}>
                    {formatMove(item.asset.dailyChangeBps)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-[1rem] border border-amber-100/10 bg-amber-100/[0.035] p-4 text-sm leading-6 text-zinc-400">
              Watchlist movement will appear when the provider-backed feed is available.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="type-label text-xs uppercase text-cyan-100/75">Research rhythm</p>
            <h2 className="type-card-title mt-3 text-2xl text-white">Continue your review</h2>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-zinc-600 sm:flex">
            <Clock3 className="size-3.5 text-amber-100/60" />
            Calm context, not alerts
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {researchAreas.map(({ href, eyebrow, title, body, icon: Icon, meta }) => (
            <Link key={href} className="overview-area glass-surface group rounded-[1.1rem] p-5" href={href}>
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-9 place-items-center rounded-[0.75rem] border border-cyan-200/15 bg-cyan-200/[0.055] text-cyan-100">
                  <Icon className="size-4" />
                </div>
                <ArrowRight className="size-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-cyan-100" />
              </div>
              <p className="type-label mt-6 text-[0.62rem] uppercase text-cyan-100/65">{eyebrow}</p>
              <h3 className="type-card-title mt-2 text-xl text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
              <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.15em] text-amber-100/65">{meta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell flex flex-col gap-4 rounded-[1.1rem] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-100/75" />
          <p className="max-w-3xl text-xs leading-5 text-zinc-500">
            Aperture supports research, risk explanation, and scenario review. It does not execute trades, provide personalized investment advice, or promise outcomes.
          </p>
        </div>
        <Link className="overview-link shrink-0" href="/app/settings">
          Review controls
          <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  );
}
