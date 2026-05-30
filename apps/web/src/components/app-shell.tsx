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
    <div className="page-stage workspace-stage min-h-dvh text-white">
      <div className="workspace-atmosphere" aria-hidden="true">
        <span className="workspace-orb workspace-orb-cyan" />
        <span className="workspace-orb workspace-orb-amber" />
      </div>
      <aside className="workspace-sidebar fixed inset-y-4 left-4 hidden w-72 rounded-[1.2rem] border border-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_76px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:block">
        <div className="glass-surface rounded-[1rem] p-3">
          <BrandMark />
        </div>
        <nav className="mt-6 space-y-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-hover flex items-center gap-3 rounded-[0.95rem] border border-transparent px-3 py-2.5 text-sm text-zinc-400 transition-[background-color,color,border-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-cyan-200/15 hover:text-cyan-50"
            >
              <item.icon className="size-4 text-cyan-200/70" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-80">
        <header className="sticky top-0 z-10 px-3 py-3 lg:hidden">
          <div className="glass-surface rounded-[1.1rem] p-4">
            <BrandMark />
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm text-zinc-400">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="shrink-0 rounded-[0.85rem] border border-white/10 bg-white/[0.025] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,color,border-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-cyan-200/15 hover:bg-black/25 hover:text-cyan-50">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
