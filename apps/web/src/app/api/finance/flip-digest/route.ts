import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";

import { loadFlipDigestNotifications, loadFlipDigestPreferences, saveFlipDigestPreferences } from "@/lib/server/flip-digest-api";
import { authenticatedTokenFromRequest, authenticationRequiredResponse, isAuthenticationRequiredError } from "@/lib/server/identity";

const preferencesSchema = z.object({
  enabled: z.boolean(),
  direction: z.enum(["bull", "bear", "both"]),
  cadence: z.enum(["daily", "weekly"]),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
}).strict().refine((value) => !value.enabled || value.emailEnabled || value.inAppEnabled);

function errorResponse(error: unknown) {
  if (isAuthenticationRequiredError(error)) return authenticationRequiredResponse();
  return Response.json({ error: { message: error instanceof Error ? error.message : "Flip digest service is unavailable." } }, { status: 502 });
}

export async function GET(request: Request) {
  try {
    const token = await authenticatedTokenFromRequest(request);
    const [preferences, notifications] = await Promise.all([
      loadFlipDigestPreferences(token), loadFlipDigestNotifications(token),
    ]);
    return Response.json({ preferences, notifications, emailDeliveryReady: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { message: "Choose valid digest settings." } }, { status: 400 });
  try {
    const token = await authenticatedTokenFromRequest(request);
    if (parsed.data.enabled && parsed.data.emailEnabled) {
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        return Response.json({ error: { message: "Email delivery is not configured yet. Select in-app alerts or configure Resend first." } }, { status: 400 });
      }
      const user = await currentUser();
      if (!user?.primaryEmailAddress || user.primaryEmailAddress.verification?.status !== "verified") {
        return Response.json({ error: { message: "A verified primary account email is required for email digests." } }, { status: 400 });
      }
    }
    return Response.json({ data: await saveFlipDigestPreferences(token, parsed.data) });
  } catch (error) { return errorResponse(error); }
}
