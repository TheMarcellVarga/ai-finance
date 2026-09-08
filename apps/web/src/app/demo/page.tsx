import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";
import { Button } from "@/components/ui/button";

const holdings = [
  { ticker: "VTI", name: "US total market", weight: "42.0%", price: "$379.73", move: "−0.32%", width: "42%", tone: "bg-cyan-200/80" },
  { ticker: "VXUS", name: "International equity", weight: "24.0%", price: "$88.41", move: "+0.49%", width: "24%", tone: "bg-cyan-200/60" },
  { ticker: "BND", name: "US bond market", weight: "20.0%", price: "$71.95", move: "+0.04%", width: "20%", tone: "bg-amber-200/75" },
  { ticker: "CASH", name: "Cash reserve", weight: "14.0%", price: "$14,000", move: "—", width: "14%", tone: "bg-zinc-300/45" },
];

const findings = [
  {
    title: "Revenue expanded 18% year over year",
    body: "Microsoft reported fiscal-year revenue of $331.8B, compared with $281.7B in 2025.",
    citation: "10-K · p.37",
    strength: "Direct support",
  },
  {
    title: "Intelligent Cloud remained a primary growth driver",
    body: "Segment revenue reached $98.5B for the first nine months, up 29% from the comparable period.",
    citation: "10-Q · p.38",
    strength: "Direct support",
  },
  {
    title: "AI infrastructure continues to raise the cost base",
    body: "Management attributes higher cost of revenue in part to infrastructure supporting Copilot usage growth.",
    citation: "10-Q · p.38",
    strength: "Interpreted",
  },
];

const reviewSteps = [
  { label: "Source ingested", detail: "Microsoft FY2026 10-K · public filing", time: "09:42" },
  { label: "Evidence retrieved", detail: "12 passages · 3 sections · hybrid search", time: "09:43" },
  { label: "Analysis generated", detail: "3 findings · all material claims mapped", time: "09:44" },
  { label: "Human review complete", detail: "2 accepted · 1 edited · 0 unsupported", time: "09:51" },
];

