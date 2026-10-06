import type { FlipDigestEntry, FlipDirection } from "@/lib/flip-digest";

export type FlipCandidate = {
  assetClass: string;
  symbol: string;
  name: string;
  trend?: "bullish" | "bearish";
  lastFlipAt?: string | null;
  capturedAt: string;
  source: string;
  signalBasis: string;
  confirmedClosedCandle: boolean;
};

export function selectRecentConfirmedFlips(
  candidates: FlipCandidate[],
  direction: FlipDirection,
  periodStart: Date,
  periodEnd: Date,
): FlipDigestEntry[] {
  return candidates.flatMap((candidate) => {
    const flipAt = candidate.lastFlipAt ? Date.parse(candidate.lastFlipAt) : NaN;
    const capturedAt = Date.parse(candidate.capturedAt);
    const side: "bull" | "bear" | null = candidate.trend === "bullish" ? "bull" : candidate.trend === "bearish" ? "bear" : null;
    if (!candidate.confirmedClosedCandle || !side || (direction !== "both" && side !== direction) ||
        !Number.isFinite(flipAt) || !Number.isFinite(capturedAt) ||
        flipAt < periodStart.getTime() || flipAt >= periodEnd.getTime() || capturedAt < flipAt) return [];
    return [{
      assetClass: candidate.assetClass,
      symbol: candidate.symbol,
      name: candidate.name,
      direction: side,
      lastFlipAt: new Date(flipAt).toISOString(),
      source: candidate.source,
      capturedAt: new Date(capturedAt).toISOString(),
      signalBasis: candidate.signalBasis,
    }];
  }).sort((left, right) => right.lastFlipAt.localeCompare(left.lastFlipAt));
}
