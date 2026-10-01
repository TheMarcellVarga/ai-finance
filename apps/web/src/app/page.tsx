import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Target,
} from "lucide-react";

import { HomeMotion } from "@/components/home-motion";
import { MarketingPage } from "@/components/marketing-page";
import { Button } from "@/components/ui/button";

const storyPanels = [
  {
    title: "Portfolio context first",
    body: "Holdings, allocation, watchlists, and provider freshness become one readable starting point.",
    icon: Target,
  },
  {
    title: "Evidence stays attached",
    body: "Filing passages, citations, assumptions, and interpretation remain close to every material claim.",
    icon: FileText,
  },
  {
    title: "Questions become a record",
    body: "Save the brief, challenge the assumptions, and return to the conversation when the picture changes.",
    icon: BookOpenCheck,
  },
];

const boundaries = [
  { title: "Server-owned", body: "Secrets stay out of the browser.", icon: KeyRound },
  { title: "Owner-scoped", body: "Finance data stays behind identity checks.", icon: Fingerprint },
  { title: "Research support", body: "Sources and assumptions stay visible.", icon: ShieldCheck },
];

const tiers = [
  { name: "Free", price: "$0", detail: "1 portfolio" },
  { name: "Pro", price: "$19", detail: "5 portfolios" },
  { name: "Research Pro", price: "$49", detail: "20 portfolios" },
  { name: "Team / Advisor", price: "Custom", detail: "Shared rooms" },
];

export default function Home() {
  return (
    <MarketingPage>
      <HomeMotion>
        <div className="home-index">
          <section id="top" className="home-hero relative isolate overflow-hidden px-4 sm:px-6 lg:px-8">
            <div className="home-hero-art" aria-hidden="true" />
            <div className="home-hero-glow" aria-hidden="true" />
            <div className="home-hero-scrim" aria-hidden="true" />

            <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center pt-20 pb-12 sm:pt-24">
              <div className="home-hero-copy max-w-3xl">
                <p className="home-eyebrow">Private wealth intelligence</p>
                <h1 className="mt-7 max-w-4xl text-5xl font-extralight leading-[0.96] tracking-[-0.035em] text-zinc-50 sm:text-6xl xl:text-7xl">
                  Complexity, made quiet.
                </h1>
                <p className="mt-7 max-w-xl text-base leading-8 text-zinc-200/88 sm:text-lg">
                  Portfolios, filings, goals, and market noise become cited briefings for calm, deliberate decisions.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="rounded-[0.95rem] px-5">
                    <Link href="/app" prefetch={false}>
                      Open workspace
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-[0.95rem] px-5">
                    <a href="#product">See the product</a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section id="product" data-home-reveal className="home-section home-product scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-7xl">
              <div className="home-section-heading max-w-3xl">
                <h2>One picture before many tools.</h2>
                <p>Aperture gives the portfolio, the evidence, and the next question a shared place to meet.</p>
              </div>

              <div className="home-product-grid mt-14">
                <figure className="home-photo-frame">
                  <Image
                    src="/media/aperture-private-study-detail-v1.png"
                    alt="A quiet desk with a notebook, pen, tablet, and city lights beyond a window"
                    width={1672}
                    height={941}
                    className="block w-full object-cover"
                  />
                  <figcaption>A research surface for people who want context without a finance terminal.</figcaption>
                </figure>

                <div className="home-surface-list">
                  <div className="home-surface-row">
                    <span>Portfolio</span>
                    <p>See allocation, holdings, watchlists, and freshness before asking for an interpretation.</p>
                  </div>
                  <div className="home-surface-row">
                    <span>Evidence</span>
                    <p>Turn filings and market context into a cited brief with assumptions close at hand.</p>
                  </div>
                  <div className="home-surface-row">
                    <span>Plan</span>
                    <p>Compare user-controlled scenarios without turning a range into a promise.</p>
                  </div>
                  <Link href="/app" prefetch={false} className="home-inline-link">
                    Enter the workspace <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" data-story className="home-section home-story scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
              <div data-story-visual className="home-story-visual self-start">
                <Image
                  src="/media/aperture-private-study-hero-v1.png"
                  alt="A warmly lit workspace facing a city at dusk"
                  width={1717}
                  height={916}
                  className="h-full w-full object-cover"
                />
                <div className="home-story-progress" aria-hidden="true">
                  <span data-story-progress />
                </div>
              </div>

              <div className="home-story-panels">
                <div className="max-w-xl pb-10">
                  <h2>Follow the question, not the noise.</h2>
                  <p className="mt-6 text-base leading-8 text-zinc-400">
                    The daily loop stays deliberately small. Understand the position, inspect the source, keep a record for later.
                  </p>
                </div>
                <div className="home-story-list">
                  {storyPanels.map(({ title, body, icon: Icon }) => (
                    <article key={title} data-story-panel className="home-story-panel">
                      <div className="home-story-icon"><Icon className="size-5" aria-hidden="true" /></div>
                      <div>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="security" data-home-reveal className="home-section home-boundary scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
              <div>
                <h2>Quiet by design.</h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
                  No brokerage. No trade execution. Research support with sources, freshness, and assumptions in view.
                </p>
              </div>
              <div className="home-boundary-list">
                {boundaries.map(({ title, body, icon: Icon }) => (
                  <div key={title} className="home-boundary-row">
                    <Icon className="size-5 text-cyan-100/78" aria-hidden="true" />
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="pricing" data-home-reveal className="home-section home-pricing scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-7xl">
              <div className="home-section-heading max-w-3xl">
                <h2>Choose the depth of your review rhythm.</h2>
                <p>More context when you need it. No incentives to trade more.</p>
              </div>
              <div className="home-pricing-grid mt-12">
                {tiers.map((tier) => (
                  <article key={tier.name} className="home-pricing-item">
                    <div className="flex items-start justify-between gap-4">
                      <h3>{tier.name}</h3>
                      <span className="home-pricing-mark" aria-hidden="true" />
                    </div>
                    <p className="home-price">{tier.price}</p>
                    <p className="mt-4 text-sm text-zinc-400">{tier.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section data-home-reveal className="home-close px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-white/10 pt-10 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2>Keep the final judgment with the person.</h2>
                <p className="mt-5 text-base leading-8 text-zinc-400">
                  A calmer way to prepare for the next financial conversation.
                </p>
              </div>
              <Link href="/app" prefetch={false} className="home-inline-link shrink-0">
                Open the workspace <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </HomeMotion>
    </MarketingPage>
  );
}
