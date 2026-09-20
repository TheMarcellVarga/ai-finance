import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { hasClerkRuntimeKeys } from "@/lib/clerk-config";

const navItems = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#security", label: "Security" },
];

export function SiteHeader() {
  const authConfigured = hasClerkRuntimeKeys();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20">
      <div className="mx-auto w-full max-w-7xl px-3 pt-3">
        <div className="glass-surface flex h-16 w-full items-center justify-between rounded-[1.2rem] px-4 sm:px-5 lg:px-6">
          <div className="pointer-events-auto relative flex w-full items-center justify-between gap-4">
            <BrandMark />
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-[0.95rem] bg-black/20 p-1 text-sm font-light text-zinc-400 xl:flex">
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
            <div className="flex shrink-0 items-center gap-2">
              <details className="group relative shrink-0 xl:hidden">
                <summary
                  aria-label="Open navigation menu"
                  className="flex size-11 list-none cursor-pointer items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/[0.025] text-zinc-200 outline-none transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-black/22 hover:text-white focus-visible:ring-3 focus-visible:ring-cyan-200/35 [&::-webkit-details-marker]:hidden"
                >
                  <Menu className="size-5 transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-90" />
                  <span className="sr-only">Menu</span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(20rem,calc(100vw-2rem))] rounded-[1.1rem] border border-white/10 bg-[#0a0f10]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
                  <nav aria-label="Compact marketing navigation" className="grid gap-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-[0.8rem] px-3 py-2.5 text-sm text-zinc-300 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                  <div className="mt-2 grid gap-1 border-t border-white/10 pt-2">
                    {authConfigured ? (
                      <>
                        <Show when="signed-in">
                          <Link
                            href="/app/settings/account"
                            className="rounded-[0.8rem] px-3 py-2.5 text-sm text-zinc-300 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                          >
                            Account
                          </Link>
                          <Link
                            href="/app"
                            prefetch={false}
                            className="rounded-[0.8rem] bg-slate-800 px-3 py-2.5 text-sm text-white transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                          >
                            Open workspace
                          </Link>
                        </Show>
                        <Show when="signed-out">
                          <Link
                            href="/sign-in"
                            className="rounded-[0.8rem] px-3 py-2.5 text-sm text-zinc-300 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                          >
                            Sign in
                          </Link>
                          <Link
                            href="/sign-up"
                            className="rounded-[0.8rem] bg-slate-800 px-3 py-2.5 text-sm text-white transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                          >
                            Create account
                          </Link>
                        </Show>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/sign-in"
                          className="rounded-[0.8rem] px-3 py-2.5 text-sm text-zinc-300 transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                        >
                          Sign in
                        </Link>
                        <Link
                          href="/sign-up"
                          className="rounded-[0.8rem] bg-slate-800 px-3 py-2.5 text-sm text-white transition-[background-color,color] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/35"
                        >
                          Create account
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </details>
              <div className="hidden shrink-0 items-center gap-2 xl:flex">
                {authConfigured ? (
                  <>
                    <Show when="signed-in">
                      <div className="flex items-center gap-2">
                        <div className="flex h-11 items-center gap-2 rounded-[0.95rem] border border-white/10 bg-white/[0.025] px-3 text-sm text-zinc-200">
                          <UserButton
                            userProfileMode="navigation"
                            userProfileUrl="/app/settings/account"
                            appearance={{ elements: { avatarBox: "size-7" } }}
                          />
                          <Link href="/app/settings/account" className="hidden transition-colors hover:text-white sm:inline">
                            Account
                          </Link>
                        </div>
                        <Button asChild size="lg" className="rounded-[0.95rem] px-5">
                          <Link href="/app" prefetch={false}>
                            Open workspace
                            <ArrowRight data-icon="inline-end" />
                          </Link>
                        </Button>
                      </div>
                    </Show>
                    <Show when="signed-out">
                      <div className="flex items-center gap-2">
                        <Button asChild size="lg" variant="outline" className="rounded-[0.95rem] px-5">
                          <Link href="/sign-in">Sign in</Link>
                        </Button>
                        <Button asChild size="lg" className="hidden rounded-[0.95rem] px-5 sm:inline-flex">
                          <Link href="/sign-up">Create account</Link>
                        </Button>
                      </div>
                    </Show>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button asChild size="lg" variant="outline" className="rounded-[0.95rem] px-5">
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                    <Button asChild size="lg" className="hidden rounded-[0.95rem] px-5 sm:inline-flex">
                      <Link href="/sign-up">Create account</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
