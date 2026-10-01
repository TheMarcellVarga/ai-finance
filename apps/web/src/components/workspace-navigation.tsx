"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CircleGauge, Goal, Layers3, WalletCards } from "lucide-react";

const destinations = [
  { href: "/app", label: "Overview", icon: CircleGauge },
  { href: "/app/monitors", label: "Markets", icon: Layers3 },
  { href: "/app/portfolio", label: "Portfolio", icon: WalletCards },
  { href: "/app/goals", label: "Plan", icon: Goal },
  { href: "/app/learn", label: "Learn", icon: BookOpenCheck },
];

export function WorkspaceNavigation({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const currentPath = pathname === "/learn-preview" ? "/app/learn" : pathname;

  return (
    <nav
      aria-label={compact ? "Compact workspace navigation" : "Primary workspace navigation"}
      className={compact ? "order-3 grid min-w-0 basis-full grid-cols-5 gap-1 md:order-none md:flex md:basis-auto md:flex-1 md:gap-2" : "mt-6 space-y-2"}
    >
      {destinations.map(({ href, label, icon: Icon }) => {
        const active = href === "/app"
          ? currentPath === href
          : currentPath === href || currentPath.startsWith(`${href}/`)
            || (href === "/app/monitors" && ["/app/crypto-monitor", "/app/assets", "/app/watchlist"].includes(currentPath));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-[0.85rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 ${compact ? "justify-center px-1 text-[0.6875rem] font-medium sm:px-2 sm:text-sm md:flex-1" : "gap-3 px-3 text-sm"} ${active ? "bg-cyan-200/10 text-cyan-50 ring-1 ring-inset ring-cyan-200/20" : "text-zinc-400 hover:bg-white/[0.05] hover:text-cyan-50"}`}
          >
            {!compact ? <Icon className={`size-4 shrink-0 ${active ? "text-cyan-100" : "text-cyan-200/70"}`} aria-hidden="true" /> : null}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
