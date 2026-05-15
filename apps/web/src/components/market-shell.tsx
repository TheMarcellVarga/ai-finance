import { Activity, Database, FileText, Gauge, Maximize2, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="pointer-events-none absolute -inset-x-10 -bottom-10 h-20 rounded-full bg-cyan-950/35 blur-3xl" />
      <div className="glass-surface rounded-[2rem] p-3">
        <div className="relative overflow-hidden rounded-[1.55rem] bg-zinc-950/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(103,232,249,0.16),transparent_18rem),radial-gradient(circle_at_12%_82%,rgba(20,184,166,0.1),transparent_16rem)]" />
          <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-70" />
        <div className="relative flex items-start justify-between pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Workspace preview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Research cockpit</h2>
          </div>
          <span className="rounded-full bg-cyan-200/10 px-4 py-2 text-xs text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            Decision support
          </span>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-4">
          {metrics.map(([label, value, meta]) => (
            <div key={label} className="glass-hover rounded-2xl bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-3 font-mono text-xl font-light text-white">{value}</p>
              <p className="mt-1 text-xs text-cyan-100/70">{meta}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-hover rounded-3xl bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Allocation review</p>
              <Gauge className="size-4 text-cyan-200" />
            </div>
            <div className="space-y-3">
              {exposures.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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
          <div className="glass-hover rounded-3xl bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="size-4 text-cyan-200" />
                AI workstream
              </div>
              <Maximize2 className="size-3.5 text-zinc-500" />
            </div>
            <div className="space-y-2">
              {workstream.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl bg-zinc-950/38 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
                    <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-zinc-300">
                      <Icon className="size-3.5 text-cyan-200/80" />
                      {item.label}
                    </span>
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-zinc-500">
                      {item.state}
                    </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="relative mt-5 rounded-2xl bg-black/20 px-4 py-3 text-xs leading-5 text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          Preview data is deterministic scaffold content. Final AI briefs require real model calls,
          citations, freshness labels, and persisted safety metadata.
        </p>
        </div>
      </div>
    </div>
  );
}
