import "server-only";

import type { FlipDigestNotification, FlipDigestPreferences } from "@/lib/flip-digest";

const baseUrl = process.env.FINANCE_API_BASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:8080";

async function financeRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const payload = await response.json() as { data?: T; error?: { message?: string } };
  if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Flip digest service is unavailable.");
  return payload.data;
}

export const loadFlipDigestPreferences = (token: string) =>
  financeRequest<FlipDigestPreferences>("/v1/flip-digest/preferences", token);

export const saveFlipDigestPreferences = (token: string, value: FlipDigestPreferences) =>
  financeRequest<FlipDigestPreferences>("/v1/flip-digest/preferences", token, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
  });

export const loadFlipDigestNotifications = (token: string) =>
  financeRequest<FlipDigestNotification[]>("/v1/flip-digest/notifications", token);

export async function flipDigestJobRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = process.env.FLIP_DIGEST_JOB_SECRET;
  if (!secret) throw new Error("FLIP_DIGEST_JOB_SECRET is not configured.");
  const response = await fetch(`${baseUrl}/v1/internal/flip-digest${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${secret}`, ...init?.headers },
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "Flip digest job request failed.");
  return payload;
}
