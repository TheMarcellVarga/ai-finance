import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  runEvidenceEvaluation,
  type EvaluationSource,
  type EvidenceEvaluationReport,
} from "../src/lib/ai/evidence-evaluation";

const root = path.resolve(process.cwd(), "../..");
const fixtureRoot = path.join(root, "evals/evidence-workspace");
const sourceDefinitions = [
  ["northstar-q1", "11111111-1111-4111-8111-111111111111", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Northstar Systems Q1", "northstar-q1.txt"],
  ["northstar-q2", "22222222-2222-4222-8222-222222222222", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "Northstar Systems Q2", "northstar-q2.txt"],
  ["harbor-annual", "33333333-3333-4333-8333-333333333333", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", "Harbor Components annual report", "harbor-annual.txt"],
  ["meridian-8k", "44444444-4444-4444-8444-444444444444", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", "Meridian Health Data current report", "meridian-8k.txt"],
  ["untrusted-appendix", "55555555-5555-4555-8555-555555555555", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", "Untrusted appendix", "untrusted-appendix.txt"],
] as const;

async function main() {
  const sources: EvaluationSource[] = await Promise.all(
    sourceDefinitions.map(async ([id, documentId, chunkId, title, filename]) => ({
      id,
      documentId,
      chunkId,
      title,
      filename,
      text: await readFile(path.join(fixtureRoot, "sources", filename), "utf8"),
    })),
  );
  const cases = JSON.parse(await readFile(path.join(fixtureRoot, "cases.json"), "utf8"));
  const baselinePath = path.join(fixtureRoot, "baseline.json");
  let baseline: EvidenceEvaluationReport | undefined;
  try {
    baseline = JSON.parse(await readFile(baselinePath, "utf8")) as EvidenceEvaluationReport;
  } catch {
    baseline = undefined;
  }

  const report = runEvidenceEvaluation({
    cases,
    sources,
    buildVersion: process.env.EVIDENCE_EVAL_BUILD_VERSION ?? "working-tree",
    baseline,
  });
  const outputDirectory = path.join(root, "artifacts/evaluations");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (process.argv.includes("--write-baseline")) {
    const baselineReport = { ...report };
    delete baselineReport.comparison;
    await writeFile(baselinePath, `${JSON.stringify(baselineReport, null, 2)}\n`);
  }

  console.log(`Evidence eval: ${report.passedCaseCount}/${report.caseCount} passed (${report.passRate}%).`);
  console.log(`Sources: ${report.sourceDocumentCount}; citations: ${report.metrics.citationCorrectness}%; prompt injection: ${report.metrics.promptInjectionResistance}%.`);
  if (report.failedCaseCount > 0) {
    for (const result of report.cases.filter((item) => !item.passed)) {
      console.error(`FAIL ${result.id}: ${result.note}`);
    }
    process.exitCode = 1;
  }
}

void main();
