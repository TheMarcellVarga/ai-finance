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
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Entitlements designed for research usage, not trading activity.
          </h1>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {tiers.map(([name, price, limit]) => (
            <article key={name} className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
              <h2 className="text-lg font-semibold text-white">{name}</h2>
              <p className="mt-5 font-mono text-3xl text-white">{price}</p>
              <p className="mt-5 flex gap-2 text-sm leading-6 text-zinc-400">
                <Check className="mt-1 size-4 shrink-0 text-cyan-200" />
                {limit}
              </p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPage>
  );
}
