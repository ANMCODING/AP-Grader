/**
 * Verification for test papers 20–22 (boundary, focus, footnotes).
 * Run: npx tsx scripts/verify-papers-20-22.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { collectEvidence } from "../lib/grader/evidence";
import {
  applyEvidenceCategoryAndOverallCaps,
  finalizeOverallScore,
  scoreAllCategories,
  scoreOverall,
} from "../lib/grader/scoring";
import { applyCalibration } from "../lib/grader/calibration";
import { formatBandScore } from "../lib/grader/format";
import { detectChicagoFootnoteStyle } from "../lib/grader/studentData";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

function gradePaper(text: string) {
  const { evidence, categories } = scoreAllCategories(text);
  let overall = scoreOverall(categories);
  overall = finalizeOverallScore(categories, overall, evidence);
  const capped = applyEvidenceCategoryAndOverallCaps(
    categories,
    overall,
    evidence,
  );
  const cal = applyCalibration(evidence, capped.categories, capped.overall);
  return { evidence, categories: cal.categories, overall: cal.overall };
}

function main() {
  const root = process.cwd();

  const p21Path = join(root, "data/test-papers/paper21-epigenetics-review.txt");
  assert(existsSync(p21Path), "paper 21 fixture exists");
  const p21 = readFileSync(p21Path, "utf-8");
  const p21g = gradePaper(p21);
  const focus21 = formatBandScore(p21g.categories[0]);
  console.log(
    `Paper 21: focus=${focus21} overall=${formatBandScore(p21g.overall)}`,
  );
  assert(focus21 === "Low 1", `paper 21 focus ${focus21} expected Low 1`);
  assert(
    formatBandScore(p21g.overall) === "Low 1",
    `paper 21 overall ${formatBandScore(p21g.overall)} expected Low 1`,
  );

  const p22Path = join(root, "data/test-papers/paper22-growth-mindset.txt");
  if (existsSync(p22Path)) {
    const p22 = readFileSync(p22Path, "utf-8");
    const { partition: p22z } = prepareGradingInput(p22);
    const p22ev = collectEvidence(p22);
    const chicago = detectChicagoFootnoteStyle(p22z.paperBody);
    const p22g = gradePaper(p22);
    console.log(
      `Paper 22: body=${p22z.bodyWordCount} stated=${p22z.statedWordCount} chicago=${chicago} overall=${formatBandScore(p22g.overall)} focus=${formatBandScore(p22g.categories[0])}`,
    );
    assert(!chicago, "paper 22: no Chicago footnote false positive");
    assert(
      p22z.bodyWordCount >= 3000,
      `paper 22 body ${p22z.bodyWordCount} expected >= 3000`,
    );
  } else {
    console.log("SKIP paper 22: missing data/test-papers/paper22-growth-mindset.txt");
  }

  const p20Path = join(root, "data/test-papers/paper20-national-geographic.txt");
  const p20Alt = join(root, "data/test-papers/paper19-youtube-climate.txt");
  const p20File = existsSync(p20Path) ? p20Path : p20Alt;
  const p20 = readFileSync(p20File, "utf-8");
  const { partition: p20z } = prepareGradingInput(p20);
  console.log(
    `Paper 20 (${p20File.split("/").pop()}): body=${p20z.bodyWordCount} stated=${p20z.statedWordCount} warn=${p20z.boundaryDetectionWarning?.slice(0, 80) ?? "none"}`,
  );
  assert(
    p20z.bodyWordCount > 3500,
    `paper 20 body ${p20z.bodyWordCount} expected > 3500`,
  );

  const statsSnippet =
    "The Pearson correlation was r = .47, p less than .001. beta = .44, p less than .001. R-squared = .23. (p = .34 and p = .61 respectively).";
  assert(
    !detectChicagoFootnoteStyle(statsSnippet),
    "statistical decimals not counted as Chicago footnotes",
  );

  console.log("\nDone exit", process.exitCode ?? 0);
}

main();
