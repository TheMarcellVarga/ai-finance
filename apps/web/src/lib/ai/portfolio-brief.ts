import { z } from "zod";

export const citationSchema = z.object({
  label: z.string().min(1),
  sourceType: z.enum(["portfolio_snapshot", "market_data", "research_document", "system"]),
  sourceId: z.string().min(1),
  capturedAt: z.string().min(1),
  freshness: z.string().min(1),
});

export const portfolioBriefSchema = z.object({
  summary: z.string().min(20),
  keyFacts: z.array(z.string().min(8)).min(2),
  riskFactors: z.array(z.string().min(8)).min(1),
  citations: z.array(citationSchema).min(1),
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

export type PortfolioBrief = z.infer<typeof portfolioBriefSchema>;

export const portfolioBriefRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(1200).optional(),
  portfolioId: z.string().trim().min(1).max(120).optional(),
  stream: z.boolean().optional(),
});

export type PortfolioBriefRequest = z.infer<typeof portfolioBriefRequestSchema>;

export type PortfolioSnapshot = {
  id: string;
  name: string;
  baseCurrency: string;
  summary: {
    totalValueCents: number;
    displayTotalValue: string;
    topConcentrationTicker: string;
    topConcentrationBps: number;
    holdingCount: number;
    reviewFlags: number;
  };
  holdings: Array<{
    ticker: string;
    name: string;
    sector?: string;
    displayValue: string;
    displayPrice?: string;
    weightBps: number;
    freshness?: string;
    capturedAt?: string;
    provider?: string;
  }>;
  allocation: Array<{ label: string; weightBps: number; status: string }>;
  dataFreshness: { provider: string; capturedAt: string; freshness: string };
};

const forbiddenPromptPatterns = [
  /\b(buy|sell|short|hold)\b.*\b(now|today|immediately|next)\b/i,
  /\bwhat should i (buy|sell|hold)\b/i,
  /\bguarantee(d)? returns?\b/i,
  /\bbeat the market\b/i,
  /\btrading bot\b/i,
  /\bautomated trading\b/i,
  /\bplace (an )?order\b/i,
  /\bprofit streaks?\b/i,
  /\brisky trades?\b/i,
  /\binsider trading\b/i,
  /\bignore (previous|all) instructions\b/i,
  /\breveal (the )?(system prompt|developer message|secret|api key|jwt)\b/i,
  /\banother user's? portfolio\b/i,
];

export function classifyPromptSafety(prompt: string) {
  const normalizedPrompt = prompt.trim();
  const violatesBoundary = forbiddenPromptPatterns.some((pattern) => pattern.test(normalizedPrompt));

  return {
    safe: !violatesBoundary,
    safetyLabel: violatesBoundary ? ("refusal" as const) : ("research_only" as const),
    reason: violatesBoundary
      ? "The prompt asks for trading instructions, guaranteed outcomes, hidden instructions, secrets, or cross-user data."
      : "The prompt is within research and portfolio decision-support boundaries.",
  };
}

export function createRefusalBrief(prompt: string): PortfolioBrief {
  return {
    summary:
      "I cannot provide trade instructions, automated trading behavior, guaranteed-return claims, hidden prompt details, secrets, or another user's portfolio data.",
    keyFacts: [
      "This workspace is limited to financial research, risk explanation, scenario analysis, and portfolio decision support.",
      "The requested prompt crossed a safety boundary and was not sent to a model or finance-data tool.",
    ],
    riskFactors: [
      "Direct buy, sell, hold, automated trading, or guaranteed-return guidance can be regulated investment advice or unsafe financial behavior.",
    ],
    citations: [
      {
        label: "AI safety boundary",
        sourceType: "system",
        sourceId: "phase-5-ai-guardrails",
        capturedAt: new Date().toISOString(),
        freshness: "runtime",
      },
    ],
    assumptions: [`Rejected user prompt: ${prompt.slice(0, 180)}`],
    dataFreshness: {
      provider: "system",
      capturedAt: new Date().toISOString(),
      freshness: "runtime",
    },
    confidence: "high",
    safetyLabel: "refusal",
    disclaimer:
      "This is not financial advice. Use the workspace for research, scenario analysis, and risk review, not trade execution or personalized investment instructions.",
    followUpQuestions: [
      "Would you like a research-only concentration review instead?",
      "Would you like assumptions and risks summarized without a buy or sell recommendation?",
    ],
  };
}

