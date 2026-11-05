import Link from "next/link";
import { MarketingPage } from "@/components/marketing-page";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return <MarketingPage><section className="mx-auto max-w-3xl px-6 pb-24 pt-40">
    <h1 className="type-display text-4xl text-white">Aperture preview</h1>
    <p className="mt-5 text-sm leading-7 text-zinc-300">Explore the workspace with the current preview limits. Paid subscriptions are not available.</p>
    <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/app">Open workspace</Link></Button><Button disabled variant="outline">Subscriptions unavailable</Button></div>
  </section></MarketingPage>;
}
