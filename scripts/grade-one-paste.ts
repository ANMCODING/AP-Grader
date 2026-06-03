import fs from "node:fs";
import { gradeSeminarPaper, SEMINAR_GRADER_VERSION } from "@/lib/seminar";

const [filePath, task, target, label] = process.argv.slice(2);
if (!filePath || !task) {
  console.error(
    "Usage: npx tsx scripts/grade-one-paste.ts <file> <iwa|irr> <target-band> [label]",
  );
  process.exit(1);
}
const text = fs.readFileSync(filePath, "utf8");
const r = gradeSeminarPaper(text, task as "iwa" | "irr");
const rows = r.rows.map((x) => x.score);
const max = task === "iwa" ? 48 : 30;
let inBand = false;
const m = target?.match(/(\d+)\s*-\s*(\d+)/);
if (m) inBand = r.total >= Number(m[1]) && r.total <= Number(m[2]);

console.log(
  JSON.stringify(
    {
      version: SEMINAR_GRADER_VERSION,
      label: label ?? filePath,
      target,
      total: r.total,
      max,
      rows: rows.join("+"),
      inTargetBand: inBand,
      rowDetail: r.rows.map((x) => ({
        id: x.id,
        score: x.score,
        max: x.maxScore,
        name: x.name,
      })),
      wordCountWarning: r.wordCountWarning ?? null,
      wordCountGate: r.wordCountGate
        ? {
            band: r.wordCountGate.band,
            organic: r.wordCountGate.organicScores,
            deduction: r.wordCountGate.totalWordCountDeduction,
          }
        : null,
    },
    null,
    2,
  ),
);
