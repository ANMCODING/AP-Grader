/**
 * B.6 regression guard: official regression grading must not apply word-count caps.
 * Also reports CB band classification on each extract (informational).
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIwa, gradeIrr } from "@/lib/seminar";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import {
  classifyIwaBand,
  classifyIrrBand,
} from "@/lib/seminar/seminarWordCountGates";

const ROOT = path.join(process.cwd(), "data/seminar-samples");
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"),
) as {
  iwa: { file: string; examYear?: number }[];
  irr: { file: string }[];
};

let bandNotFull = 0;

for (const { file, examYear } of manifest.iwa) {
  const text = fs.readFileSync(path.join(ROOT, "iwa", file), "utf8");
  const ev = buildSeminarEvidence(text, { isOfficialSample: true });
  const band = classifyIwaBand(ev.bodyWordCount);
  const result = gradeIwa(text, { examYear, isOfficialSample: true });
  if (band !== "full") {
    bandNotFull++;
    console.warn(`NOTE IWA ${file}: CB band=${band} (${ev.bodyWordCount} words)`);
  } else {
    console.log(`OK IWA ${file}: full (${ev.bodyWordCount} words)`);
  }
  if (result.wordCountGate != null) {
    console.error(`FAIL IWA ${file}: word count gates applied to official sample`);
    process.exit(1);
  }
}

for (const { file } of manifest.irr) {
  const text = fs.readFileSync(path.join(ROOT, "irr", file), "utf8");
  const ev = buildSeminarEvidence(text, { task: "irr", isOfficialSample: true });
  const band = classifyIrrBand(ev.bodyWordCount);
  const result = gradeIrr(text, { isOfficialSample: true });
  if (band !== "full") {
    bandNotFull++;
    console.warn(`NOTE IRR ${file}: CB band=${band} (${ev.bodyWordCount} words)`);
  } else {
    console.log(`OK IRR ${file}: full (${ev.bodyWordCount} words)`);
  }
  if (result.wordCountGate != null) {
    console.error(`FAIL IRR ${file}: word count gates applied to official sample`);
    process.exit(1);
  }
}

console.log(
  `\nRegression samples: gates not applied (${bandNotFull} outside CB full band by word count only).`,
);
