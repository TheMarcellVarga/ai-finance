import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, BookMarked, CircleGauge, FlaskConical, Goal, Settings, ShieldCheck, UserRound, WalletCards } from "lucide-react";

import { BrandMark } from "@/components/brand";

const nav: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/app", label: "Overview", icon: CircleGauge },
  { href: "/app/portfolio", label: "Portfolio", icon: WalletCards },
  { href: "/app/research", label: "Research", icon: BookMarked },
  { href: "/app/research/evaluations", label: "Evaluations", icon: FlaskConical },
  { href: "/app/goals", label: "Goals", icon: Goal },
  { href: "/app/watchlist", label: "Watchlist", icon: BarChart3 },
  { href: "/app/risk", label: "Risk", icon: ShieldCheck },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/account", label: "Account", icon: UserRound },
  { href: "/app/billing", label: "Billing", icon: WalletCards },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-stage workspace-stage min-h-dvh text-white">
      <div className="workspace-atmosphere" aria-hidden="true">
        <span className="workspace-orb workspace-orb-cyan" />
        <span className="workspace-orb workspace-orb-amber" />
      </div>
      <aside className="workspace-sidebar fixed inset-y-4 left-4 hidden w-72 rounded-[1.2rem] p-5 shadow-[0_28px_76px_rgba(0,0,0,0.38)] backdrop-blur-2xl xl:block">
        <div className="glass-surface rounded-[1rem] p-3">
          <div className="flex items-center justify-between gap-3">
            <BrandMark />
            <UserButton userProfileMode="navigation" userProfileUrl="/app/settings/account" />
          </div>
        </div>
        <nav className="mt-6 space-y-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-sm text-zinc-400 transition-colors duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.05] hover:text-cyan-50 focus-visible:bg-white/[0.05] focus-visible:text-cyan-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/30"
            >
              <item.icon className="size-4 text-cyan-200/70" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="xl:pl-80">
        <header className="sticky top-0 z-20 px-3 py-3 xl:hidden">
          <div className="glass-surface rounded-[1.1rem] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <BrandMark />
              <UserButton userProfileMode="navigation" userProfileUrl="/app/settings/account" />
            </div>
            <nav className="mt-4 hidden gap-2 overflow-x-auto pb-1 text-sm text-zinc-400 sm:flex">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="shrink-0 rounded-[0.85rem] bg-white/[0.025] px-3 py-1.5 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-black/25 hover:text-cyan-50">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8 xl:py-8">{children}</main>
      </div>
      <nav className="glass-surface fixed inset-x-3 bottom-3 z-30 flex gap-1 overflow-x-auto rounded-[1.05rem] p-1.5 sm:hidden" aria-label="Workspace navigation">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 rounded-[0.8rem] px-1 py-2 text-[0.62rem] text-zinc-400 transition hover:bg-black/25 hover:text-cyan-50"
          >
            <item.icon className="size-4 text-cyan-200/70" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
