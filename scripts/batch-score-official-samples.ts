/**
 * Batch-score official College Board samples and report accuracy.
 * Run: npx tsx scripts/batch-score-official-samples.ts
 */
import { join } from "path";
import { applyCalibration } from "../lib/grader/calibration";
import { applyEvidenceCategoryAndOverallCaps } from "../lib/grader/scoring";
import { finalizeOverallScore } from "../lib/grader/scoring";
import {
  listOfficialSampleFiles,
  loadOfficialSamplePaper,
} from "../lib/grader/sampleCorpus";
import { scoreAllCategories, scoreOverall } from "../lib/grader/scoring";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";

const samplesDir = join(process.cwd(), "data/samples");

function withinOneBand(expected: number, actualBand: number): boolean {
  return Math.abs(expected - actualBand) <= 1;
}

/** Baseline before targeted failure fixes (90.0%). */
const BEFORE_SCORES: Record<string, number> = {
  "ap23-apc-research-sample-a": 4,
  "ap23-apc-research-sample-b": 2,
  "ap23-apc-research-sample-c": 2,
  "ap23-apc-research-sample-d": 3,
  "ap23-apc-research-sample-e": 2,
  "ap23-apc-research-sample-f": 3,
  "ap23-apc-research-sample-g": 1,
  "ap23-apc-research-sample-h": 1,
  "ap23-apc-research-sample-i": 1,
  "ap23-apc-research-sample-j": 1,
  "ap24-apc-research-sample-a": 4,
  "ap24-apc-research-sample-b": 4,
  "ap24-apc-research-sample-c": 4,
  "ap24-apc-research-sample-d": 4,
  "ap24-apc-research-sample-e": 4,
  "ap24-apc-research-sample-f": 2,
  "ap24-apc-research-sample-g": 3,
  "ap24-apc-research-sample-h": 2,
  "ap24-apc-research-sample-i": 1,
  "ap24-apc-research-sample-j": 1,
  "ap25-apc-research-sample-a": 4,
  "ap25-apc-research-sample-b": 2,
  "ap25-apc-research-sample-c": 4,
  "ap25-apc-research-sample-d": 4,
  "ap25-apc-research-sample-e": 4,
  "ap25-apc-research-sample-f": 3,
  "ap25-apc-research-sample-g": 1,
  "ap25-apc-research-sample-h": 1,
  "ap25-apc-research-sample-i": 1,
  "ap25-apc-research-sample-j": 1,
};

async function main() {
  const rows: {
    name: string;
    expected: number;
    engine: number;
    diff: number;
    ok: boolean;
    bodyWords: number;
  }[] = [];

  for (const filePath of listOfficialSampleFiles(samplesDir)) {
    const { text, fileName, officialScore } = loadOfficialSamplePaper(filePath);
    const { partition } = prepareGradingInput(text);
    let { evidence, categories } = scoreAllCategories(partition);
    let overall = scoreOverall(categories);
    overall = finalizeOverallScore(categories, overall, evidence);
    const capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
    categories = capped.categories;
    overall = capped.overall;
    const cal = applyCalibration(evidence, categories, overall);
    overall = cal.overall;

    const engineBand = overall.band;
    rows.push({
      name: fileName.replace(".txt", ""),
      expected: officialScore,
      engine: engineBand,
      diff: engineBand - officialScore,
      ok: withinOneBand(officialScore, engineBand),
      bodyWords: evidence.wordCount,
    });
  }

  const accurate = rows.filter((r) => r.ok).length;
  const pct = ((accurate / rows.length) * 100).toFixed(1);

  console.log("\n| Paper | Expected | Engine | Δ bands | Within ±1 | Body words |");
  console.log("|-------|----------|--------|---------|-----------|------------|");
  for (const r of rows) {
    console.log(
      `| ${r.name} | ${r.expected} | ${r.engine} | ${r.diff >= 0 ? "+" : ""}${r.diff} | ${r.ok ? "yes" : "no"} | ${r.bodyWords} |`,
    );
  }
  console.log(`\nOverall accuracy (within ±1 band): ${accurate}/${rows.length} (${pct}%)`);

  const beforeAccurate = rows.filter(
    (r) => Math.abs(r.expected - (BEFORE_SCORES[r.name] ?? r.engine)) <= 1,
  ).length;

  console.log("\n| File | Official | Before | After | Δ before→after | Pass |");
  console.log("|------|----------|--------|-------|----------------|------|");
  for (const r of rows) {
    const before = BEFORE_SCORES[r.name] ?? r.engine;
    const pass = withinOneBand(r.expected, r.engine);
    console.log(
      `| ${r.name} | ${r.expected} | ${before} | ${r.engine} | ${r.engine - before >= 0 ? "+" : ""}${r.engine - before} | ${pass ? "Pass" : "Fail"} |`,
    );
  }

  console.log("\n--- Accuracy summary ---");
  console.log(
    `Before (90% run): ${beforeAccurate}/${rows.length} (${((beforeAccurate / rows.length) * 100).toFixed(1)}%)`,
  );
  console.log(`After:  ${accurate}/${rows.length} (${pct}%)`);

  const score5Fails = [
    "ap23-apc-research-sample-a",
    "ap23-apc-research-sample-b",
    "ap24-apc-research-sample-a",
    "ap24-apc-research-sample-b",
    "ap25-apc-research-sample-a",
    "ap25-apc-research-sample-b",
  ];
  console.log("\nPreviously underscored Score 5 papers:");
  for (const id of score5Fails) {
    const r = rows.find((x) => x.name === id);
    if (r) {
      console.log(
        `  ${id}: expected ${r.expected} → engine ${r.engine} (${r.ok ? "within ±1" : "MISS"})`,
      );
    }
  }

  const lowPapers = rows.filter((r) => r.expected <= 2);
  const lowInflated = lowPapers.filter((r) => r.engine >= 3);
  console.log("\nScore 1–2 papers inflated to 3+:");
  if (lowInflated.length === 0) {
    console.log("  (none)");
  } else {
    for (const r of lowInflated) {
      console.log(`  ${r.name}: expected ${r.expected} → engine ${r.engine}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
