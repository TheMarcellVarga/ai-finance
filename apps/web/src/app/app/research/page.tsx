import { BookOpenCheck, FileText, Link2 } from "lucide-react";

import { createDeterministicFilingSummary } from "@/lib/ai/research-intelligence";

export default function ResearchPage() {
  const brief = createDeterministicFilingSummary({
    ticker: "AAPL",
    prompt: "Summarize filing risks and research follow-ups for a portfolio research room.",
  });

  return (
    <section className="space-y-6">
      <div className="section-shell rounded-[8px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="type-label text-xs uppercase text-cyan-100">Research room</p>
            <h1 className="mt-4 text-3xl font-light tracking-normal text-white sm:text-5xl">
              {brief.ticker} {brief.filingType} intelligence
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">{brief.summary}</p>
          </div>
          <div className="rounded-[8px] border border-cyan-200/15 bg-cyan-200/8 px-4 py-3 text-sm text-cyan-50">
            {brief.dataFreshness.provider} · {brief.dataFreshness.freshness}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-cyan-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Filing highlights</h2>
          </div>
          <div className="mt-5 space-y-3">
            {brief.filingHighlights.map((item) => (
              <p key={item} className="rounded-[8px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="size-5 text-cyan-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Material risk review</h2>
          </div>
          <div className="mt-5 space-y-3">
            {brief.materialRisks.map((risk) => (
              <p key={risk} className="text-sm leading-6 text-zinc-400">
                {risk}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-surface rounded-[8px] p-6">
        <div className="flex items-center gap-3">
          <Link2 className="size-5 text-cyan-100" />
          <h2 className="text-lg font-medium tracking-normal text-white">Retrieved source chunks</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {brief.retrievedChunks.map((chunk) => (
            <article key={chunk.id} className="rounded-[8px] border border-white/10 bg-zinc-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/75">{chunk.section}</p>
              <h3 className="mt-2 text-sm font-medium text-white">{chunk.sourceLocator}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{chunk.excerpt}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-zinc-500">{brief.disclaimer}</p>
      </div>
    </section>
  );
}
