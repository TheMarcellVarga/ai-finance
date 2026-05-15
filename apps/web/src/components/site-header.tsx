import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/72 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <Button asChild size="lg" className="hidden bg-cyan-200 text-zinc-950 hover:bg-cyan-100 md:inline-flex">
          <Link href="/app">
            Open workspace
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/[0.03] text-white md:hidden">
          <Link href="/app">Workspace</Link>
        </Button>
      </div>
    </header>
  );
}
