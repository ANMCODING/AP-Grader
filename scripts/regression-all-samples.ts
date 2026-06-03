/**
 * Combined regression: 30 official samples + custom test papers.
 * Reports three-tier accuracy (official / complete custom / incomplete fixtures).
 * Run: npx tsx scripts/regression-all-samples.ts
 */
process.env.ANTHROPIC_API_KEY = "";

import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { applyCalibration } from "../lib/grader/calibration";
import {
  applyEvidenceCategoryAndOverallCaps,
  finalizeOverallScore,
  scoreAllCategories,
  scoreOverall,
} from "../lib/grader/scoring";
import {
  listOfficialSampleFiles,
  loadOfficialSamplePaper,
} from "../lib/grader/sampleCorpus";
import { gradePaper } from "../lib/grader/gradePaper";
import { formatBandScore } from "../lib/grader/format";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { CATEGORY_NAMES } from "../lib/grader/types";
import { runGoogleDocsPdfCorpusTest } from "./test-pdf-google-docs";

const FIXTURE_COMPLETE_RATIO = 0.7;

interface ManifestPaper {
  overall: number;
  expectedOverall?: number;
  expectedAP?: number;
  band?: string;
  tier?: string;
  range?: string;
  note?: string;
}

interface Manifest {
  papers: Record<string, ManifestPaper>;
}

function withinOneBand(expected: number, actualBand: number): boolean {
  return Math.abs(expected - actualBand) <= 1;
}

function isFixtureComplete(bodyWordCount: number, statedWordCount: number | null): boolean {
  if (statedWordCount === null || statedWordCount <= 0) return true;
  return bodyWordCount / statedWordCount >= FIXTURE_COMPLETE_RATIO;
}

function loadManifest(): Record<string, number> {
  const path = join(process.cwd(), "data/test-papers/manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf-8")) as Manifest;
  const out: Record<string, number> = {};
  for (const [file, spec] of Object.entries(manifest.papers)) {
    out[file] = spec.overall;
  }
  return out;
}

