import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";
import {
  scoreIwaRow1,
  scoreIwaRow2,
  scoreIwaRow3,
  scoreIwaRow4,
  scoreIwaRow5,
  scoreIwaRow6,
  scoreIwaRow7,
} from "@/lib/seminar/iwaRows";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx scripts/grade-pasted-iwa.ts <path-to-txt>");
  process.exit(1);
}
const text = fs.readFileSync(path.resolve(file), "utf8");
const m = prepareSeminarSubmissionMetrics(text);
const r = gradeIwa(text);
const e = buildSeminarEvidence(text);
const g = r.wordCountGate;

console.log(JSON.stringify({
  file: path.basename(file),
  bodyWordCount: m.bodyWordCount,
  band: g?.band,
  wcDeduction: g?.totalWordCountDeduction,
  organic: g?.organicScores,
  final: r.rows.map((x) => x.score),
  rowNames: r.rows.map((x) => x.name),
  total: r.total,
  evidence: {
    row1: { score: scoreIwaRow1(e), ...pickRow1(e) },
    row2: { score: scoreIwaRow2(e), specificityScore: e.specificityScore, rqContextLinked: e.rqContextLinked, substantiatedRqContextCount: e.substantiatedRqContextCount, seminarContextScore: e.seminarContextScore },
    row3: { score: scoreIwaRow3(e), namedPerspectiveCount: e.namedPerspectiveCount, evaluativeLinkingCount: e.evaluativeLinkingCount, descriptiveLinkingCount: e.descriptiveLinkingCount, perspectiveIsolated: e.perspectiveIsolated, namedPerspectiveTypeA: e.namedPerspectiveTypeA },
    row4: { score: scoreIwaRow4(e), thesisPresent: e.thesisPresent, thesisInOpening: e.thesisInOpening, conclusionAligned: e.conclusionAligned, counterclaimPresent: e.counterclaimPresent, strongCounterclaimEngaged: e.strongCounterclaimEngaged, exploratoryMode: e.exploratoryMode, echoRatio: e.echoRatio, commentaryDepthRatio: e.commentaryDepthRatio },
    row5: { score: scoreIwaRow5(e), totalCredibilityPoints: e.totalCredibilityPoints, scholarlyRatio: e.scholarlyRatio, analysisDepthCount: e.analysisDepthCount, urlOnly: e.urlOnlyBibliography, bibPresent: e.bibliographyPresent, entries: e.bibliographyEntryCount },
    row6: { score: scoreIwaRow6(e), linkingRatio: e.bibliographyLinkedRatio, missingCount: e.missingFromBibliographyCount, inTextCount: e.inTextCitationCount },
    row7: { score: scoreIwaRow7(e), colloquialSeverity: e.colloquialSeverity, colloquialHitCount: e.colloquialHitCount },
  },
}, null, 2));

function pickRow1(e: ReturnType<typeof buildSeminarEvidence>) {
  const q = e.row1IntegrationQuality;
  return {
    namedSourceInBody: e.namedSourceInBody,
    commentaryQuality: q.commentaryQuality,
    dialogueScore: q.dialogueScore,
    functions: q.functions,
    appearances: q.appearanceCount,
    sections: q.sections,
    qualifies: q.qualifiesSource,
    extends: q.extendsSource,
    challenges: q.challengesSource,
    agrees: q.agreesWithSource,
  };
}
