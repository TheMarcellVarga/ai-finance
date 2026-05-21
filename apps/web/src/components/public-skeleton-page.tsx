import type { LucideIcon } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";

type PublicSkeletonPageProps = {
  eyebrow: string;
  title: string;
  body: string;
  items: Array<{
    title: string;
    body: string;
    icon: LucideIcon;
  }>;
};

export function PublicSkeletonPage({
  eyebrow,
  title,
  body,
  items,
}: PublicSkeletonPageProps) {
  return (
    <MarketingPage>
      <section className="page-stage px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.14),transparent_24rem),radial-gradient(circle_at_76%_22%,rgba(39,39,42,0.7),transparent_28rem),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.62)_76%)]" />
        <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-35" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="section-shell rounded-[1.25rem] p-6 sm:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="max-w-3xl">
                <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {eyebrow}
                </p>
                <h1 className="type-display mt-6 text-balance text-4xl text-white sm:text-5xl xl:text-6xl">
                  {title}
                </h1>
                <p className="mt-6 text-base leading-7 text-zinc-400">{body}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.title}
                      className="glass-hover glass-surface rounded-[1.15rem] p-6"
                    >
                      <Icon className="size-5 text-cyan-200" />
                      <h2 className="type-card-title mt-6 text-xl text-white">
                        {item.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        {item.body}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
