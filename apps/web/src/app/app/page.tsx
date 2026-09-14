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
  FinanceWorkspaceEmptyError,
  loadFinanceUsage,
  loadRealProviderPortfolio,
  loadRealProviderWatchlist,
} from "@/lib/finance-api";
import { authenticatedSessionToken } from "@/lib/server/identity";
import { OverviewCharts } from "@/components/overview-charts";

export const dynamic = "force-dynamic";

const unavailableValue = "N/A";

function percentFromBps(value?: number) {
  if (value == null) {
    return unavailableValue;
  }
  return `${(value / 100).toFixed(1)}%`;
}

function formatMove(value?: number) {
  if (value == null) {
    return unavailableValue;
  }
  const move = value / 100;
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

async function loadOverviewData(authToken: string) {
  const [portfolioResult, watchlistResult, usageResult, financeUsageResult] = await Promise.allSettled([
    loadRealProviderPortfolio(authToken),
    loadRealProviderWatchlist(authToken),
    getUsageSummaryForToken(authToken),
    loadFinanceUsage(authToken),
  ]);

  const financeUsage = financeUsageResult.status === "fulfilled" ? financeUsageResult.value.data : null;
  const persistedUsage = usageResult.status === "fulfilled" ? usageResult.value : null;

  return {
    portfolio: portfolioResult.status === "fulfilled" ? portfolioResult.value.data : null,
    watchlist: watchlistResult.status === "fulfilled" ? watchlistResult.value.data : null,
    portfolioEmpty: portfolioResult.status === "rejected" && portfolioResult.reason instanceof FinanceWorkspaceEmptyError,
    watchlistEmpty: watchlistResult.status === "rejected" && watchlistResult.reason instanceof FinanceWorkspaceEmptyError,
    usage: persistedUsage,
    financeUsage,
    marketDataAvailable: financeUsageResult.status === "fulfilled",
  };
}

export default async function AppOverviewPage() {
  const authToken = await authenticatedSessionToken();
  const { portfolio, portfolioEmpty, watchlist, watchlistEmpty, usage, financeUsage, marketDataAvailable } = await loadOverviewData(authToken);
  const topHolding = portfolio ? [...portfolio.holdings].sort((left, right) => right.weightBps - left.weightBps)[0] : undefined;
  const watchlistItems = watchlist ? [...watchlist.items].sort(
    (left, right) => Math.abs(right.asset.dailyChangeBps ?? 0) - Math.abs(left.asset.dailyChangeBps ?? 0),
  ) : undefined;
  const largestMove = watchlistItems?.[0];
  const aiUsage = usage?.features.find((feature) => feature.feature === "portfolio_brief")
    ?? financeUsage?.features.find((feature) => feature.feature === "portfolio_brief");

  const summaryMetrics = [
    {
      label: "Portfolio value",
      value: portfolio?.summary.displayTotalValue ?? unavailableValue,
      detail: portfolio ? `${portfolio.summary.holdingCount} source-backed positions` : portfolioEmpty ? "Add your first real holding" : "Finance API unavailable",
      icon: WalletCards,
      tone: "cyan",
    },
    {
      label: "Concentration",
      value: topHolding ? percentFromBps(topHolding.weightBps) : unavailableValue,
      detail: topHolding ? `${topHolding.asset.ticker} largest allocation` : portfolioEmpty ? "No portfolio data entered" : "Awaiting portfolio snapshot",
      icon: CircleGauge,
      tone: portfolio && portfolio.summary.reviewFlags > 0 ? "amber" : "cyan",
    },
    {
      label: "Watchlist focus",
      value: largestMove?.asset.ticker ?? unavailableValue,
      detail: largestMove ? `${formatMove(largestMove.asset.dailyChangeBps)} provider-reported move` : watchlistEmpty ? "Add a ticker to begin" : "Awaiting market feed",
      icon: Radar,
      tone: "cyan",
    },
    {
      label: "Research usage",
      value: aiUsage ? `${aiUsage.used}/${aiUsage.limit}` : unavailableValue,
      detail: usage ? `${usage.entitlements.label} plan · ${usage.period}` : financeUsage ? `${financeUsage.plan} plan · ${financeUsage.period}` : "Usage service unavailable",
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
            <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Overview
            </p>
            <h1 className="type-display mt-6 text-4xl text-white sm:text-5xl">Your research day, composed.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300/80">
              A quiet summary of portfolio context, watchlist movement, saved research, goal scenarios, and risk review.
            </p>
          </div>
          <div className="workspace-sync rounded-[1rem] p-4">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${marketDataAvailable ? "bg-cyan-200 shadow-[0_0_0_6px_rgba(103,232,249,0.08)]" : "bg-amber-200 shadow-[0_0_0_6px_rgba(253,230,138,0.08)]"}`} />
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-zinc-500">Workspace pulse</p>
                <p className="mt-2 text-sm text-zinc-100">
                  {marketDataAvailable ? "Source-aware context is ready." : "Local market services are offline."}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {portfolio ? `${portfolio.dataFreshness.provider} · ${formatTimestamp(portfolio.dataFreshness.capturedAt)}` : marketDataAvailable ? "Finance API connected · add your own data to begin." : "Start local services to restore provider-backed values."}
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
            <p className="mt-5 min-w-0 truncate font-mono text-2xl font-light text-white">{value}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
          </article>
        ))}
      </section>

      <OverviewCharts
        allocation={portfolio?.allocation ?? []}
        watchlist={(watchlistItems ?? []).map((item) => ({
          id: item.id,
          ticker: item.asset.ticker,
          name: item.asset.name,
          displayPrice: item.asset.displayPrice,
          dailyChangeBps: item.asset.dailyChangeBps,
        }))}
        provider={portfolio?.dataFreshness.provider ?? watchlist?.dataFreshness.provider}
        capturedAt={portfolio?.dataFreshness.capturedAt ?? watchlist?.dataFreshness.capturedAt}
        portfolioEmpty={portfolioEmpty}
        watchlistEmpty={watchlistEmpty}
      />

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
                <div className="grid size-9 place-items-center rounded-[0.75rem] bg-cyan-200/[0.055] text-cyan-100">
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
