import type { AnalysisReviewEvent } from "@/lib/ai/research-review";
import { deriveSectionReviewStates } from "@/lib/ai/research-review";
import type { StructuredResearchResult } from "@/lib/ai/structured-research";

function markdownText(value: string) {
  return value.replace(/[\\`*_[\]{}<>#+\-.!|]/g, "\\$&");
}

function decisionLabel(decision: "accepted" | "rejected" | "unreviewed") {
  if (decision === "accepted") return "Human reviewed and accepted";
  if (decision === "rejected") return "Human reviewed and rejected";
  return "Not yet approved";
}

export function buildReviewedMarkdown(input: {
  runId: string;
  result: StructuredResearchResult;
  events: AnalysisReviewEvent[];
  exportedAt: string;
}) {
  const states = deriveSectionReviewStates(input.events);
  const acceptedSections = input.result.sections.filter(
    (section) => states.get(section.key)?.decision === "accepted",
  ).length;
  const fullyReviewed = acceptedSections === input.result.sections.length;
  const lines = [
    `# ${markdownText(input.result.title)}`,
    "",
    `- Export status: ${fullyReviewed ? "All sections human reviewed and accepted" : "Contains unapproved sections"}`,
    `- Accepted sections: ${acceptedSections} of ${input.result.sections.length}`,
    `- Analysis run: \`${input.runId}\``,
    `- Exported at: ${input.exportedAt}`,
    `- Source retrieval: \`${input.result.retrieval.runId}\``,
    "",
    "> This reviewed export is research support, not financial advice. Unapproved and rejected sections are labeled explicitly.",
    "",
  ];

  for (const section of input.result.sections) {
    const state = states.get(section.key);
    const decision = state?.decision ?? "unreviewed";
    const acceptedEdit =
      decision === "accepted" && state?.decisionEvent?.contentEventId
        ? input.events.find(
            (event) => event.id === state.decisionEvent?.contentEventId,
          )
        : null;
    const title = acceptedEdit?.sectionTitle ?? section.title;
    const body = acceptedEdit?.sectionBody ?? section.body;
    lines.push(
      `## ${markdownText(title)}`,
      "",
      `**Review state:** ${decisionLabel(decision)}`,
      "",
      `**Content provenance:** ${acceptedEdit ? "Accepted user edit" : "Immutable raw AI output"}`,
      "",
      markdownText(body),
      "",
    );
    if (state?.edit && !acceptedEdit) {
      lines.push(
        "_A separate user edit exists but is not exported as accepted content._",
        "",
      );
    }
    if (state?.decisionEvent?.note) {
      lines.push(
        `**Reviewer note:** ${markdownText(state.decisionEvent.note)}`,
        "",
      );
    }
    if (section.claims.length > 0) {
      lines.push("### Material findings", "");
      for (const claim of section.claims) {
        const support =
          claim.supportStatus === "supported"
            ? `Supported (${claim.evidenceStrength} evidence)`
            : "Unsupported - do not treat as established";
        lines.push(
          `- ${markdownText(claim.text)} **[${markdownText(support)}]**`,
        );
        for (const chunkId of claim.evidenceChunkIds) {
          const citation = input.result.citations.find(
            (item) => item.chunkId === chunkId,
          );
          if (citation) {
            lines.push(
              `  - Evidence: ${markdownText(citation.documentTitle)}, page ${citation.pageNumber}, ${markdownText(citation.sourceLocator)}`,
            );
          }
        }
      }
      lines.push("");
    }
  }

  lines.push("## Evidence references", "");
  for (const [index, citation] of input.result.citations.entries()) {
    const flags = input.events.filter(
      (event) =>
        event.eventType === "citation_flagged" &&
        event.citationChunkId === citation.chunkId,
    );
    lines.push(
      `### Source ${index + 1}: ${markdownText(citation.documentTitle)}, page ${citation.pageNumber}`,
      "",
      `- Source locator: ${markdownText(citation.sourceLocator)}`,
      `- Retrieval chunk: \`${citation.chunkId}\``,
      `- Citation feedback: ${flags.length > 0 ? `${flags.length} human issue report${flags.length === 1 ? "" : "s"}` : "No issue reported"}`,
      "",
      `> ${markdownText(citation.excerpt)}`,
      "",
    );
  }

  lines.push(
    "## Assumptions and limitations",
    "",
    ...input.result.assumptions.map(
      (assumption) => `- ${markdownText(assumption)}`,
    ),
    "",
    markdownText(input.result.disclaimer),
    "",
  );
  return {
    markdown: lines.join("\n"),
    acceptedSections,
    fullyReviewed,
  };
}
