import { z } from "zod";

import { classifyPromptSafety, createRefusalBrief, type PortfolioBrief, type PortfolioSnapshot } from "@/lib/ai/portfolio-brief";

const disclaimer =
  "This is not financial advice. Use this workspace for research, scenario analysis, and risk review, not trade execution or personalized investment instructions.";

export const researchCitationSchema = z.object({
  label: z.string().min(1),
  sourceType: z.enum(["sec_filing", "research_chunk", "portfolio_snapshot", "goal_plan", "system"]),
  sourceId: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  capturedAt: z.string().min(1),
  freshness: z.string().min(1),
});

export const filingSummarySchema = z.object({
  ticker: z.string().min(1),
  filingType: z.string().min(1),
  period: z.string().min(1),
  summary: z.string().min(20),
  filingHighlights: z.array(z.string().min(8)).min(2),
  materialRisks: z.array(z.string().min(8)).min(1),
  retrievedChunks: z
    .array(
      z.object({
        id: z.string().min(1),
        section: z.string().min(1),
        sourceLocator: z.string().min(1),
        excerpt: z.string().min(20),
      }),
    )
    .min(1),
  citations: z.array(researchCitationSchema).min(1),
  assumptions: z.array(z.string().min(8)).min(1),
  dataFreshness: z.object({
    provider: z.string().min(1),
    capturedAt: z.string().min(1),
    freshness: z.string().min(1),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  safetyLabel: z.enum(["research_only", "refusal", "needs_human_review"]),
  disclaimer: z.string().min(20),
  followUpQuestions: z.array(z.string().min(8)).min(2),
});

export const goalPlanSchema = z.object({
  goalName: z.string().min(1),
  currentAmount: z.string().min(1),
  targetAmount: z.string().min(1),
  fundingGap: z.string().min(1),
  progressBps: z.number().int().min(0),
  timeHorizon: z.string().min(1),
  summary: z.string().min(20),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        targetDate: z.string().min(1),
        reviewMetric: z.string().min(1),
        status: z.enum(["draft", "pending", "review"]),
      }),
    )
    .min(2),
  contributionScenarios: z
    .array(
      z.object({
        cadence: z.string().min(1),
        amount: z.string().min(1),
        assumption: z.string().min(8),
      }),
    )
    .min(2),
  educationalChallenges: z.array(z.string().min(8)).min(2),
  achievements: z.array(z.string().min(8)).min(2),
  riskNotes: z.array(z.string().min(8)).min(1),
  citations: z.array(researchCitationSchema).min(1),
  assumptions: z.array(z.string().min(8)).min(1),
  dataFreshness: z.object({
    provider: z.string().min(1),
    capturedAt: z.string().min(1),
    freshness: z.string().min(1),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  safetyLabel: z.enum(["research_only", "refusal", "needs_human_review"]),
  disclaimer: z.string().min(20),
  followUpQuestions: z.array(z.string().min(8)).min(2),
});

export const riskExplainerSchema = z.object({
  summary: z.string().min(20),
  concentrationSignals: z.array(z.string().min(8)).min(1),
  allocationSignals: z.array(z.string().min(8)).min(1),
  limitationNotes: z.array(z.string().min(8)).min(1),
  reviewActions: z.array(z.string().min(8)).min(2),
  citations: z.array(researchCitationSchema).min(1),
  assumptions: z.array(z.string().min(8)).min(1),
  dataFreshness: z.object({
    provider: z.string().min(1),
    capturedAt: z.string().min(1),
    freshness: z.string().min(1),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  safetyLabel: z.enum(["research_only", "refusal", "needs_human_review"]),
  disclaimer: z.string().min(20),
  followUpQuestions: z.array(z.string().min(8)).min(2),
});

export const filingSummaryRequestSchema = z.object({
  ticker: z.string().trim().min(1).max(12).default("AAPL"),
  prompt: z.string().trim().min(1).max(1200).optional(),
});

export const goalPlanRequestSchema = z.object({
  portfolioId: z.string().trim().min(1).max(120),
  goalName: z.string().trim().min(1).max(80),
  targetAmountCents: z.number().int().positive().max(100_000_000_000),
  timeHorizonMonths: z.number().int().min(1).max(600),
  monthlyContributionCents: z.number().int().nonnegative().max(100_000_000),
  riskPreference: z.enum(["conservative", "balanced", "growth"]).default("balanced"),
  prompt: z.string().trim().min(1).max(1200).optional(),
});

export const riskExplainerRequestSchema = z.object({
  portfolioId: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(1).max(1200).optional(),
});

export type FilingSummary = z.infer<typeof filingSummarySchema>;
export type GoalPlan = z.infer<typeof goalPlanSchema>;
export type RiskExplainer = z.infer<typeof riskExplainerSchema>;

type FilingFixture = {
  ticker: string;
  filingType: string;
  period: string;
  sourceUrl: string;
  capturedAt: string;
  chunks: FilingSummary["retrievedChunks"];
};

const filingFixtures: Record<string, FilingFixture> = {
  AAPL: {
    ticker: "AAPL",
    filingType: "10-K",
    period: "FY2025",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/320193/",
    capturedAt: "2026-05-24T00:00:00.000Z",
    chunks: [
      {
        id: "aapl-10k-risk-competition",
        section: "Item 1A. Risk Factors",
        sourceLocator: "AAPL FY2025 10-K Item 1A",
        excerpt:
          "The fixture highlights competitive pressure, product-cycle dependency, and supply-chain exposure as research topics that require source review.",
      },
      {
        id: "aapl-10k-business-services",
        section: "Item 1. Business",
        sourceLocator: "AAPL FY2025 10-K Item 1",
        excerpt:
          "The fixture notes hardware, services, and platform ecosystem revenue drivers without making valuation or trade-timing claims.",
      },
    ],
  },
  MSFT: {
    ticker: "MSFT",
    filingType: "10-K",
    period: "FY2025",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/789019/",
    capturedAt: "2026-05-24T00:00:00.000Z",
    chunks: [
      {
        id: "msft-10k-cloud-risk",
        section: "Item 1A. Risk Factors",
        sourceLocator: "MSFT FY2025 10-K Item 1A",
        excerpt:
          "The fixture highlights cloud infrastructure demand, enterprise spending cycles, cybersecurity, and regulatory review as research topics.",
      },
      {
        id: "msft-10k-business-cloud",
        section: "Item 1. Business",
        sourceLocator: "MSFT FY2025 10-K Item 1",
        excerpt:
          "The fixture frames productivity software, cloud platforms, and AI infrastructure as business lines to compare with fresh filings.",
      },
    ],
  },
};

function nowIso() {
  return new Date().toISOString();
}

function selectedFixture(ticker: string) {
  return filingFixtures[ticker.toUpperCase()] ?? filingFixtures.AAPL;
}

export function createResearchRefusal(prompt: string): FilingSummary {
  const refusal = createRefusalBrief(prompt);
  return {
    ticker: "N/A",
    filingType: "refusal",
    period: "runtime",
    summary: refusal.summary,
    filingHighlights: refusal.keyFacts,
    materialRisks: refusal.riskFactors,
    retrievedChunks: [
      {
        id: "safety-boundary",
        section: "AI safety boundary",
        sourceLocator: "runtime",
        excerpt: refusal.summary,
      },
    ],
    citations: [
      {
        label: "AI safety boundary",
        sourceType: "system",
        sourceId: "phase-6-research-guardrails",
        capturedAt: nowIso(),
        freshness: "runtime",
      },
    ],
    assumptions: refusal.assumptions,
    dataFreshness: refusal.dataFreshness,
    confidence: "high",
    safetyLabel: "refusal",
    disclaimer,
    followUpQuestions: refusal.followUpQuestions,
  };
}

export function createDeterministicFilingSummary(input: z.infer<typeof filingSummaryRequestSchema>): FilingSummary {
  const fixture = selectedFixture(input.ticker);
  const prompt = input.prompt ?? "Summarize filing risks and research follow-ups.";
  const safety = classifyPromptSafety(prompt);
  if (!safety.safe) {
    return createResearchRefusal(prompt);
  }

  return {
    ticker: fixture.ticker,
    filingType: fixture.filingType,
    period: fixture.period,
    summary:
      `${fixture.ticker} ${fixture.filingType} fixture summary focuses on cited business context, material risk themes, and follow-up research questions. ` +
      "It is deterministic local output until live filing ingestion and retrieval are connected.",
    filingHighlights: [
      `${fixture.ticker} has source-backed business themes available for research-room review.`,
      "The summary keeps the output at filing interpretation level and avoids valuation, suitability, or trade timing.",
    ],
    materialRisks: [
      "Risk factors should be compared against the original filing sections before forming a research conclusion.",
      "The fixture does not include complete filing text, so confidence stays medium until live SEC ingestion is active.",
    ],
    retrievedChunks: fixture.chunks,
    citations: fixture.chunks.map((chunk) => ({
      label: chunk.sourceLocator,
      sourceType: "sec_filing" as const,
      sourceId: chunk.id,
      sourceUrl: fixture.sourceUrl,
      capturedAt: fixture.capturedAt,
      freshness: "fixture-sec-reference",
    })),
    assumptions: [
      `User research prompt: ${prompt.slice(0, 180)}`,
      "Retrieved chunks are deterministic SEC-style fixtures used to test citation, freshness, and prompt-injection boundaries.",
    ],
    dataFreshness: {
      provider: "deterministic-sec-fixture",
      capturedAt: fixture.capturedAt,
      freshness: "fixture-sec-reference",
    },
    confidence: "medium",
    safetyLabel: "research_only",
    disclaimer,
    followUpQuestions: [
      "Which filing section changed most between the latest annual and quarterly filing?",
      "Which risk theme should be compared against portfolio concentration next?",
    ],
  };
}

function formatScenarioMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function monthLabel(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  return `${months} months`;
}

function milestoneDate(monthsFromNow: number) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + monthsFromNow);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function createGoalScenarioPlan(
  input: z.infer<typeof goalPlanRequestSchema>,
  snapshot: PortfolioSnapshot,
): GoalPlan | PortfolioBrief {
  const safety = classifyPromptSafety(input.prompt ?? `${input.goalName} ${input.targetAmountCents} ${input.timeHorizonMonths}`);
  if (!safety.safe) {
    return createRefusalBrief(input.prompt ?? input.goalName);
  }

  const currentAmountCents = snapshot.summary.totalValueCents;
  const fundingGapCents = Math.max(input.targetAmountCents - currentAmountCents, 0);
  const requiredMonthlyCents = Math.ceil(fundingGapCents / input.timeHorizonMonths);
  const projectedContributionCents = input.monthlyContributionCents * input.timeHorizonMonths;
  const projectedBalanceCents = currentAmountCents + projectedContributionCents;
  const progressBps = Math.min(Math.round((currentAmountCents * 10_000) / input.targetAmountCents), 10_000);
  const currency = snapshot.baseCurrency || "USD";
  const capturedAt = snapshot.dataFreshness.capturedAt || nowIso();
  const milestoneFractions = [0.25, 0.5, 0.75];

  return {
    goalName: input.goalName,
    currentAmount: formatScenarioMoney(currentAmountCents, currency),
    targetAmount: formatScenarioMoney(input.targetAmountCents, currency),
    fundingGap: formatScenarioMoney(fundingGapCents, currency),
    progressBps,
    timeHorizon: monthLabel(input.timeHorizonMonths),
    summary:
      `${input.goalName} starts from the live portfolio value of ${formatScenarioMoney(currentAmountCents, currency)} and tests ${formatScenarioMoney(input.monthlyContributionCents, currency)} monthly for ${monthLabel(input.timeHorizonMonths)}. ` +
      "The arithmetic assumes zero investment return, so market performance is not fabricated or promised.",
    milestones: milestoneFractions.map((fraction) => {
      const thresholdBps = Math.round(fraction * 10_000);
      return {
        title: `${Math.round(fraction * 100)}% funding review`,
        targetDate: milestoneDate(Math.max(1, Math.round(input.timeHorizonMonths * fraction))),
        reviewMetric: `Compare the current provider-backed balance with ${formatScenarioMoney(Math.round(input.targetAmountCents * fraction), currency)} and review contribution records.`,
        status: progressBps >= thresholdBps ? ("review" as const) : ("pending" as const),
      };
    }),
    contributionScenarios: [
      {
        cadence: "Your monthly input",
        amount: formatScenarioMoney(input.monthlyContributionCents, currency),
        assumption: `Adds ${formatScenarioMoney(projectedContributionCents, currency)} over the selected horizon; estimated ending balance is ${formatScenarioMoney(projectedBalanceCents, currency)} before withdrawals, taxes, fees, inflation, or market movement.`,
      },
      {
        cadence: "Zero-return gap pace",
        amount: formatScenarioMoney(requiredMonthlyCents, currency),
        assumption: "This is the monthly arithmetic needed to close the current funding gap with contributions alone; it is not a recommendation or return forecast.",
      },
    ],
    educationalChallenges: [
      "Review diversification notes before editing goal assumptions.",
      "Save one cited research note before each quarterly goal review.",
      "Check whether market-data freshness is current before interpreting progress.",
    ],
    achievements: [
      "Research discipline: saved a cited note before a goal review.",
      "Diversification review: documented concentration and sector exposure.",
    ],
    riskNotes: [
      "Goal progress can be affected by contributions, withdrawals, volatility, inflation, taxes, and stale or incomplete market data.",
      "The plan is not a suitability assessment and does not recommend a portfolio allocation.",
    ],
    citations: [
      {
        label: "Owner-scoped portfolio snapshot",
        sourceType: "portfolio_snapshot",
        sourceId: snapshot.id,
        capturedAt,
        freshness: snapshot.dataFreshness.freshness,
      },
    ],
    assumptions: [
      "No expected return, alpha, or guarantee is used.",
      `Risk preference is treated as a planning label: ${input.riskPreference}.`,
      `Target, horizon, and monthly contribution are user-provided inputs: ${formatScenarioMoney(input.targetAmountCents, currency)}, ${monthLabel(input.timeHorizonMonths)}, ${formatScenarioMoney(input.monthlyContributionCents, currency)}.`,
    ],
    dataFreshness: snapshot.dataFreshness,
    confidence: "high",
    safetyLabel: "research_only",
    disclaimer,
    followUpQuestions: [
      "What monthly contribution should be tested next?",
      "Should portfolio concentration be reviewed before setting milestone thresholds?",
    ],
  };
}

export function createDeterministicRiskExplainer(snapshot: PortfolioSnapshot, prompt?: string): RiskExplainer | PortfolioBrief {
  const safety = classifyPromptSafety(prompt ?? "Explain portfolio risk as research.");
  if (!safety.safe) {
    return createRefusalBrief(prompt ?? "Risk explainer request");
  }

  const topWeight = Math.round(snapshot.summary.topConcentrationBps / 100);
  const topTicker = snapshot.summary.topConcentrationTicker || "largest holding";
  const reviewedAllocations = snapshot.allocation.slice(0, 3);

  return {
    summary:
      `${snapshot.name} has ${snapshot.summary.holdingCount} holdings and ${snapshot.summary.reviewFlags} review flags in the current owner-scoped snapshot. ` +
      "The explainer frames concentration and allocation as research signals, not trading instructions.",
    concentrationSignals: [
      `${topTicker} is the largest visible concentration at about ${topWeight}% of the portfolio snapshot.`,
      "Single-name and single-sector exposure can increase drawdown sensitivity and should be reviewed with fresh data.",
    ],
    allocationSignals:
      reviewedAllocations.length > 0
        ? reviewedAllocations.map(
            (allocation) =>
              `${allocation.label} is about ${Math.round(allocation.weightBps / 100)}% of the snapshot and is marked ${allocation.status}.`,
          )
        : ["Allocation data is unavailable in the current owner-scoped snapshot."],
    limitationNotes: [
      "This risk explainer does not calculate volatility, beta, correlation, tax impact, or suitability.",
      "Provider-reported prices can be stale or incomplete; use the captured timestamp before interpreting the output.",
    ],
    reviewActions: [
      "Review concentration and sector notes against the portfolio objective.",
      "Refresh provider data before saving the risk note to the research room.",
      "Compare the risk explanation with cited filings for the largest holdings.",
    ],
    citations: [
      {
        label: "Owner-scoped portfolio snapshot",
        sourceType: "portfolio_snapshot",
        sourceId: snapshot.id,
        capturedAt: snapshot.dataFreshness.capturedAt,
        freshness: snapshot.dataFreshness.freshness,
      },
    ],
    assumptions: [
      "Only the current owner-scoped portfolio snapshot is used.",
      `User research prompt: ${(prompt ?? "Explain portfolio risk as research.").slice(0, 180)}`,
    ],
    dataFreshness: snapshot.dataFreshness,
    confidence: "medium",
    safetyLabel: "research_only",
    disclaimer,
    followUpQuestions: [
      "Which concentration should be compared against filing risks first?",
      "Should the next risk pass include fresh price history when the provider is available?",
    ],
  };
}
