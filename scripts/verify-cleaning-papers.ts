/**
 * Verify cleaning + boundaries for papers 26-27, 30, 33-35.
 * Run: npx tsx scripts/verify-cleaning-papers.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { countWords } from "../lib/grader/text";
import { applyCalibration } from "../lib/grader/calibration";
import {
  applyEvidenceCategoryAndOverallCaps,
  finalizeOverallScore,
  scoreAllCategories,
  scoreOverall,
} from "../lib/grader/scoring";
import { formatBandScore } from "../lib/grader/format";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

function grade(text: string) {
  const { evidence, categories } = scoreAllCategories(text);
  let overall = scoreOverall(categories);
  overall = finalizeOverallScore(categories, overall, evidence);
  const capped = applyEvidenceCategoryAndOverallCaps(
    categories,
    overall,
    evidence,
  );
  return applyCalibration(evidence, capped.categories, capped.overall).overall;
}

function checkPaper(
  label: string,
  path: string,
  minBodyToRaw: number,
  expectedOverall?: string,
) {
  if (!existsSync(path)) {
    console.log(`SKIP ${label}: missing ${path}`);
    return;
  }
  const raw = readFileSync(path, "utf-8");
  const { partition: z } = prepareGradingInput(raw);
  const bodyToRaw = z.bodyWordCount / Math.max(z.rawDocumentWordCount, 1);
  const retention =
    z.fullDocumentWordCount / Math.max(z.rawDocumentWordCount, 1);
  console.log(
    `\n${label}: raw=${z.rawDocumentWordCount} cleaned=${z.fullDocumentWordCount} body=${z.bodyWordCount} stated=${z.statedWordCount} body/raw=${bodyToRaw.toFixed(3)} clean/raw=${retention.toFixed(3)}`,
  );
  assert(
    retention >= 0.85,
    `${label}: cleaning retained >=85% of raw (${(retention * 100).toFixed(1)}%)`,
  );
  assert(
    bodyToRaw >= minBodyToRaw,
    `${label}: body/raw ${bodyToRaw.toFixed(3)} >= ${minBodyToRaw}`,
  );
  if (expectedOverall) {
    const overall = formatBandScore(grade(raw));
    console.log(`  overall=${overall} (expected ${expectedOverall})`);
  }
}

function main() {
  const root = join(process.cwd(), "data/test-papers");
  checkPaper("Paper 33", join(root, "paper33-sleep-finals-full.txt"), 0.85);
  checkPaper("Paper 33 short", join(root, "paper33-sleep-finals.txt"), 0.85);
  checkPaper("Paper 26", join(root, "paper26-boundary.txt"), 0.85);
  checkPaper("Paper 27", join(root, "paper27-boundary.txt"), 0.85);
  checkPaper("Paper 30", join(root, "paper30-boundary.txt"), 0.85);

  const p34 = join(root, "paper34-school-start-times.txt");
  if (!existsSync(p34)) {
    console.log("SKIP paper 34: add fixture at", p34);
  } else {
    checkPaper("Paper 34", p34, 0.85, "Low 1");
  }

  console.log("\nDone exit", process.exitCode ?? 0);
}

main();
