import "server-only";

type SupabaseFetchOptions = RequestInit & {
  allowMissingConfig?: boolean;
};

export const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseServerConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export async function supabaseRestFetch<T>(path: string, init: SupabaseFetchOptions = {}) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (init.allowMissingConfig) {
      return null as T;
    }
    throw new Error("Supabase server persistence is not configured.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Supabase returned ${response.status}.`);
  }

  return payload as T;
}

export async function ensureProfileForClerkUser(input: { clerkUserId: string; displayName?: string | null }) {
  const [profile] = await supabaseRestFetch<Array<{ id: string; clerk_user_id: string }>>(
    "profiles?on_conflict=clerk_user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([
        {
          clerk_user_id: input.clerkUserId,
          display_name: input.displayName ?? null,
        },
      ]),
    },
  );

  return profile;
}
