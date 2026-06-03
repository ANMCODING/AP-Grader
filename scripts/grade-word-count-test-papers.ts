/**
 * Grade six word-count test papers and report band, caps, deductions.
 * Run: npx tsx scripts/grade-word-count-test-papers.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIwa, gradeIrr } from "@/lib/seminar";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";

const DIR = path.join(process.cwd(), "data/seminar/word-count-test-papers");

const EXPECTED: Record<
  string,
  { task: "iwa" | "irr"; band: string; totalMin: number; totalMax: number }
> = {
  "iwa_high_scoring.txt": { task: "iwa", band: "full", totalMin: 44, totalMax: 48 },
  "iwa_mid_scoring.txt": { task: "iwa", band: "moderate", totalMin: 22, totalMax: 35 },
  "iwa_low_scoring.txt": { task: "iwa", band: "significant", totalMin: 0, totalMax: 8 },
  "irr_high_scoring.txt": { task: "irr", band: "full", totalMin: 27, totalMax: 30 },
  "irr_mid_scoring.txt": { task: "irr", band: "moderate", totalMin: 15, totalMax: 19 },
  "irr_low_scoring.txt": { task: "irr", band: "significant", totalMin: 4, totalMax: 8 },
};

function main(): void {
  let bandPass = 0;
  let totalPass = 0;
  for (const [file, spec] of Object.entries(EXPECTED)) {
    const text = fs.readFileSync(path.join(DIR, file), "utf8");
    const body = prepareSeminarSubmissionMetrics(text).bodyWordCount;
    const result =
      spec.task === "iwa" ? gradeIwa(text) : gradeIrr(text);
    const gate = result.wordCountGate;
    const band = gate?.band ?? "none";
    const totalOk =
      result.total >= spec.totalMin && result.total <= spec.totalMax;
    const bandOk = band === spec.band;
    if (bandOk) bandPass++;
    if (totalOk) totalPass++;

    console.log(`\n=== ${file} ===`);
    console.log(`Body: ${body} | Band: ${band} | Total: ${result.total}`);
    console.log(
      `Expected band ${spec.band}, total ${spec.totalMin}-${spec.totalMax} — ${bandOk && totalOk ? "PASS" : "CHECK"}`,
    );
  }
  const n = Object.keys(EXPECTED).length;
  console.log(`\nBands: ${bandPass}/${n} | Totals: ${totalPass}/${n}`);
  process.exit(bandPass === n && totalPass === n ? 0 : 1);
}

main();
