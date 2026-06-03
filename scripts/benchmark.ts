import "@/lib/synthetic/disableClaude";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { runAllTiers } from "@/lib/synthetic/gradeTiers";
import type { BenchmarkFile } from "@/lib/synthetic/types";

const BENCH_DIR = join(process.cwd(), "data/benchmarks");
const THRESHOLDS_PATH = join(BENCH_DIR, "thresholds.json");
const BASELINE_PATH = join(BENCH_DIR, "baseline.json");

function loadThreshold(syntheticPct: number): number {
  if (!existsSync(THRESHOLDS_PATH)) return 65;
  const t = JSON.parse(readFileSync(THRESHOLDS_PATH, "utf-8")) as {
    syntheticPct?: number;
  };
  return t.syntheticPct ?? 65;
}

function updateThreshold(syntheticPct: number): number {
  const floor = existsSync(BASELINE_PATH) ? loadThreshold(syntheticPct) : 65;
  let next = floor;
  if (existsSync(BASELINE_PATH)) {
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as BenchmarkFile;
    const best = baseline.tiers.synthetic.pct;
    next = Math.max(50, best - 5);
  }
  mkdirSync(BENCH_DIR, { recursive: true });
  writeFileSync(
    THRESHOLDS_PATH,
    JSON.stringify({ syntheticPct: next, updatedAt: new Date().toISOString() }, null, 2),
  );
  return next;
}

function main(): void {
  const fast = process.argv.includes("--fast");
  const corpus = join(process.cwd(), "data/synthetic-papers/manifest.json");
  if (!existsSync(corpus)) {
    execSync(`npx tsx scripts/generate-synthetic-papers.ts ${fast ? "--fast" : ""}`, {
      stdio: "inherit",
    });
  }
  execSync(
    `npx tsx scripts/run-synthetic-grading.ts ${fast ? "--fast" : ""}`,
    { stdio: "inherit" },
  );

  const tiers = runAllTiers(fast);
  const thresholdPct = updateThreshold(tiers.synthetic.pct);
  const passed = tiers.synthetic.pct >= thresholdPct;

  const snap: BenchmarkFile = {
    generatedAt: new Date().toISOString(),
    mode: fast ? "fast" : "full",
    tiers,
    thresholdPct,
    passed,
  };

  mkdirSync(BENCH_DIR, { recursive: true });
  const file = join(BENCH_DIR, `benchmark-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(snap, null, 2));
  writeFileSync(join(BENCH_DIR, "latest.json"), JSON.stringify({ path: file, ...snap }, null, 2));
  if (!existsSync(BASELINE_PATH)) {
    writeFileSync(BASELINE_PATH, JSON.stringify(snap, null, 2));
  }

  console.log("\n=== Benchmark ===");
  console.log(`Official: ${tiers.official.ok}/${tiers.official.total} (${tiers.official.pct}%)`);
  console.log(`Custom: ${tiers.custom.ok}/${tiers.custom.total} (${tiers.custom.pct}%)`);
  console.log(`Synthetic: ${tiers.synthetic.ok}/${tiers.synthetic.total} (${tiers.synthetic.pct}%)`);
  if (tiers.innovation) {
    console.log(
      `Innovation: ${tiers.innovation.ok}/${tiers.innovation.total} (${tiers.innovation.pct}%)`,
    );
  }
  console.log(`Threshold: ${thresholdPct}% — ${passed ? "PASS" : "WARN"}`);
  console.log(`Saved: ${file}`);
}

main();
