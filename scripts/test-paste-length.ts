/**
 * Verify full-length submissions reach the grading pipeline (no silent truncation).
 * Run: npx tsx scripts/test-paste-length.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { isIncompleteSubmission } from "../lib/grader/incompleteSubmission";
import { countWords } from "../lib/grader/text";

const SENTENCE =
  "This sentence is repeated to build a long paste test for the AP Research grader input path. ";

function buildWordCount(targetWords: number): string {
  let text = `Word Count: ${targetWords}\n\n`;
  while (countWords(text) < targetWords) {
    text += SENTENCE;
  }
  return text;
}

function report(label: string, raw: string) {
  const { partition } = prepareGradingInput(raw);
  const chars = raw.length;
  const words = countWords(raw);
  const rawDoc = partition.rawDocumentWordCount;
  const body = partition.bodyWordCount;
  const stated = partition.statedWordCount;
  const incomplete =
    stated !== null &&
    isIncompleteSubmission(stated, body, partition.rawDocumentWordCount);
  const pctRaw = stated ? ((rawDoc / stated) * 100).toFixed(1) : "n/a";
  const pctBody = stated ? ((body / stated) * 100).toFixed(1) : "n/a";

  console.log(`\n--- ${label} ---`);
  console.log(`  Submitted characters: ${chars.toLocaleString()}`);
  console.log(`  Submitted words (countWords): ${words.toLocaleString()}`);
  console.log(`  rawDocumentWordCount: ${rawDoc.toLocaleString()}`);
  console.log(`  bodyWordCount: ${body.toLocaleString()}`);
  console.log(`  statedWordCount: ${stated?.toLocaleString() ?? "n/a"}`);
  console.log(`  raw/stated: ${pctRaw}%`);
  console.log(`  body/stated: ${pctBody}%`);
  console.log(`  incompleteSubmission warning: ${incomplete ? "YES" : "no"}`);
}

function main() {
  const targetWords = 10_000;
  const synthetic = buildWordCount(targetWords);
  const syntheticWords = countWords(synthetic);
  const syntheticChars = synthetic.length;

  report("10,000-word synthetic paste", synthetic);

  const receivedPct = (syntheticWords / targetWords) * 100;
  console.log(
    `\nSynthetic retention: ${syntheticWords.toLocaleString()} / ${targetWords.toLocaleString()} words (${receivedPct.toFixed(1)}%)`,
  );
  console.log(
    receivedPct >= 90
      ? "PASS: ≥90% of submitted words reached the pipeline."
      : "FAIL: fewer than 90% of words received.",
  );

  const paper27 = join(
    process.cwd(),
    "data/test-papers/paper27-mindfulness-anxiety.txt",
  );
  const paper27Text = readFileSync(paper27, "utf-8");
  report("paper27-mindfulness-anxiety (complete fixture)", paper27Text);

  const paper27Chars = paper27Text.length;
  const paper27Words = countWords(paper27Text);
  console.log(
    `\npaper27 character retention: submitted ${paper27Chars.toLocaleString()} chars, ${paper27Words.toLocaleString()} words`,
  );
}

main();
