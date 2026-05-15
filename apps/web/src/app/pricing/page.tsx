import { Check } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";

const tiers = [
  ["Free", "$0", "1 portfolio, 10 holdings, 1 watchlist, 5 AI briefs/month"],
  ["Pro", "$19", "5 portfolios, 100 holdings, 5 watchlists, 100 AI briefs/month"],
  ["Research Pro", "$49", "20 portfolios, filing summaries, 500 AI briefs/month"],
  ["Team/Advisor", "Custom", "Shared research rooms, audit export, organization controls"],
];

export default function PricingPage() {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-shell rounded-[2.5rem] p-6 sm:p-10 lg:p-12">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-cyan-200/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                Pricing
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                Research entitlements without trading incentives.
              </h1>
            </div>
            <div className="mt-12 grid gap-4 lg:grid-cols-4">
              {tiers.map(([name, price, limit], index) => (
                <article key={name} className={`glass-surface glass-hover rounded-[2rem] p-6 ${index === 1 ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_30px_90px_rgba(103,232,249,0.1)]" : ""}`}>
                  <h2 className="text-lg font-semibold text-white">{name}</h2>
                  <p className="mt-6 font-mono text-4xl font-light text-white">{price}</p>
                  <div className="soft-divider my-6 h-px" />
                  <p className="flex gap-2 text-sm leading-6 text-zinc-400">
                    <Check className="mt-1 size-4 shrink-0 text-cyan-200" />
                    {limit}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
