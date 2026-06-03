import fs from "node:fs";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { gradeIrr } from "@/lib/seminar/irrGrader";

const FILE = "/Users/morel/Downloads/batch3_grade_these.txt";
const text = fs.readFileSync(FILE, "utf8");

const markers = [
  ...text.matchAll(
    /^={8,}\n\[(IWA|IRR)-(\d+)\] \[(\w+)\] \[TARGET: ([^\]]+)\]/gm,
  ),
];

function extractPaper(i: number): { id: string; type: string; target: string; text: string } {
  const m = markers[i]!;
  const id = `${m[1]}-${m[2]}`;
  const start = m.index! + m[0].length;
  const end = i + 1 < markers.length ? markers[i + 1].index! : text.length;
  const chunk = text.slice(start, end).trim();
  const header = `========================================================================\n[${id}] [${m[3]}] [TARGET: ${m[4]}]\n========================================================================\n\n`;
  return { id, type: m[3]!, target: m[4]!, text: header + chunk };
}

function pickEvidence(e: ReturnType<typeof gradeIwa>["evidence"]) {
  return {
    bodyWordCount: e.bodyWordCount,
    thesisPresent: e.thesisPresent,
    thesisInOpening: e.thesisInOpening,
    conclusionAligned: e.conclusionAligned,
    counterclaimPresent: e.counterclaimPresent,
    strongCounterclaimEngaged: e.strongCounterclaimEngaged,
    specificityScore: e.specificityScore,
    dictionaryContextOpening: e.dictionaryContextOpening,
    rqContextLinked: e.rqContextLinked,
    statisticalUrgencyCount: e.statisticalUrgencyCount,
    namedPerspectiveCount: e.namedPerspectiveCount,
    evaluativeLinkingCount: e.evaluativeLinkingCount,
    descriptiveLinkingCount: e.descriptiveLinkingCount,
    perspectiveIsolated: e.perspectiveIsolated,
    synthesisIsolationCount: e.synthesisIsolationCount,
    commentaryStructureScore: e.commentaryStructureScore,
    echoRatio: e.echoRatio,
    commentaryDepthRatio: e.commentaryDepthRatio,
    sourceToCommentaryRatio: e.sourceToCommentaryRatio,
    exploratoryMode: e.exploratoryMode,
    totalCredibilityPoints: e.totalCredibilityPoints,
    tier1SourceCount: e.tier1SourceCount,
    totalNonStimulusSources: e.totalNonStimulusSources,
    scholarlyRatio: e.scholarlyRatio,
    beyondStimulusWellVettedCount: e.beyondStimulusWellVettedCount,
    bibliographyPresent: e.bibliographyPresent,
    bibliographyEntryCount: e.bibliographyEntryCount,
    bibliographyLinkedRatio: e.bibliographyLinkedRatio,
    missingFromBibliographyCount: e.missingFromBibliographyCount,
    inTextCitationCount: e.inTextCitationCount,
    urlOnlyBibliography: e.urlOnlyBibliography,
    colloquialSeverity: e.colloquialSeverity,
    sentenceVarietyScore: e.sentenceVarietyScore,
    namedStimulusInBody: e.namedStimulusInBody,
    stimulusAuthorsInBody: e.stimulusAuthorsInBody,
    row1IntegrationQuality: e.row1IntegrationQuality,
    irrMethodologySignalCount: e.irrMethodologySignalCount,
    irrBiasEvaluationCount: e.irrBiasEvaluationCount,
    credentialMentionCount: e.credentialMentionCount,
    seminarContextScore: e.seminarContextScore,
    detectedPerspectives: e.detectedPerspectives?.slice(0, 6),
  };
}

const out: unknown[] = [];

for (let i = 0; i < markers.length; i++) {
  const p = extractPaper(i);
  const result =
    p.type === "IWA" ? gradeIwa(p.text) : gradeIrr(p.text);
  const organic = result.wordCountGate?.organicScores ?? result.rows.map((r) => r.score);
  out.push({
    id: p.id,
    type: p.type,
    target: p.target,
    graderVersion: result.graderVersion,
    bodyWordCount: result.bodyWordCount,
    total: result.total,
    maxTotal: result.maxTotal,
    qualityLevel: result.qualityLevel,
    wordCountGate: result.wordCountGate
      ? {
          band: result.wordCountGate.band,
          organicTotal: result.wordCountGate.organicTotal,
          finalTotal: result.wordCountGate.finalTotal,
          deduction: result.wordCountGate.totalWordCountDeduction,
          adjustments: result.wordCountGate.adjustments,
        }
      : null,
    rows: result.rows.map((r, idx) => ({
      id: r.id,
      name: r.name,
      score: r.score,
      organic: organic[idx],
      maxScore: r.maxScore,
      feedback: r.feedback,
      detectionNote: r.detectionNote,
      confidence: r.confidence,
    })),
    rowDetectionNotes: result.rowDetectionNotes,
    flags: result.flags,
    evidence: pickEvidence(result.evidence),
    anchorNote: result.anchorComparisonNote,
  });
}

console.log(JSON.stringify(out, null, 2));
