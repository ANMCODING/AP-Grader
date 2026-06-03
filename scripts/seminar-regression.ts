import fs from "node:fs";
import path from "node:path";
import { gradeSeminarPaper } from "@/lib/seminar";
import {
  IWA_REGRESSION_TOLERANCE,
  IRR_REGRESSION_TOLERANCE,
} from "@/lib/seminar/seminarPolicy";
import { SEMINAR_GRADER_VERSION } from "@/lib/seminar/seminarTypes";

const ROOT = path.join(process.cwd(), "data/seminar-samples");
const DRIFT_BASELINE_PATH = path.join(
  process.cwd(),
  "data/seminar/regression-drift-baseline.json",
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"),
) as {
  iwa: { file: string; officialTotal: number; examYear?: number }[];
  irr: { file: string; officialTotal: number }[];
};

function withinTolerance(
  task: "iwa" | "irr",
  official: number,
  engine: number,
): boolean {
  const tol =
    task === "iwa" ? IWA_REGRESSION_TOLERANCE : IRR_REGRESSION_TOLERANCE;
  if (official === 0) return engine <= tol;
  const pct = Math.abs(engine - official) / official;
  return Math.abs(engine - official) <= tol || pct <= 0.1;
}

type Row = {
  name: string;
  task: "iwa" | "irr";
  official: number;
  engine: number;
  diff: number;
  pass: boolean;
  rows: string;
};

function gradeFile(
  task: "iwa" | "irr",
  file: string,
  official: number,
  examYear?: number,
): Row {
  const text = fs.readFileSync(path.join(ROOT, task, file), "utf8");
  const result = gradeSeminarPaper(text, task, {
    examYear,
    isOfficialSample: true,
  });
  const pass = withinTolerance(task, official, result.total);
  const rows = result.rows.map((r) => `${r.score}`).join("+");
  return {
    name: file,
    task,
    official,
    engine: result.total,
    diff: result.total - official,
    pass,
    rows,
  };
}

function checkDrift(deltas: number[], updateDriftBaseline: boolean): void {
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
    console.log("Drift baseline updated.");
  }
}

function main(): void {
  const updateDriftBaseline = process.argv.includes("--update-drift-baseline");
  const results: Row[] = [];
  for (const e of manifest.iwa) {
    results.push(gradeFile("iwa", e.file, e.officialTotal, e.examYear));
  }
  for (const e of manifest.irr) {
    results.push(gradeFile("irr", e.file, e.officialTotal));
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const pct = Math.round((passed / total) * 100);

  console.log("\nAP Seminar regression (official vs engine totals)\n");
  console.log(
    "Sample".padEnd(28) +
      "Task".padEnd(6) +
      "Official".padEnd(10) +
      "Engine".padEnd(10) +
      "Diff".padEnd(8) +
      "Rows".padEnd(24) +
      "Pass",
  );
  console.log("-".repeat(90));
  for (const r of results) {
    console.log(
      r.name.padEnd(28) +
        r.task.padEnd(6) +
        String(r.official).padEnd(10) +
        String(r.engine).padEnd(10) +
        (r.diff >= 0 ? "+" : "") +
        String(r.diff).padEnd(8) +
        r.rows.padEnd(24) +
        (r.pass ? "PASS" : "FAIL"),
    );
  }
  console.log("-".repeat(90));
  console.log(`\nAccuracy: ${passed}/${total} (${pct}%) — target ≥83% (10/12)\n`);

  checkDrift(
    results.map((r) => r.diff),
    updateDriftBaseline,
  );

  if (passed < Math.ceil(total * 0.83)) {
    process.exitCode = 1;
  }
}

main();
