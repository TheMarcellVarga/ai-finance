import { ArrowLeft, Check, FlaskConical, ShieldCheck } from "lucide-react";
import Link from "next/link";

import baseline from "@/data/evidence-eval-baseline.json";
import type { EvidenceEvaluationReport } from "@/lib/ai/evidence-evaluation";

const report = baseline as EvidenceEvaluationReport;

const categoryLabels: Record<string, string> = {
  factual: "Factual",
  risk: "Risk",
  comparison: "Comparison",
  unanswerable: "Unanswerable",
  prompt_injection: "Prompt injection",
  advice_boundary: "Advice boundary",
  calculation: "Calculation",
};

function formatMetric(value: number, suffix = "%") {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export default function ResearchEvaluationsPage() {
  const categories = Object.entries(
    report.cases.reduce<Record<string, { passed: number; total: number }>>(
      (summary, item) => {
        const current = summary[item.category] ?? { passed: 0, total: 0 };
        summary[item.category] = {
          passed: current.passed + (item.passed ? 1 : 0),
          total: current.total + 1,
        };
        return summary;
      },
      {},
    ),
  );

  return (
    <div className="space-y-6">
      <section className="section-shell overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 text-cyan-100">
              <FlaskConical className="size-5" aria-hidden="true" />
              <span className="text-sm">Release evaluation baseline</span>
            </div>
            <h1 className="type-display mt-5 text-3xl text-white sm:text-5xl">
              Evidence quality, measured before release
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Deterministic regression results across factual, comparison,
              unanswerable, adversarial, advice-boundary, and calculation cases.
              The baseline uses no external model calls and makes no investment
              performance claim.
            </p>
          </div>
          <Link
            href="/app/research"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-4 text-sm text-zinc-200 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Research workspace
          </Link>
        </div>
      </section>

      <section aria-labelledby="release-gates-title" className="glass-surface overflow-hidden rounded-[1.25rem]">
        <div className="border-b border-white/7 p-5 sm:p-6">
          <h2 id="release-gates-title" className="type-card-title text-xl text-white">
            Release gates
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Build {report.buildVersion} · {report.sourceDocumentCount} documents · {report.caseCount} cases · {report.model}
          </p>
        </div>
        <dl className="grid grid-flow-dense grid-cols-1 gap-px bg-white/7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Overall pass rate", formatMetric(report.passRate)],
            ["Structured output", formatMetric(report.metrics.structuredOutputValidity)],
            ["Citation correctness", formatMetric(report.metrics.citationCorrectness)],
            ["Injection resistance", formatMetric(report.metrics.promptInjectionResistance)],
          ].map(([label, value]) => (
            <div key={label} className="bg-zinc-950/95 p-5 sm:p-6">
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="mt-2 font-mono text-2xl text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-px border-t border-white/7 bg-white/7 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
          <div className="bg-zinc-950/95 p-5 sm:p-6">
            <h3 className="text-sm font-medium text-white">Coverage by case family</h3>
            <dl className="mt-4 divide-y divide-white/7">
              {categories.map(([category, result]) => (
                <div key={category} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-zinc-400">{categoryLabels[category] ?? category}</dt>
                  <dd className="inline-flex items-center gap-2 font-mono text-sm text-emerald-100">
                    <Check className="size-3.5" aria-hidden="true" />
                    {result.passed}/{result.total}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-zinc-950/95 p-5 sm:p-6">
            <h3 className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="size-4 text-cyan-100" aria-hidden="true" />
              Build contract
            </h3>
            <dl className="mt-4 space-y-4 text-xs">
              <div>
                <dt className="text-zinc-600">Prompt</dt>
                <dd className="mt-1 break-words font-mono text-zinc-300">{report.promptVersion}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Schema</dt>
                <dd className="mt-1 break-words font-mono text-zinc-300">{report.schemaVersion}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Retrieval</dt>
                <dd className="mt-1 break-words font-mono text-zinc-300">{report.retrievalVersion}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">Mean local latency</dt>
                <dd className="mt-1 font-mono text-zinc-300">{formatMetric(report.metrics.averageLatencyMs, " ms")}</dd>
              </div>
              <div>
                <dt className="text-zinc-600">External model cost</dt>
                <dd className="mt-1 font-mono text-zinc-300">$0.00</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="case-ledger-title" className="glass-surface overflow-hidden rounded-[1.25rem]">
        <div className="border-b border-white/7 p-5 sm:p-6">
          <h2 id="case-ledger-title" className="type-card-title text-xl text-white">
            Case ledger
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Each row records the behavior exercised and the release-gate outcome. Private source text and user prompts are not logged here.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <caption className="sr-only">Evidence evaluation case results</caption>
            <thead className="bg-black/20 text-xs text-zinc-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Case</th>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Family</th>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Outcome</th>
                <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/7">
              {report.cases.map((item) => (
                <tr key={item.id}>
                  <th scope="row" className="px-5 py-4 font-mono text-xs font-normal text-zinc-300 sm:px-6">{item.id}</th>
                  <td className="px-5 py-4 text-zinc-400 sm:px-6">{categoryLabels[item.category]}</td>
                  <td className="px-5 py-4 sm:px-6">
                    <span className={item.passed ? "inline-flex items-center gap-2 text-emerald-100" : "inline-flex items-center gap-2 text-rose-100"}>
                      {item.passed ? <Check className="size-3.5" aria-hidden="true" /> : null}
                      {item.passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-xs text-zinc-500 sm:px-6">{formatMetric(item.latencyMs, " ms")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
