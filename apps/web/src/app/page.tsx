import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { MarketingPage } from "@/components/marketing-page";
import { HomeHeroImage } from "@/components/home-hero-image";
import { Button } from "@/components/ui/button";
import { WorkspaceParticleBloom } from "@/components/workspace-particle-bloom";

const capabilities = [
  { title: "Markets", description: "Explore supported asset classes, monitor changes, and keep market context in view." },
  { title: "Portfolio", description: "Bring your holdings and allocation together, with data freshness close at hand." },
  { title: "Plan", description: "Compare possible paths with contributions and assumptions you control." },
  { title: "Learn", description: "Build your understanding with lessons connected to the questions you are asking." },
];

export default function Home() {
  return (
    <MarketingPage>
      <div className="home-index product-home">
        <section className="home-hero relative isolate overflow-hidden px-4 sm:px-6 lg:px-8">
          <HomeHeroImage />
          <noscript><style>{".home-hero-art { opacity: 1 !important; }"}</style></noscript>
          <div className="home-hero-glow" aria-hidden="true" />
          <div className="home-hero-scrim" aria-hidden="true" />
          <div className="product-hero-inner relative z-10 mx-auto flex w-full max-w-7xl items-center">
            <div className="max-w-3xl">
              <h1>A clearer view of your finances.</h1>
              <p>Explore markets, review your holdings, and compare goal scenarios in one workspace.</p>
              <div className="product-hero-actions">
                <Button asChild size="lg" className="rounded-[0.95rem] px-5"><Link href="/app" prefetch={false}>Open workspace <ArrowRight data-icon="inline-end" /></Link></Button>
                <a href="#product" className="product-text-link">Explore Aperture <span aria-hidden="true">↓</span></a>
              </div>
              <p className="product-hero-note">Research and planning support. Not financial advice.</p>
            </div>
          </div>
        </section>

        <section id="product" className="product-section product-overview relative isolate overflow-hidden scroll-mt-24 px-4 sm:px-6 lg:px-8">
          <div className="product-overview-atmosphere" aria-hidden="true"><WorkspaceParticleBloom /></div>
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="product-section-heading">
              <h2>A clearer picture starts here.</h2>
              <p>Financial decisions don’t happen in isolation. Aperture brings the context, your position, and the next question together.</p>
            </div>
            <div className="product-capabilities">
              {capabilities.map(({ title, description }) => <div key={title}><h3>{title}</h3><p>{description}</p></div>)}
            </div>
            <figure className="product-screen product-screen-wide">
              <Image src="/media/market-workspace-current.jpg" alt="Aperture Markets workspace showing a cross-asset market monitor" width={1512} height={741} sizes="(max-width: 1280px) 100vw, 1280px" />
              <figcaption>Aperture Markets · captured 6 November 2026; market values are historical</figcaption>
            </figure>
          </div>
        </section>

        <section id="security" className="product-section product-trust scroll-mt-24 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:gap-24">
            <div className="product-section-heading"><h2>Built for thoughtful decisions.</h2><p>Your judgment stays at the center. Aperture offers context and tools, with the boundaries made clear.</p></div>
            <div className="product-trust-list">
              <div><Check aria-hidden="true" size={18} /><p><strong>Private by design.</strong> Account access and ownership checks protect user-owned workspace data.</p></div>
              <div><Check aria-hidden="true" size={18} /><p><strong>Assumptions in view.</strong> Planning scenarios are illustrations, not forecasts or promises.</p></div>
              <div><Check aria-hidden="true" size={18} /><p><strong>Market context.</strong> Data comes from supported providers, with freshness shown where available.</p></div>
              <div><Check aria-hidden="true" size={18} /><p><strong>Research, not execution.</strong> No brokerage, trading, or personalized investment advice.</p></div>
              <Link href="/privacy" className="product-inline-link">Read our privacy policy <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

      </div>
    </MarketingPage>
  );
}
