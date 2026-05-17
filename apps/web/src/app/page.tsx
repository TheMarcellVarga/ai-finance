import Link from "next/link";
import { ArrowRight, Clock3, FileSearch, LockKeyhole, Radar, ShieldCheck } from "lucide-react";

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
        <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8">
        <div className="relative z-10 max-w-3xl lg:-translate-y-12">
          <p className="type-label mb-5 inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl">
            AI financial research workspace
          </p>
          <h1 className="type-display text-balance text-5xl text-white xl:text-6xl 2xl:text-7xl">
            Portfolio intelligence with sources, safety, and structure.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
            Aperture helps users inspect portfolios, research assets, summarize filings,
            and compare goal scenarios with AI-assisted outputs that show citations,
            assumptions, and data freshness.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-[0.95rem] px-5">
              <Link href="/app">
                Open workspace scaffold
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-[0.95rem] px-5"
            >
              <Link href="/product">Review product plan</Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
            {[
              { icon: Clock3, label: "Data age", value: "15 min" },
              { icon: FileSearch, label: "Sources", value: "12 cited" },
              { icon: ShieldCheck, label: "Advice guard", value: "active" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label} className="flex items-center justify-between gap-3 rounded-[1rem] bg-white/[0.035] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-cyan-200" />
                    {item.label}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-cyan-100">{item.value}</span>
                </span>
              );
            })}
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
              <article key={pillar.title} className="glass-surface rounded-[1.15rem] p-6">
                <Icon className="size-5 text-cyan-200" />
                <h2 className="type-card-title mt-5 text-lg text-white">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{pillar.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </MarketingPage>
  );
}
