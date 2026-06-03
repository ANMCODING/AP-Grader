/**
 * Boundary verification using rawDocumentWordCount (papers 26–32).
 * Run: npx tsx scripts/verify-boundary-raw.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { countWords } from "../lib/grader/text";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

const papers: { n: number; minBodyVsRaw: number; minBodyVsStated?: number }[] = [
  { n: 26, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
  { n: 27, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
  { n: 28, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
  { n: 29, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
  { n: 30, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
  { n: 31, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
  { n: 32, minBodyVsRaw: 0.8, minBodyVsStated: 0.7 },
];

function main() {
  const root = process.cwd();

  for (const { n, minBodyVsRaw, minBodyVsStated } of papers) {
    const path = join(root, `data/test-papers/paper${n}-boundary.txt`);
    if (!existsSync(path)) {
      console.log(`SKIP paper ${n}: missing ${path}`);
      continue;
    }
    const raw = readFileSync(path, "utf-8");
    const rawWords = countWords(raw);
    const { partition: z } = prepareGradingInput(raw);
    const bodyToRaw = z.bodyWordCount / Math.max(z.rawDocumentWordCount, 1);
    const bodyToStated =
      z.statedWordCount && z.statedWordCount > 0
        ? z.bodyWordCount / z.statedWordCount
        : null;

    console.log(
      `\nPaper ${n}: body=${z.bodyWordCount} raw=${z.rawDocumentWordCount} cleanedFull=${z.fullDocumentWordCount} stated=${z.statedWordCount}`,
    );
    console.log(
      `  body/raw=${bodyToRaw.toFixed(3)} body/stated=${bodyToStated?.toFixed(3) ?? "n/a"}`,
    );
    if (z.boundaryDetectionWarning) {
      console.log(`  warn: ${z.boundaryDetectionWarning.slice(0, 200)}...`);
    }

    assert(
      z.rawDocumentWordCount === rawWords,
      `paper ${n}: rawDocumentWordCount matches pre-clean count`,
    );
    assert(
      bodyToRaw >= minBodyVsRaw,
      `paper ${n}: body/raw ${bodyToRaw.toFixed(3)} expected >= ${minBodyVsRaw}`,
    );

    if (
      minBodyVsStated &&
      z.statedWordCount &&
      z.statedWordCount <= z.rawDocumentWordCount * 1.15 &&
      bodyToStated !== null
    ) {
      assert(
        bodyToStated >= minBodyVsStated,
        `paper ${n}: body/stated ${bodyToStated.toFixed(3)} expected >= ${minBodyVsStated}`,
      );
    } else if (z.statedWordCount && z.statedWordCount > z.rawDocumentWordCount * 1.15) {
      console.log(
        `  (stated ${z.statedWordCount} >> raw ${z.rawDocumentWordCount}; skip body/stated check)`,
      );
    }
  }

  console.log("\nDone exit", process.exitCode ?? 0);
}

main();
