import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { scoreIwaRow4, iwaSignalTotal } from "@/lib/seminar/iwaRows";
import { detectThesis } from "@/lib/seminar/seminarThesisDetection";
import { analyzeCommentaryStructure } from "@/lib/seminar/seminarDeepCalibration";
import {
  countDistinctPatternHits,
  IWA_ROW4_CAP8_TRIGGERS,
} from "@/lib/seminar/seminarPatterns";

const sample = process.argv[2] ?? "ap23-iwa-sample-a.txt";
const text = fs.readFileSync(
  path.join(process.cwd(), "data/seminar-samples/iwa", sample),
  "utf8",
);

const r = gradeIwa(text, { examYear: 2023, isOfficialSample: true });
const e = r.evidence;
const thesis = detectThesis(e.bodyText);
const commentary = analyzeCommentaryStructure(e.bodyText);
const row4Cap8 =
  countDistinctPatternHits(e.bodyText, IWA_ROW4_CAP8_TRIGGERS, 12) >= 4;

console.log("sample:", sample);
console.log("rows:", r.rows.map((x) => x.score).join("+"), "total:", r.total);
console.log("signalTotal:", iwaSignalTotal(e));
console.log("scoreIwaRow4(signal only):", scoreIwaRow4(e));
console.log({
  thesis,
  thesisPresent_evidence: e.thesisPresent,
  thesisInOpening: e.thesisInOpening,
  conclusionAligned: e.conclusionAligned,
  counterclaimPresent: e.counterclaimPresent,
  strongCounterclaimEngaged: e.strongCounterclaimEngaged,
  exploratoryMode: e.exploratoryMode,
  echoRatio: e.echoRatio,
  commentaryDepthRatio: e.commentaryDepthRatio,
  commentaryStructureScore: e.commentaryStructureScore,
  row4Cap8,
  cap8Hits: countDistinctPatternHits(e.bodyText, IWA_ROW4_CAP8_TRIGGERS, 12),
  bodyWordCount: e.bodyWordCount,
  conclusionSlice: e.bodyText.slice(-500),
});
