import type { EvidenceResult } from "@/lib/research-api";

const documentInstructionPatterns = [
  /\bignore (?:all |any |the )?(?:previous|prior|system|developer) instructions?\b/i,
  /\breveal (?:the )?(?:system prompt|developer message|secret|api key|jwt)\b/i,
  /\baccess another user(?:'s)? (?:data|workspace|portfolio)\b/i,
  /\bplace (?:an )?(?:order|trade)\b/i,
  /\bhide (?:the |this )?(?:action|request|event) from (?:the )?audit log\b/i,
  /\b(?:call|invoke|use) any available tool\b/i,
];

export function containsDocumentPromptInjection(value: string) {
  return documentInstructionPatterns.some((pattern) => pattern.test(value));
}

export function screenRetrievedEvidence(evidence: EvidenceResult[]) {
  const safe: EvidenceResult[] = [];
  const blocked: EvidenceResult[] = [];
  for (const item of evidence) {
    (containsDocumentPromptInjection(item.snippet) ? blocked : safe).push(item);
  }
  return { safe, blocked };
}
