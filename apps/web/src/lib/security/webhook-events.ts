import "server-only";

import { supabaseRestFetch, supabaseServerConfigured } from "@/lib/server/supabase-rest";

export async function claimWebhookEvent(input: { id?: string | null; provider: "stripe" | "clerk"; eventType: string }) {
  if (!input.id || !supabaseServerConfigured()) {
    return { claimed: true, status: "not_configured" as const };
  }

  const existing = await supabaseRestFetch<Array<{ id: string; status: string }>>(
    `webhook_events?id=eq.${encodeURIComponent(input.id)}&select=id,status&limit=1`,
  );
  if (existing[0]?.status === "processed") {
    return { claimed: false, status: "duplicate" as const };
  }

  await supabaseRestFetch("webhook_events?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        id: input.id,
        provider: input.provider,
        event_type: input.eventType,
        status: "processing",
      },
    ]),
  });

  return { claimed: true, status: "claimed" as const };
}

export async function markWebhookEventProcessed(input: {
  id?: string | null;
  status: "processed" | "failed";
  metadata?: Record<string, unknown>;
}) {
  if (!input.id || !supabaseServerConfigured()) {
    return { status: "not_configured" as const };
  }

  await supabaseRestFetch(`webhook_events?id=eq.${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: input.status,
      metadata: input.metadata ?? {},
    }),
  });

  return { status: input.status };
}
