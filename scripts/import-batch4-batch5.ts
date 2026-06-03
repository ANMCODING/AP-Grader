/**
 * Split batch4_grade_these.txt / batch5_grade_these.txt into calibration layout.
 * Run: npx tsx scripts/import-batch4-batch5.ts
 */
import fs from "node:fs";
import path from "node:path";

const HEADER_RE =
  /^\[(IWA|IRR)-(\d+)\] \[(IWA|IRR)\] \[TARGET: (\d+)-(\d+)\] \[(\d+) WORDS\] \[(.+)\]$/gm;

type PaperMeta = {
  batch: 4 | 5;
  task: "iwa" | "irr";
  label: string;
  totalBand: [number, number];
  claimedWords: number;
  topic: string;
  file: string;
  text: string;
};

function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

/** Strip leading/trailing separator lines and the metadata header line. */
function extractPaperBody(block: string): string {
  const lines = block.split("\n");
  let i = 0;
  while (i < lines.length && /^=+$/.test(lines[i]!.trim())) i++;
  if (i < lines.length && HEADER_RE.test(lines[i]!)) i++;
  while (i < lines.length && /^=+$/.test(lines[i]!.trim())) i++;
  return lines.slice(i).join("\n").trim();
}

function parseBatchFile(batch: 4 | 5, raw: string): PaperMeta[] {
  const papers: PaperMeta[] = [];
  const matches = [...raw.matchAll(HEADER_RE)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const start = m.index ?? 0;
    const end =
      i + 1 < matches.length
        ? (matches[i + 1]!.index ?? raw.length)
        : raw.length;
    const block = raw.slice(start, end);
    const text = extractPaperBody(block);
    if (text.length < 500) {
      console.warn(
        `Batch ${batch} paper ${m[1]}-${m[2]}: short body (${text.length} chars)`,
      );
    }

    const task = m[3]!.toLowerCase() as "iwa" | "irr";
    const num = m[2]!;
    const topic = m[7]!.trim();
    const file = `${task}_${num}_${slugify(topic)}.txt`;

    papers.push({
      batch,
      task,
      label: `${m[1]}-${num} ${task.toUpperCase()} ${topic}`,
      totalBand: [Number(m[4]), Number(m[5])],
      claimedWords: Number(m[6]),
      topic,
      file,
      text,
    });
  }

  return papers;
}

function writeBatch(batch: 4 | 5, papers: PaperMeta[]): void {
  const calDir = path.join(
    process.cwd(),
    `data/seminar/batch${batch}-calibration`,
  );
  fs.rmSync(calDir, { recursive: true, force: true });
  fs.mkdirSync(calDir, { recursive: true });

  const targetPapers = papers.map((p) => ({
    file: p.file,
    task: p.task,
    label: p.label,
    totalBand: p.totalBand,
    claimedWords: p.claimedWords,
    topic: p.topic,
  }));

  for (const p of papers) {
    fs.writeFileSync(path.join(calDir, p.file), p.text);
  }

  fs.writeFileSync(
    path.join(process.cwd(), `data/seminar/batch${batch}-targets.json`),
    JSON.stringify({ tolerance: 3, papers: targetPapers }, null, 2) + "\n",
  );

  console.log(`Batch ${batch}: ${papers.length} papers → ${calDir}`);
}

function main(): void {
  const b4 = parseBatchFile(
    4,
    fs.readFileSync(
      path.join(process.cwd(), "data/seminar/batch4_grade_these.txt"),
      "utf8",
    ),
  );
  const b5 = parseBatchFile(
    5,
    fs.readFileSync(
      path.join(process.cwd(), "data/seminar/batch5_grade_these.txt"),
      "utf8",
    ),
  );

  if (b4.length !== 10 || b5.length !== 10) {
    console.error(
      `Expected 10 papers each; got batch4=${b4.length} batch5=${b5.length}`,
    );
    process.exit(1);
  }

  writeBatch(4, b4);
  writeBatch(5, b5);
  console.log("Created batch4-targets.json and batch5-targets.json");
}

main();
