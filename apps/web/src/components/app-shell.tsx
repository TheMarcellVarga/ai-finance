import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, CircleGauge, Goal, Layers3, WalletCards } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { WorkspaceParticleBloom } from "@/components/workspace-particle-bloom";

const nav: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/app", label: "Overview", icon: CircleGauge },
  { href: "/app/monitors", label: "Markets", icon: Layers3 },
  { href: "/app/portfolio", label: "Portfolio", icon: WalletCards },
  { href: "/app/goals", label: "Plan", icon: Goal },
  { href: "/app/learn", label: "Learn", icon: BookOpenCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-stage workspace-stage min-h-dvh text-white">
      <div className="workspace-atmosphere" aria-hidden="true">
        <WorkspaceParticleBloom />
        <span className="workspace-orb workspace-orb-cyan" />
        <span className="workspace-orb workspace-orb-amber" />
      </div>
      <aside className="workspace-sidebar fixed inset-y-4 left-4 z-20 hidden w-72 rounded-[1.2rem] p-5 shadow-[0_28px_76px_rgba(0,0,0,0.38)] backdrop-blur-2xl xl:block">
        <div className="glass-surface rounded-[1rem] p-3">
          <div className="flex items-center justify-between gap-3">
            <BrandMark />
            <UserButton userProfileMode="navigation" userProfileUrl="/app/settings/account" />
          </div>
        </div>
        <nav aria-label="Primary workspace navigation" className="mt-6 space-y-2">
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
      <div className="relative z-10 xl:pl-80">
        <header className="sticky top-0 z-20 px-3 py-2.5 sm:px-4 sm:py-3 xl:hidden">
          <div className="glass-surface rounded-[1.1rem] p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center gap-2.5 md:flex-nowrap md:gap-4">
              <BrandMark />
              <div className="order-2 ml-auto shrink-0 md:order-3 md:ml-0">
                <UserButton userProfileMode="navigation" userProfileUrl="/app/settings/account" />
              </div>
              <nav aria-label="Compact workspace navigation" className="order-3 -mx-1 flex min-w-0 basis-full gap-1 overflow-x-auto px-1 pb-0.5 text-xs text-zinc-400 md:order-none md:mx-0 md:basis-auto md:flex-1 md:gap-2 md:px-0 sm:text-sm">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-[0.85rem] bg-white/[0.025] px-2.5 py-2 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-black/25 hover:text-cyan-50 md:min-h-9 md:justify-start md:px-3 md:py-1.5">
                  {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:py-8">{children}</main>
      </div>
    </div>
  );
}
