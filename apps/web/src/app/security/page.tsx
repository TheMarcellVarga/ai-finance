import type { LucideIcon } from "lucide-react";
import { DatabaseZap, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";

const controls: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Server-owned secrets", body: "Provider keys, service-role keys, JWTs, webhooks, and private prompts stay out of browser bundles.", icon: KeyRound },
  { title: "Ownership enforcement", body: "Go validates Clerk identity and enforces access on every user-owned finance resource.", icon: Fingerprint },
  { title: "AI tool boundary", body: "Model tools call application-owned APIs, never unrestricted database credentials.", icon: DatabaseZap },
  { title: "Privacy scrubbing", body: "Analytics and errors must redact PII, holdings, prompts, outputs, and financial amounts.", icon: ShieldCheck },
];

export default function SecurityPage() {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-shell rounded-[1.25rem] p-6 sm:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  Security
                </p>
                <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Sensitive portfolio data deserves server-first boundaries.
                </h1>
                <p className="mt-6 text-base leading-7 text-zinc-400">
                  The architecture keeps finance calculations, provider access, ownership checks,
                  and audit-backed mutations behind server boundaries.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {controls.map((control) => (
                  <article key={control.title} className="glass-surface glass-hover rounded-[1.15rem] p-6">
                    <control.icon className="size-5 text-cyan-200" />
                    <h2 className="mt-6 text-xl font-semibold text-white">{control.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{control.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
