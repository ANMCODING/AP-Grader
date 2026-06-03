import "@/lib/synthetic/disableClaude";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { verifyPaper } from "@/lib/synthetic/verify";
import type { SyntheticManifest, GradingResultsFile } from "@/lib/synthetic/types";

process.env.ANTHROPIC_API_KEY = "";

const CORPUS = join(process.cwd(), "data/synthetic-papers");
const fast = process.argv.includes("--fast");
const perLevel = fast ? 4 : 20;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function main(): void {
  const needGen =
    !existsSync(join(CORPUS, "manifest.json")) ||
    (fast &&
      !existsSync(join(CORPUS, "score1-paper-001.txt"))) ||
    (!fast && !existsSync(join(CORPUS, "score5-paper-020.txt")));
  if (needGen) {
    execSync(`npx tsx scripts/generate-synthetic-papers.ts ${fast ? "--fast" : ""}`, {
      stdio: "inherit",
    });
  }

  const manifest = JSON.parse(
    readFileSync(join(CORPUS, "manifest.json"), "utf-8"),
  ) as SyntheticManifest;
  const papers = fast
    ? manifest.papers.filter((p) => {
        const m = p.file.match(/paper-(\d+)/);
        return m && Number(m[1]) <= 4;
      })
    : manifest.papers;
  for (let s = 1; s <= 5; s++) {
    const count = papers.filter((p) => p.expectedAP === s).length;
    assert(count === perLevel, `score ${s} expected ${perLevel} files got ${count}`);
  }

  for (const p of papers) {
    const text = readFileSync(join(CORPUS, p.file), "utf-8");
    const v = verifyPaper(text, p.expectedAP);
    assert(v.bodyWordCount >= 500, `${p.file} below 500 words`);
    assert(v.bodyToOriginalRatio >= 80, `${p.file} ratio ${v.bodyToOriginalRatio}%`);
    if (p.expectedAP >= 3) {
      for (const [k, w] of Object.entries(v.regions)) {
        if (["introduction", "literatureReview", "method", "results", "conclusion"].includes(k)) {
          assert(w >= 50, `${p.file} ${k}=${w}`);
        }
      }
    }
  }

  execSync(`npx tsx scripts/run-synthetic-grading.ts ${fast ? "--fast" : ""}`, {
    stdio: "inherit",
  });
  const grades = JSON.parse(
    readFileSync(join(CORPUS, "grading-results-latest.json"), "utf-8"),
  ) as GradingResultsFile;
  assert(grades.records.length > 0, "no grade records");
  assert(grades.claudeDisabled === true, "claude flag");
  assert(process.env.ANTHROPIC_API_KEY === "", "API key must be empty");

  execSync("npx tsx scripts/measure-accuracy.ts", { stdio: "pipe" });
  assert(existsSync(join(CORPUS, "accuracy-metrics-latest.json")), "metrics json");

  const benchOut = execSync("npx tsx scripts/benchmark.ts --fast", {
    encoding: "utf-8",
  });
  assert(/benchmark-\d+\.json/.test(benchOut) || existsSync(join(process.cwd(), "data/benchmarks/latest.json")), "benchmark saved");

  console.log("PASS: synthetic system self-test");
}

main();
