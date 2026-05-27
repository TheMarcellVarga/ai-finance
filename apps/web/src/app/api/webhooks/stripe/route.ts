import { NextResponse } from "next/server";

import { PLAN_ENTITLEMENTS, stripePriceIdToPlan } from "@/lib/billing/entitlements";
import { writeAuditLog } from "@/lib/security/audit";
import { captureSafeError, captureSafeEvent } from "@/lib/security/observability";
import { claimWebhookEvent, markWebhookEventProcessed } from "@/lib/security/webhook-events";
import { verifyStripeSignature } from "@/lib/security/webhook-signatures";
import { ensureProfileForClerkUser, supabaseRestFetch, supabaseServerConfigured } from "@/lib/server/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> };
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberToIso(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function metadataValue(object: Record<string, unknown>, key: string) {
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  return stringValue((metadata as Record<string, unknown>)[key]);
}

function priceIdFromSubscription(object: Record<string, unknown>) {
  const items = object.items;
  if (!items || typeof items !== "object") {
    return null;
  }
  const data = (items as Record<string, unknown>).data;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") {
    return null;
  }
  const price = (data[0] as Record<string, unknown>).price;
  return price && typeof price === "object" ? stringValue((price as Record<string, unknown>).id) : null;
}

async function profileIdForStripeObject(object: Record<string, unknown>) {
  const clerkUserId = metadataValue(object, "clerk_user_id") ?? metadataValue(object, "clerkUserId");
  if (clerkUserId) {
    return ensureProfileForClerkUser({ clerkUserId });
  }

  const customerId = stringValue(object.customer);
  if (!customerId || !supabaseServerConfigured()) {
    return null;
  }

  const rows = await supabaseRestFetch<Array<{ user_id: string }>>(
    `subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`,
  );
  return rows[0] ? { id: rows[0].user_id, clerk_user_id: "" } : null;
}

async function syncSubscription(event: StripeEvent, object: Record<string, unknown>) {
  if (!supabaseServerConfigured()) {
    return { status: "not_configured" as const };
  }

  const profile = await profileIdForStripeObject(object);
  if (!profile) {
    return { status: "ignored_missing_profile" as const };
  }

  const priceId = priceIdFromSubscription(object);
  const plan = stripePriceIdToPlan(priceId) ?? metadataValue(object, "plan");
  const subscriptionId = stringValue(object.id);
  if (!subscriptionId) {
    return { status: "ignored_missing_subscription_id" as const };
  }

  const [subscription] = await supabaseRestFetch<Array<{ id: string }>>("subscriptions?on_conflict=stripe_subscription_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([
      {
        user_id: profile.id,
        stripe_customer_id: stringValue(object.customer),
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        plan,
        status: event.type === "customer.subscription.deleted" ? "canceled" : stringValue(object.status) ?? "inactive",
        current_period_start: numberToIso(object.current_period_start),
        current_period_end: numberToIso(object.current_period_end),
        cancel_at_period_end: Boolean(object.cancel_at_period_end),
        entitlements: PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free,
        last_webhook_event_id: event.id,
      },
    ]),
  });

  await writeAuditLog({
    clerkUserId: profile.clerk_user_id,
    action: "billing.subscription_synced",
    entityType: "subscription",
    entityId: subscription.id,
    metadata: { eventId: event.id, type: event.type, plan, status: object.status },
  });

  return { status: "synced" as const, subscriptionId: subscription.id };
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (
    !verifyStripeSignature({
      payload,
      signatureHeader,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    })
  ) {
    await captureSafeEvent("webhook.signature_failed", { provider: "stripe" });
    return NextResponse.json({ error: { code: "invalid_signature", message: "Invalid Stripe signature." } }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload) as StripeEvent;
    const claim = await claimWebhookEvent({ id: event.id, provider: "stripe", eventType: event.type });
    if (!claim.claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const object = event.data?.object;
    let result: unknown = { status: "ignored" };

    if (object && event.type.startsWith("customer.subscription.")) {
      result = await syncSubscription(event, object);
    }

    await markWebhookEventProcessed({ id: event.id, status: "processed", metadata: { type: event.type, result } });
    await captureSafeEvent("webhook.processed", { provider: "stripe", type: event.type, result });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    await captureSafeError(error, { route: "/api/webhooks/stripe" });
    return NextResponse.json({ error: { code: "webhook_failed", message: "Stripe webhook could not be processed." } }, { status: 400 });
  }
}
