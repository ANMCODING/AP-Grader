/**
 * Batch 2 calibration check — data/seminar/batch2-calibration/*.txt
 * Run: npx tsx scripts/seminar-batch2-calibration.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeSeminarPaper } from "@/lib/seminar";

const ROOT = path.join(process.cwd(), "data/seminar/batch2-calibration");
const TARGETS = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "data/seminar/batch2-targets.json"),
    "utf8",
  ),
) as {
  tolerance: number;
  papers: {
    file: string;
    task: "iwa" | "irr";
    label: string;
    totalBand: [number, number];
    rowGuidance?: Record<string, [number, number]>;
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
  let failed = 0;
  let missing = 0;

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
      console.log(
        `PASS ${p.label}: ${result.total} [${rows}] (band ${p.totalBand[0]}-${p.totalBand[1]})`,
      );
    } else {
      failed++;
      console.error(
        `FAIL ${p.label}: ${result.total} [${rows}] — expected band ${p.totalBand[0]}-${p.totalBand[1]} ±${TARGETS.tolerance}`,
      );
    }

    if (p.rowGuidance) {
      for (const [rowId, band] of Object.entries(p.rowGuidance)) {
        const row = result.rows.find((r) => r.id === rowId);
        const score = row?.score ?? -1;
        const rowOk =
          score >= band[0] - TARGETS.tolerance &&
          score <= band[1] + TARGETS.tolerance;
        const tag = rowOk ? "row-ok" : "row-soft-miss";
        console.log(`  ${tag} ${rowId}: ${score} (guidance ${band[0]}-${band[1]})`);
      }
    }
  }

  if (missing > 0) {
    console.error(`\n${missing} paper file(s) missing under ${ROOT}`);
  }
  if (failed > 0) {
    console.error(`\n${failed} paper(s) outside total band`);
    process.exit(1);
  }
  console.log(`\nAll present Batch 2 papers within total band (±${TARGETS.tolerance}).`);
}

main();
