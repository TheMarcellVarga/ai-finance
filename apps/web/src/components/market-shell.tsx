import { Activity, Database, FileText, Gauge, ShieldCheck, Sparkles } from "lucide-react";

const metrics = [
  ["Portfolio value", "$428,319.42", "+1.42%"],
  ["Concentration", "31.8%", "NVDA/MSFT"],
  ["Data freshness", "15 min", "cached"],
  ["AI quota", "86/100", "briefs"],
];

const exposures = [
  ["Technology", "47.2%"],
  ["Healthcare", "13.6%"],
  ["Financials", "12.4%"],
  ["Fixed income", "10.9%"],
  ["Cash proxy", "6.7%"],
];

const workstream = [
  { icon: Activity, label: "Risk explainer", state: "ready" },
  { icon: FileText, label: "Filing summary", state: "queued" },
  { icon: Database, label: "Portfolio snapshot", state: "fresh" },
  { icon: ShieldCheck, label: "Advice boundary", state: "enforced" },
];

export function MarketShell() {
  return (
    <div className="rounded-2xl border border-white/12 bg-zinc-900/70 p-3 shadow-2xl shadow-zinc-950/60 backdrop-blur-xl">
      <div className="rounded-xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Workspace preview</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Research cockpit</h2>
          </div>
          <span className="rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100">
            Decision support
          </span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
          {metrics.map(([label, value, meta]) => (
            <div key={label} className="bg-zinc-950/70 p-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-3 font-mono text-lg text-white">{value}</p>
              <p className="mt-1 text-xs text-cyan-100/70">{meta}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-4">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Allocation review</p>
              <Gauge className="size-4 text-cyan-200" />
            </div>
            <div className="space-y-3">
              {exposures.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-cyan-200/80"
                      style={{ width: value }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-zinc-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="size-4 text-cyan-200" />
              AI workstream
            </div>
            <div className="space-y-2">
              {workstream.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                    <span className="flex items-center gap-2 text-xs text-zinc-300">
                      <Icon className="size-3.5 text-cyan-200/80" />
                      {item.label}
                    </span>
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-zinc-500">
                      {item.state}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Preview data is deterministic scaffold content. Final AI briefs require real model calls,
          citations, freshness labels, and persisted safety metadata.
        </p>
      </div>
    </div>
  );
}
