import { z } from "zod";

export const geographyThemes = ["unattributed", "crossBorder", "mapped"] as const;
export type GeographyTheme = (typeof geographyThemes)[number];

const count = z.number().int().min(0).max(10_000);
export const geographyReviewInput = z.strictObject({
  unattributed: count,
  crossBorder: count,
  mapped: count,
});
export type GeographyReviewInput = z.infer<typeof geographyReviewInput>;

export const geographyReviewOutput = z.strictObject({
  order: z.array(z.enum(geographyThemes)).min(2).max(3),
});

export const geographyThemeCopy: Record<GeographyTheme, { title: string; context: string }> = {
  unattributed: { title: "Missing country data", context: "Check which assets could not be assigned a reported location." },
  crossBorder: { title: "Cross-border assets", context: "Review assets with no single country on the globe." },
  mapped: { title: "Reported locations", context: "Review the distribution of reported issuer, registration, or listing locations." },
};

export function rankGeographyLocally(input: GeographyReviewInput) {
  return geographyThemes.filter((theme) => input[theme] > 0).sort((a, b) => input[b] - input[a]);
}

export function validateGeographyRanking(input: GeographyReviewInput, result: unknown) {
  const { order } = geographyReviewOutput.parse(result);
  const eligible = rankGeographyLocally(input);
  if (order.length !== eligible.length || new Set(order).size !== eligible.length || order.some((theme) => input[theme] === 0)) {
    throw new Error("The ranking does not match the available geography topics.");
  }
  return order;
}
