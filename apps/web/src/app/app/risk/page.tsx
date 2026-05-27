import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";

import type { PortfolioSnapshot } from "@/lib/ai/portfolio-brief";
import { createDeterministicRiskExplainer, riskExplainerSchema } from "@/lib/ai/research-intelligence";

const demoSnapshot: PortfolioSnapshot = {
  id: "phase-6-risk-demo",
  name: "Core research portfolio",
  baseCurrency: "USD",
  summary: {
    displayTotalValue: "$48,250.00",
    topConcentrationTicker: "NVDA",
    topConcentrationBps: 4200,
    holdingCount: 3,
    reviewFlags: 2,
  },
  holdings: [
    {
      ticker: "NVDA",
      name: "NVIDIA Corp.",
      sector: "Technology",
      displayValue: "$20,265.00",
      displayPrice: "$337.75",
      weightBps: 4200,
      freshness: "fixture-provider-reported",
      capturedAt: "2026-05-24T00:00:00.000Z",
      provider: "deterministic-risk-fixture",
    },
  ],
  allocation: [
    { label: "Technology", weightBps: 7600, status: "review" },
    { label: "Communication Services", weightBps: 1400, status: "ok" },
    { label: "Broad market ETF", weightBps: 1000, status: "ok" },
  ],
  dataFreshness: {
    provider: "deterministic-risk-fixture",
    capturedAt: "2026-05-24T00:00:00.000Z",
    freshness: "fixture-provider-reported",
  },
};

export default function RiskPage() {
  const risk = riskExplainerSchema.parse(
    createDeterministicRiskExplainer(demoSnapshot, "Explain concentration and allocation risk as research."),
  );

  return (
    <section className="space-y-6">
      <div className="section-shell rounded-[8px] p-6 sm:p-8">
        <p className="type-label text-xs uppercase text-cyan-100">Risk explainer</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <h1 className="text-3xl font-light tracking-normal text-white sm:text-5xl">Portfolio risk review</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">{risk.summary}</p>
          </div>
          <div className="rounded-[8px] border border-amber-200/20 bg-amber-200/8 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-100/80">Review flags</p>
            <p className="mt-2 text-3xl font-light text-white">{demoSnapshot.summary.reviewFlags}</p>
            <p className="mt-1 text-sm text-zinc-400">{risk.dataFreshness.freshness}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Concentration</h2>
          </div>
          <div className="mt-5 space-y-3">
            {risk.concentrationSignals.map((signal) => (
              <p key={signal} className="text-sm leading-6 text-zinc-400">{signal}</p>
            ))}
          </div>
        </div>
        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <Activity className="size-5 text-cyan-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Allocation</h2>
          </div>
          <div className="mt-5 space-y-3">
            {risk.allocationSignals.map((signal) => (
              <p key={signal} className="text-sm leading-6 text-zinc-400">{signal}</p>
            ))}
          </div>
        </div>
        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Limitations</h2>
          </div>
          <div className="mt-5 space-y-3">
            {risk.limitationNotes.map((note) => (
              <p key={note} className="text-sm leading-6 text-zinc-400">{note}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-surface rounded-[8px] p-6">
        <h2 className="text-lg font-medium tracking-normal text-white">Research review actions</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {risk.reviewActions.map((action) => (
            <p key={action} className="rounded-[8px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-400">
              {action}
            </p>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-zinc-500">{risk.disclaimer}</p>
      </div>
    </section>
  );
}
