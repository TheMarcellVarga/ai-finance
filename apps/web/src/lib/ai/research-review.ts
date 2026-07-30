import { z } from "zod";

import { researchSectionKeySchema } from "@/lib/ai/structured-research";

export const analysisReviewEventTypeSchema = z.enum([
  "edit_saved",
  "accepted",
  "rejected",
  "citation_flagged",
]);

export const analysisReviewEventSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  analysisRunId: z.string().uuid(),
  sectionKey: researchSectionKeySchema,
  eventType: analysisReviewEventTypeSchema,
  contentEventId: z.string().uuid().optional(),
  sectionTitle: z.string().min(1).max(160).optional(),
  sectionBody: z.string().min(1).max(12000).optional(),
  note: z.string().min(1).max(2000).optional(),
  citationChunkId: z.string().uuid().optional(),
  outputSha256: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: z.string().datetime(),
});

const reviewBaseSchema = z.object({
  requestId: z.string().uuid(),
  sectionKey: researchSectionKeySchema,
}).strict();

export const appendAnalysisReviewEventSchema = z.discriminatedUnion(
  "eventType",
  [
    reviewBaseSchema.extend({
      eventType: z.literal("edit_saved"),
      sectionTitle: z.string().trim().min(1).max(160),
      sectionBody: z.string().trim().min(1).max(12000),
    }),
    reviewBaseSchema.extend({
      eventType: z.literal("accepted"),
      contentEventId: z.string().uuid().optional(),
      note: z.string().trim().min(1).max(2000).optional(),
    }),
    reviewBaseSchema.extend({
      eventType: z.literal("rejected"),
      contentEventId: z.string().uuid().optional(),
      note: z.string().trim().min(1).max(2000).optional(),
    }),
    reviewBaseSchema.extend({
      eventType: z.literal("citation_flagged"),
      citationChunkId: z.string().uuid(),
      note: z.string().trim().min(1).max(2000),
    }),
  ],
);

export type AnalysisReviewEvent = z.infer<typeof analysisReviewEventSchema>;
export type AppendAnalysisReviewEvent = z.infer<
  typeof appendAnalysisReviewEventSchema
>;

export type SectionReviewState = {
  edit: AnalysisReviewEvent | null;
  decision: "accepted" | "rejected" | "unreviewed";
  decisionEvent: AnalysisReviewEvent | null;
  citationFlags: AnalysisReviewEvent[];
};

export function deriveSectionReviewStates(events: AnalysisReviewEvent[]) {
  const states = new Map<string, SectionReviewState>();

  for (const event of events) {
    const state = states.get(event.sectionKey) ?? {
      edit: null,
      decision: "unreviewed" as const,
      decisionEvent: null,
      citationFlags: [],
    };
    if (event.eventType === "edit_saved") {
      state.edit = event;
      state.decision = "unreviewed";
      state.decisionEvent = null;
    } else if (event.eventType === "citation_flagged") {
      state.citationFlags = [...state.citationFlags, event];
    } else {
      const activeContentEventId = state.edit?.id;
      const decisionContentEventId = event.contentEventId;
      const decisionMatchesActiveContent =
        activeContentEventId === decisionContentEventId ||
        (!activeContentEventId && !decisionContentEventId);
      if (decisionMatchesActiveContent) {
        state.decision = event.eventType;
        state.decisionEvent = event;
      }
    }
    states.set(event.sectionKey, state);
  }

  return states;
}

export function reviewStateForSection(
  events: AnalysisReviewEvent[],
  sectionKey: string,
) {
  return (
    deriveSectionReviewStates(events).get(sectionKey) ?? {
      edit: null,
      decision: "unreviewed" as const,
      decisionEvent: null,
      citationFlags: [],
    }
  );
}
