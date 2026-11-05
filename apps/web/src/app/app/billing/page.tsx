import { Button } from "@/components/ui/button";
import { getUsageSummaryForToken } from "@/lib/billing/usage";
import { authenticatedSessionToken } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  let usage: Awaited<ReturnType<typeof getUsageSummaryForToken>> | null = null;
  try {
    usage = await getUsageSummaryForToken(await authenticatedSessionToken());
  } catch {
    // Service failures must not take down the account workspace.
  }
  return <div className="mx-auto max-w-3xl space-y-8">
    <header><h1 className="type-display text-3xl text-white sm:text-4xl">Usage</h1><p className="mt-3 text-sm text-zinc-400">{usage?.configured ? `${usage.entitlements.label} · ${usage.period}` : "Usage tracking is unavailable for this session."}</p></header>
    {usage?.configured ? <section className="divide-y divide-white/10 border-y border-white/10" aria-label="Current usage">
      {usage.features.map((feature) => <div key={feature.feature} className="flex items-center justify-between gap-4 py-5"><h2 className="text-sm capitalize text-zinc-300">{feature.feature.replace(/_/g, " ")}</h2><p className="font-mono text-sm text-white">{feature.used} / {feature.limit}</p></div>)}
    </section> : null}
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"><p id="subscriptions-unavailable" className="text-sm text-zinc-400">Paid subscriptions are unavailable in this preview.</p><Button disabled variant="outline" aria-describedby="subscriptions-unavailable">Upgrade unavailable</Button></div>
  </div>;
}
