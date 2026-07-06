import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { hasClerkRuntimeKeys } from "@/lib/clerk-config";

const navItems = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/blog", label: "Briefs" },
];

export function SiteHeader() {
  const authConfigured = hasClerkRuntimeKeys();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20">
      <div className="mx-auto w-full max-w-7xl px-3 pt-3">
        <div className="glass-surface flex h-16 w-full items-center justify-between rounded-[1.2rem] px-4 sm:px-5 lg:px-6">
          <div className="pointer-events-auto flex w-full items-center justify-between gap-4">
            <BrandMark />
            <nav className="hidden items-center rounded-[0.95rem] bg-black/20 p-1 text-sm font-light text-zinc-400 md:flex">
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
            {authConfigured ? (
              <>
                <Show when="signed-in">
                  <Button asChild size="lg" className="hidden rounded-[0.95rem] px-5 md:inline-flex">
                    <Link href="/app" prefetch={false}>
                      Open workspace
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-[0.9rem] md:hidden">
                    <Link href="/app" prefetch={false}>Workspace</Link>
                  </Button>
                </Show>
                <Show when="signed-out">
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="rounded-[0.9rem]">
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                    <Button asChild size="sm" className="hidden rounded-[0.9rem] sm:inline-flex">
                      <Link href="/sign-up">Create account</Link>
                    </Button>
                  </div>
                </Show>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-[0.9rem]">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="hidden rounded-[0.9rem] sm:inline-flex">
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
