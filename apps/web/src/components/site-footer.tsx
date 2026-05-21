import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { href: "/product", label: "Product" },
      { href: "/pricing", label: "Pricing" },
      { href: "/security", label: "Security" },
      { href: "/blog", label: "Briefs" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/app", label: "Workspace" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative bg-zinc-950/88 px-3 pb-3">
      <div className="section-shell relative mx-auto w-full max-w-7xl overflow-hidden rounded-[1.35rem] border border-white/10 px-5 py-7 text-sm text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_90px_rgba(0,0,0,0.38)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/28 to-transparent" />
        <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <div className="space-y-5">
            <BrandMark />
            <p className="max-w-xl leading-6 text-zinc-400">
              AI-assisted research and portfolio decision support for cited briefs,
              scenario review, and risk explanation. Aperture does not execute trades,
              provide personalized investment advice, or promise outcomes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="rounded-[0.95rem] px-5"
              >
                <Link href="/app">
                  Open workspace
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <p className="max-w-sm text-xs leading-5 text-zinc-600">
                Built for research discipline, data freshness, citations, and secure backend boundaries.
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:justify-self-end lg:gap-12">
            {footerGroups.map((group) => (
              <nav key={group.title} aria-label={group.title} className="space-y-3">
                <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-cyan-100/70">
                  {group.title}
                </h2>
                <div className="grid gap-1.5">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-[0.7rem] border border-transparent px-0 py-1.5 text-zinc-400 transition-[background-color,color,border-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-cyan-200/15 hover:bg-black/25 hover:text-cyan-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35 sm:px-2"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-2 border-t border-white/10 pt-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>2026 Aperture Financial Intelligence</span>
          <span>Research support only. Not financial advice.</span>
        </div>
      </div>
    </footer>
  );
}
