import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { gradePaper } from "../lib/grader/gradePaper";
import { formatBandScore } from "../lib/grader/format";
import { stripTestPaperMetadata } from "../lib/grader/cleanDocument";

function scoreNumeric(label: string): number {
  const m = label.match(/(Low|Mid|High)\s+(\d)/i);
  if (!m) return 0;
  const tier = { Low: 0, Mid: 0.35, High: 0.7 }[m[1] as "Low" | "Mid" | "High"];
  return parseInt(m[2], 10) - 1 + tier;
}

function assertWithin(
  actual: string,
  expected: string,
  tolerance: number,
  label: string,
) {
  const diff = Math.abs(scoreNumeric(actual) - scoreNumeric(expected));
  if (diff > tolerance) {
    console.error(
      `FAIL ${label}: got ${actual}, want ${expected} (±${tolerance} band)`,
    );
    process.exitCode = 1;
  } else {
    console.log(`OK ${label}: ${actual} (~${expected})`);
  }
}

async function gradeFixture(relPath: string) {
  const path = join(process.cwd(), relPath);
  if (!existsSync(path)) {
    console.warn("SKIP missing", relPath);
    return null;
  }
  const raw = readFileSync(path, "utf8");
  const text = stripTestPaperMetadata(raw);
  const result = await gradePaper(text);
  return formatBandScore(result.overall);
}

const fixtures: { file: string; expected: string; tolerance: number }[] = [
  { file: "data/test-papers/microplastics.txt", expected: "Low 5", tolerance: 0.5 },
  { file: "data/test-papers/music.txt", expected: "Mid 2", tolerance: 0.5 },
  { file: "data/test-papers/social-media.txt", expected: "Low 1", tolerance: 0.35 },
  { file: "data/test-papers/social-media-depression.txt", expected: "Low 2", tolerance: 0.5 },
  { file: "data/test-papers/parental-homework.txt", expected: "Mid 3", tolerance: 0.7 },
];

for (const f of fixtures) {
  const actual = await gradeFixture(f.file);
  if (actual) assertWithin(actual, f.expected, f.tolerance, f.file);
}

console.log("\nDone exit", process.exitCode ?? 0);
