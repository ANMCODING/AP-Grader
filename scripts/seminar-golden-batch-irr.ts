/**
 * IRR golden batch — per-row expectations within ±1 (seminar-3.2.13).
 * Run: npx tsx scripts/seminar-golden-batch-irr.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIrr } from "@/lib/seminar/irrGrader";

const ROOT = process.cwd();
const GOLDEN = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "data/seminar/golden-batch-irr.json"),
    "utf8",
  ),
) as {
  papers: {
    file: string;
    expectedTotal: number;
    expectedRows: number[];
  }[];
};

const ROW_TOLERANCE = 1;

let pass = 0;
for (const g of GOLDEN.papers) {
  const filePath = path.join(ROOT, g.file);
  const text = fs.readFileSync(filePath, "utf8");
  const r = gradeIrr(text);
  const rows = r.rows.map((x) => x.score);
  const rowOk = rows.every(
    (v, i) => Math.abs(v - (g.expectedRows[i] ?? 0)) <= ROW_TOLERANCE,
  );
  const totalOk = Math.abs(r.total - g.expectedTotal) <= ROW_TOLERANCE;
  const ok = rowOk && totalOk;
  if (ok) pass++;
  else {
    console.log(
      `FAIL ${path.basename(g.file)}: expected ${g.expectedTotal} [${g.expectedRows.join("+")}] ` +
        `got ${r.total} [${rows.join("+")}]`,
    );
  }
}
console.log(`\nGolden IRR batch: ${pass}/${GOLDEN.papers.length}`);
process.exit(pass === GOLDEN.papers.length ? 0 : 1);
