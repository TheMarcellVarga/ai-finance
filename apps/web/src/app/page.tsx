import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSearch, LockKeyhole, Radar } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";
import { MarketShell } from "@/components/market-shell";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: FileSearch,
    title: "Cited research briefs",
    body: "Portfolio and asset summaries are designed around source-backed facts, assumptions, and freshness labels.",
  },
  {
    icon: Radar,
    title: "Risk context first",
    body: "Allocation, concentration, volatility proxies, and watchlist movement are framed as review areas, not instructions.",
  },
  {
    icon: LockKeyhole,
    title: "Secure backend boundary",
    body: "Next.js owns the product and AI UX while Go owns authoritative finance APIs and ownership enforcement.",
  },
];

export default function Home() {
  return (
    <MarketingPage>
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/8 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
            AI financial research workspace
          </p>
          <h1 className="text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Portfolio intelligence with sources, safety, and structure.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">
            Aperture helps users inspect portfolios, research assets, summarize filings,
            and compare goal scenarios with AI-assisted outputs that show citations,
            assumptions, and data freshness.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-cyan-200 text-zinc-950 hover:bg-cyan-100">
              <Link href="/app">
                Open workspace scaffold
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/[0.03] text-white hover:bg-white/10">
              <Link href="/product">Review product plan</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
            {["No trade execution", "No return promises", "Not financial advice"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-cyan-200" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <MarketShell />
      </section>
      <section className="border-t border-white/10 bg-zinc-950/45">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Icon className="size-5 text-cyan-200" />
                <h2 className="mt-5 text-lg font-semibold text-white">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{pillar.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </MarketingPage>
  );
}
