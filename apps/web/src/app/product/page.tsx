import type { LucideIcon } from "lucide-react";
import { BarChart3, BookOpenCheck, FileText, Target } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";

const features: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Portfolio workspace", body: "Holdings, allocation, watchlist, risk flags, and data freshness in one decision-support surface.", icon: BarChart3 },
  { title: "Research room", body: "Saved AI briefs, cited facts, assumptions, and follow-up questions without pretending to be advice.", icon: BookOpenCheck },
  { title: "Filing intelligence", body: "SEC filing summaries with source links, section context, and stale-data disclosure.", icon: FileText },
  { title: "Goal scenarios", body: "Educational milestones and contribution scenarios framed around planning discipline, not promised returns.", icon: Target },
];

const featureMeta = ["Freshness labels", "Saved citations", "SEC source links", "No return promises"];

export default function ProductPage() {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-shell rounded-[1.25rem] p-6 sm:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  Product
                </p>
                <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Evidence, ownership, and safe AI boundaries in one dark workspace.
                </h1>
                <p className="mt-6 text-base leading-7 text-zinc-400">
                  The MVP focuses on a precise golden path: load a portfolio, inspect exposures,
                  generate a real AI brief through application-owned tools, and save the cited result.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {features.map((feature, index) => (
                  <article key={feature.title} className="glass-surface glass-hover rounded-[1.15rem] p-6">
                    <div className="flex items-start justify-between gap-3">
                      <feature.icon className="size-5 text-cyan-200" />
                      <span className="rounded-full bg-cyan-200/8 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-cyan-100">
                        {featureMeta[index]}
                      </span>
                    </div>
                    <h2 className="mt-6 text-xl font-semibold text-white">{feature.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{feature.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
