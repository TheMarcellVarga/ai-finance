import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type SettingsWorkspaceProps = {
  financeApiConnected: boolean;
  externalAiEnabled: boolean;
};

export function SettingsWorkspace({ financeApiConnected, externalAiEnabled }: SettingsWorkspaceProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="type-display text-3xl text-white sm:text-4xl">Settings</h1>
        <p className="mt-3 text-sm text-zinc-400">Manage your account and check service availability.</p>
      </header>
      <section className="divide-y divide-white/10 border-y border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div><h2 className="font-medium text-white">Account</h2><p className="mt-2 text-sm text-zinc-400">Profile, sign-in methods, and active sessions.</p></div>
          <Button asChild variant="outline"><Link href="/app/settings/account">Manage account <ArrowUpRight className="size-4" /></Link></Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div><h2 className="font-medium text-white">Usage</h2><p className="mt-2 text-sm text-zinc-400">Current limits and research activity.</p></div>
          <Button asChild variant="outline"><Link href="/app/billing">View usage</Link></Button>
        </div>
        <dl className="space-y-5 py-6 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-zinc-400">Portfolio service</dt><dd className={financeApiConnected ? "text-emerald-100" : "text-amber-100"}>{financeApiConnected ? "Connected" : "Unavailable"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-zinc-400">External AI calls</dt><dd className="text-zinc-200">{externalAiEnabled ? "Enabled in server configuration" : "Disabled"}</dd></div>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div><h2 className="font-medium text-white">Data export</h2><p id="export-unavailable" className="mt-2 text-sm text-zinc-400">Account-wide export is unavailable in this preview.</p></div>
          <Button disabled variant="outline" aria-describedby="export-unavailable">Export unavailable</Button>
        </div>
        <div id="flip-digests" className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div><h2 className="font-medium text-white">Email alerts</h2><p id="alerts-unavailable" className="mt-2 text-sm text-zinc-400">Email delivery is unavailable in this preview.</p></div>
          <Button disabled variant="outline" aria-describedby="alerts-unavailable">Alerts unavailable</Button>
        </div>
      </section>
      <p className="text-xs leading-6 text-zinc-400">Research and scenario planning only. Not financial advice. <Link href="/privacy" className="text-cyan-100 underline underline-offset-4">Privacy policy</Link></p>
    </div>
  );
}
