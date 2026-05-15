import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpenCheck, FileText, Target } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";

const features: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Portfolio workspace", body: "Holdings, allocation, watchlist, risk flags, and data freshness in one decision-support surface.", icon: BarChart3 },
  { title: "Research room", body: "Saved AI briefs, cited facts, assumptions, and follow-up questions without pretending to be advice.", icon: BookOpenCheck },
  { title: "Filing intelligence", body: "SEC filing summaries with source links, section context, and stale-data disclosure.", icon: FileText },
  { title: "Goal scenarios", body: "Educational milestones and contribution scenarios framed around planning discipline, not promised returns.", icon: Target },
];

export default function ProductPage() {
  return (
    <MarketingPage>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Product</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            A finance workspace built around evidence, ownership, and safe AI boundaries.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-400">
            The MVP focuses on a precise golden path: load a portfolio, inspect exposures,
            generate a real AI brief through application-owned tools, and save the cited result.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
              <feature.icon className="size-5 text-cyan-200" />
              <h2 className="mt-5 text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingPage>
  );
}
