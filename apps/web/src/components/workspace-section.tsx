type WorkspaceSectionProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function WorkspaceSection({ eyebrow, title, body }: WorkspaceSectionProps) {
  return (
    <section className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{body}</p>
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
        {["Data model", "Go API", "AI safety"].map((item, index) => (
          <div key={item} className="bg-zinc-950/70 p-5">
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
