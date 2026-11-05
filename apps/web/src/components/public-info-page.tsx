import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { MarketingPage } from "@/components/marketing-page";

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  body: string;
  items: Array<{
    title: string;
    body: string;
    icon: LucideIcon;
  }>;
};

export function PublicInfoPage({
  eyebrow,
  title,
  body,
  items,
}: PublicInfoPageProps) {
  return (
    <MarketingPage>
      <section className="public-info-page page-stage px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.14),transparent_24rem),radial-gradient(circle_at_76%_22%,rgba(39,39,42,0.7),transparent_28rem),linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.62)_76%)]" />
        <div className="pointer-events-none cinematic-grid absolute inset-0 opacity-35" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="public-info-shell">
            <div className="public-info-header">
              <div className="max-w-4xl">
                <p className="public-info-kicker">
                  <span className="public-info-kicker-line" aria-hidden="true" />
                  {eyebrow}
                </p>
                <h1 className="type-display mt-6 max-w-4xl text-balance text-4xl text-white sm:text-5xl xl:text-[4.5rem]">
                  {title}
                </h1>
                <p className="public-info-lede mt-6 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg">
                  {body}
                </p>
              </div>
            </div>

            <div className="public-info-list" aria-label={`${eyebrow} principles`}>
              {items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article key={item.title} className="public-info-row">
                    <div className="public-info-row-index hidden min-[641px]:block" aria-hidden="true">
                      {index + 1}
                    </div>
                    <div className="public-info-row-icon">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="public-info-row-copy">
                      <h2 className="type-card-title text-lg text-white">{item.title}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
                        {item.body}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="public-info-footer">
              <p>
                Aperture is research support only. Keep the source, freshness, assumptions, and final judgment in view.
              </p>
              <Link href="/" className="public-info-return">
                Return to Aperture
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
