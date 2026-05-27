import "server-only";

export type PlanTier = "free" | "pro" | "research_pro" | "team";

export type UsageFeature =
  | "portfolio"
  | "holding"
  | "watchlist"
  | "portfolio_brief"
  | "filing_summary"
  | "goal_plan"
  | "risk_explainer"
  | "research_save";

export type EntitlementSet = {
  label: string;
  monthlyPrice: string;
  portfolios: number;
  holdings: number;
  watchlists: number;
  aiBriefsPerMonth: number;
  savedResearchItems: number;
  filingSummaries: boolean;
  teamSeats: number;
  auditExport: boolean;
};

export const PLAN_ENTITLEMENTS: Record<PlanTier, EntitlementSet> = {
  free: {
    label: "Free",
    monthlyPrice: "$0",
    portfolios: 1,
    holdings: 10,
    watchlists: 1,
    aiBriefsPerMonth: 5,
    savedResearchItems: 5,
    filingSummaries: false,
    teamSeats: 1,
    auditExport: false,
  },
  pro: {
    label: "Pro",
    monthlyPrice: "$19",
    portfolios: 5,
    holdings: 100,
    watchlists: 5,
    aiBriefsPerMonth: 100,
    savedResearchItems: 100,
    filingSummaries: false,
    teamSeats: 1,
    auditExport: false,
  },
  research_pro: {
    label: "Research Pro",
    monthlyPrice: "$49",
    portfolios: 20,
    holdings: 500,
    watchlists: 20,
    aiBriefsPerMonth: 500,
    savedResearchItems: 1000,
    filingSummaries: true,
    teamSeats: 1,
    auditExport: false,
  },
  team: {
    label: "Team/Advisor",
    monthlyPrice: "Custom",
    portfolios: 100,
    holdings: 2500,
    watchlists: 100,
    aiBriefsPerMonth: 2500,
    savedResearchItems: 5000,
    filingSummaries: true,
    teamSeats: 10,
    auditExport: true,
  },
};

const activeStatuses = new Set(["active", "trialing"]);
const restrictedStatuses = new Set(["past_due", "canceled", "incomplete", "incomplete_expired", "unpaid", "paused"]);

export function normalizePlan(plan?: string | null): PlanTier {
  if (plan === "pro" || plan === "research_pro" || plan === "team") {
    return plan;
  }
  return "free";
}

export function effectivePlanForSubscription(input?: { plan?: string | null; status?: string | null } | null) {
  const status = input?.status ?? "inactive";
  const requestedPlan = normalizePlan(input?.plan);

  if (activeStatuses.has(status)) {
    return {
      plan: requestedPlan,
      status,
      billingState: "active" as const,
      entitlements: PLAN_ENTITLEMENTS[requestedPlan],
    };
  }

  if (restrictedStatuses.has(status)) {
    return {
      plan: "free" as const,
      status,
      billingState: "restricted" as const,
      entitlements: PLAN_ENTITLEMENTS.free,
    };
  }

  return {
    plan: "free" as const,
    status,
    billingState: "free" as const,
    entitlements: PLAN_ENTITLEMENTS.free,
  };
}

export function limitForFeature(entitlements: EntitlementSet, feature: UsageFeature) {
  switch (feature) {
    case "portfolio":
      return entitlements.portfolios;
    case "holding":
      return entitlements.holdings;
    case "watchlist":
      return entitlements.watchlists;
    case "research_save":
      return entitlements.savedResearchItems;
    case "filing_summary":
      return entitlements.filingSummaries ? entitlements.aiBriefsPerMonth : 0;
    case "portfolio_brief":
    case "goal_plan":
    case "risk_explainer":
      return entitlements.aiBriefsPerMonth;
  }
}

export function stripePriceIdToPlan(priceId?: string | null): PlanTier {
  const configured: Array<[PlanTier, Array<string | undefined>]> = [
    ["pro", [process.env.STRIPE_PRICE_PRO, process.env.STRIPE_PRICE_ID_PRO]],
    ["research_pro", [process.env.STRIPE_PRICE_RESEARCH_PRO, process.env.STRIPE_PRICE_ID_RESEARCH_PRO]],
    ["team", [process.env.STRIPE_PRICE_TEAM, process.env.STRIPE_PRICE_ID_TEAM]],
  ];

  for (const [plan, ids] of configured) {
    if (priceId && ids.includes(priceId)) {
      return plan;
    }
  }

  return "free";
}

export function featureLabel(feature: UsageFeature) {
  return feature.replace(/_/g, " ");
}
