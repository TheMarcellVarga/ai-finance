import "server-only";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  source: "memory" | "upstash";
};

const buckets = new Map<string, { count: number; resetAt: number }>();

async function checkUpstashRateLimit(key: string, windowSeconds: number, max: number): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds],
        ["TTL", key],
      ]),
      cache: "no-store",
    });
    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = Number(payload[0]?.result ?? 0);
    const ttl = Number(payload[2]?.result ?? windowSeconds);
    const resetAt = new Date(Date.now() + Math.max(ttl, 1) * 1000).toISOString();
    return { allowed: count <= max, remaining: Math.max(max - count, 0), resetAt, source: "upstash" };
  } catch {
    return null;
  }
}

export async function checkRateLimit(input: { key: string; windowSeconds: number; max: number }) {
  const upstash = await checkUpstashRateLimit(input.key, input.windowSeconds, input.max);
  if (upstash) {
    return upstash;
  }

  const now = Date.now();
  const current = buckets.get(input.key);
  const resetAt = current && current.resetAt > now ? current.resetAt : now + input.windowSeconds * 1000;
  const count = current && current.resetAt > now ? current.count + 1 : 1;
  buckets.set(input.key, { count, resetAt });

  return {
    allowed: count <= input.max,
    remaining: Math.max(input.max - count, 0),
    resetAt: new Date(resetAt).toISOString(),
    source: "memory" as const,
  };
}
