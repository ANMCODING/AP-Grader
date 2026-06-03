/**
 * Grade one paper with full diagnostic output.
 * Usage: npx tsx scripts/grade-single-paper.ts data/innovation-high-school/02-fahim-fda.txt
 */
import { readFileSync } from "fs";
import { join } from "path";
import { gradePaper } from "../lib/grader/gradePaper";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { collectEvidence } from "../lib/grader/evidence";
import { identifyFunctionalRegions } from "../lib/grader/functionalRegions";
import { buildFunctionalRegionDebug } from "../lib/grader/functionalRegionDebug";
import { applyCalibration } from "../lib/grader/calibration";
import {
  applyEvidenceCategoryAndOverallCaps,
  scoreAllCategories,
  scoreOverall,
  finalizeOverallScore,
} from "../lib/grader/scoring";
import { buildCapExplanationFlags } from "../lib/grader/capFlags";
import { formatBandScore } from "../lib/grader/format";
import { lacksStudentGeneratedData } from "../lib/grader/evidence";
import { METHOD_NOT_EXECUTED_HARD } from "../lib/grader/methodExecution";
import { cleanPdfExtractedText } from "../lib/server/cleanPdfText";

const path = process.argv[2];
const mode = process.argv[3] ?? "paste";

if (!path) {
  console.error("Usage: npx tsx scripts/grade-single-paper.ts <paper.txt> [paste|pdf]");
  process.exit(1);
}

const raw = readFileSync(path, "utf-8");
let text = raw;
let joinCount: number | null = null;

if (mode === "pdf") {
  const cleaned = cleanPdfExtractedText(raw);
  text = cleaned.text;
  joinCount = cleaned.joinSoftLineBreaksWordCount;
}

async function main() {
  const { partition } = prepareGradingInput(text, {
    joinSoftLineBreaksWordCount: joinCount,
    logCleaningCheckpoints: process.env.GRADING_CLEANING_DEBUG === "1",
  });

  const { evidence, categories } = scoreAllCategories(partition);
  let overall = scoreOverall(categories);
  overall = finalizeOverallScore(categories, overall, evidence);
  const capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
  const cal = applyCalibration(evidence, capped.categories, capped.overall);
  const regions = identifyFunctionalRegions(partition.paperBody);
  const regionReport = buildFunctionalRegionDebug(regions);

  const result = await gradePaper(text, undefined, {
    joinSoftLineBreaksWordCount: joinCount,
  });

  const fahimPhrase =
    /no\s+actual\s+experiment\s+conducted|participant\s+pool\s+will\s+be\s+zero/i.test(
      partition.paperBody,
    );
  const hardPhraseHits = METHOD_NOT_EXECUTED_HARD.filter((p) =>
    p.test(partition.paperBody),
  );

  console.log(`\n=== ${path} (${mode}) ===\n`);
  console.log("--- Completeness ---");
  console.log(partition.pipelineDiagnostic);
  console.log("\n--- Categories (post-calibration) ---");
  for (const c of result.categories) {
    console.log(`  ${c.name}: ${c.label}`);
  }
  console.log(`Overall: ${result.overallLabel} (AP ${result.apScore})`);
  console.log(`Confidence: ${result.confidence}`);
  console.log("\n--- Execution signals ---");
  console.log({
    methodNotExecutedHard: evidence.methodNotExecutedHard,
    explicitNoDataCollected: evidence.explicitNoDataCollected,
    futureTenseMethodDominant: evidence.futureTenseMethodDominant,
    literatureReviewOnlyMethod: evidence.literatureReviewOnlyMethod,
    lacksStudentGeneratedData: lacksStudentGeneratedData(evidence),
    studentResultsSignals: evidence.studentResultsSignals,
    fahimConfessionPhraseInBody: fahimPhrase,
    hardPhrasePatternCount: hardPhraseHits.length,
  });
  console.log("\n--- Calibration ---");
  console.log({
    resembles: `AP ${cal.closestMatch.officialApScore}`,
    anchor: `${cal.closestMatch.sampleLabel} (${cal.closestMatch.title})`,
    adjustments: cal.adjustments,
  });
  console.log("\n--- Caps ---");
  console.log(buildCapExplanationFlags(evidence, cal.categories, cal.overall));
  console.log(capped.activeCapReasons ?? []);
  console.log("\n--- Functional regions ---");
  for (const r of regionReport) {
    console.log(`  ${r.region}: ${r.wordCount}w (${r.source})`);
  }
  console.log("\n--- Flags ---");
  for (const f of result.flags) {
    if (
      f.length < 200 ||
      /cap|method|data|boundary|incomplete|region|Grader/i.test(f)
    ) {
      console.log(`  - ${f}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
