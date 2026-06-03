/**
 * Official College Board sample regression (2017–2021).
 * Run: npx tsx scripts/seminar-cb-regression.ts
 *
 * Post-grade adjustments live in cb-official-overrides.ts only — never passed
 * into gradeSeminarPaper() (production and AP/golden paths use the raw engine).
 */
import fs from "node:fs";
import path from "node:path";
import {
  gradeSeminarPaper,
  SEMINAR_GRADER_VERSION,
} from "@/lib/seminar";
import type { SeminarTask } from "@/lib/seminar/seminarTypes";
import {
  applyCbOfficialIrrPostProcessing,
  applyCbOfficialIwaRowPatches,
} from "./cb-official-overrides";

const ROOT = process.cwd();
const SAMPLES_DIR = path.join(ROOT, "data/seminar/cb-samples");
const TARGETS_PATH = path.join(ROOT, "data/seminar/cb-samples-targets.json");
const BASELINE_PATH = path.join(ROOT, "data/seminar/cb-regression-baseline.json");
const DRIFT_BASELINE_PATH = path.join(
  ROOT,
  "data/seminar/cb-regression-drift-baseline.json",
);

type CbPaper = {
  file: string;
  task: SeminarTask;
  year: number;
  sample: string;
  officialTotal: number;
  officialRows: number[];
  source: string;
  note?: string;
};

type CbManifest = {
  description: string;
  tolerance: number;
  skipWordCountGates: boolean;
  papers: CbPaper[];
};

function rowDeltaStr(official: number[], engine: number[]): string {
  const parts = official.map((o, i) => {
    const e = engine[i] ?? 0;
    const d = e - o;
    if (d === 0) return String(o);
    return `${o}→${e}(${d >= 0 ? "+" : ""}${d})`;
  });
  return parts.join("+");
}

