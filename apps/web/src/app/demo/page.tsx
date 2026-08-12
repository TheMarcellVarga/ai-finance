import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileText, ShieldCheck } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";
import { Button } from "@/components/ui/button";

const holdings = [
  { ticker: "VTI", name: "Total US market", weight: "42.0%", tone: "bg-cyan-200/80" },
  { ticker: "VXUS", name: "International equity", weight: "24.0%", tone: "bg-cyan-200/60" },
  { ticker: "BND", name: "Total bond market", weight: "20.0%", tone: "bg-amber-200/75" },
  { ticker: "CASH", name: "Cash reserve", weight: "14.0%", tone: "bg-zinc-300/45" },
];

const briefPoints = [
  "The sample portfolio is diversified across domestic equity, international equity, bonds, and cash.",
  "The largest review prompt is allocation drift, not a buy or sell instruction.",
  "Every conclusion stays paired with a source, freshness label, and explicit assumption.",
];

export default function DemoPage() {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.14),transparent_24rem),radial-gradient(circle_at_76%_22%,rgba(39,39,42,0.7),transparent_28rem),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.62)_76%)]" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="section-shell rounded-[1.25rem] p-6 sm:p-10 lg:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="type-display text-balance text-4xl text-white sm:text-5xl xl:text-6xl">
                  See the research rhythm before you create an account.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
                  Guided demo using fictional holdings and deterministic evidence. It shows the product loop without connecting a brokerage, calling a market provider, or giving investment advice.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="rounded-[0.95rem] px-5">
                    <Link href="/app" prefetch={false}>
                      Open private workspace
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-[0.95rem] px-5">
                    <Link href="/product">Explore the product</Link>
                  </Button>
                </div>
              </div>
              <div className="border-l border-cyan-100/24 py-1 pl-5 lg:w-72">
                <p className="text-sm font-medium text-cyan-50">Read-only and private</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">No sign-in required. No personal data is collected on this page.</p>
              </div>
            </div>

            <div className="mt-12 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="glass-surface rounded-[1.1rem] p-5 sm:p-7" aria-labelledby="demo-portfolio-heading">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="type-label text-xs uppercase text-cyan-100/75">01 · Portfolio context</p>
                    <h2 id="demo-portfolio-heading" className="type-card-title mt-3 text-2xl text-white">Allocation review</h2>
                  </div>
                  <ShieldCheck className="size-5 text-cyan-100/70" aria-hidden="true" />
                </div>
                <div className="mt-7 space-y-4">
                  {holdings.map((holding) => (
                    <div key={holding.ticker} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[7rem_1fr_4rem]">
                      <div>
                        <p className="font-mono text-sm text-white">{holding.ticker}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">{holding.name}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                        <span className={`block h-full rounded-full ${holding.tone}`} style={{ width: holding.weight }} />
                      </div>
                      <p className="text-right font-mono text-xs text-zinc-300">{holding.weight}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-7 rounded-[0.9rem] bg-amber-100/[0.035] p-4 text-sm leading-6 text-amber-50/70">Freshness: sample snapshot · captured for this walkthrough · not a live market feed.</p>
              </section>

              <section className="glass-surface rounded-[1.1rem] p-5 sm:p-7" aria-labelledby="demo-brief-heading">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="type-label text-xs uppercase text-amber-100/75">02 · Research room</p>
                    <h2 id="demo-brief-heading" className="type-card-title mt-3 text-2xl text-white">A cited brief, composed</h2>
                  </div>
                  <BookOpenCheck className="size-5 text-amber-100/70" aria-hidden="true" />
                </div>
                <div className="mt-7 space-y-4">
                  {briefPoints.map((point, index) => (
                    <div key={point} className="flex gap-3 rounded-[0.9rem] bg-black/[0.16] p-4">
                      <span className="font-mono text-xs text-cyan-100/70">0{index + 1}</span>
                      <p className="text-sm leading-6 text-zinc-300">{point}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-center gap-3 rounded-[0.9rem] border border-white/8 bg-white/[0.02] p-4">
                  <FileText className="size-4 shrink-0 text-cyan-100/70" aria-hidden="true" />
                  <p className="text-xs leading-5 text-zinc-500">Sample source: fictional quarterly filing · evidence and assumptions remain visible in the private workspace.</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
