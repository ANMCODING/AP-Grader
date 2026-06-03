import "@/lib/synthetic/disableClaude";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { applyCalibration } from "@/lib/grader/calibration";
import {
  applyEvidenceCategoryAndOverallCaps,
  finalizeOverallScore,
  scoreAllCategories,
  scoreOverall,
} from "@/lib/grader/scoring";
import {
  listOfficialSampleFiles,
  loadOfficialSamplePaper,
} from "@/lib/grader/sampleCorpus";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import { formatBandScore } from "@/lib/grader/format";
import { gradeDeterministic } from "@/lib/grader/deterministicGrade";
import type { BenchmarkTierResult } from "@/lib/synthetic/types";

const FIXTURE_COMPLETE_RATIO = 0.7;

function withinOneBand(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) <= 1;
}

function gradeOfficial(samplesDir: string): BenchmarkTierResult {
  let ok = 0;
  let total = 0;
  const failures: BenchmarkTierResult["failures"] = [];
  for (const filePath of listOfficialSampleFiles(samplesDir)) {
    const { text, fileName, officialScore } = loadOfficialSamplePaper(filePath);
    const { partition } = prepareGradingInput(text);
    let { evidence, categories } = scoreAllCategories(partition);
    let overall = scoreOverall(categories);
    overall = finalizeOverallScore(categories, overall, evidence);
    const capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
    const cal = applyCalibration(evidence, capped.categories, capped.overall);
    const band = cal.overall.band;
    total++;
    if (withinOneBand(officialScore, band)) ok++;
    else failures?.push({ file: fileName, expected: officialScore, actual: band });
  }
  return {
    ok,
    total,
    pct: total ? Math.round((ok / total) * 1000) / 10 : 0,
    failures,
  };
}

function gradeCustom(): BenchmarkTierResult {
  const manifestPath = join(process.cwd(), "data/test-papers/manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    papers: Record<string, { overall: number }>;
  };
  const dir = join(process.cwd(), "data/test-papers");
  let ok = 0;
  let total = 0;
  const failures: BenchmarkTierResult["failures"] = [];
  for (const [file, spec] of Object.entries(manifest.papers)) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf-8");
    const { partition } = prepareGradingInput(raw);
    const ratio =
      partition.statedWordCount && partition.statedWordCount > 0
        ? partition.bodyWordCount / partition.statedWordCount
        : 1;
    if (ratio < FIXTURE_COMPLETE_RATIO) continue;
    const g = gradeDeterministic(raw);
    total++;
    if (withinOneBand(spec.overall, g.apScore)) ok++;
    else failures?.push({ file, expected: spec.overall, actual: g.apScore });
  }
  return {
    ok,
    total,
    pct: total ? Math.round((ok / total) * 1000) / 10 : 0,
    failures,
  };
}

function gradeSynthetic(fast: boolean): BenchmarkTierResult {
  const latest = join(process.cwd(), "data/synthetic-papers/grading-results-latest.json");
  if (!existsSync(latest)) {
    return { ok: 0, total: 0, pct: 0 };
  }
  const g = JSON.parse(readFileSync(latest, "utf-8")) as {
    totalCorrect: number;
    totalGraded: number;
    accuracyPct: number;
    records: { file: string; expectedAP: number; predictedAP: number; withinOneBand: boolean }[];
  };
  const failures = g.records
    .filter((r) => !r.withinOneBand)
    .map((r) => ({ file: r.file, expected: r.expectedAP, actual: r.predictedAP }));
  return {
    ok: g.totalCorrect,
    total: g.totalGraded,
    pct: g.accuracyPct,
    failures,
  };
}

function gradeInnovation(): BenchmarkTierResult | undefined {
  const dir = join(process.cwd(), "data/innovation-high-school");
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) return undefined;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    papers: Record<string, { expectedOverall?: number; overall?: number }>;
  };
  let ok = 0;
  let total = 0;
  const failures: BenchmarkTierResult["failures"] = [];
  for (const [file, spec] of Object.entries(manifest.papers)) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf-8");
    const g = gradeDeterministic(raw);
    const expected = spec.overall ?? spec.expectedOverall ?? 1;
    total++;
    if (withinOneBand(expected, g.apScore)) ok++;
    else failures?.push({ file, expected, actual: g.apScore });
  }
  return {
    ok,
    total,
    pct: total ? Math.round((ok / total) * 1000) / 10 : 0,
    failures,
  };
}

export function runAllTiers(fast: boolean): {
  official: BenchmarkTierResult;
  custom: BenchmarkTierResult;
  synthetic: BenchmarkTierResult;
  innovation?: BenchmarkTierResult;
} {
  return {
    official: gradeOfficial(join(process.cwd(), "data/samples")),
    custom: gradeCustom(),
    synthetic: gradeSynthetic(fast),
    innovation: gradeInnovation(),
  };
}
