import "@/lib/synthetic/disableClaude";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { bandTierToScale } from "@/lib/synthetic/bandScale";
import type {
  AccuracyMetrics,
  GradingResultsFile,
  SyntheticManifest,
} from "@/lib/synthetic/types";

const CORPUS = join(process.cwd(), "data/synthetic-papers");
const METRICS_PATH = join(CORPUS, "accuracy-metrics-latest.json");

function latestGradingFile(): string {
  const latest = join(CORPUS, "grading-results-latest.json");
  if (existsSync(latest)) return latest;
  const files = readdirSync(CORPUS)
    .filter((f) => f.startsWith("grading-results-") && f.endsWith(".json"))
    .sort();
  if (!files.length) throw new Error("No grading results. Run grade:synthetic first.");
  return join(CORPUS, files[files.length - 1]);
}

function loadBenchmarkTierPct(): { official: number | null; custom: number | null } {
  const latest = join(process.cwd(), "data/benchmarks/latest.json");
  if (!existsSync(latest)) return { official: null, custom: null };
  try {
    const b = JSON.parse(readFileSync(latest, "utf-8")) as {
      tiers?: { official?: { pct: number }; custom?: { pct: number } };
    };
    return {
      official: b.tiers?.official?.pct ?? null,
      custom: b.tiers?.custom?.pct ?? null,
    };
  } catch {
    return { official: null, custom: null };
  }
}

function main(): void {
  const sourceFile = latestGradingFile();
  const grades = JSON.parse(readFileSync(sourceFile, "utf-8")) as GradingResultsFile;
  const manifest = JSON.parse(
    readFileSync(join(CORPUS, "manifest.json"), "utf-8"),
  ) as SyntheticManifest;
  const manifestByFile = new Map(manifest.papers.map((p) => [p.file, p]));

  const byScoreLevel: AccuracyMetrics["byScoreLevel"] = {};
  const byCategory: AccuracyMetrics["byCategory"] = {};
  const capExpected: Record<string, { expected: number; fired: number }> = {};
  let above80 = 0;
  let below80 = 0;
  let ratioSum = 0;
  const falsePosFiles: string[] = [];
  const falseNegFiles: string[] = [];

  for (const rec of grades.records) {
    const exp = rec.expectedAP;
    if (!byScoreLevel[exp]) {
      byScoreLevel[exp] = { total: 0, correct: 0, accuracyPct: 0, avgDistance: 0, direction: "balanced" };
    }
    const row = byScoreLevel[exp];
    row.total++;
    if (rec.withinOneBand) row.correct++;
    row.avgDistance += rec.predictedAP - exp;
    ratioSum += rec.bodyToOriginalRatio;
    if (rec.bodyToOriginalRatio >= 80) above80++;
    else below80++;

    if (rec.predictedAP - exp >= 2) falsePosFiles.push(rec.file);
    if (exp - rec.predictedAP >= 2) falseNegFiles.push(rec.file);

    for (const [name, cat] of Object.entries(rec.allFiveCategoryScores)) {
      if (!byCategory[name]) byCategory[name] = {};
      if (!byCategory[name][exp]) byCategory[name][exp] = 0;
      byCategory[name][exp] += bandTierToScale(cat.band, cat.tier);
    }

    const spec = manifestByFile.get(rec.file);
    if (spec) {
      for (const cap of spec.expectedCaps) {
        if (!capExpected[cap]) capExpected[cap] = { expected: 0, fired: 0 };
        capExpected[cap].expected++;
        if (rec.manifestFlagsMatchedToFiredCaps[cap]) capExpected[cap].fired++;
      }
    }
  }

  for (const level of Object.keys(byScoreLevel)) {
    const r = byScoreLevel[Number(level)];
    r.accuracyPct = r.total ? (r.correct / r.total) * 100 : 0;
    r.avgDistance = r.total ? Math.round((r.avgDistance / r.total) * 10) / 10 : 0;
    if (r.avgDistance > 0.2) r.direction = "too high";
    else if (r.avgDistance < -0.2) r.direction = "too low";
    else r.direction = "balanced";
    for (const name of Object.keys(byCategory)) {
      if (byCategory[name][Number(level)] !== undefined) {
        byCategory[name][Number(level)] =
          Math.round((byCategory[name][Number(level)] / r.total) * 10) / 10;
      }
    }
  }

  const capAccuracy: AccuracyMetrics["capAccuracy"] = {};
  for (const [cap, v] of Object.entries(capExpected)) {
    capAccuracy[cap] = {
      expected: v.expected,
      fired: v.fired,
      pct: v.expected ? Math.round((v.fired / v.expected) * 1000) / 10 : 0,
    };
  }

  const bench = loadBenchmarkTierPct();
  const metrics: AccuracyMetrics = {
    generatedAt: new Date().toISOString(),
    sourceFile,
    mode: grades.mode,
    overallAccuracy: grades.accuracyPct,
    overallCorrect: grades.totalCorrect,
    overallTotal: grades.totalGraded,
    byScoreLevel,
    byCategory,
    capAccuracy,
    completeness: {
      above80,
      below80,
      avgRatio: grades.totalGraded ? Math.round((ratioSum / grades.totalGraded) * 10) / 10 : 0,
    },
    falsePositives: {
      count: falsePosFiles.length,
      pct: grades.totalGraded ? (falsePosFiles.length / grades.totalGraded) * 100 : 0,
      files: falsePosFiles,
    },
    falseNegatives: {
      count: falseNegFiles.length,
      pct: grades.totalGraded ? (falseNegFiles.length / grades.totalGraded) * 100 : 0,
      files: falseNegFiles,
    },
    officialTierPct: bench.official,
    customTierPct: bench.custom,
    topErrorCategory: null,
  };

  writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));
  console.log(`Wrote ${METRICS_PATH}`);
}

main();