export default function DemoPage() {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.14),transparent_24rem),radial-gradient(circle_at_76%_22%,rgba(39,39,42,0.7),transparent_28rem),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.72)_76%)]" />
        <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-35" />
        <div className="relative z-10 mx-auto max-w-7xl space-y-8">
          <section data-demo-screen="overview" className="section-shell overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-7 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100">Guided demo · public market snapshot</p>
                <h1 className="type-display mt-6 text-balance text-4xl text-white sm:text-5xl xl:text-6xl">Start with context, not a conclusion.</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">An illustrative allocation using public ETF prices, captured September 5, 2026. No brokerage is connected and no position is a recommendation.</p>
              </div>
              <div className="flex items-center gap-3 rounded-[1rem] border border-cyan-100/12 bg-cyan-100/[0.035] px-4 py-3 lg:w-72">
                <span className="size-2 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_0_6px_rgba(103,232,249,0.08)]" />
                <div><p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-zinc-500">Data freshness</p><p className="mt-1 text-xs text-zinc-300">Public market data · Sept 5, 2026</p></div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
              <section className="glass-surface rounded-[1.1rem] p-5 sm:p-7" aria-labelledby="demo-portfolio-heading">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="type-label text-xs uppercase text-cyan-100/75">Portfolio context</p><h2 id="demo-portfolio-heading" className="type-card-title mt-3 text-2xl text-white">Allocation and price context</h2></div>
                  <ShieldCheck className="size-5 text-cyan-100/70" aria-hidden="true" />
                </div>
                <div className="mt-6 overflow-hidden rounded-[0.9rem] border border-white/8">
                  <div className="grid grid-cols-[1fr_4.5rem_4rem_4.25rem] gap-3 bg-white/[0.025] px-4 py-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-zinc-500"><span>Holding</span><span className="text-right">Weight</span><span className="text-right">Price</span><span className="text-right">1D</span></div>
                  {holdings.map((holding) => (
                    <div key={holding.ticker} className="grid grid-cols-[1fr_4.5rem_4rem_4.25rem] items-center gap-3 border-t border-white/8 px-4 py-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3"><span className="w-11 font-mono text-sm text-white">{holding.ticker}</span><span className="truncate text-xs text-zinc-500">{holding.name}</span></div>
                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/[0.06]"><span className={`block h-full rounded-full ${holding.tone}`} style={{ width: holding.width }} /></span>
                      </div>
                      <span className="text-right font-mono text-xs text-zinc-300">{holding.weight}</span><span className="text-right font-mono text-xs text-zinc-300">{holding.price}</span><span className={`text-right font-mono text-xs ${holding.move.startsWith("+") ? "text-cyan-100" : "text-zinc-400"}`}>{holding.move}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-surface flex flex-col rounded-[1.1rem] p-5 sm:p-7" aria-labelledby="demo-prompt-heading">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="type-label text-xs uppercase text-amber-100/75">Research prompt</p><h2 id="demo-prompt-heading" className="type-card-title mt-3 text-2xl text-white">What deserves a closer look?</h2></div>
                  <Sparkles className="size-5 text-amber-100/70" aria-hidden="true" />
                </div>
                <blockquote className="mt-6 rounded-[1rem] bg-black/[0.18] p-5 text-sm leading-6 text-zinc-200">“Review this allocation alongside Microsoft’s latest annual filing. Separate sourced facts from interpretation and surface the assumptions I should challenge.”</blockquote>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {["Owner-scoped portfolio context", "SEC filing evidence only", "No buy / sell language"].map((item) => <div key={item} className="flex items-center gap-3 text-xs text-zinc-400"><Check className="size-3.5 text-cyan-100/75" aria-hidden="true" />{item}</div>)}
                </div>
                <div className="mt-auto pt-6"><Button asChild size="lg" className="w-full rounded-[0.95rem] px-5"><Link href="#evidence">Follow the evidence <ArrowRight data-icon="inline-end" /></Link></Button></div>
              </section>
            </div>
          </section>

          <section id="evidence" data-demo-screen="analysis" className="section-shell overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 xl:grid-cols-[0.76fr_1.24fr]">
              <div className="flex flex-col">
                <div><p className="type-label text-xs uppercase text-cyan-100/75">Evidence workspace</p><h2 className="type-display mt-4 text-4xl text-white sm:text-5xl">Every material claim keeps its source close.</h2><p className="mt-5 text-sm leading-6 text-zinc-400">Aperture binds generated findings to retrieved passages from the active research run. Unsupported claims stay visible instead of receiving a decorative citation.</p></div>
                <div className="mt-8 rounded-[1rem] border border-white/8 bg-black/[0.16] p-5">
                  <div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 shrink-0 text-cyan-100/75" aria-hidden="true" /><div><p className="text-sm font-medium text-white">Microsoft FY2026 Form 10-K</p><p className="mt-1 text-xs leading-5 text-zinc-500">Filed July 29, 2026 · SEC EDGAR · public source</p></div></div>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/8 pt-5 text-center"><Metric value="12" label="passages" /><Metric value="3" label="sections" /><Metric value="100%" label="mapped" /></div>
                </div>
                <Link href="https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm" target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 pt-8 text-sm text-cyan-100/80 hover:text-cyan-50">Open source filing <ArrowRight className="size-3.5" /></Link>
              </div>

              <div className="space-y-3">
                {findings.map((finding, index) => (
                  <article key={finding.title} className="glass-surface rounded-[1rem] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-4"><span className="font-mono text-xs text-cyan-100/65">0{index + 1}</span><div><h3 className="text-base font-medium text-white">{finding.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{finding.body}</p></div></div>
                      <span className="shrink-0 rounded-[0.7rem] bg-cyan-200/8 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-cyan-100/75">{finding.strength}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-4 text-xs text-zinc-500"><Quote className="size-3.5 text-amber-100/70" aria-hidden="true" />{finding.citation} · active retrieval run</div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section data-demo-screen="review" className="section-shell overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl"><p className="type-label text-xs uppercase text-amber-100/75">Human approval</p><h2 className="type-display mt-4 text-4xl text-white sm:text-5xl">The model drafts. The reviewer decides.</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400">Raw output remains immutable while edits, acceptance decisions, citation feedback, and export status are recorded as a separate review trail.</p></div>
              <div className="flex items-center gap-3 rounded-[1rem] bg-cyan-200/8 px-4 py-3 text-sm text-cyan-50"><CheckCircle2 className="size-5" aria-hidden="true" />Ready for reviewed export</div>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="glass-surface rounded-[1.1rem] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4"><div><p className="type-label text-xs uppercase text-cyan-100/75">Review history</p><h3 className="type-card-title mt-3 text-2xl text-white">One inspectable chain of work</h3></div><Clock3 className="size-5 text-cyan-100/70" aria-hidden="true" /></div>
                <ol className="mt-6">
                  {reviewSteps.map((step) => (
                    <li key={step.label} className="grid grid-cols-[1.5rem_1fr_auto] gap-3 border-t border-white/8 py-4 first:border-t-0 first:pt-0">
                      <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-cyan-200/10 text-cyan-100"><Check className="size-3" /></span>
                      <div><p className="text-sm text-white">{step.label}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{step.detail}</p></div>
                      <span className="font-mono text-[0.65rem] text-zinc-600">{step.time}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="glass-surface rounded-[1.1rem] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4"><div><p className="type-label text-xs uppercase text-amber-100/75">Reviewed artifact</p><h3 className="type-card-title mt-3 text-2xl text-white">Research note · MSFT FY2026</h3></div><FileCheck2 className="size-5 text-amber-100/70" aria-hidden="true" /></div>
                <div className="mt-6 space-y-3"><ReviewRow label="Executive summary" state="Accepted" /><ReviewRow label="Growth drivers" state="Edited + accepted" /><ReviewRow label="Risk factors" state="Accepted" /><ReviewRow label="Sources & assumptions" state="Attached" /></div>
                <div className="mt-6 rounded-[0.9rem] border border-amber-100/10 bg-amber-100/[0.035] p-4 text-xs leading-5 text-amber-50/70">Research support only. This artifact does not provide personalized investment advice or a buy, sell, or hold instruction.</div>
                <Button size="lg" className="mt-5 w-full rounded-[0.95rem] px-5"><BookOpenCheck data-icon="inline-start" /> Export reviewed Markdown</Button>
              </section>
            </div>
          </section>
        </div>
      </section>
    </MarketingPage>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><p className="font-mono text-lg text-white">{value}</p><p className="mt-1 text-[0.62rem] uppercase tracking-[0.12em] text-zinc-600">{label}</p></div>;
}

function ReviewRow({ label, state }: { label: string; state: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-[0.85rem] bg-black/[0.16] px-4 py-3.5"><span className="text-sm text-zinc-300">{label}</span><span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-cyan-100/75">{state}</span></div>;
}
