/**
 * Score custom test papers and compare to expected bands.
 * Run: npx tsx scripts/verify-custom-test-papers.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { gradePaper } from "../lib/grader/gradePaper";
import { formatBandScore } from "../lib/grader/format";
import { CATEGORY_NAMES } from "../lib/grader/types";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";

function scoreNumeric(label: string): number {
  const m = label.match(/(Low|Mid|High)\s+(\d)/i);
  if (!m) return 0;
  const tier = { Low: 0, Mid: 0.35, High: 0.7 }[m[1] as "Low" | "Mid" | "High"];
  return parseInt(m[2], 10) - 1 + tier;
}

function withinBand(actual: string, min: string, max: string): boolean {
  const a = scoreNumeric(actual);
  const lo = scoreNumeric(min);
  const hi = scoreNumeric(max);
  return a >= lo - 0.35 && a <= hi + 0.35;
}

function withinOneBand(expected: string, actual: string): boolean {
  return Math.abs(scoreNumeric(actual) - scoreNumeric(expected)) <= 1.05;
}

interface PaperSpec {
  file: string;
  label: string;
  overallMin: string;
  overallMax: string;
  overallTarget?: string;
  categories?: Partial<
    Record<
      (typeof CATEGORY_NAMES)[number],
      { min: string; max: string }
    >
  >;
}

const PAPERS: PaperSpec[] = [
  {
    file: "paper17-first-generation.txt",
    label: "Paper 17 first-gen PWI",
    overallMin: "High 3",
    overallMax: "Low 4",
  },
  {
    file: "paper20-national-geographic.txt",
    label: "Paper 20 National Geographic",
    overallMin: "Mid 4",
    overallMax: "Mid 4",
    overallTarget: "Mid 4",
  },
  {
    file: "paper22-growth-mindset.txt",
    label: "Paper 22 growth mindset",
    overallMin: "High 3",
    overallMax: "High 3",
    overallTarget: "High 3",
  },
  {
    file: "paper23-spinach-photosynthesis.txt",
    label: "Paper 23 spinach failure",
    overallMin: "Low 2",
    overallMax: "Low 2",
    overallTarget: "Low 2",
  },
  {
    file: "paper24-ap-biology-retrieval.txt",
    label: "Paper 24 retrieval RCT",
    overallMin: "Mid 5",
    overallMax: "Mid 5",
    overallTarget: "Mid 5",
  },
  {
    file: "paper25-ya-fiction.txt",
    label: "Paper 25 YA fiction",
    overallMin: "Low 3",
    overallMax: "Low 3",
    overallTarget: "Low 3",
  },
  {
    file: "paper26-bilingual-ell.txt",
    label: "Paper 26 bilingual ELL",
    overallMin: "High 4",
    overallMax: "High 4",
    overallTarget: "High 4",
  },
  {
    file: "paper27-mindfulness-anxiety.txt",
    label: "Paper 27 mindfulness n=2",
    overallMin: "Low 2",
    overallMax: "Low 2",
    overallTarget: "Low 2",
  },
  {
    file: "paper28-music-plants.txt",
    label: "Paper 28 music plants",
    overallMin: "Mid 3",
    overallMax: "Mid 3",
    overallTarget: "Mid 3",
  },
  {
    file: "paper29-influencer.txt",
    label: "Paper 29 influencer survey",
    overallMin: "High 2",
    overallMax: "High 2",
    overallTarget: "High 2",
  },
  {
    file: "paper30-cold-water.txt",
    label: "Paper 30 cold water RCT",
    overallMin: "Low 5",
    overallMax: "Low 5",
    overallTarget: "Low 5",
  },
  {
    file: "paper33-sleep-finals-full.txt",
    label: "Paper 33 sleep finals",
    overallMin: "Mid 3",
    overallMax: "Mid 3",
    overallTarget: "Mid 3",
  },
  {
    file: "paper34-school-start-times.txt",
    label: "Paper 34 argumentative",
    overallMin: "Low 1",
    overallMax: "Low 1",
    overallTarget: "Low 1",
  },
  {
    file: "paper35-culturally-responsive-math.txt",
    label: "Paper 35 CRA math",
    overallMin: "High 4",
    overallMax: "Low 5",
  },
];

async function main() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  console.log("\n=== Custom test paper verification ===\n");

  for (const spec of PAPERS) {
    const path = join(process.cwd(), "data/test-papers", spec.file);
    if (!existsSync(path)) {
      console.log(`SKIP ${spec.label}: missing ${spec.file}`);
      fail++;
      failures.push(`${spec.label}: missing file`);
      continue;
    }

    const raw = readFileSync(path, "utf-8");
    const { partition } = prepareGradingInput(raw);
    const result = await gradePaper(raw);
    const overall = formatBandScore(result.overall);
    const cats = result.categories.map((c) => `${c.name}: ${c.label}`).join(" | ");

    const bodyToStated =
      partition.statedWordCount && partition.statedWordCount > 0
        ? (partition.bodyWordCount / partition.statedWordCount).toFixed(2)
        : "n/a";

    console.log(`\n${spec.label} (${spec.file})`);
    console.log(
      `  words: body=${partition.bodyWordCount} raw=${partition.rawDocumentWordCount} stated=${partition.statedWordCount} ratio=${bodyToStated}`,
    );
    if (result.incompleteSubmissionWarning) {
      console.log(`  ⚠ INCOMPLETE SUBMISSION WARNING`);
    }
    console.log(`  Overall: ${overall} (expected ${spec.overallMin}–${spec.overallMax})`);
    console.log(`  ${cats}`);

    const okOverall = withinBand(overall, spec.overallMin, spec.overallMax);
    if (okOverall) {
      pass++;
      console.log("  PASS overall");
    } else {
      fail++;
      const msg = `${spec.label}: overall ${overall} not in ${spec.overallMin}–${spec.overallMax}`;
      failures.push(msg);
      console.log(`  FAIL overall`);
    }
  }

  console.log(`\n=== Summary: ${pass}/${pass + fail} papers within expected overall band ===`);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  }
}

main();
