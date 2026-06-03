/**
 * Batch 4 calibration — data/seminar/batch4-calibration/*.txt
 * Run: npx tsx scripts/seminar-batch4-calibration.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeSeminarPaper } from "@/lib/seminar";

const ROOT = path.join(process.cwd(), "data/seminar/batch4-calibration");
const TARGETS = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "data/seminar/batch4-targets.json"),
    "utf8",
  ),
) as {
  tolerance: number;
  papers: {
    file: string;
    task: "iwa" | "irr";
    label: string;
    totalBand: [number, number];
  }[];
};

function inBand(
  total: number,
  band: [number, number],
  tolerance: number,
): boolean {
  const [lo, hi] = band;
  return total >= lo - tolerance && total <= hi + tolerance;
}

function main(): void {
  let passed = 0;
  let failed = 0;
  let missing = 0;

  console.log("\nBatch 4 calibration\n");

  for (const p of TARGETS.papers) {
    const filePath = path.join(ROOT, p.file);
    if (!fs.existsSync(filePath)) {
      missing++;
      console.error(`SKIP (missing file): ${p.file}`);
      continue;
    }
    const text = fs.readFileSync(filePath, "utf8");
    const result = gradeSeminarPaper(text, p.task);
    const rows = result.rows.map((r) => `${r.score}`).join("+");
    const ok = inBand(result.total, p.totalBand, TARGETS.tolerance);

    if (ok) {
      passed++;
      console.log(
        `PASS ${p.label}: ${result.total} [${rows}] (band ${p.totalBand[0]}-${p.totalBand[1]} ±${TARGETS.tolerance})`,
      );
    } else {
      failed++;
      console.error(
        `FAIL ${p.label}: ${result.total} [${rows}] — expected band ${p.totalBand[0]}-${p.totalBand[1]} ±${TARGETS.tolerance}`,
      );
    }
  }

  console.log(`\nBatch 4: ${passed}/${TARGETS.papers.length - missing} pass`);
  if (missing > 0) {
    console.error(`${missing} paper file(s) missing under ${ROOT}`);
  }
  if (failed > 0 || missing > 0) {
    process.exitCode = 1;
  }
}

main();
