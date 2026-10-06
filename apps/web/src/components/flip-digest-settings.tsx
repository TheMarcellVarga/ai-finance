"use client";

import { useEffect, useState } from "react";

import type { FlipDigestNotification, FlipDigestPreferences } from "@/lib/flip-digest";

const initialPreferences: FlipDigestPreferences = {
  enabled: false, direction: "bull", cadence: "daily", emailEnabled: true, inAppEnabled: true,
};

export function FlipDigestSettings() {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [notifications, setNotifications] = useState<FlipDigestNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailDeliveryReady, setEmailDeliveryReady] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/finance/flip-digest", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "Could not load digest settings.");
        if (active) {
          setPreferences(body.preferences);
          setNotifications(body.notifications);
          setEmailDeliveryReady(body.emailDeliveryReady);
        }
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load digests."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/finance/flip-digest", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Could not save digest settings.");
      setPreferences(body.data);
      setMessage("Digest settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save digest settings.");
    } finally { setSaving(false); }
  }

  return (
    <div id="flip-digests" className="space-y-5">
      <p className="text-sm leading-6 text-zinc-400">
        Receive a summary when a monitored market confirms a recent flip on its closed daily candle. No message is sent when there are no matching flips.
      </p>
      {loading ? <p className="text-sm text-zinc-500">Loading alerts…</p> : <>
        <label className="flex items-center gap-3 text-sm text-zinc-200">
          <input type="checkbox" checked={preferences.enabled} onChange={(event) => setPreferences({ ...preferences, enabled: event.target.checked })} className="size-4 accent-cyan-300" />
          Enable confirmed flip summaries
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-xs text-zinc-400">
            <span>Direction</span>
            <select value={preferences.direction} onChange={(event) => setPreferences({ ...preferences, direction: event.target.value as FlipDigestPreferences["direction"] })} className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white">
              <option value="bull">Bull flips</option><option value="bear">Bear flips</option><option value="both">Both directions</option>
            </select>
          </label>
          <label className="space-y-2 text-xs text-zinc-400">
            <span>Cadence</span>
            <select value={preferences.cadence} onChange={(event) => setPreferences({ ...preferences, cadence: event.target.value as FlipDigestPreferences["cadence"] })} className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white">
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-zinc-200">
          <label className="flex items-center gap-2"><input type="checkbox" checked={preferences.emailEnabled} onChange={(event) => setPreferences({ ...preferences, emailEnabled: event.target.checked })} className="size-4 accent-cyan-300" />Email</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={preferences.inAppEnabled} onChange={(event) => setPreferences({ ...preferences, inAppEnabled: event.target.checked })} className="size-4 accent-cyan-300" />In-app</label>
        </div>
        {!emailDeliveryReady && <p className="text-xs text-amber-200">Email delivery is awaiting server configuration. In-app digests are available now.</p>}
        <p className="text-xs leading-5 text-zinc-500">Email uses your verified primary account address. Coverage spans the Markets classes, including the top 20 eligible crypto markets by volume. Provider gaps are shown in each digest.</p>
        <button type="button" onClick={save} disabled={saving || (preferences.enabled && !preferences.emailEnabled && !preferences.inAppEnabled)} className="rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-200/20 disabled:opacity-50">
          {saving ? "Saving…" : "Save alert settings"}
        </button>
        {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
      </>}

      <div className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-white">Recent in-app digests</h3>
        {notifications.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No matching digests yet.</p> :
          <div className="mt-3 space-y-3">
            {notifications.slice(0, 8).map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-sm font-medium text-white">{item.entries.length} confirmed {item.direction} flip{item.entries.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-xs text-zinc-500">Period ending {new Date(item.periodEnd).toLocaleDateString()} · {item.cadence}</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                {item.entries.slice(0, 10).map((entry) => <li key={`${entry.assetClass}:${entry.symbol}:${entry.lastFlipAt}`}>
                  {entry.assetClass} · {entry.symbol} · {entry.direction} · {new Date(entry.lastFlipAt).toLocaleString()} · {entry.source} as of {new Date(entry.capturedAt).toLocaleString()}
                </li>)}
              </ul>
              {item.entries.length > 10 && <p className="mt-2 text-xs text-zinc-500">+{item.entries.length - 10} more flips in this digest.</p>}
              {item.coverage.failedClasses.length > 0 && <p className="mt-2 text-xs text-amber-200">Unavailable: {item.coverage.failedClasses.join(", ")}</p>}
            </article>)}
          </div>}
        <p className="mt-3 text-xs leading-5 text-zinc-500">Research context only. Confirm source freshness and assumptions. This is not financial advice or an instruction to trade.</p>
      </div>
    </div>
  );
}
