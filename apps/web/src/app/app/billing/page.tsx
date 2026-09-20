import { AlertTriangle, CheckCircle2, Gauge, ShieldCheck, WalletCards } from "lucide-react";

import { PLAN_ENTITLEMENTS, type PlanTier } from "@/lib/billing/entitlements";
import { getUsageSummaryForToken } from "@/lib/billing/usage";
import { authenticatedSessionToken } from "@/lib/server/identity";

const tierOrder: PlanTier[] = ["free", "pro", "research_pro", "team"];

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const usage = await getUsageSummaryForToken(await authenticatedSessionToken());

  return (
    <div className="space-y-6">
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100">
              Billing
            </p>
            <h1 className="type-display mt-5 text-3xl text-white sm:text-4xl">Plan, usage, and research limits.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              Stripe controls subscription state. Server-side entitlements limit portfolios, watchlists, AI briefs,
              filing summaries, and saved research without adding trading incentives.
            </p>
          </div>
          <div className="glass-surface w-full rounded-[1rem] p-5 lg:max-w-sm">
            <div className="flex items-center gap-3">
              <WalletCards className="size-5 text-cyan-200" />
              <div>
                <p className="text-sm text-zinc-400">Current plan</p>
                <p className="type-card-title text-xl text-white">{usage.entitlements.label}</p>
              </div>
            </div>
            <div className="soft-divider my-5 h-px" />
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              {usage.configured ? <CheckCircle2 className="size-4 text-emerald-300" /> : <AlertTriangle className="size-4 text-amber-300" />}
              <span>
                {usage.configured
                  ? `Usage period ${usage.period}. Billing state: ${usage.billingState}.`
                  : usage.message}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {tierOrder.map((tier) => {
          const entitlements = PLAN_ENTITLEMENTS[tier];
          const active = usage.plan === tier;
          return (
            <article key={tier} className={`glass-surface rounded-[1rem] p-5 ${active ? "shadow-[0_22px_68px_rgba(0,0,0,0.34)]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="type-card-title text-lg text-white">{entitlements.label}</h2>
                  <p className="mt-2 font-mono text-3xl text-white">{entitlements.monthlyPrice}</p>
                </div>
                {active ? <ShieldCheck className="size-5 text-cyan-200" /> : <Gauge className="size-5 text-zinc-500" />}
              </div>
              <div className="soft-divider my-5 h-px" />
              <div className="space-y-3 text-sm text-zinc-400">
                <p>{entitlements.portfolios} portfolios</p>
                <p>{entitlements.holdings} holdings</p>
                <p>{entitlements.watchlists} watchlists</p>
                <p>{entitlements.aiBriefsPerMonth} AI research briefs/month</p>
                <p>{entitlements.savedResearchItems} saved research items</p>
                <p>{entitlements.filingSummaries ? "Filing summaries included" : "Filing summaries locked"}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="type-label text-xs uppercase text-cyan-100">Usage</p>
            <h2 className="type-card-title mt-3 text-2xl text-white">Current billing period</h2>
          </div>
          <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">{usage.period}</span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {usage.features.map((feature) => {
            const width = feature.limit > 0 ? Math.min(100, Math.round((feature.used / feature.limit) * 100)) : 0;
            return (
              <div key={feature.feature} className="rounded-[0.85rem] bg-black/18 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="capitalize text-zinc-300">{feature.feature.replace(/_/g, " ")}</span>
                  <span className="font-mono text-zinc-500">
                    {feature.used}/{feature.limit}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-cyan-200" style={{ width: `${width}%` }} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-zinc-500">{feature.status}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
