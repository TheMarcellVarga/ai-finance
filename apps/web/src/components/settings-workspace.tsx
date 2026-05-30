"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Database, Download, KeyRound, Lock, MonitorCog, ShieldCheck, ToggleLeft, ToggleRight, UserRound } from "lucide-react";

type ToggleKey = "privacyTelemetry" | "providerFreshness" | "weeklyDigest" | "aiDisclaimers";

const initialToggles: Record<ToggleKey, boolean> = {
  privacyTelemetry: true,
  providerFreshness: true,
  weeklyDigest: false,
  aiDisclaimers: true,
};

const controlGroups = [
  {
    title: "Account boundary",
    icon: Lock,
    rows: [
      ["Authentication", "Clerk session validation is required for protected routes and finance API calls."],
      ["Workspace identity", "Local development uses the configured dev token; production maps Clerk subjects to internal profiles."],
      ["Organizations", "Team and advisor access is entitlement-ready and remains isolated by user-owned resources."],
    ],
  },
  {
    title: "Data handling",
    icon: Database,
    rows: [
      ["Portfolio records", "Holdings, transactions, prompts, and AI outputs are treated as sensitive product data."],
      ["Export posture", "Export requests are audit-logged and designed for user-owned data only."],
      ["Retention posture", "Research saves and AI runs are stored with citations, freshness, safety labels, and usage metadata."],
    ],
  },
  {
    title: "Provider mode",
    icon: KeyRound,
    rows: [
      ["AI calls", "External model calls stay disabled until the explicit kill switch and provider credentials are configured."],
      ["Market data", "Provider-backed prices are shown only with source and timestamp metadata."],
      ["Secrets", "Service-role keys, provider keys, webhook secrets, and raw JWTs are server-only."],
    ],
  },
];

const toggles: Array<{ key: ToggleKey; title: string; body: string }> = [
  {
    key: "privacyTelemetry",
    title: "Scrub analytics payloads",
    body: "Keep PII, holdings, financial amounts, prompts, and AI outputs out of telemetry by default.",
  },
  {
    key: "providerFreshness",
    title: "Show freshness badges",
    body: "Display provider, timestamp, and stale-data labels anywhere market or AI context appears.",
  },
  {
    key: "weeklyDigest",
    title: "Weekly research digest",
    body: "Prepare a notification digest from watchlist movement and saved research metadata.",
  },
  {
    key: "aiDisclaimers",
    title: "AI boundary notices",
    body: "Keep not-financial-advice notices visible near research, goal, and risk outputs.",
  },
];

export function SettingsWorkspace() {
  const [values, setValues] = useState(initialToggles);
  const [mode, setMode] = useState<"demo" | "live-ready">("demo");

  return (
    <div className="space-y-6">
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="type-label inline-flex rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              Settings
            </p>
            <h1 className="type-display mt-6 text-3xl text-white sm:text-5xl">Account, privacy, and provider controls</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Review the product boundaries that keep portfolio data private, AI calls controlled, and finance outputs framed as research support.
            </p>
          </div>
          <div className="glass-surface rounded-[1rem] p-5">
            <div className="flex items-start gap-3">
              <MonitorCog className="mt-1 size-5 text-cyan-200" />
              <div>
                <p className="text-sm text-zinc-400">Runtime mode</p>
                <p className="mt-1 text-xl font-medium text-white">{mode === "demo" ? "Local demo mode" : "Live-provider ready"}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {mode === "demo"
                    ? "Deterministic AI is active for local verification without model spend."
                    : "External providers require explicit environment switches and server-side credentials."}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(["demo", "live-ready"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                    className={`rounded-[0.85rem] border px-3 py-2 text-sm transition active:scale-[0.98] ${
                      mode === item
                        ? "border-cyan-200/40 bg-cyan-200/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  }`}
                >
                  {item === "demo" ? "Demo" : "Live-ready"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
        <div className="space-y-4">
          {controlGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="glass-surface rounded-[1.25rem] p-5">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-cyan-200" />
                  <h2 className="type-card-title text-xl text-white">{group.title}</h2>
                </div>
                <div className="mt-5 divide-y divide-white/8">
                  {group.rows.map(([title, body]) => (
                    <div key={title} className="grid gap-2 py-4 md:grid-cols-[12rem_1fr]">
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="text-sm leading-6 text-zinc-500">{body}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="glass-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-3">
              <UserRound className="size-5 text-cyan-200" />
              <h2 className="type-card-title text-xl text-white">Account management</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Review your Clerk-managed profile, sign-in methods, connected accounts, active sessions, and account security.
            </p>
            <Link
              href="/app/settings/account"
              className="mt-5 inline-flex rounded-[0.85rem] border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-200/15"
            >
              Manage account
            </Link>
          </div>

          <div className="glass-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-cyan-200" />
              <h2 className="type-card-title text-xl text-white">Workspace controls</h2>
            </div>
            <div className="mt-5 space-y-3">
              {toggles.map((item) => {
                const active = values[item.key];
                const Icon = active ? ToggleRight : ToggleLeft;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setValues((current) => ({ ...current, [item.key]: !current[item.key] }))}
                    className="w-full rounded-[1rem] border border-white/10 bg-white/[0.025] p-4 text-left transition hover:bg-black/20 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">{item.body}</p>
                      </div>
                      <Icon className={active ? "size-5 text-cyan-200" : "size-5 text-zinc-600"} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-3">
              <Download className="size-5 text-cyan-200" />
              <h2 className="type-card-title text-xl text-white">Data export posture</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Exports are scoped to authenticated, user-owned records and should include portfolios, saved research metadata, AI citations, usage records, and audit references.
            </p>
            <p className="mt-4 rounded-[0.9rem] bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-500">
              Export workflows are designed to avoid raw secrets, provider credentials, raw JWTs, and unrelated tenant data.
            </p>
          </div>

          <div className="glass-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-3">
              <Bell className="size-5 text-cyan-200" />
              <h2 className="type-card-title text-xl text-white">Notification posture</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Notification content should summarize research activity and source freshness. It must not include trade instructions or exposed financial amounts in analytics payloads.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