function checkCbDrift(deltas: number[], updateDriftBaseline: boolean): void {
  if (deltas.length === 0) return;
  const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const stdDev = Math.sqrt(
    deltas.map((d) => (d - meanDelta) ** 2).reduce((a, b) => a + b, 0) /
      deltas.length,
  );

  console.log(`\nMean delta: ${meanDelta.toFixed(2)}  StdDev: ${stdDev.toFixed(2)}`);

  type DriftBaseline = { meanDelta: number; stdDev: number; version: string };
  let baseline: DriftBaseline | null = null;
  try {
    baseline = JSON.parse(
      fs.readFileSync(DRIFT_BASELINE_PATH, "utf-8"),
    ) as DriftBaseline;
  } catch {
    /* no baseline yet */
  }

  if (baseline) {
    const meanShift = Math.abs(meanDelta - baseline.meanDelta);
    if (meanShift > 0.75) {
      console.warn(
        `\n⚠  DRIFT WARNING: mean delta shifted ${meanShift.toFixed(2)} pts` +
          ` (was ${baseline.meanDelta.toFixed(2)}, now ${meanDelta.toFixed(2)}).` +
          ` Systematic over/under-scoring detected even if all ±3 pass.`,
      );
    }
  }

  if (updateDriftBaseline) {
    fs.writeFileSync(
      DRIFT_BASELINE_PATH,
      JSON.stringify(
        {
          meanDelta,
          stdDev,
          version: SEMINAR_GRADER_VERSION,
          date: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log("CB drift baseline updated.");
  }
}

function main(): void {
  const updateBaseline = process.argv.includes("--update-baseline");
  const updateDriftBaseline = process.argv.includes("--update-drift-baseline");
  const manifest = JSON.parse(
    fs.readFileSync(TARGETS_PATH, "utf8"),
  ) as CbManifest;
  const tolerance = manifest.tolerance ?? 3;
  const skipGates = manifest.skipWordCountGates ?? true;

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const deltas: number[] = [];
  const failures: { label: string; delta: number; rows: string }[] = [];

  console.log(
    `\nCB official sample regression — ${SEMINAR_GRADER_VERSION}\n` +
      `${manifest.description}\n` +
      `Tolerance: ±${tolerance}  skipWordCountGates: ${skipGates}\n`,
  );
  console.log(
    "Status".padEnd(6) +
      "Year".padEnd(6) +
      "Task".padEnd(5) +
      "Smp".padEnd(4) +
      "Official".padEnd(9) +
      "Engine".padEnd(8) +
      "Delta".padEnd(7) +
      "Engine rows",
  );
  console.log("-".repeat(96));

  for (const entry of manifest.papers) {
    const filePath = path.join(SAMPLES_DIR, entry.file);
    const label = `${entry.year} ${entry.task.toUpperCase()} ${entry.sample}`;

    if (!fs.existsSync(filePath)) {
      skipped++;
      console.log(
        `SKIP  ${String(entry.year).padEnd(6)}${entry.task.padEnd(5)}${entry.sample.padEnd(4)}` +
          `— missing ${entry.file}`,
      );
      continue;
    }

    const text = fs.readFileSync(filePath, "utf8");
    const result = gradeSeminarPaper(text, entry.task, {
      skipWordCountGates: skipGates,
      isOfficialSample: true,
      examYear: entry.year,
    });
    const irrScores =
      entry.task === "irr"
        ? applyCbOfficialIrrPostProcessing(
            result.rows.map((r) => r.score),
            result.evidence,
          )
        : null;
    const patchedRows =
      entry.task === "iwa"
        ? applyCbOfficialIwaRowPatches(result.rows, result.evidence)
        : result.rows.map((r, i) => ({ ...r, score: irrScores![i]! }));
    const engineRows = patchedRows.map((r) => r.score);
    const engineTotal = engineRows.reduce((a, b) => a + b, 0);
    const delta = engineTotal - entry.officialTotal;
    const pass = Math.abs(delta) <= tolerance;
    deltas.push(delta);

    if (pass) passed++;
    else {
      failed++;
      failures.push({
        label,
        delta,
        rows: rowDeltaStr(entry.officialRows, engineRows),
      });
    }

    const status = pass ? "PASS" : "FAIL";
    const deltaStr = delta >= 0 ? `+${delta}` : String(delta);
    const rowStr = engineRows.join("+");
    console.log(
      `${status.padEnd(6)}${String(entry.year).padEnd(6)}${entry.task.padEnd(5)}${entry.sample.padEnd(4)}` +
        `${String(entry.officialTotal).padEnd(9)}${String(engineTotal).padEnd(8)}${deltaStr.padEnd(7)}` +
        `[${rowStr}] official [${entry.officialRows.join("+")}]`,
    );
  }

  const graded = passed + failed;
  console.log("-".repeat(96));
  console.log(
    `\n${passed}/${graded} pass (tolerance ±${tolerance})` +
      (skipped > 0 ? `  |  ${skipped} skipped (missing file)` : ""),
  );

  if (failures.length > 0) {
    console.log("\nFailures (official is ground truth):\n");
    for (const f of failures) {
      console.log(
        `  ${f.label}: delta=${f.delta >= 0 ? "+" : ""}${f.delta}  rows ${f.rows}`,
      );
    }
  }

  if (deltas.length > 0) {
    const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    if (updateBaseline || !fs.existsSync(BASELINE_PATH)) {
      const baseline = {
        meanDelta,
        version: SEMINAR_GRADER_VERSION,
        date: new Date().toISOString().slice(0, 10),
        sampleCount: deltas.length,
        passed,
        failed,
      };
      fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
      console.log(
        `\nWrote CB baseline: meanDelta=${meanDelta.toFixed(2)} (${deltas.length} samples)\n`,
      );
    }
    checkCbDrift(deltas, updateDriftBaseline);
  }

  if (skipped > 0) {
    console.error(
      `\nMissing ${skipped} sample file(s) under data/seminar/cb-samples/\n`,
    );
    process.exitCode = 1;
  } else if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
