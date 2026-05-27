import "server-only";

const sensitiveKeyPattern = /(amount|authorization|billing|email|holding|jwt|key|output|prompt|secret|token)/i;

export function scrubForTelemetry(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scrubForTelemetry(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[redacted]" : scrubForTelemetry(entry),
      ]),
    );
  }

  if (typeof value === "string" && value.length > 160) {
    return `${value.slice(0, 120)}...[truncated]`;
  }

  return value;
}

function posthogHost() {
  return (process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com").replace(/\/$/, "");
}

export async function captureSafeEvent(event: string, properties: Record<string, unknown> = {}) {
  const apiKey = process.env.POSTHOG_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const safeProperties = scrubForTelemetry(properties) as Record<string, unknown>;

  if (!apiKey) {
    console.info("safe_event", { event, properties: safeProperties });
    return { status: "not_configured" as const };
  }

  await fetch(`${posthogHost()}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      event,
      distinct_id: "server",
      properties: safeProperties,
    }),
  });

  return { status: "sent" as const };
}

function parseSentryDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    const publicKey = url.username;
    if (!projectId || !publicKey) {
      return null;
    }
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_key=${publicKey}`,
    };
  } catch {
    return null;
  }
}

export async function captureSafeError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : "Unknown server error";
  const safeContext = scrubForTelemetry(context) as Record<string, unknown>;
  const sentry = process.env.SENTRY_DSN ? parseSentryDsn(process.env.SENTRY_DSN) : null;

  if (!sentry) {
    console.error("safe_error", { message, context: safeContext });
    return { status: "not_configured" as const };
  }

  await fetch(sentry.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      level: "error",
      platform: "javascript",
      logger: "ai-finance-web",
      extra: safeContext,
    }),
  });

  return { status: "sent" as const };
}
