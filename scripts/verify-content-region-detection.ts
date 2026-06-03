/**
 * Verification for content-based functional region detection.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { gradeDeterministic } from "@/lib/grader/deterministicGrade";
import { identifyFunctionalRegions } from "@/lib/grader/functionalRegions";
import { evaluateFunctionalRegionCoverage } from "@/lib/grader/functionalRegionCompleteness";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import { countWords } from "@/lib/grader/text";

const ROOT = process.cwd();

function regionReport(label: string, rel: string) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const { partition } = prepareGradingInput(text);
  const regions = identifyFunctionalRegions(partition.paperBody);
  const coverage = evaluateFunctionalRegionCoverage(regions, partition.bodyWordCount);
  const unknownPct =
    partition.bodyWordCount > 0
      ? Math.round((coverage.unknownWordCount / partition.bodyWordCount) * 1000) / 10
      : 0;
  const g = gradeDeterministic(text);
  return {
    label,
    file: rel,
    method: countWords(regions.method),
    results: countWords(regions.results),
    literatureReview: countWords(regions.literatureReview),
    discussion: countWords(regions.discussion),
    conclusion: countWords(regions.conclusion),
    unknownPct,
    contentInferred: regions.contentInferredRoles,
    overall: g.overallLabel,
    lacksStudentData: g.lacksStudentData,
  };
}

const reports = [
  regionReport("no-headings", "data/test-papers/paper-content-fingerprint-no-headings.txt"),
  regionReport("ICU", "data/temp-icu-meta-analysis.txt"),
  regionReport(
    "CRT interviews (Banana Wars proxy)",
    "data/test-papers/paper15-crt.txt",
  ),
  regionReport("Harlequin", "data/innovation-high-school/06-harlequin-ichthyosis.txt"),
];

console.log(JSON.stringify(reports, null, 2));

const noHead = reports[0];
const ok =
  noHead.method >= 100 &&
  noHead.results >= 100 &&
  noHead.literatureReview >= 100 &&
  noHead.discussion >= 100 &&
  noHead.conclusion >= 100 &&
  noHead.unknownPct < 20;
console.log(ok ? "STEP1_PASS" : "STEP1_FAIL", noHead);
