import Link from "next/link";

import { BrandMark } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="bg-zinc-950/80 px-3 pb-3">
      <div className="section-shell mx-auto grid w-full max-w-7xl gap-8 rounded-[2rem] px-6 py-8 text-sm text-zinc-500 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <BrandMark />
          <p className="max-w-xl leading-6">
            Research and portfolio decision support only. Aperture does not execute trades,
            provide personalized investment advice, or promise outcomes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:justify-self-end">
          <Link href="/product" className="rounded-full bg-white/[0.035] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:text-white">
            Product
          </Link>
          <Link href="/pricing" className="rounded-full bg-white/[0.035] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:text-white">
            Pricing
          </Link>
          <Link href="/security" className="rounded-full bg-white/[0.035] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:text-white">
            Security
          </Link>
          <Link href="/app" className="rounded-full bg-white/[0.035] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:text-white">
            Workspace
          </Link>
        </div>
      </div>
    </footer>
  );
}
