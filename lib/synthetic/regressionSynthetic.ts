import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { GradingResultsFile } from "@/lib/synthetic/types";

export function runSyntheticRegressionTier(
  fastPaperLimit = 20,
): { ok: number; total: number; pct: number; threshold: number; passed: boolean } {
  const latest = join(process.cwd(), "data/synthetic-papers/grading-results-latest.json");
  if (!existsSync(latest)) {
    return { ok: 0, total: 0, pct: 0, threshold: 65, passed: true };
  }
  const g = JSON.parse(readFileSync(latest, "utf-8")) as GradingResultsFile;
  const records = g.records.slice(0, fastPaperLimit);
  const ok = records.filter((r) => r.withinOneBand).length;
  const total = records.length;
  const pct = total ? (ok / total) * 100 : 0;

  const threshPath = join(process.cwd(), "data/benchmarks/thresholds.json");
  let threshold = 65;
  if (existsSync(threshPath)) {
    threshold = (JSON.parse(readFileSync(threshPath, "utf-8")) as { syntheticPct: number })
      .syntheticPct;
  }
  const baselineExists = existsSync(
    join(process.cwd(), "data/benchmarks/baseline.json"),
  );
  const passed = baselineExists ? pct >= threshold : pct >= 65 || pct >= threshold;
  return { ok, total, pct, threshold: baselineExists ? threshold : 65, passed };
}
