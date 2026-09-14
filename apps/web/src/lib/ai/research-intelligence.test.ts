import assert from "node:assert/strict";
import test from "node:test";

import { createGoalScenarioPlan, goalPlanSchema } from "./research-intelligence";
import type { PortfolioSnapshot } from "./portfolio-brief";

const snapshot: PortfolioSnapshot = {
  id: "pf_owner_1",
  name: "Household research portfolio",
  baseCurrency: "USD",
  summary: {
    totalValueCents: 10_000_00,
    displayTotalValue: "$10,000.00",
    topConcentrationTicker: "VTI",
    topConcentrationBps: 10_000,
    holdingCount: 1,
    reviewFlags: 1,
  },
  holdings: [{ ticker: "VTI", name: "Vanguard Total Stock Market ETF", displayValue: "$10,000.00", weightBps: 10_000 }],
  allocation: [{ label: "ETF", weightBps: 10_000, status: "review" }],
  dataFreshness: { provider: "market-provider", capturedAt: "2026-09-07T12:00:00.000Z", freshness: "provider-reported" },
};

test("goal scenario uses the owner-scoped balance and user inputs with zero-return arithmetic", () => {
  const result = createGoalScenarioPlan(
    {
      portfolioId: snapshot.id,
      goalName: "Education reserve",
      targetAmountCents: 22_000_00,
      timeHorizonMonths: 24,
      monthlyContributionCents: 50_000,
      riskPreference: "balanced",
    },
    snapshot,
  );

  assert.ok("goalName" in result);
  const plan = goalPlanSchema.parse(result);
  assert.equal(plan.currentAmount, "$10,000");
  assert.equal(plan.targetAmount, "$22,000");
  assert.equal(plan.fundingGap, "$12,000");
  assert.equal(plan.contributionScenarios[0].amount, "$500");
  assert.equal(plan.contributionScenarios[1].amount, "$500");
  assert.equal(plan.citations[0].sourceId, snapshot.id);
  assert.equal(plan.dataFreshness.provider, snapshot.dataFreshness.provider);
  assert.match(plan.summary, /zero investment return/i);
});
