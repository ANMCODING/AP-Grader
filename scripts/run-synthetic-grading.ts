import "@/lib/synthetic/disableClaude";
import { readFileSync, existsSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { gradeDeterministic } from "@/lib/grader/deterministicGrade";
import { matchManifestCaps } from "@/lib/synthetic/capMatching";
import type {
  GradingResultsFile,
  SlimGradeRecord,
  SyntheticManifest,
} from "@/lib/synthetic/types";

const CORPUS = join(process.cwd(), "data/synthetic-papers");

function withinOneBand(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) <= 1;
}

function categoryMap(
  categories: { name: string; label: string; band: number; tier: string }[],
): SlimGradeRecord["allFiveCategoryScores"] {
  const out: SlimGradeRecord["allFiveCategoryScores"] = {};
  for (const c of categories) {
    out[c.name] = { band: c.band, tier: c.tier, label: c.label };
  }
  return out;
}

function main(): void {
  const fast = process.argv.includes("--fast");
  const verbose = process.argv.includes("--verbose");
  const manifestPath = join(CORPUS, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("Run: npm run generate:synthetic");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as SyntheticManifest;
  let papers = manifest.papers;
  if (fast) {
    papers = papers.filter((p) => {
      const m = p.file.match(/paper-(\d+)/);
      return m && Number(m[1]) <= 4;
    });
  }

  const start = Date.now();
  const records: SlimGradeRecord[] = [];
  let done = 0;

  for (const spec of papers) {
    const path = join(CORPUS, spec.file);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf-8");
    const g = gradeDeterministic(raw);
    const fired = matchManifestCaps(spec.expectedCaps, g);
    const rec: SlimGradeRecord = {
      file: spec.file,
      expectedAP: spec.expectedAP,
      predictedAP: g.apScore,
      predictedBand: g.overallLabel,
      withinOneBand: withinOneBand(spec.expectedAP, g.apScore),
      allFiveCategoryScores: categoryMap(g.categories),
      activeCapsFired: g.activeCaps,
      bodyWordCount: g.bodyWordCount,
      bodyToOriginalRatio: g.bodyToOriginalRatio,
      manifestFlagsMatchedToFiredCaps: {
        plannedNonExecution: spec.plannedNonExecution === g.methodNotExecutedHard,
        lacksStudentData: spec.lacksStudentData === g.lacksStudentData,
        futureTenseMethod: spec.futureTenseMethod === g.futureTenseMethodDominant,
        ...fired,
      },
    };
    if (verbose) rec.pipelineDiagnostic = g.pipelineDiagnostic;
    records.push(rec);
    done++;
    process.stdout.write(`\rGraded ${done}/${papers.length}`);
  }
  console.log("");

  const correct = records.filter((r) => r.withinOneBand).length;
  const elapsedMs = Date.now() - start;
  const out: GradingResultsFile = {
    generatedAt: new Date().toISOString(),
    mode: fast ? "fast" : "full",
    claudeDisabled: true,
    elapsedMs,
    totalGraded: records.length,
    totalCorrect: correct,
    accuracyPct: records.length ? (correct / records.length) * 100 : 0,
    records,
  };

  const ts = Date.now();
  const outFile = join(CORPUS, `grading-results-${ts}.json`);
  writeFileSync(outFile, JSON.stringify(out, null, 2));
  writeFileSync(join(CORPUS, "grading-results-latest.json"), JSON.stringify(out, null, 2));

  console.log(`\nGraded ${records.length} in ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Accuracy: ${correct}/${records.length} (${out.accuracyPct.toFixed(1)}%)`);
  console.log(`Saved: ${outFile}`);
}

main();
