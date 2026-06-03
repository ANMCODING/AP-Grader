/**
 * Batch completeness diagnostics for Innovation High School papers.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";

const dir = join(process.cwd(), "data/innovation-high-school");

interface Row {
  file: string;
  original: number;
  afterAll: number;
  body: number;
  ratio: number;
  boundary: string;
  fallback: boolean;
  stated: number | null;
  warn: boolean;
}

const rows: Row[] = [];

for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
  const raw = readFileSync(join(dir, file), "utf-8");
  const { partition } = prepareGradingInput(raw);
  const d = partition.pipelineDiagnostic;
  const ratio = d.bodyToOriginalRatio;
  rows.push({
    file,
    original: d.originalInputWordCount,
    afterAll: d.afterAllCleaningWordCount,
    body: d.bodyWordCount,
    ratio,
    boundary: String(d.detectedBoundaryHeading).slice(0, 60),
    fallback: d.fallbackTriggered,
    stated: d.statedWordCount,
    warn: ratio < 70,
  });
}

console.log("\n| File | Original | After clean | Body | Body/Orig % | Boundary | Fallback | Stated |");
console.log("| --- | ---: | ---: | ---: | ---: | --- | --- | --- |");
for (const r of rows) {
  const flag = r.warn ? " **WARNING**" : "";
  console.log(
    `| ${r.file} | ${r.original} | ${r.afterAll} | ${r.body} | ${r.ratio}${flag} | ${r.boundary} | ${r.fallback} | ${r.stated ?? "—"} |`,
  );
}

const warnings = rows.filter((r) => r.warn);
if (warnings.length) {
  console.log(`\n${warnings.length} paper(s) below 70% body/original.`);
} else {
  console.log("\nAll papers ≥ 70% body/original.");
}
