type WorkspaceSectionProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function WorkspaceSection({ eyebrow, title, body }: WorkspaceSectionProps) {
  return (
    <section className="section-shell rounded-[2.5rem] p-6 sm:p-8 lg:p-10">
      <div className="max-w-3xl">
        <p className="inline-flex rounded-full bg-cyan-200/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">{eyebrow}</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{body}</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {["Data model", "Go API", "AI safety"].map((item, index) => (
          <div key={item} className="glass-surface glass-hover rounded-[1.75rem] p-6">
            <p className="font-mono text-xs text-cyan-100">0{index + 1}</p>
            <h2 className="mt-4 text-lg font-semibold text-white">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Phase scaffold only. Real data, auth, and persistence arrive in the ordered roadmap phases.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
