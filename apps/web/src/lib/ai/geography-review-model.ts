import { generateText, Output, type LanguageModel } from "ai";

import { geographyReviewOutput, validateGeographyRanking, type GeographyReviewInput } from "./geography-review";

const instructions = "Rank the populated geography topics for research and data quality review. Consider whether missing country data or cross-border classification could materially limit interpretation of mapped locations. Return every topic whose count is positive exactly once, most relevant first. The allowed topics are unattributed (missing country), crossBorder (no single country), and mapped (reported location). Counts are not portfolio weights or economic exposure. Do not rank securities or provide investment advice.";

export async function rankGeographyWithModel(model: LanguageModel, input: GeographyReviewInput, abortSignal: AbortSignal) {
  const result = await generateText({
    model,
    system: instructions,
    prompt: JSON.stringify(input),
    output: Output.object({ schema: geographyReviewOutput, name: "GeographyTopicOrder" }),
    maxOutputTokens: 500,
    maxRetries: 0,
    abortSignal,
  });
  return { order: validateGeographyRanking(input, result.output), usage: result.usage };
}