export function createDeterministicPortfolioBrief(snapshot: PortfolioSnapshot, userPrompt?: string): PortfolioBrief {
  const capturedAt = snapshot.dataFreshness.capturedAt || new Date().toISOString();
  const topHolding = snapshot.holdings[0];
  const topTicker = snapshot.summary.topConcentrationTicker || topHolding?.ticker || "the largest holding";
  const topWeight = Math.round(snapshot.summary.topConcentrationBps / 100);
  const provider = snapshot.dataFreshness.provider || "finance-api";
  const prompt = userPrompt?.trim() || "Generate a portfolio brief focused on allocation, concentration, data freshness, and research follow-ups.";

  return {
    summary:
      `${snapshot.name} has ${snapshot.summary.holdingCount} holdings with ${topTicker} as the largest visible concentration. ` +
      "This deterministic development brief is for local workflow testing only; enable an explicit live provider before treating external model behavior as verified.",
    keyFacts: [
      `Portfolio value is reported as ${snapshot.summary.displayTotalValue} in ${snapshot.baseCurrency}.`,
      `${topTicker} represents about ${topWeight}% of the current portfolio snapshot.`,
      `Market data freshness is labeled ${snapshot.dataFreshness.freshness} by ${provider}.`,
    ],
    riskFactors: [
      "Concentration should be reviewed as a research signal because a single holding or sector can drive portfolio movement.",
      "Provider-reported data can be stale or incomplete, so conclusions should be checked against the captured timestamp.",
    ],
    citations: [
      {
        label: "Owner-scoped portfolio snapshot",
        sourceType: "portfolio_snapshot",
        sourceId: snapshot.id,
        capturedAt,
        freshness: snapshot.dataFreshness.freshness,
      },
      {
        label: "Market data freshness",
        sourceType: "market_data",
        sourceId: provider,
        capturedAt,
        freshness: snapshot.dataFreshness.freshness,
      },
    ],
    assumptions: [
      "This brief uses only the current owner-scoped portfolio snapshot returned by the finance API.",
      `User research prompt: ${prompt.slice(0, 180)}`,
      "No model call was made because local deterministic fixture mode is active and external AI calls are disabled by default.",
    ],
    dataFreshness: {
      provider,
      capturedAt,
      freshness: snapshot.dataFreshness.freshness,
    },
    confidence: "medium",
    safetyLabel: "research_only",
    disclaimer:
      "This is not financial advice. Use the workspace for research, scenario analysis, and risk review, not trade execution or personalized investment instructions.",
    followUpQuestions: [
      "Which concentration or sector exposure should be reviewed first?",
      "Should the next brief compare allocation changes after fresh market data is captured?",
    ],
  };
}

export function buildPortfolioBriefPrompt(snapshot: PortfolioSnapshot, userPrompt?: string) {
  return [
    "Create a concise, schema-valid portfolio research brief.",
    "Do not recommend buying, selling, holding, timing trades, or guaranteeing outcomes.",
    "Frame observations as risk review, scenario analysis, research discipline, and decision support.",
    "Use only the provided portfolio snapshot as source context.",
    "Every factual claim about holdings, allocation, value, provider, or freshness needs a citation from the snapshot.",
    "",
    `User research prompt: ${userPrompt || "Generate a portfolio brief focused on allocation, concentration, data freshness, and research follow-ups."}`,
    "",
    "Portfolio snapshot JSON:",
    JSON.stringify(snapshot, null, 2),
  ].join("\n");
}
