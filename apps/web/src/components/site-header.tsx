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
    <header className="sticky top-0 z-20 px-3 pt-3">
      <div className="glass-surface mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-[1.2rem] px-4 sm:px-5 lg:px-6">
        <BrandMark />
        <nav className="hidden items-center rounded-[0.95rem] bg-black/20 p-1 text-sm font-light text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[0.8rem] px-4 py-2 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.05] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button
          asChild
          size="lg"
          className="hidden rounded-[0.95rem] px-5 md:inline-flex"
        >
          <Link href="/app">
            Open workspace
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-[0.9rem] md:hidden"
        >
          <Link href="/app">Workspace</Link>
        </Button>
      </div>
    </header>
  );
}
