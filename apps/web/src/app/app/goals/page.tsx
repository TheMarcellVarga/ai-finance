import { Flag, GraduationCap, Target } from "lucide-react";

import { AiActionPanel } from "@/components/ai-action-panel";
import { createDeterministicGoalPlan, goalPlanSchema } from "@/lib/ai/research-intelligence";

export default function GoalsPage() {
  const plan = goalPlanSchema.parse(
    createDeterministicGoalPlan({
      goalName: "Research-funded home reserve",
      targetAmount: "$250,000",
      timeHorizon: "5 years",
      riskPreference: "balanced",
      contributionCadence: "monthly",
      prompt: "Create an educational scenario plan with research habits and no return promise.",
    }),
  );

  return (
    <section className="space-y-6">
      <div className="section-shell rounded-[8px] p-6 sm:p-8">
        <p className="type-label text-xs uppercase text-cyan-100">Goal intelligence</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <h1 className="text-3xl font-light tracking-normal text-white sm:text-5xl">{plan.goalName}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">{plan.summary}</p>
          </div>
          <div className="rounded-[8px] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Scenario target</p>
            <p className="mt-2 text-2xl font-light text-white">{plan.targetAmount}</p>
            <p className="mt-1 text-sm text-zinc-400">{plan.timeHorizon}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plan.milestones.map((milestone) => (
          <article key={milestone.title} className="glass-surface rounded-[8px] p-5">
            <div className="flex items-start justify-between gap-4">
              <Flag className="size-5 text-cyan-100" />
              <span className="rounded-[8px] bg-white/[0.04] px-2 py-1 text-xs uppercase tracking-[0.14em] text-zinc-500">
                {milestone.status}
              </span>
            </div>
            <h2 className="mt-4 text-lg font-medium tracking-normal text-white">{milestone.title}</h2>
            <p className="mt-2 text-sm text-cyan-100/80">{milestone.targetDate}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{milestone.reviewMetric}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-cyan-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Contribution scenarios</h2>
          </div>
          <div className="mt-5 space-y-4">
            {plan.contributionScenarios.map((scenario) => (
              <div key={scenario.cadence} className="rounded-[8px] bg-black/20 p-4">
                <p className="text-sm font-medium text-white">{scenario.cadence} · {scenario.amount}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{scenario.assumption}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-surface rounded-[8px] p-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="size-5 text-cyan-100" />
            <h2 className="text-lg font-medium tracking-normal text-white">Research discipline</h2>
          </div>
          <div className="mt-5 space-y-3">
            {[...plan.educationalChallenges, ...plan.achievements].map((item) => (
              <p key={item} className="text-sm leading-6 text-zinc-400">{item}</p>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-zinc-500">{plan.disclaimer}</p>
        </div>
      </div>

      <AiActionPanel
        title="Goal planner route controls"
        description="Generate the goal-plan route through usage gates and save the result as educational scenario-planning context without return promises."
        generateEndpoint="/api/ai/goal-plan"
        generatePayload={{
          goalName: "Research-funded home reserve",
          targetAmount: "$250,000",
          timeHorizon: "5 years",
          riskPreference: "balanced",
          contributionCadence: "monthly",
          prompt: "Create an educational scenario plan with research habits and no return promise.",
        }}
        saveTitle={`${plan.goalName} goal plan`}
        saveSourceType="goal_plan"
        citationCount={plan.citations.length}
      />
    </section>
  );
}
