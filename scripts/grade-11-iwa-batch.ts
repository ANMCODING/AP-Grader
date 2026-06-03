import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

const ROOT = path.join(process.cwd(), "data/batch-iwa-11-combined.txt");

const ROW_NAMES = [
  "Row 1 Stimulus (5)",
  "Row 2 Context (5)",
  "Row 3 Perspective (9)",
  "Row 4 Argument (12)",
  "Row 5 Evidence (9)",
  "Row 6 Citation (5)",
  "Row 7 Style (3)",
];

function extractTitle(block: string): string {
  const m = block.match(/Running head:\s*([^\n]+)/i);
  if (m?.[1]) return m[1].trim();
  const rq = block.match(
    /(?:^|\n)(To What Extent[^?\n]+\?|Should [^\n]+\?)/im,
  );
  if (rq?.[1]) return rq[1].slice(0, 72);
  return block.slice(0, 60).replace(/\s+/g, " ");
}

function main(): void {
  if (!fs.existsSync(ROOT)) {
    console.error(`Missing ${ROOT} — paste all 11 papers into that file first.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(ROOT, "utf8");
  const blocks = raw.split(/(?=Running head: )/i).filter((b) => b.trim().length > 300);

  console.log(`\nGraded ${blocks.length} IWA papers (engine: seminar grader)\n`);
  console.log("=".repeat(100));

  blocks.forEach((text, i) => {
    const title = extractTitle(text);
    const r = gradeIwa(text);
    const rows = r.rows.map((row) => row.score);
    const rowStr = rows.join("+");

    console.log(`\n### ${i + 1}. ${title}`);
    console.log(`Body words: ${r.bodyWordCount} | Total: ${r.total}/48 | ${r.qualityLevel}`);
    ROW_NAMES.forEach((name, j) => {
      const row = r.rows[j]!;
      const fb = row.feedback ? ` — ${row.feedback.slice(0, 120)}…` : "";
      console.log(`  ${name}: ${row.score}${fb}`);
    });
    if (r.flags.length) {
      console.log(`  Flags: ${r.flags.slice(0, 3).join(" | ")}`);
    }
    console.log(`  Profile: ${rowStr}`);
  });
}

main();
