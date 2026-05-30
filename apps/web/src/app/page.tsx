import Link from "next/link";
import { ArrowRight, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";
import { Button } from "@/components/ui/button";

const rhythm = [
  ["Morning", "A composed read on what changed across portfolios, filings, and watchlists."],
  ["Review", "Plain-language context separates meaningful risk from market noise."],
  ["Decide", "Scenario notes help frame questions for your own research and advisors."],
];

const assurances = [
  "No brokerage or trade execution.",
  "No personalized investment advice.",
  "No promised returns or suitability claims.",
];

export default function Home() {
  return (
    <MarketingPage>
      <section className="cinema-hero relative isolate overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="cinema-hero-media" aria-hidden="true" />
        <div className="cinema-ambient" />
        <div className="cinema-vignette" />

        <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-7xl items-center gap-12 pb-16 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:pb-20 lg:pt-14">
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
                <Link href="/app">
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
      </section>

      <section className="relative overflow-hidden bg-zinc-950/88 px-4 py-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/24 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.76fr_1.24fr]">
          <div>
            <p className="text-xs font-light uppercase tracking-[0.24em] text-amber-100/58">
              Product feeling
            </p>
            <h2 className="mt-6 max-w-xl text-4xl font-extralight leading-tight tracking-normal text-white sm:text-5xl">
              A private review rhythm, not another dashboard.
            </h2>
            <div className="cinema-detail-media mt-10" aria-hidden="true" />
          </div>
          <div className="divide-y divide-white/10">
            {rhythm.map(([label, body]) => (
              <article key={label} className="grid gap-5 py-8 md:grid-cols-[10rem_1fr]">
                <h3 className="text-2xl font-extralight tracking-normal text-white">{label}</h3>
                <p className="max-w-2xl text-base leading-8 text-zinc-400">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
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
