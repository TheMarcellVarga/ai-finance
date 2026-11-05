import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AiActionPanel } from "@/components/ai-action-panel";
import { getPortfolioSnapshot } from "@/lib/ai/portfolio-tools";
import { createDeterministicRiskExplainer, riskExplainerSchema } from "@/lib/ai/research-intelligence";
import { authenticatedSessionToken } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

export default async function RiskPage() {
  const authToken = await authenticatedSessionToken();
  let snapshot;
  try {
    snapshot = await getPortfolioSnapshot({ requestAuthorization: `Bearer ${authToken}` });
  } catch {
    return (
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8">
        <AlertTriangle className="size-5 text-amber-200" />
        <h1 className="type-display mt-5 text-3xl text-white sm:text-5xl">Risk review needs your portfolio.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
          Your portfolio is unavailable. Add a holding or refresh your portfolio before reviewing risk.
        </p>
        <Link href="/app/portfolio" className="mt-6 inline-flex rounded-[0.85rem] bg-cyan-100 px-4 py-2 text-sm font-medium text-black">Add a real holding</Link>
      </section>
    );
  }
  const risk = riskExplainerSchema.parse(
    createDeterministicRiskExplainer(snapshot, "Explain concentration and allocation risk as research."),
  );

  return (
    <section className="space-y-6">
      <div className="workspace-hero section-shell relative overflow-hidden rounded-[8px] p-6 sm:p-8">
        <p className="text-sm text-zinc-400">Calculated from portfolio data · no AI generation</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <h1 className="text-3xl font-light tracking-normal text-white sm:text-5xl">Portfolio risk review</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">{risk.summary}</p>
          </div>
          <div className="rounded-[8px] bg-amber-200/8 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-100/80">Review flags</p>
            <p className="mt-2 text-3xl font-light text-white">{snapshot.summary.reviewFlags}</p>
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
            <p key={action} className="rounded-[8px] bg-black/20 p-4 text-sm leading-6 text-zinc-400">
              {action}
            </p>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-zinc-500">{risk.disclaimer}</p>
      </div>

      <AiActionPanel title="Research report" />
    </section>
  );
}
