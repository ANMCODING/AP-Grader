import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { AccuracyMetrics } from "@/lib/synthetic/types";

const METRICS = join(process.cwd(), "data/synthetic-papers/accuracy-metrics-latest.json");
const ERR_REPORT_DIR = join(process.cwd(), "data/error-patterns");

function topErrorFromExtraction(): string | null {
  if (!existsSync(ERR_REPORT_DIR)) return null;
  const files = readdirSync(ERR_REPORT_DIR)
    .filter((f) => f.startsWith("error-report-") && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  const report = JSON.parse(
    readFileSync(join(ERR_REPORT_DIR, files[files.length - 1]), "utf-8"),
  ) as { ranked?: { category: string }[] };
  return report.ranked?.[0]?.category ?? null;
}

function main(): void {
  if (!existsSync(METRICS)) {
    console.error("Run: npm run measure-accuracy (via accuracy:report)");
    process.exit(1);
  }
  const m = JSON.parse(readFileSync(METRICS, "utf-8")) as AccuracyMetrics;
  const totalTarget = m.mode === "full" ? 100 : 20;
  const topErr = m.topErrorCategory ?? topErrorFromExtraction();

  console.log("SYNTHETIC PAPER ACCURACY REPORT");
  console.log(`Generated: ${m.generatedAt}`);
  console.log(`Papers graded: ${m.overallTotal} of ${totalTarget} (${m.mode} mode)`);
  console.log("Claude disabled: YES");
  console.log(
    `OVERALL ACCURACY: ${m.overallAccuracy.toFixed(1)}% (${m.overallCorrect}/${m.overallTotal} within one band)`,
  );
  console.log(
    `Official CB samples (current run): ${m.officialTierPct != null ? `${m.officialTierPct.toFixed(1)}%` : "n/a (run benchmark)"}`,
  );
  console.log(
    `Custom fixtures: ${m.customTierPct != null ? `${m.customTierPct.toFixed(1)}%` : "n/a (run benchmark)"}`,
  );
  console.log("BY SCORE LEVEL:");
  for (let s = 1; s <= 5; s++) {
    const row = m.byScoreLevel[s];
    if (!row) continue;
    const denom = m.mode === "full" ? 20 : 4;
    console.log(
      `Score ${s}: ${row.accuracyPct.toFixed(0)}% (${row.correct}/${row.total} of ~${denom}) — direction: ${row.direction} by avg ${Math.abs(row.avgDistance).toFixed(1)} bands`,
    );
  }
  console.log("CAP ACCURACY (expected cap vs fired):");
  for (const [cap, row] of Object.entries(m.capAccuracy)) {
    console.log(`${cap}: expected ${row.expected} papers, fired on ${row.fired} (${row.pct.toFixed(0)}%)`);
  }
  console.log("COMPLETENESS:");
  console.log(`Papers above 80% body/original: ${m.completeness.above80}/${m.overallTotal}`);
  console.log(`Papers below 80%: ${m.completeness.below80}/${m.overallTotal}`);
  console.log(`Average body/original: ${m.completeness.avgRatio.toFixed(1)}%`);
  console.log(
    `FALSE POSITIVES (engine scored 2+ bands too high): ${m.falsePositives.count} papers (${m.falsePositives.pct.toFixed(1)}%)`,
  );
  console.log(
    `FALSE NEGATIVES (engine scored 2+ bands too low): ${m.falseNegatives.count} papers (${m.falseNegatives.pct.toFixed(1)}%)`,
  );
  console.log(`NEXT FIX PRIORITY: ${topErr ?? "run errors:extract"}`);

  let lowest = 1;
  let lowestPct = 100;
  for (const [s, row] of Object.entries(m.byScoreLevel)) {
    if (row.accuracyPct < lowestPct) {
      lowestPct = row.accuracyPct;
      lowest = Number(s);
    }
  }
  console.log(`\nLowest accuracy score level: ${lowest} (${lowestPct.toFixed(0)}%)`);
}

main();
