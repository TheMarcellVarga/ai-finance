"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertTriangle, Calculator, CheckCircle2, Flag, GraduationCap, Loader2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GoalPlan } from "@/lib/ai/research-intelligence";
import type { FinancePortfolioResponse } from "@/lib/finance-api";

type GoalPlannerWorkspaceProps = {
  portfolio?: FinancePortfolioResponse["data"];
  initialError?: string;
};

type GoalRouteResponse = {
  data?: GoalPlan;
  meta?: { mode?: string };
  error?: { message?: string };
};

export function GoalPlannerWorkspace({ portfolio, initialError }: GoalPlannerWorkspaceProps) {
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [horizonYears, setHorizonYears] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [riskPreference, setRiskPreference] = useState<"conservative" | "balanced" | "growth">("balanced");
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!portfolio) {
      setError("Add a real portfolio holding before creating a goal scenario.");
      return;
    }
    const target = Number.parseFloat(targetAmount);
    const years = Number.parseFloat(horizonYears);
    const contribution = Number.parseFloat(monthlyContribution);
    if (!goalName.trim() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(years) || years <= 0 || !Number.isFinite(contribution) || contribution < 0) {
      setError("Enter a goal name, positive target and horizon, plus a non-negative monthly contribution.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/goal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          goalName: goalName.trim(),
          targetAmountCents: Math.round(target * 100),
          timeHorizonMonths: Math.max(1, Math.round(years * 12)),
          monthlyContributionCents: Math.round(contribution * 100),
          riskPreference,
          prompt: "Calculate a contribution-only educational goal scenario from my owner-scoped portfolio without assuming returns.",
        }),
      });
      const payload = (await response.json()) as GoalRouteResponse;
      if (!response.ok || !payload.data || !("goalName" in payload.data)) {
        throw new Error(payload.error?.message ?? "The goal scenario could not be calculated.");
      }
      setPlan(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The goal scenario could not be calculated.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-end">
          <div>
            <h1 className="type-display text-3xl text-white sm:text-5xl">Plan from your actual portfolio.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
              Set your own target, horizon, and contribution. Aperture uses the latest owner-scoped portfolio value and assumes zero investment return.
            </p>
          </div>
          <div className="rounded-[1rem] bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Current provider-backed value</p>
            <p className="mt-2 font-mono text-2xl text-white">{portfolio?.summary.displayTotalValue ?? "No portfolio"}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              {portfolio ? `${portfolio.dataFreshness.provider} · ${portfolio.dataFreshness.freshness}` : "Add a holding to establish a real starting balance."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={calculate} className="glass-surface rounded-[1.25rem] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Calculator className="size-5 text-cyan-200" />
          <h2 className="type-card-title text-xl text-white">Scenario inputs</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
          <label className="text-sm text-zinc-300">Goal name<input value={goalName} onChange={(event) => setGoalName(event.target.value)} maxLength={80} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 text-base text-white outline-none focus:border-cyan-200/40" required /></label>
          <label className="text-sm text-zinc-300">Target amount<input type="number" min="1" step="0.01" inputMode="decimal" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-base text-white outline-none focus:border-cyan-200/40" required /></label>
          <label className="text-sm text-zinc-300">Horizon (years)<input type="number" min="0.1" max="50" step="0.1" inputMode="decimal" value={horizonYears} onChange={(event) => setHorizonYears(event.target.value)} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-base text-white outline-none focus:border-cyan-200/40" required /></label>
          <label className="text-sm text-zinc-300">Monthly contribution<input type="number" min="0" step="0.01" inputMode="decimal" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 font-mono text-base text-white outline-none focus:border-cyan-200/40" required /></label>
          <label className="text-sm text-zinc-300">Risk context<select value={riskPreference} onChange={(event) => setRiskPreference(event.target.value as typeof riskPreference)} className="mt-2 h-11 w-full rounded-[0.75rem] border border-white/10 bg-zinc-950/70 px-3 text-base text-white outline-none focus:border-cyan-200/40"><option value="conservative">Conservative</option><option value="balanced">Balanced</option><option value="growth">Growth</option></select></label>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={loading || !portfolio}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
            {loading ? "Calculating" : "Calculate scenario"}
          </Button>
          {!portfolio ? <Link href="/app/portfolio" className="text-sm text-cyan-100 hover:text-white">Add your first holding →</Link> : null}
        </div>
      </form>

      {error ? <div className="flex items-start gap-3 rounded-[1rem] bg-amber-200/8 p-4 text-sm leading-6 text-amber-50"><AlertTriangle className="mt-1 size-4 shrink-0" /><p>{error}</p></div> : null}

      {plan ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {[["Current", plan.currentAmount], ["Target", plan.targetAmount], ["Funding gap", plan.fundingGap], ["Funded", `${(plan.progressBps / 100).toFixed(1)}%`]].map(([label, value]) => <article key={label} className="glass-surface rounded-[1rem] p-5"><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">{label}</p><p className="mt-3 font-mono text-2xl text-white">{value}</p></article>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plan.milestones.map((milestone) => <article key={milestone.title} className="glass-surface rounded-[1rem] p-5"><div className="flex items-start justify-between gap-4"><Flag className="size-5 text-cyan-100" /><span className="text-xs uppercase tracking-[0.12em] text-zinc-400">{milestone.status}</span></div><h2 className="mt-4 text-lg font-medium text-white">{milestone.title}</h2><p className="mt-2 text-sm text-cyan-100/80">{milestone.targetDate}</p><p className="mt-3 text-sm leading-6 text-zinc-400">{milestone.reviewMetric}</p></article>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-surface rounded-[1rem] p-6"><div className="flex items-center gap-3"><Target className="size-5 text-cyan-100" /><h2 className="text-lg font-medium text-white">Contribution arithmetic</h2></div><div className="mt-5 space-y-4">{plan.contributionScenarios.map((scenario) => <div key={scenario.cadence} className="rounded-[0.85rem] bg-black/20 p-4"><p className="text-sm font-medium text-white">{scenario.cadence} · {scenario.amount}</p><p className="mt-2 text-sm leading-6 text-zinc-400">{scenario.assumption}</p></div>)}</div></div>
            <div className="glass-surface rounded-[1rem] p-6"><div className="flex items-center gap-3"><GraduationCap className="size-5 text-cyan-100" /><h2 className="text-lg font-medium text-white">Assumptions and boundaries</h2></div><div className="mt-5 space-y-3">{plan.assumptions.map((item) => <p key={item} className="text-sm leading-6 text-zinc-400">{item}</p>)}</div><p className="mt-5 flex items-start gap-2 text-xs leading-5 text-zinc-400"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-200" />{plan.disclaimer}</p></div>
          </div>
        </>
      ) : null}
    </section>
  );
}
