/**
 * Run: npx tsx scripts/diagnose-cleaning.ts [path-to-paper.txt]
 * Or: GRADING_CLEANING_DEBUG=1 when grading (prepareGradingInput logs checkpoints).
 */
import { readFileSync } from "fs";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";

const path =
  process.argv[2] ??
  "data/test-papers/paper33-sleep-finals-full.txt";

const raw = readFileSync(path, "utf-8");
console.log(`\n=== Cleaning diagnosis: ${path} ===\n`);
const { partition } = prepareGradingInput(raw, { logCleaningCheckpoints: true });
console.log("\n--- Partition ---");
console.log({
  rawDocumentWordCount: partition.rawDocumentWordCount,
  cleanedFullWords: partition.fullDocumentWordCount,
  bodyWords: partition.bodyWordCount,
  stated: partition.statedWordCount,
  bodyToRaw: (partition.bodyWordCount / partition.rawDocumentWordCount).toFixed(3),
  bodyToStated: partition.statedWordCount
    ? (partition.bodyWordCount / partition.statedWordCount).toFixed(3)
    : "n/a",
});
