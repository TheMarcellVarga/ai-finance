import "server-only";

import {
  effectivePlanForSubscription,
  featureLabel,
  limitForFeature,
  type PlanTier,
  type UsageFeature,
} from "@/lib/billing/entitlements";
import { decodeJwtSubject } from "@/lib/server/identity";
import { ensureProfileForClerkUser, supabaseRestFetch, supabaseServerConfigured } from "@/lib/server/supabase-rest";
import { loadFinanceUsage } from "@/lib/finance-api";

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  stripe_price_id?: string | null;
  current_period_end?: string | null;
};

type UsageRow = {
  feature: string;
  count: number;
};

const aiBriefFeatures = new Set([
  "portfolio_brief",
  "structured_research",
  "filing_summary",
  "goal_plan",
  "risk_explainer",
]);
const usageFeatures: UsageFeature[] = [
  "portfolio_brief",
  "structured_research",
  "filing_summary",
  "goal_plan",
  "risk_explainer",
  "research_save",
  "portfolio",
  "holding",
  "watchlist",
];

export function billingPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function usageGroup(feature: UsageFeature) {
  return aiBriefFeatures.has(feature) ? aiBriefFeatures : new Set([feature]);
}

function usageForFeature(rows: UsageRow[], feature: UsageFeature) {
  const group = usageGroup(feature);
  return rows
    .filter((row) => group.has(row.feature))
    .reduce((total, row) => total + Number(row.count ?? 0), 0);
}

async function readSubscription(userId: string) {
  const rows = await supabaseRestFetch<SubscriptionRow[]>(
    `subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=plan,status,stripe_price_id,current_period_end&order=updated_at.desc&limit=1`,
  );
  return rows[0] ?? null;
}

async function readUsageRows(userId: string, period: string) {
  return supabaseRestFetch<UsageRow[]>(
    `usage_events?user_id=eq.${encodeURIComponent(userId)}&billing_period=eq.${encodeURIComponent(period)}&select=feature,count`,
  );
}

export async function getUsageSummaryForToken(authToken?: string | null) {
  const period = billingPeriod();

  async function localApiSummary(message: string) {
    const free = effectivePlanForSubscription(null);
    let apiFeatures: Array<{ feature: string; used: number; limit: number; status: string }> = [];
    if (authToken) {
      try {
        apiFeatures = (await loadFinanceUsage(authToken)).data.features;
      } catch {
        apiFeatures = [];
      }
    }
    return {
      configured: false as const,
      clerkUserId: decodeJwtSubject(authToken),
      period,
      plan: free.plan,
      status: free.status,
      billingState: free.billingState,
      entitlements: free.entitlements,
      features: usageFeatures.map((feature) => {
        const limit = limitForFeature(free.entitlements, feature);
        const apiFeature = apiFeatures.find((candidate) => candidate.feature === feature);
        return {
          feature,
          used: apiFeature?.used ?? 0,
          limit: apiFeature?.limit ?? limit,
          status: limit <= 0 ? "unavailable" : apiFeature ? "local_api" : "session_only",
        };
      }),
      message,
    };
  }

  if (!supabaseServerConfigured()) {
    return localApiSummary("Persisted usage is not configured; local API counts remain visible for this session.");
  }

  try {
    const clerkUserId = decodeJwtSubject(authToken);
    const profile = await ensureProfileForClerkUser({ clerkUserId });
    const subscription = await readSubscription(profile.id);
    const plan = effectivePlanForSubscription(subscription);
    const usageRows = await readUsageRows(profile.id, period);
    return {
      configured: true as const,
      clerkUserId,
      period,
      plan: plan.plan,
      status: plan.status,
      billingState: plan.billingState,
      entitlements: plan.entitlements,
      features: usageFeatures.map((feature) => {
        const used = usageForFeature(usageRows, feature);
        const limit = limitForFeature(plan.entitlements, feature);
        return {
          feature,
          used,
          limit,
          status: limit <= 0 ? "unavailable" : used >= limit ? "limit_reached" : "available",
        };
      }),
    };
  } catch {
    return localApiSummary("Persisted usage is temporarily unreachable; local API counts remain visible for this session.");
  }
}

export async function checkUsageLimit(input: { authToken?: string | null; feature: UsageFeature }) {
  const summary = await getUsageSummaryForToken(input.authToken);

  if (!summary.configured) {
    return {
      allowed: true,
      status: "not_configured" as const,
      plan: summary.plan as PlanTier,
      used: 0,
      limit: limitForFeature(summary.entitlements, input.feature),
      message: summary.message,
    };
  }

  const row = summary.features.find((feature) => feature.feature === input.feature);
  const used = row?.used ?? 0;
  const limit = row?.limit ?? 0;

  if (limit <= 0 || used >= limit) {
    return {
      allowed: false,
      status: "limit_reached" as const,
      plan: summary.plan as PlanTier,
      used,
      limit,
      message: `${featureLabel(input.feature)} is not available for the current plan or billing state.`,
    };
  }

  return {
    allowed: true,
    status: "available" as const,
    plan: summary.plan as PlanTier,
    used,
    limit,
  };
}

export async function recordUsageEvent(input: {
  authToken?: string | null;
  feature: UsageFeature;
  count?: number;
  metadata?: Record<string, unknown>;
}) {
  if (!supabaseServerConfigured()) {
    return { status: "not_configured" as const };
  }

  const clerkUserId = decodeJwtSubject(input.authToken);
  try {
    const profile = await ensureProfileForClerkUser({ clerkUserId });
    const [usageEvent] = await supabaseRestFetch<Array<{ id: string }>>("usage_events", {
      method: "POST",
      body: JSON.stringify([
        {
          user_id: profile.id,
          feature: input.feature,
          count: input.count ?? 1,
          billing_period: billingPeriod(),
          metadata: input.metadata ?? {},
        },
      ]),
    });

    return { status: "recorded" as const, usageEventId: usageEvent.id };
  } catch {
    return { status: "temporarily_unavailable" as const };
  }
}
