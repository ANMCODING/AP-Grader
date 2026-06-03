import "@/lib/synthetic/disableClaude";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { buildPaper } from "@/lib/synthetic/generator";
import {
  adjustStatedWordCount,
  simplifyReferencesFormat,
  verifyPaper,
} from "@/lib/synthetic/verify";
import type { SyntheticManifest } from "@/lib/synthetic/types";

const OUT_DIR = join(process.cwd(), "data/synthetic-papers");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");
const MAX_ATTEMPTS = 3;

function parseArgs(): { fast: boolean; force: boolean } {
  const args = process.argv.slice(2);
  return {
    fast: args.includes("--fast"),
    force: args.includes("--force"),
  };
}

function main(): void {
  const { fast, force } = parseArgs();
  const perLevel = fast ? 4 : 20;

  if (force && existsSync(OUT_DIR)) {
    for (const score of [1, 2, 3, 4, 5]) {
      for (let p = 1; p <= 20; p++) {
        const f = join(OUT_DIR, `score${score}-paper-${String(p).padStart(3, "0")}.txt`);
        if (existsSync(f)) rmSync(f);
      }
    }
  }

  if (!force && existsSync(MANIFEST_PATH)) {
    console.log("Corpus exists. Use --force to regenerate.");
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const papers: SyntheticManifest["papers"] = [];
  let skipped = 0;
  let regenerationAttempts = 0;
  const byLevel: Record<number, { ok: number; skip: number }> = {
    1: { ok: 0, skip: 0 },
    2: { ok: 0, skip: 0 },
    3: { ok: 0, skip: 0 },
    4: { ok: 0, skip: 0 },
    5: { ok: 0, skip: 0 },
  };

  for (let score = 1; score <= 5; score++) {
    for (let p = 1; p <= perLevel; p++) {
      let saved = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        regenerationAttempts++;
        let { text, manifest } = buildPaper(score, p);
        if (attempt === 1) text = simplifyReferencesFormat(text);
        if (attempt === 2) text = adjustStatedWordCount(text, 85);
        const check = verifyPaper(text, score);
        if (check.ok) {
          writeFileSync(join(OUT_DIR, manifest.file), text, "utf-8");
          papers.push(manifest);
          byLevel[score].ok++;
          saved = true;
          break;
        }
      }
      if (!saved) {
        skipped++;
        byLevel[score].skip++;
        console.warn(`SKIP score${score} paper ${p} after ${MAX_ATTEMPTS} attempts`);
      }
    }
  }

  const manifest: SyntheticManifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    fastMode: fast,
    papersPerLevel: perLevel,
    skipped,
    regenerationAttempts,
    papers,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log("\n=== Generation summary ===");
  for (let s = 1; s <= 5; s++) {
    console.log(`Score ${s}: ${byLevel[s].ok} generated, ${byLevel[s].skip} skipped`);
  }
  console.log(`Total: ${papers.length} papers, ${skipped} skipped, ${regenerationAttempts} attempts`);
}

main();
