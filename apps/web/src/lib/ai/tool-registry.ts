import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { getPortfolioSnapshot } from "@/lib/ai/portfolio-tools";

export function createFinanceAiTools(requestAuthorization?: string | null) {
  return {
    getPortfolioSnapshot: tool({
      description:
        "Return the current user's owner-scoped portfolio holdings, allocation, concentration, value, provider, and freshness metadata.",
      inputSchema: z.object({
        portfolioId: z.string().trim().min(1).optional(),
      }),
      outputSchema: z.object({
        id: z.string(),
        name: z.string(),
        baseCurrency: z.string(),
        summary: z.object({
          displayTotalValue: z.string(),
          topConcentrationTicker: z.string(),
          topConcentrationBps: z.number(),
          holdingCount: z.number(),
          reviewFlags: z.number(),
        }),
        holdings: z.array(
          z.object({
            ticker: z.string(),
            name: z.string(),
            sector: z.string().optional(),
            displayValue: z.string(),
            displayPrice: z.string().optional(),
            weightBps: z.number(),
            freshness: z.string().optional(),
            capturedAt: z.string().optional(),
            provider: z.string().optional(),
          }),
        ),
        allocation: z.array(z.object({ label: z.string(), weightBps: z.number(), status: z.string() })),
        dataFreshness: z.object({ provider: z.string(), capturedAt: z.string(), freshness: z.string() }),
      }),
      strict: true,
      execute: async ({ portfolioId }) => {
        return getPortfolioSnapshot({ portfolioId, requestAuthorization });
      },
    }),
  };
}
