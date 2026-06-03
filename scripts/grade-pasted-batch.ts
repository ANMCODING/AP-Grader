import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { gradeSeminarPaper, SEMINAR_GRADER_VERSION } from "@/lib/seminar";

const papers: { name: string; task: "iwa" | "irr"; target: string; text: string }[] = [
  {
    name: "Social Media Age (IWA)",
    task: "iwa",
    target: "44-48",
    text: "", // filled below via stdin files
  },
];

// Papers read from temp files passed as argv
const names = [
  "01-social-media-age-iwa",
  "02-legacy-admissions-iwa",
  "03-school-uniforms-iwa",
  "04-sleep-deprivation-irr",
  "05-body-image-irr",
  "06-school-lunch-irr",
];
const tasks: ("iwa" | "irr")[] = ["iwa", "iwa", "iwa", "irr", "irr", "irr"];
const targets = ["44-48", "30-36", "10-18", "27-30", "16-20", "6-10"];

console.log(`\nSeminar engine: ${SEMINAR_GRADER_VERSION}\n`);
console.log(
  "Paper".padEnd(32) +
    "Task".padEnd(6) +
    "Target".padEnd(10) +
    "Total".padEnd(8) +
    "Rows",
);
console.log("-".repeat(90));

for (let i = 0; i < names.length; i++) {
  const path = join(process.cwd(), "data/seminar/_paste-grade", `${names[i]}.txt`);
  const text = require("fs").readFileSync(path, "utf8");
  const task = tasks[i]!;
  const r = gradeSeminarPaper(text, task);
  const rows = r.rows.map((x) => x.score).join("+");
  const max = task === "iwa" ? 48 : 30;
  console.log(
    names[i].padEnd(32) +
      task.padEnd(6) +
      targets[i]!.padEnd(10) +
      String(r.total).padEnd(8) +
      `${rows} (${r.total}/${max})`,
  );
  for (const row of r.rows) {
    console.log(`  ${row.id}: ${row.score}/${row.maxScore} — ${row.name}`);
  }
  console.log();
}
