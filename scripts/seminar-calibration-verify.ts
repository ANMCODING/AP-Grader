/**
 * Quick checks for seminar-2.4.0 calibration (Sections 1–2, batch papers).
 */
import fs from "node:fs";
import path from "node:path";
import { namedStimulusAuthorsInBody } from "@/lib/seminar/seminarStimulusBody";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

const BATCH = path.join(process.cwd(), "data/batch-iwa-papers");

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
  console.log("PASS:", msg);
}

function main(): void {
  const howeverAuthors = namedStimulusAuthorsInBody(
    "However, this is important. Norberg (2021) argues memory matters.",
  );
  assert(!howeverAuthors.includes("Howe"), "However does not match Howe");
  assert(howeverAuthors.includes("Norberg"), "Norberg still detected");

  const p02 = fs.readFileSync(path.join(BATCH, "p02-fast-fashion.txt"), "utf8");
  const r02 = gradeIwa(p02);
  assert(r02.rows[0]!.score === 0, "Paper 2 Row 1 = 0");
  assert(r02.rows[1]!.score === 5, "Paper 2 Row 2 = 5");
  assert(r02.rows[3]!.score === 8, "Paper 2 Row 4 = 8");
  assert(r02.total >= 14 && r02.total <= 20, `Paper 2 total ~16 (got ${r02.total})`);

  const p03 = gradeIwa(
    fs.readFileSync(path.join(BATCH, "p03-mandatory-voting.txt"), "utf8"),
  );
  assert(p03.rows[2]!.score === 0 || p03.rows[2]!.score === 6, "Paper 3 Row 3");

  const p04 = gradeIwa(
    fs.readFileSync(path.join(BATCH, "p04-genetic-testing.txt"), "utf8"),
  );
  assert(p04.rows[0]!.score === 0, "Paper 4 Row 1 = 0 (no false Howe)");

  const p07 = gradeIwa(
    fs.readFileSync(path.join(BATCH, "p07-nostalgia-political.txt"), "utf8"),
  );
  assert(p07.rows[1]!.score === 5, "Paper 7 Row 2 = 5");

  const p11 = gradeIwa(
    fs.readFileSync(path.join(BATCH, "p11-memory-fallibility-adesanya.txt"), "utf8"),
  );
  assert(p11.total >= 20, `Paper 11 graded (got ${p11.total})`);

  console.log("\nAll calibration verification checks passed.");
}

main();
