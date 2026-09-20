import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { href: "/#product", label: "Product" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#security", label: "Security" },
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
    <footer className="relative overflow-hidden bg-zinc-950/96 px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/18 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-200/8 to-transparent" />

      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div className="space-y-5">
          <BrandMark />
          <p className="max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
            AI-assisted research and portfolio decision support for cited briefs,
            scenario review, and risk explanation. Aperture does not execute trades,
            provide personalized investment advice, or promise outcomes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rounded-[0.95rem] px-5">
              <Link href="/app" prefetch={false}>
                Open workspace
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <p className="max-w-sm text-xs leading-5 text-zinc-600">
              Built for research discipline, data freshness, citations, and secure backend boundaries.
            </p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:justify-self-end lg:gap-12">
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
                    prefetch={link.href === "/app" ? false : undefined}
                    className="rounded-[0.7rem] border border-transparent px-0 py-1.5 text-zinc-400 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.03] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35 sm:px-2"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 pt-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <span>2026 Aperture Financial Intelligence</span>
        <span>Research support only. Not financial advice.</span>
      </div>
    </footer>
  );
}
