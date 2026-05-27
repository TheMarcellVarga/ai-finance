import "server-only";

import { createHash } from "node:crypto";

import { scrubForTelemetry } from "@/lib/security/observability";
import { ensureProfileForClerkUser, supabaseRestFetch, supabaseServerConfigured } from "@/lib/server/supabase-rest";

function sha256(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return createHash("sha256").update(value).digest("hex");
}

function requestIp(request?: Request) {
  return (
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request?.headers.get("x-real-ip") ??
    request?.headers.get("cf-connecting-ip")
  );
}

export async function writeAuditLog(input: {
  clerkUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  request?: Request;
  metadata?: Record<string, unknown>;
}) {
  const safeMetadata = scrubForTelemetry(input.metadata ?? {}) as Record<string, unknown>;

  if (!supabaseServerConfigured()) {
    console.info("audit_log", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: safeMetadata,
    });
    return { status: "not_configured" as const };
  }

  const profile = input.clerkUserId ? await ensureProfileForClerkUser({ clerkUserId: input.clerkUserId }) : null;
  const [auditLog] = await supabaseRestFetch<Array<{ id: string }>>("audit_logs", {
    method: "POST",
    body: JSON.stringify([
      {
        user_id: profile?.id ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        ip_hash: sha256(requestIp(input.request)),
        user_agent_hash: sha256(input.request?.headers.get("user-agent")),
        metadata: safeMetadata,
      },
    ]),
  });

  return { status: "recorded" as const, auditLogId: auditLog.id };
}
