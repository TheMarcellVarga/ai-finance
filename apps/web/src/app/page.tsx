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
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.18),transparent_24rem),radial-gradient(circle_at_72%_24%,rgba(39,39,42,0.72),transparent_26rem),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.72)_72%)]" />
        <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-45" />
        <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex rounded-full bg-cyan-200/8 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            AI financial research workspace
          </p>
          <h1 className="text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Portfolio intelligence with sources, safety, and structure.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">
            Aperture helps users inspect portfolios, research assets, summarize filings,
            and compare goal scenarios with AI-assisted outputs that show citations,
            assumptions, and data freshness.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full bg-cyan-200 px-5 text-zinc-950 shadow-[0_18px_50px_rgba(103,232,249,0.18)] hover:bg-cyan-100">
              <Link href="/app">
                Open workspace scaffold
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" className="rounded-full bg-white/[0.035] px-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl hover:bg-white/10">
              <Link href="/product">Review product plan</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
            {["No trade execution", "No return promises", "Not financial advice"].map((item) => (
              <span key={item} className="glass-hover flex items-center gap-2 rounded-2xl bg-white/[0.035] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                <CheckCircle2 className="size-4 text-cyan-200" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <MarketShell />
        </div>
        </div>
      </section>
      <section className="bg-zinc-950/70">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className="glass-surface glass-hover rounded-[1.75rem] p-6">
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