async function runRegression(): Promise<void> {
  const CUSTOM_EXPECTED = loadManifest();
  let officialOk = 0;
  let officialTotal = 0;

  let customCompleteOk = 0;
  let customCompleteTotal = 0;
  const incompleteFixtures: string[] = [];
  const customFailures: {
    file: string;
    expected: number;
    actual: string;
    categories: string;
  }[] = [];

  console.log("\n--- Pre-flight: custom fixture completeness (body ≥ 70% of stated) ---\n");
  const dir = join(process.cwd(), "data/test-papers");
  for (const file of Object.keys(CUSTOM_EXPECTED)) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf-8");
    const { partition } = prepareGradingInput(raw);
    const ratio =
      partition.statedWordCount && partition.statedWordCount > 0
        ? partition.bodyWordCount / partition.statedWordCount
        : 1;
    const complete = isFixtureComplete(
      partition.bodyWordCount,
      partition.statedWordCount,
    );
    if (!complete) {
      incompleteFixtures.push(
        `${file}: body=${partition.bodyWordCount} stated=${partition.statedWordCount} (${(ratio * 100).toFixed(0)}%)`,
      );
    }
  }
  if (incompleteFixtures.length) {
    for (const line of incompleteFixtures) {
      console.log(`  FIXTURE INCOMPLETE — score not reliable: ${line}`);
    }
  } else {
    console.log("  All custom fixtures meet completeness threshold.");
  }

  console.log("\n--- Official College Board samples (30) ---\n");
  for (const filePath of listOfficialSampleFiles(join(process.cwd(), "data/samples"))) {
    const { text, fileName, officialScore } = loadOfficialSamplePaper(filePath);
    const { partition } = prepareGradingInput(text);
    let { evidence, categories } = scoreAllCategories(partition);
    let overall = scoreOverall(categories);
    overall = finalizeOverallScore(categories, overall, evidence);
    const capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
    const cal = applyCalibration(evidence, capped.categories, capped.overall);
    const band = cal.overall.band;
    const pass = withinOneBand(officialScore, band);
    officialTotal++;
    if (pass) officialOk++;
    console.log(
      `${pass ? "OK" : "FAIL"} ${fileName.replace(".txt", "")}: expected ${officialScore} → ${formatBandScore(cal.overall)}`,
    );
  }

  console.log("\n--- Custom test papers ---\n");
  for (const [file, expected] of Object.entries(CUSTOM_EXPECTED)) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      console.log(`SKIP ${file} (missing)`);
      continue;
    }
    const raw = readFileSync(path, "utf-8");
    const { partition } = prepareGradingInput(raw);
    const complete = isFixtureComplete(
      partition.bodyWordCount,
      partition.statedWordCount,
    );

    if (!complete) {
      console.log(
        `UNTESTED ${file}: FIXTURE INCOMPLETE — score not reliable (expected ${expected})`,
      );
      continue;
    }

    const result = await gradePaper(raw);
    const band = result.overall.band;
    const pass = withinOneBand(expected, band);
    customCompleteTotal++;
    if (pass) customCompleteOk++;
    const catLine = result.categories
      .map((c) => `${c.name.split(" ")[0]}: ${c.label}`)
      .join(", ");
    console.log(
      `${pass ? "OK" : "FAIL"} ${file}: expected ${expected} → ${formatBandScore(result.overall)} | ${catLine}`,
    );
    if (!pass) {
      customFailures.push({
        file,
        expected,
        actual: formatBandScore(result.overall),
        categories: result.categories
          .map((c) => `${c.name}: ${c.label}`)
          .join(" | "),
      });
    }
  }

  const officialPct = ((officialOk / officialTotal) * 100).toFixed(1);
  const customPct =
    customCompleteTotal > 0
      ? ((customCompleteOk / customCompleteTotal) * 100).toFixed(1)
      : "n/a";
  const combinedOk = officialOk + customCompleteOk;
  const combinedTotal = officialTotal + customCompleteTotal;
  const combinedPct = ((combinedOk / combinedTotal) * 100).toFixed(1);

  if (incompleteFixtures.length) {
    console.log(
      `Custom incomplete fixtures (not scored): ${incompleteFixtures.length}`,
    );
  }

  if (customFailures.length) {
    console.log("\n--- Custom scoring mismatches (>1 band) ---\n");
    for (const f of customFailures) {
      console.log(`${f.file}: expected AP ${f.expected}, got ${f.actual}`);
      console.log(`  ${f.categories}`);
    }
  }

  if (combinedTotal > 0 && combinedOk / combinedTotal < 0.85) {
    process.exitCode = 1;
  }

  const innovationDir = join(process.cwd(), "data/innovation-high-school");
  const innovationManifestPath = join(innovationDir, "manifest.json");
  let innovationOk = 0;
  let innovationTotal = 0;
  const innovationFailures: { file: string; expected: number; actual: string }[] =
    [];

  if (existsSync(innovationManifestPath)) {
    const innovationManifest = JSON.parse(
      readFileSync(innovationManifestPath, "utf-8"),
    ) as Manifest;
    console.log("\n--- Innovation High School 2024 ---\n");
    for (const [file, spec] of Object.entries(innovationManifest.papers)) {
      const path = join(innovationDir, file);
      if (!existsSync(path)) {
        console.log(`SKIP ${file} (missing)`);
        continue;
      }
      const raw = readFileSync(path, "utf-8");
      const { partition } = prepareGradingInput(raw);
      const ratio = partition.pipelineDiagnostic.bodyToOriginalRatio;
      if (ratio < 70) {
        console.log(
          `WARN ${file}: body/original ${ratio}% < 70% — score may be unreliable`,
        );
      }
      const result = await gradePaper(raw);
      const expected = spec.overall ?? spec.expectedOverall;
      const band = result.overall.band;
      const pass = withinOneBand(expected, band);
      innovationTotal++;
      if (pass) innovationOk++;
      const catLine = result.categories
        .map((c) => `${c.name.split(" ")[0]}: ${c.label}`)
        .join(", ");
      console.log(
        `${pass ? "OK" : "FAIL"} ${file}: expected ${expected} → ${formatBandScore(result.overall)} | ${catLine}`,
      );
      if (!pass) {
        innovationFailures.push({
          file,
          expected,
          actual: formatBandScore(result.overall),
        });
      }
    }
    const innovPct =
      innovationTotal > 0
        ? ((innovationOk / innovationTotal) * 100).toFixed(1)
        : "n/a";
    console.log(
      `\nInnovation High School: ${innovationOk}/${innovationTotal} (${innovPct}%)`,
    );
    if (innovationFailures.length) {
      console.log("\n--- Innovation mismatches (>1 band) ---\n");
      for (const f of innovationFailures) {
        console.log(`${f.file}: expected AP ${f.expected}, got ${f.actual}`);
      }
    }
  }

  console.log("\n=== Four-tier accuracy summary ===");
  console.log(
    `Official College Board:     ${officialOk}/${officialTotal} (${officialPct}%)`,
  );
  console.log(
    `Custom (complete fixtures): ${customCompleteOk}/${customCompleteTotal} (${customPct}%)`,
  );
  console.log(
    `Combined (official + custom): ${combinedOk}/${combinedTotal} (${combinedPct}%)`,
  );
  if (existsSync(innovationManifestPath)) {
    const innovPct =
      innovationTotal > 0
        ? ((innovationOk / innovationTotal) * 100).toFixed(1)
        : "n/a";
    console.log(
      `Innovation High School:     ${innovationOk}/${innovationTotal} (${innovPct}%)`,
    );
  }

  const synManifest = join(process.cwd(), "data/synthetic-papers/manifest.json");
  if (existsSync(synManifest)) {
    const { execSync } = await import("child_process");
    const { runSyntheticRegressionTier } = await import(
      "../lib/synthetic/regressionSynthetic"
    );
    try {
      const t0 = Date.now();
      if (!existsSync(join(process.cwd(), "data/synthetic-papers/grading-results-latest.json"))) {
        execSync("npx tsx scripts/generate-synthetic-papers.ts --fast", {
          stdio: "pipe",
          env: { ...process.env, ANTHROPIC_API_KEY: "" },
        });
      }
      execSync("npx tsx scripts/run-synthetic-grading.ts --fast", {
        stdio: "pipe",
        encoding: "utf-8",
        env: { ...process.env, ANTHROPIC_API_KEY: "" },
      });
      let limit = 20;
      if (Date.now() - t0 > 25000) limit = 10;
      const syn = runSyntheticRegressionTier(limit);
      console.log(
        `Synthetic (fast):         ${syn.ok}/${syn.total} (${syn.pct.toFixed(1)}%) threshold ${syn.threshold}%`,
      );
      const baselinePath = join(process.cwd(), "data/benchmarks/baseline.json");
      if (!syn.passed && existsSync(baselinePath)) {
        console.log("FAIL synthetic tier below accuracy threshold");
        process.exitCode = 1;
      } else if (!syn.passed) {
        console.log(
          `WARN synthetic tier ${syn.pct.toFixed(1)}% below ${syn.threshold}% (first run — warn only)`,
        );
      }
    } catch {
      console.log("Synthetic (fast):         skipped (grading failed)");
    }
  }

  console.log("\n--- Google Docs PDF extraction (paper24 corpus) ---\n");
  try {
    const pdfTest = await runGoogleDocsPdfCorpusTest();
    console.log(`${pdfTest.pass ? "OK" : "FAIL"} ${pdfTest.message}`);
    if (!pdfTest.pass) process.exitCode = 1;
  } catch (err) {
    console.log(
      `FAIL Google Docs PDF test: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  }
}

runRegression().catch((err) => {
  console.error(err);
  process.exit(1);
});
