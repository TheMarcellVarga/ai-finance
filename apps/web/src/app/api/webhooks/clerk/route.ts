import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/security/audit";
import { captureSafeError, captureSafeEvent } from "@/lib/security/observability";
import { claimWebhookEvent, markWebhookEventProcessed } from "@/lib/security/webhook-events";
import { verifyClerkSignature } from "@/lib/security/webhook-signatures";
import { ensureProfileForClerkUser, supabaseRestFetch, supabaseServerConfigured } from "@/lib/server/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClerkEvent = {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function displayName(data: Record<string, unknown>) {
  const firstName = stringValue(data.first_name);
  const lastName = stringValue(data.last_name);
  const username = stringValue(data.username);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || username || null;
}

async function syncProfile(event: ClerkEvent) {
  if (!supabaseServerConfigured()) {
    return { status: "not_configured" as const };
  }

  const data = event.data;
  const clerkUserId = data ? stringValue(data.id) : null;
  if (!data || !clerkUserId) {
    return { status: "ignored_missing_user" as const };
  }

  if (event.type === "user.deleted") {
    const rows = await supabaseRestFetch<Array<{ id: string }>>(
      `profiles?clerk_user_id=eq.${encodeURIComponent(clerkUserId)}&select=id&limit=1`,
    );
    if (!rows[0]) {
      return { status: "ignored_missing_profile" as const };
    }
    await supabaseRestFetch("profiles?id=eq." + encodeURIComponent(rows[0].id), {
      method: "PATCH",
      body: JSON.stringify({ display_name: "Deleted user", onboarding_state: "deleted" }),
    });
    await writeAuditLog({
      clerkUserId,
      action: "auth.profile_deleted",
      entityType: "profile",
      entityId: rows[0].id,
      metadata: { eventId: event.id, type: event.type },
    });
    return { status: "deleted" as const, profileId: rows[0].id };
  }

  const profile = await ensureProfileForClerkUser({ clerkUserId, displayName: displayName(data) });
  await writeAuditLog({
    clerkUserId,
    action: "auth.profile_synced",
    entityType: "profile",
    entityId: profile.id,
    metadata: { eventId: event.id, type: event.type },
  });
  return { status: "synced" as const, profileId: profile.id };
}

export async function POST(request: Request) {
  const payload = await request.text();

  if (
    !verifyClerkSignature({
      payload,
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
      secret: process.env.CLERK_WEBHOOK_SECRET,
    })
  ) {
    await captureSafeEvent("webhook.signature_failed", { provider: "clerk" });
    return NextResponse.json({ error: { code: "invalid_signature", message: "Invalid Clerk signature." } }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload) as ClerkEvent;
    const claim = await claimWebhookEvent({ id: event.id, provider: "clerk", eventType: event.type });
    if (!claim.claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const result = event.type.startsWith("user.") ? await syncProfile(event) : { status: "ignored" as const };
    await markWebhookEventProcessed({ id: event.id, status: "processed", metadata: { type: event.type, result } });
    await captureSafeEvent("webhook.processed", { provider: "clerk", type: event.type, result });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    await captureSafeError(error, { route: "/api/webhooks/clerk" });
    return NextResponse.json({ error: { code: "webhook_failed", message: "Clerk webhook could not be processed." } }, { status: 400 });
  }
}
