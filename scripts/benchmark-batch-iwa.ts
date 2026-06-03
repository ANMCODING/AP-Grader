/**
 * Batch IWA timing (Fix 7.3).
 * Run: npx tsx scripts/benchmark-batch-iwa.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

const BATCH = path.join(process.cwd(), "data/batch-iwa-papers");
const files = fs.readdirSync(BATCH).filter((f) => f.endsWith(".txt")).sort();

const times: { file: string; ms: number }[] = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(BATCH, file), "utf8");
  const t0 = performance.now();
  gradeIwa(text);
  const ms = performance.now() - t0;
  times.push({ file, ms });
  console.log(`${file}: ${(ms / 1000).toFixed(2)}s`);
}

const total = times.reduce((a, t) => a + t.ms, 0);
const mean = total / times.length;
const p05 = times.find((t) => t.file.includes("p05"));
const p11 = times.find((t) => t.file.includes("p11"));
console.log(`\nTotal: ${(total / 1000).toFixed(1)}s  Mean: ${(mean / 1000).toFixed(2)}s`);
if (p05) console.log(`p05: ${(p05.ms / 1000).toFixed(2)}s (target <5s)`);
if (p11) console.log(`p11: ${(p11.ms / 1000).toFixed(2)}s (target <8s)`);
