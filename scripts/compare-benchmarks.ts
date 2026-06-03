import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { BenchmarkFile } from "@/lib/synthetic/types";

const BENCH_DIR = join(process.cwd(), "data/benchmarks");

function load(path: string): BenchmarkFile {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as BenchmarkFile & { path?: string };
  return raw.tiers ? raw : (JSON.parse(readFileSync(raw.path ?? path, "utf-8")) as BenchmarkFile);
}

function main(): void {
  const explicit = process.argv.slice(2).filter((a) => a.endsWith(".json"));
  let pathA: string;
  let pathB: string;
  if (explicit.length >= 2) {
    [pathA, pathB] = explicit;
  } else {
    const files = readdirSync(BENCH_DIR)
      .filter((f) => f.startsWith("benchmark-") && f.endsWith(".json"))
      .sort();
    if (files.length < 2) {
      console.error("Need two benchmark-*.json files");
      process.exit(1);
    }
    pathB = join(BENCH_DIR, files[files.length - 1]);
    pathA = join(BENCH_DIR, files[files.length - 2]);
  }

  const older = load(pathA);
  const newer = load(pathB);
  console.log(`Compare:\n  ${pathA}\n  ${pathB}\n`);

  for (const tier of ["official", "custom", "synthetic", "innovation"] as const) {
    const o = older.tiers[tier];
    const n = newer.tiers[tier];
    if (!o || !n) continue;
    const delta = Math.round((n.pct - o.pct) * 10) / 10;
    console.log(
      `${tier}: ${o.pct}% → ${n.pct}% (${delta >= 0 ? "+" : ""}${delta}) ${delta >= 0 ? "improved" : "regressed"}`,
    );
  }

  const regressions: string[] = [];
  for (const tier of ["official", "custom", "synthetic", "innovation"] as const) {
    const o = older.tiers[tier]?.failures ?? [];
    const n = newer.tiers[tier]?.failures ?? [];
    const nFail = new Set(n.map((f) => f.file));
    const oOk = new Set(
      (older.tiers[tier]
        ? Array.from({ length: older.tiers[tier]!.total }, (_, i) => i)
        : []
      ).map(String),
    );
    for (const f of o) {
      if (nFail.has(f.file)) regressions.push(`${tier}: ${f.file} (was wrong, still wrong)`);
    }
    const prevOk = (older.tiers[tier]?.ok ?? 0);
    const newOk = (newer.tiers[tier]?.ok ?? 0);
    if (newOk < prevOk) {
      console.log(`\n*** REGRESSION on ${tier}: ${prevOk} → ${newOk} correct ***`);
    }
  }

  const changed: string[] = [];
  for (const tier of ["official", "custom", "synthetic", "innovation"] as const) {
    const oMap = new Map((older.tiers[tier]?.failures ?? []).map((f) => [f.file, f.actual]));
    const nMap = new Map((newer.tiers[tier]?.failures ?? []).map((f) => [f.file, f.actual]));
    const all = new Set([...oMap.keys(), ...nMap.keys()]);
    for (const file of all) {
      if (oMap.get(file) !== nMap.get(file)) {
        changed.push(`${tier}/${file}: ${oMap.get(file) ?? "OK"} → ${nMap.get(file) ?? "OK"}`);
      }
    }
  }
  if (changed.length) {
    console.log("\nPapers with changed scores (failures list):");
    for (const c of changed.slice(0, 20)) console.log(`  ${c}`);
  } else {
    console.log("\nNo failure-list changes (identical benchmarks expected zero).");
  }

  if (regressions.length) {
    console.log("\n*** REGRESSION DETECTION ***");
    for (const r of regressions) console.log(`  ${r}`);
  }
}

main();
