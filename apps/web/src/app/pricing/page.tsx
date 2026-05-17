import { Gauge } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";

const tiers = [
  ["Free", "$0", "1 portfolio", "5 AI briefs/mo", "10 holdings"],
  ["Pro", "$19", "5 portfolios", "100 AI briefs/mo", "100 holdings"],
  ["Research Pro", "$49", "20 portfolios", "500 AI briefs/mo", "filing summaries"],
  ["Team/Advisor", "Custom", "shared rooms", "audit export", "org controls"],
];

export default function PricingPage() {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.14),transparent_24rem),radial-gradient(circle_at_76%_22%,rgba(39,39,42,0.7),transparent_28rem),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.62)_76%)]" />
        <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-35" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="section-shell rounded-[1.25rem] p-6 sm:p-10 lg:p-12">
            <div className="max-w-4xl">
              <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                Pricing
              </p>
              <h1 className="type-display mt-6 text-balance text-4xl text-white sm:text-6xl">
                Research entitlements without trading incentives.
              </h1>
            </div>
            <div className="mt-12 grid gap-4 lg:grid-cols-4">
              {tiers.map(([name, price, portfolios, briefs, scope], index) => (
                <article key={name} className={`glass-hover glass-surface rounded-[1.15rem] p-6 ${index === 1 ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_26px_78px_rgba(103,232,249,0.09)]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="type-card-title text-lg text-white">{name}</h2>
                    <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500">
                      Research
                    </span>
                  </div>
                  <p className="mt-6 font-mono text-4xl font-light text-white">{price}</p>
                  <div className="soft-divider my-6 h-px" />
                  <div className="space-y-3 text-sm text-zinc-400">
                    {[portfolios, briefs, scope].map((item) => (
                      <p key={item} className="flex items-center justify-between gap-3">
                        <span>{item}</span>
                        <Gauge className="size-4 shrink-0 text-cyan-200/80" />
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
