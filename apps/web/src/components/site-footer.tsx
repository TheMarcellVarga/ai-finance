import Link from "next/link";

import { BrandMark } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/70">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm text-zinc-500 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="space-y-4">
          <BrandMark />
          <p className="max-w-xl leading-6">
            Research and portfolio decision support only. Aperture does not execute trades,
            provide personalized investment advice, or promise outcomes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:justify-self-end">
          <Link href="/product" className="hover:text-white">
            Product
          </Link>
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/security" className="hover:text-white">
            Security
          </Link>
          <Link href="/app" className="hover:text-white">
            Workspace
          </Link>
        </div>
      </div>
    </footer>
  );
}
