import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

const DIR = path.join(process.cwd(), "data/batch-iwa-papers");

const ROW_LABELS = [
  "R1 Stimulus /5",
  "R2 Context /5",
  "R3 Perspective /9",
  "R4 Argument /12",
  "R5 Evidence /9",
  "R6 Citation /5",
  "R7 Style /3",
];

function main(): void {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  const results: {
    file: string;
    title: string;
    bodyWords: number;
    total: number;
    rows: number[];
    quality: string;
    keyNotes: string[];
  }[] = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(DIR, file), "utf8");
    const r = gradeIwa(text);
    const title =
      text.match(/Running head:\s*([^\n]+)/i)?.[1]?.trim() ??
      text.match(/^(To What Extent[^\n]+)/im)?.[1]?.trim() ??
      file;

    const keyNotes: string[] = [];
    if (!r.evidence.namedStimulusInBody) {
      keyNotes.push("No named stimulus author in body");
    } else {
      keyNotes.push(
        `Stimulus: ${r.evidence.stimulusAuthorsInBody.slice(0, 3).join(", ")} (diag level ${r.evidence.row1DiagnosticIntegrationLevel})`,
      );
    }
    keyNotes.push(`Thesis: ${r.evidence.thesisPresent ? "yes" : "no"}`);
    keyNotes.push(`Specificity score: ${r.evidence.specificityScore}`);

    results.push({
      file,
      title,
      bodyWords: r.bodyWordCount,
      total: r.total,
      rows: r.rows.map((x) => x.score),
      quality: r.qualityLevel,
      keyNotes,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
