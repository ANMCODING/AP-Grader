/**
 * One-time helper: extract IWA/IRR student samples from College Board corpus text dumps.
 * Source: Desktop/Research/data/corpus/samples 2/ap{24,25}-apc-seminar-pt{1,2}.txt
 */
import fs from "node:fs";
import path from "node:path";

const CORPUS = path.resolve(
  process.env.HOME ?? "",
  "Desktop/Research/data/corpus/samples 2",
);
const OUT = path.resolve(process.cwd(), "data/seminar-samples");

type Task = "iwa" | "irr";
type SampleId = "a" | "b" | "c";

const SOURCES: { year: string; task: Task; file: string }[] = [
  { year: "25", task: "irr", file: "ap25-apc-seminar-pt1.txt" },
  { year: "25", task: "iwa", file: "ap25-apc-seminar-pt2.txt" },
  { year: "24", task: "irr", file: "ap24-apc-seminar-pt1.txt" },
  { year: "24", task: "iwa", file: "ap24-apc-seminar-pt2.txt" },
  { year: "23", task: "irr", file: "ap23-apc-seminar-pt1.txt" },
  { year: "23", task: "iwa", file: "ap23-apc-seminar-pt2.txt" },
];

function cleanExtracted(text: string): string {
  return text
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findSampleStarts(
  text: string,
  task: Task,
): { id: SampleId; index: number }[] {
  const patterns: { id: SampleId; re: RegExp }[] =
    task === "iwa"
      ? [
          { id: "a", re: /(?:IWA Sample A|PT2-IWA A)\s+1 of \d+/i },
          { id: "b", re: /(?:IWA Sample B|PT2-IWA B)\s+1 of \d+/i },
          { id: "c", re: /(?:IWA Sample C|PT2-IWA C)\s+1 of \d+/i },
        ]
      : [
          { id: "a", re: /(?:IRR Sample A|PT1-IRR A)\s+1 of \d+/i },
          { id: "b", re: /(?:IRR Sample B|PT1-IRR B)\s+1 of \d+/i },
          { id: "c", re: /(?:IRR Sample C|PT1-IRR C)\s+1 of \d+/i },
        ];

  const hits: { id: SampleId; index: number }[] = [];
  for (const { id, re } of patterns) {
    const m = text.match(re);
    if (m?.index != null) hits.push({ id, index: m.index });
  }
  return hits.sort((a, b) => a.index - b.index);
}

function endBeforeCommentary(text: string, from: number): number {
  const markers = [
    /AP SEMINAR \d{4} • SCORING COMMENTARY/i,
    /AP® Seminar \d{4} Scoring Commentary/i,
    /© \d{4} College Board\.\s*Visit College Board/i,
  ];
  let end = text.length;
  for (const pat of markers) {
    const m = text.slice(from + 200).match(pat);
    if (m?.index != null) end = Math.min(end, from + 200 + m.index);
  }
  return end;
}

function extractSample(
  text: string,
  start: number,
  end: number,
): string {
  let chunk = text.slice(start, end);
  // Drop page headers like "IWA Sample A 3 of 12"
  chunk = chunk.replace(
    /^(?:IWA|IRR) Sample [ABC] \d+ of \d+\s*$/gim,
    "",
  );
  chunk = chunk.replace(/^PT[12]-(?:IWA|IRR) [ABC]\s+\d+ of \d+\s*$/gim, "");
  chunk = chunk.replace(/^\d+\s*$/gm, "");
  return cleanExtracted(chunk);
}

function main(): void {
  for (const sub of ["iwa", "irr"]) {
    fs.mkdirSync(path.join(OUT, sub), { recursive: true });
  }

  for (const { year, task, file } of SOURCES) {
    const srcPath = path.join(CORPUS, file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Missing corpus file: ${srcPath}`);
      continue;
    }
    const text = fs.readFileSync(srcPath, "utf8");
    const starts = findSampleStarts(text, task);
    if (starts.length < 3) {
      console.warn(`${file}: only found ${starts.length} samples`);
    }
    for (let i = 0; i < starts.length; i++) {
      const { id, index } = starts[i]!;
      const next = starts[i + 1]?.index ?? text.length;
      const end = Math.min(
        endBeforeCommentary(text, index),
        next,
      );
      const body = extractSample(text, index, end);
      const outName = `ap${year}-${task}-sample-${id}.txt`;
      const outPath = path.join(OUT, task, outName);
      fs.writeFileSync(outPath, body, "utf8");
      console.log(`Wrote ${outPath} (${body.split(/\s+/).length} words)`);
    }
  }
}

main();
