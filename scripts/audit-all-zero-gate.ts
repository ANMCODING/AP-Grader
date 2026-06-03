/**
 * FIX 4.3 — report where isAllZeroSubmission fires.
 * Run: npx tsx scripts/audit-all-zero-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { iwaOrganicScores, isAllZeroSubmission } from "@/lib/seminar/iwaRows";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import type { IwaGradeOptions } from "@/lib/seminar/seminarTypes";

const samples = fs
  .readdirSync("data/seminar-samples/iwa")
  .filter((f) => f.endsWith(".txt"));
const batch = fs
  .readdirSync("data/batch-iwa-papers")
  .filter((f) => f.endsWith(".txt"));

function check(file: string, dir: string, opts?: IwaGradeOptions) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const e = buildSeminarEvidence(text, { task: "iwa", ...opts });
  const sig = iwaOrganicScores(e);
  const gate = isAllZeroSubmission(e, sig);
  const r = gradeIwa(text, opts);
  return { file, total: r.total, gate, exploratory: e.exploratoryMode };
}

console.log("=== Regression IWA ===\n");
for (const f of samples) {
  const year = f.startsWith("ap23") ? 2023 : f.startsWith("ap24") ? 2024 : 2025;
  const row = check(f, "data/seminar-samples/iwa", {
    examYear: year,
    isOfficialSample: true,
  });
  if (row.gate.fires) {
    console.log(`GATE ${row.file} total=${row.total} reason=${row.gate.reason}`);
  }
}

console.log("\n=== Golden batch ===\n");
for (const f of batch) {
  const row = check(f, "data/batch-iwa-papers");
  if (row.gate.fires) {
    console.log(`GATE ${row.file} total=${row.total} reason=${row.gate.reason}`);
  }
}

console.log("\nDone (only firing gates printed).");
