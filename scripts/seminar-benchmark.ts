/**
 * Times IWA grading on golden-batch papers (evidence build vs full grade).
 * Usage: npx tsx scripts/seminar-benchmark.ts
 */
import { readFileSync } from "fs";
import { performance } from "perf_hooks";
import { join } from "path";

const BATCH_DIR = join(process.cwd(), "data/batch-iwa-papers");
const SAMPLES = [
  "p04-genetic-testing.txt",
  "p11-memory-fallibility-adesanya.txt",
];

async function main() {
  const { buildSeminarEvidence } = await import("../lib/seminar/seminarEvidence");
  const { gradeIwa } = await import("../lib/seminar/iwaGrader");

  for (const file of SAMPLES) {
    const text = readFileSync(join(BATCH_DIR, file), "utf8");
    gradeIwa(text);
    const n = 2;
    let gradeMs = 0;
    let evidenceMs = 0;
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      gradeIwa(text);
      gradeMs += performance.now() - t0;
      const t1 = performance.now();
      buildSeminarEvidence(text);
      evidenceMs += performance.now() - t1;
    }
    console.log(
      `${file}: grade ${Math.round(gradeMs / n)}ms, evidence ${Math.round(evidenceMs / n)}ms`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
