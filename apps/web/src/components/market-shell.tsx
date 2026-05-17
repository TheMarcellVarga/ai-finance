import { Activity, Database, FileText, Maximize2, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

const metrics = [
  ["Portfolio value", "$428,319.42", "+1.42%", "cached snapshot"],
  ["Concentration", "31.8%", "NVDA/MSFT", "review flag"],
  ["Data freshness", "15 min", "market cache", "source age"],
  ["AI quota", "86/100", "briefs left", "metered"],
];

const exposures = [
  ["Technology", "47.2%", "Review"],
  ["Healthcare", "13.6%", "OK"],
  ["Financials", "12.4%", "OK"],
  ["Fixed income", "10.9%", "OK"],
  ["Cash proxy", "6.7%", "OK"],
];

const workstream = [
  { icon: Activity, label: "Risk explainer", state: "Ready", meta: "assumptions attached" },
  { icon: FileText, label: "Filing summary", state: "Queued", meta: "10-K source pending" },
  { icon: Database, label: "Portfolio snapshot", state: "Fresh", meta: "15 min cache" },
  { icon: ShieldCheck, label: "Advice boundary", state: "Enforced", meta: "no buy/sell output" },
];

export function MarketShell() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="pointer-events-none absolute -inset-x-10 -bottom-10 h-20 rounded-full bg-cyan-950/35 blur-3xl" />
      <div className="glass-surface rounded-[1.25rem] p-3">
        <div className="relative overflow-hidden rounded-[1.05rem] bg-zinc-950/44 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(103,232,249,0.16),transparent_18rem),radial-gradient(circle_at_12%_82%,rgba(20,184,166,0.1),transparent_16rem)]" />
          <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-70" />
        <div className="relative flex items-start justify-between pb-5">
          <div>
            <p className="type-label text-xs uppercase text-cyan-200/80">Workspace preview</p>
            <h2 className="type-card-title mt-2 text-2xl text-white">Research cockpit</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-zinc-400">
              <span className="rounded-[0.75rem] bg-white/[0.04] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">Citations 12</span>
              <span className="rounded-[0.75rem] bg-amber-300/10 px-3 py-1.5 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">1 review flag</span>
              <span className="rounded-[0.75rem] bg-cyan-200/8 px-3 py-1.5 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">NFA guard active</span>
            </div>
          </div>
          <span className="rounded-[0.85rem] bg-cyan-200/10 px-4 py-2 text-xs text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            Decision support
          </span>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 2xl:grid-cols-4">
          {metrics.map(([label, value, meta, status]) => (
            <div key={label} className="min-w-0 rounded-[1rem] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-zinc-500">{label}</p>
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500">{status}</span>
              </div>
              <p className="mt-3 font-mono text-lg font-light text-white">{value}</p>
              <p className="mt-1 text-xs text-cyan-100/70">{meta}</p>
            </div>
          ))}
        </div>
        <div className="relative mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.15rem] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-light tracking-[-0.01em] text-white">Allocation review</p>
                <p className="mt-1 text-xs text-zinc-500">Sector weights vs policy band</p>
              </div>
              <TriangleAlert className="size-4 text-amber-200" />
            </div>
            <div className="space-y-3">
              {exposures.map(([label, value, state]) => (
                <div key={label} className="grid grid-cols-[6.5rem_1fr_3.5rem_3.5rem] items-center gap-3">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <span
                      className={`block h-full rounded-full ${state === "Review" ? "bg-amber-200/80" : "bg-cyan-200/80"}`}
                      style={{ width: value }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-zinc-300">{value}</span>
                  <span className={`text-right text-[0.62rem] uppercase tracking-[0.12em] ${state === "Review" ? "text-amber-100" : "text-zinc-500"}`}>{state}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.15rem] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-light tracking-[-0.01em] text-white">
                <Sparkles className="size-4 text-cyan-200" />
                Evidence queue
              </div>
              <Maximize2 className="size-3.5 text-zinc-500" />
            </div>
            <div className="space-y-2">
              {workstream.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[0.9rem] bg-zinc-950/28 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-start justify-between gap-3">
                    <span className="flex items-start gap-2 text-xs text-zinc-300">
                      <Icon className="mt-0.5 size-3.5 text-cyan-200/80" />
                      <span>
                        <span className="block">{item.label}</span>
                        <span className="mt-0.5 block text-[0.68rem] text-zinc-500">{item.meta}</span>
                      </span>
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
        <p className="relative mt-5 rounded-[1rem] bg-black/16 px-4 py-3 text-xs leading-5 text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          Preview data is deterministic scaffold content. Final AI briefs require real model calls,
          citations, freshness labels, and persisted safety metadata.
        </p>
        </div>
      </div>
    </div>
  );
}
