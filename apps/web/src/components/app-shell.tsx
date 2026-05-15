import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, BookMarked, CircleGauge, Goal, Settings, ShieldCheck, WalletCards } from "lucide-react";

import { BrandMark } from "@/components/brand";

const nav: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/app", label: "Overview", icon: CircleGauge },
  { href: "/app/portfolio", label: "Portfolio", icon: WalletCards },
  { href: "/app/research", label: "Research", icon: BookMarked },
  { href: "/app/goals", label: "Goals", icon: Goal },
  { href: "/app/watchlist", label: "Watchlist", icon: BarChart3 },
  { href: "/app/risk", label: "Risk", icon: ShieldCheck },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/billing", label: "Billing", icon: WalletCards },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-zinc-950/90 p-5 lg:block">
        <BrandMark />
        <nav className="mt-10 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <item.icon className="size-4 text-cyan-200/70" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/75 px-4 py-4 backdrop-blur-xl lg:hidden">
          <BrandMark />
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm text-zinc-400">
            {nav.slice(0, 6).map((item) => (
              <Link key={item.href} href={item.href} className="shrink-0 rounded-md border border-white/10 px-3 py-1.5">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
