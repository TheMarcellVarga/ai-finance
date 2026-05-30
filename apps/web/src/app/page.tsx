import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  FileCheck2,
  FileSearch,
  LockKeyhole,
  Radar,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";
import { Button } from "@/components/ui/button";

const rhythm = [
  {
    number: "01",
    label: "Load the portfolio",
    body: "Start from provider-backed holdings, allocation, and freshness metadata.",
  },
  {
    number: "02",
    label: "Inspect the evidence",
    body: "Review material changes with visible sources, assumptions, and risk context.",
  },
  {
    number: "03",
    label: "Save the cited brief",
    body: "Keep the research record for follow-up questions and advisor conversations.",
  },
];

const assurances = [
  "No brokerage or trade execution.",
  "No personalized investment advice.",
  "No promised returns or suitability claims.",
];

const ambientSignals = [
  {
    time: "01",
    title: "Portfolio context",
    body: "Allocation context first",
    icon: Radar,
  },
  {
    time: "02",
    title: "Source review",
    body: "Citations stay visible",
    icon: FileSearch,
  },
  {
    time: "03",
    title: "Scenario questions",
    body: "Questions, not instructions",
    icon: ScanSearch,
  },
];

export default function Home() {
  return (
    <MarketingPage>
      <section className="cinema-hero relative isolate overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="cinema-hero-media" aria-hidden="true" />
        <div className="cinema-ambient" />
        <div className="cinema-vignette" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 pb-8 pt-28 lg:min-h-[calc(100dvh-4.75rem)] lg:grid-cols-[0.92fr_1.08fr] lg:pb-44 lg:pt-24">
          <div className="cinema-reveal max-w-3xl">
            <p className="inline-flex rounded-full border border-amber-100/16 bg-amber-100/[0.045] px-4 py-2 text-xs font-light uppercase tracking-[0.24em] text-amber-100/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              Private wealth intelligence
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-extralight leading-[0.96] tracking-normal text-zinc-50 sm:text-6xl xl:text-7xl">
              Complexity, made quiet.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-200/88 sm:text-lg">
              Aperture turns portfolios, filings, goals, and market noise into
              calm private briefings for people who want clarity without living
              inside a finance terminal.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-[0.95rem] px-5">
                <Link href="/app" prefetch={false}>
                  Open workspace
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-[0.95rem] px-5"
              >
                <Link href="/product">See the product</Link>
              </Button>
            </div>
          </div>
        </div>

        <aside
          className="cinema-intelligence-dock relative z-10 mx-auto mb-4 max-w-7xl lg:absolute lg:inset-x-8 lg:bottom-5 lg:mb-0 xl:inset-x-[max(2rem,calc((100vw-80rem)/2))]"
          aria-label="Ambient intelligence briefing"
        >
          <div className="cinema-dock-heading">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-amber-100/66">
                Ambient intelligence
              </p>
              <p className="mt-2 text-sm font-light text-zinc-100">
                A quiet read before the day gets loud.
              </p>
            </div>
            <div className="cinema-live-status">
              <span className="cinema-live-dot" />
              Source-aware research flow
            </div>
          </div>

          <div className="cinema-dock-content">
            <div className="cinema-signal-flow">
              {ambientSignals.map(({ time, title, body, icon: Icon }, index) => (
                <div className="cinema-signal" key={title}>
                  <div className="cinema-signal-icon">
                    <Icon className="size-3.5" />
                  </div>
                  <div>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-zinc-500">
                      {time}
                    </p>
                    <p className="mt-1 text-xs font-light text-zinc-100 sm:text-sm">{title}</p>
                    <p className="mt-1 hidden text-xs font-light text-zinc-500 sm:block">{body}</p>
                  </div>
                  {index < ambientSignals.length - 1 ? <span className="cinema-signal-link" /> : null}
                </div>
              ))}
            </div>

            <Link className="cinema-scroll-cue" href="#review-rhythm">
              <span>
                Continue the review
                <small>Morning, review, decide</small>
              </span>
              <ArrowDown className="cinema-scroll-arrow size-4" />
            </Link>
          </div>
        </aside>
      </section>

      <section id="review-rhythm" className="cinema-review-section scroll-mt-4 relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/24 to-transparent" />
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-20">
            <div>
              <p className="text-xs font-light uppercase tracking-[0.24em] text-amber-100/58">
                Product feeling
              </p>
              <h2 className="mt-6 max-w-xl text-4xl font-extralight leading-tight tracking-normal text-white sm:text-5xl">
                A private review rhythm, not another dashboard.
              </h2>
              <p className="mt-7 max-w-lg text-base leading-8 text-zinc-400">
                Aperture keeps the daily research loop deliberately small:
                understand the portfolio, inspect the evidence, and keep a
                useful record for the next conversation.
              </p>
            </div>

            <div className="cinema-rhythm">
              {rhythm.map(({ number, label, body }) => (
                <article key={label} className="cinema-rhythm-row">
                  <p className="font-mono text-[0.62rem] tracking-[0.18em] text-amber-100/54">
                    {number}
                  </p>
                  <div>
                    <h3 className="text-xl font-extralight tracking-normal text-white sm:text-2xl">
                      {label}
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                      {body}
                    </p>
                  </div>
                </article>
              ))}
              <p className="pt-6 text-sm leading-7 text-zinc-500">
                Sources, assumptions, and freshness stay visible throughout.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cinema-context-section relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="cinema-panel rounded-[1.5rem] p-7 sm:p-10">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-light uppercase tracking-[0.24em] text-cyan-100/58">
                  Why it exists
                </p>
                <h2 className="mt-6 max-w-2xl text-4xl font-extralight leading-tight tracking-normal text-white sm:text-5xl">
                  Wealth tools should reduce the room temperature.
                </h2>
              </div>
              <LockKeyhole className="hidden size-5 text-amber-100/58 sm:block" />
            </div>
            <p className="mt-8 max-w-2xl text-base leading-8 text-zinc-400">
              Aperture is for the investor who wants to stay informed without
              getting pulled into tickers, jargon, or reaction loops. It frames
              context, shows where information came from, and keeps the final
              judgment with the person.
            </p>
          </div>

          <aside className="cinema-panel rounded-[1.5rem] p-7 sm:p-10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-light uppercase tracking-[0.24em] text-amber-100/58">
                Boundaries
              </p>
              <ShieldCheck className="size-5 text-amber-100/60" />
            </div>
            <div className="mt-8 grid gap-3">
              {assurances.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[1rem] border border-white/[0.08] bg-black/[0.16] px-4 py-3 text-sm leading-6 text-zinc-300"
                >
                  <FileCheck2 className="mt-0.5 size-4 shrink-0 text-cyan-100/68" />
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-7 text-sm leading-7 text-zinc-500">
              Research support only. Sources, freshness, and assumptions stay
              visible so the product feels polished without becoming vague.
            </p>
          </aside>
        </div>
      </section>
    </MarketingPage>
  );
}
