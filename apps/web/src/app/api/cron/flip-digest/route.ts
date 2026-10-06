import { clerkClient } from "@clerk/nextjs/server";

import { assetMonitorDefinitions } from "@/lib/asset-monitors";
import { loadCryptoMonitor } from "@/lib/crypto-monitor";
import type { FlipCadence, FlipDigestNotification, FlipDirection } from "@/lib/flip-digest";
import { selectRecentConfirmedFlips, type FlipCandidate } from "@/lib/flip-digest-selection";
import { loadDirectFreeAssetMonitor } from "@/lib/free-market-monitors";
import { flipDigestJobRequest } from "@/lib/server/flip-digest-api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Subscriber = { userId: string; direction: FlipDirection; cadence: FlipCadence; emailEnabled: boolean; inAppEnabled: boolean };
type PendingEmail = { userId: string; notification: FlipDigestNotification };
type Scan = { candidates: FlipCandidate[]; scannedClasses: string[]; failedClasses: string[] };

function periodFor(cadence: FlipCadence, now: Date) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - (cadence === "weekly" ? 7 : 1) * 86_400_000);
  return { start, end };
}

async function scanMarkets(): Promise<Scan> {
  const candidates: FlipCandidate[] = [];
  const scannedClasses: string[] = [];
  const failedClasses: string[] = [];
  const classes = assetMonitorDefinitions.map((item) => item.id);

  // Bound concurrent public-provider requests to avoid exhausting rate limits.
  for (let index = 0; index < classes.length; index += 3) {
    const batch = await Promise.allSettled(classes.slice(index, index + 3).map(async (assetClass) => {
      if (assetClass === "crypto") {
        const payload = await loadCryptoMonitor("1d", 20);
        return { failedMarkets: payload.meta.failedMarkets, candidates: payload.data.map((row): FlipCandidate => ({
          assetClass, symbol: row.symbol, name: row.assetName, trend: row.trend,
          lastFlipAt: row.lastFlipAt, capturedAt: row.candleClosedAt,
          source: payload.meta.providerLabel, signalBasis: "ohlc", confirmedClosedCandle: true,
        })) };
      }
      const payload = await loadDirectFreeAssetMonitor(assetClass, "1d");
      return { failedMarkets: payload.meta.failedMarkets, candidates: payload.data.map((row): FlipCandidate => ({
        assetClass, symbol: row.symbol, name: row.name, trend: row.trend,
        lastFlipAt: row.lastFlipAt, capturedAt: row.capturedAt,
        source: row.provider, signalBasis: row.signalBasis ?? "unknown", confirmedClosedCandle: row.historyComplete === true,
      })) };
    }));
    batch.forEach((result, offset) => {
      const assetClass = classes[index + offset];
      if (result.status === "fulfilled") {
        scannedClasses.push(assetClass);
        candidates.push(...result.value.candidates);
        if (result.value.failedMarkets > 0) failedClasses.push(`${assetClass} (${result.value.failedMarkets} markets unavailable)`);
      } else {
        failedClasses.push(assetClass);
      }
    });
  }
  return { candidates, scannedClasses, failedClasses };
}

async function sendPendingEmail(item: PendingEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !item.notification.emailEnabled || item.notification.emailSentAt) return false;
  const client = await clerkClient();
  const user = await client.users.getUser(item.userId);
  const recipient = user.emailAddresses.find((address) =>
    address.id === user.primaryEmailAddressId && address.verification?.status === "verified");
  if (!recipient) return false;

  const notification = item.notification;
  const text = [
    `${notification.entries.length} recent confirmed ${notification.direction} flip${notification.entries.length === 1 ? "" : "s"}`,
    `Period: ${notification.periodStart} to ${notification.periodEnd}`,
    "Daily monitor timeframe: 1 day. A flip is reported after a closed candle; historical data and provider coverage can be limited.",
    "",
    ...notification.entries.map((entry) =>
      `${entry.assetClass} / ${entry.symbol} (${entry.name}): ${entry.direction.toUpperCase()} flip at ${entry.lastFlipAt}; source ${entry.source}; data as of ${entry.capturedAt}; basis ${entry.signalBasis}.`),
    "",
    `Scanned: ${notification.coverage.scannedClasses.join(", ") || "none"}`,
    `Unavailable: ${notification.coverage.failedClasses.join(", ") || "none"}`,
    "Research and scenario context only. This is not financial advice or an instruction to trade.",
  ].join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `flip-digest/${notification.id}`,
    },
    body: JSON.stringify({
      from,
      to: [recipient.emailAddress],
      subject: `Aperture: ${notification.entries.length} confirmed market flip${notification.entries.length === 1 ? "" : "s"}`,
      text,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
  await flipDigestJobRequest(`/notifications/${encodeURIComponent(notification.id)}/email-sent`, { method: "POST" });
  return true;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Cron secret is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();
    const subscribers = (await flipDigestJobRequest<{ data: Subscriber[] }>("/subscribers")).data;
    let created = 0;
    let scan: Scan = { candidates: [], scannedClasses: [], failedClasses: [] };
    if (subscribers.length > 0) {
      scan = await scanMarkets();
      // Report partial provider coverage alongside confirmed results from available classes.
      if (scan.scannedClasses.length > 0) {
        for (const subscriber of subscribers) {
          if (subscriber.cadence === "weekly" && now.getUTCDay() !== 1) continue;
          const { start, end } = periodFor(subscriber.cadence, now);
          const entries = selectRecentConfirmedFlips(scan.candidates, subscriber.direction, start, end).slice(0, 250);
          if (entries.length === 0) continue;
          const result = await flipDigestJobRequest<{ created: boolean }>("/notifications", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: subscriber.userId, notification: {
              periodStart: start.toISOString(), periodEnd: end.toISOString(), cadence: subscriber.cadence,
              direction: subscriber.direction, entries, coverage: {
                scannedClasses: scan.scannedClasses, failedClasses: scan.failedClasses, generatedAt: now.toISOString(),
              },
            } }),
          });
          if (result.created) created += 1;
        }
      }
    }

    const pending = (await flipDigestJobRequest<{ data: PendingEmail[] }>("/pending-emails")).data;
    let emailed = 0;
    let emailFailures = 0;
    for (const item of pending) {
      try { if (await sendPendingEmail(item)) emailed += 1; }
      catch { emailFailures += 1; }
    }
    return Response.json({ created, emailed, emailFailures, scannedClasses: scan.scannedClasses.length, failedClasses: scan.failedClasses });
  } catch {
    return Response.json({ error: "Flip digest run failed; retry after checking the finance API and market providers." }, { status: 502 });
  }
}
