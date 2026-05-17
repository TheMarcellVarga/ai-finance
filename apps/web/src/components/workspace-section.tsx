const phaseItems = [
  ["Data model", "Owner-scoped resources", "RLS + audit path"],
  ["Go API", "Authoritative finance math", "JWT + rate limits"],
  ["AI safety", "Citations and refusal rules", "eval gated"],
];

type WorkspaceSectionProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function WorkspaceSection({ eyebrow, title, body }: WorkspaceSectionProps) {
  return (
    <section className="section-shell rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
      <div className="max-w-3xl">
        <p className="inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">{eyebrow}</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{body}</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {phaseItems.map(([item, affordance, state], index) => (
          <div key={item} className="glass-surface rounded-[1.15rem] p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-xs text-cyan-100">0{index + 1}</p>
              <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-zinc-500">{state}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">{item}</h2>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-cyan-100/75">{affordance}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Phase scaffold only. Real data, auth, and persistence arrive in the ordered roadmap phases.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
