/**
 * Pre-flight word count gate checks (IWA hard floor 400, advisory 800–2200).
 * Synthetic macro excerpts are for gate testing only — not row-level calibration.
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";

const SYNTH_DIR = path.join(
  process.cwd(),
  "data/seminar/synthetic-macro-excerpts",
);

/** Exact body word count after seminar prep (single-token filler). */
function exactBodyWords(n: number): string {
  return Array.from({ length: n }, () => "essay").join(" ");
}

let failed = false;
function check(label: string, ok: boolean) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed = true;
  } else console.log(`OK: ${label}`);
}

// Edge cases
const r4 = gradeIwa("Video games are bad.");
check("4-word preflight", r4.preflightFailed === true && r4.total === 0 && r4.bodyWordCount === 4);

const r399 = gradeIwa(exactBodyWords(399));
check("399 preflight", r399.preflightFailed === true && r399.bodyWordCount === 399);

const r400 = gradeIwa(exactBodyWords(400));
check(
  "400 row-scored + warning",
  r400.preflightFailed === false &&
    r400.bodyWordCount === 400 &&
    r400.wordCountWarning != null,
);

const r800 = gradeIwa(exactBodyWords(800));
check(
  "800 row-scored, no advisory warning",
  r800.preflightFailed === false &&
    r800.bodyWordCount === 800 &&
    r800.wordCountWarning == null,
);

// Synthetic macro excerpts (if present)
if (fs.existsSync(SYNTH_DIR)) {
  for (const file of fs.readdirSync(SYNTH_DIR).filter((f) => f.endsWith(".txt"))) {
    const text = fs.readFileSync(path.join(SYNTH_DIR, file), "utf8");
    const metrics = prepareSeminarSubmissionMetrics(text);
    const r = gradeIwa(text);
    check(
      `${file} below hard floor (${metrics.bodyWordCount} words)`,
      metrics.bodyWordCount < 400 &&
        r.preflightFailed === true &&
        r.total === 0 &&
        r.rows.every((row) => row.score === 0),
    );
  }
}

process.exit(failed ? 1 : 0);
