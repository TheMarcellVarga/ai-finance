import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { WorkspaceParticleBloom } from "@/components/workspace-particle-bloom";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-stage workspace-stage min-h-dvh text-white">
      <div className="workspace-atmosphere" aria-hidden="true">
        <WorkspaceParticleBloom />
        <span className="workspace-orb workspace-orb-cyan" />
        <span className="workspace-orb workspace-orb-amber" />
      </div>
      <aside className="workspace-sidebar fixed inset-y-4 left-4 z-20 hidden w-72 rounded-[1.2rem] p-5 shadow-[0_28px_76px_rgba(0,0,0,0.38)] backdrop-blur-2xl xl:flex xl:flex-col">
        <div className="glass-surface rounded-[1rem] p-3">
          <BrandMark />
        </div>
        <WorkspaceNavigation />
        <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4">
          <Link href="/app/settings" className="flex min-h-11 flex-1 items-center rounded-lg px-2 text-sm text-zinc-400 hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50">Settings</Link>
          <UserButton userProfileMode="navigation" userProfileUrl="/app/settings/account" />
        </div>
      </aside>
      <div className="relative z-10 xl:pl-80">
        <header className="sticky top-0 z-20 bg-[#0e1718] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 xl:hidden">
          <div className="glass-surface rounded-[1.1rem] p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center gap-2.5 md:flex-nowrap md:gap-4">
              <BrandMark compact />
              <div className="order-2 ml-auto shrink-0 md:order-3 md:ml-0">
                <div className="flex items-center gap-1">
                  <UserButton userProfileMode="navigation" userProfileUrl="/app/settings/account" />
                </div>
              </div>
              <WorkspaceNavigation compact />
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl scroll-mt-40 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:scroll-mt-0 xl:py-8">{children}</main>
      </div>
    </div>
  );
}
