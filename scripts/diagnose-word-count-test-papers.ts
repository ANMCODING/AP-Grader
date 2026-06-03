/**
 * Part A diagnosis — verbose evidence for six word-count test papers.
 * Run: npx tsx scripts/diagnose-word-count-test-papers.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";
import { scoreIwaRows } from "@/lib/seminar/iwaRows";
import { scoreIrrRows } from "@/lib/seminar/irrRows";
import {
  applyIwaWordCountGates,
  applyIrrWordCountGates,
} from "@/lib/seminar/seminarWordCountGates";

const DIR = path.join(process.cwd(), "data/seminar/word-count-test-papers");

const FILES = [
  "iwa_high_scoring.txt",
  "iwa_mid_scoring.txt",
  "iwa_low_scoring.txt",
  "irr_high_scoring.txt",
  "irr_mid_scoring.txt",
  "irr_low_scoring.txt",
];

function capList(
  gate: ReturnType<typeof applyIwaWordCountGates> | null,
): string {
  if (!gate) return "none";
  const caps = gate.adjustments
    .filter((a) => a.capApplied != null && a.organicScore > a.cappedScore)
    .map((a) => `Row ${a.rowName} capped at ${a.capApplied} (was ${a.organicScore})`);
  return caps.length ? caps.join("; ") : "none";
}

function diagnoseIwa(file: string, text: string): void {
  const body = prepareSeminarSubmissionMetrics(text).bodyWordCount;
  const e = buildSeminarEvidence(text);
  const rows = scoreIwaRows(e);
  const organic = rows.map((r) => r.score);
  const gate = applyIwaWordCountGates(body, organic, e, rows);
  const r1 = e.row1IntegrationQuality;

  console.log(`PAPER: ${file}`);
  console.log(`Body word count: ${body}`);
  console.log(`Band: ${gate.band}`);
  console.log(`Word count caps applied: ${capList(gate)}`);
  console.log(
    `Proportional deduction: ${gate.proportionalDeduction > 0 ? `${gate.proportionalDeduction} points` : "none"}`,
  );
  console.log("");
  console.log("ROW SCORES (organic → final after caps):");
  const labels = [
    "Row 1",
    "Row 2",
    "Row 3",
    "Row 4",
    "Row 5",
    "Row 6",
    "Row 7",
  ];
  for (let i = 0; i < 7; i++) {
    const adj = gate.adjustments[i]!;
    if (i === 0) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | namedSourceInBody=${e.namedSourceInBody} integrationQuality=${organic[i]} functions=[${r1.functions.join(", ")}] commentaryQuality=${r1.commentaryQuality} dialogueScore=${r1.dialogueScore} appearances=${r1.appearanceCount} sections=[${r1.sections.join(", ")}]`,
      );
    } else if (i === 1) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | specificityScore=${e.specificityScore} rqContextLinked=${e.rqContextLinked} substantiatedRqContextCount=${e.substantiatedRqContextCount} seminarContextScore=${e.seminarContextScore}`,
      );
    } else if (i === 2) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | namedPerspectiveCount=${e.namedPerspectiveCount} evaluativeLinkingCount=${e.evaluativeLinkingCount} descriptiveLinkingCount=${e.descriptiveLinkingCount} perspectiveIsolated=${e.perspectiveIsolated} evaluativePerspectiveCount=${e.evaluativePerspectiveCount}`,
      );
    } else if (i === 3) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | thesisDetected=${e.thesisPresent} exploratoryMode=${e.exploratoryMode} echoRatio=${e.echoRatio.toFixed(3)} commentaryDepthRatio=${e.commentaryDepthRatio.toFixed(3)} counterclaimPresent=${e.counterclaimPresent} strongCounterclaimEngaged=${e.strongCounterclaimEngaged} conclusionAligned=${e.conclusionAligned} thesisInOpening=${e.thesisInOpening}`,
      );
    } else if (i === 4) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | totalCredibilityPoints=${e.totalCredibilityPoints} scholarlyRatio=${e.scholarlyRatio.toFixed(3)} analysisDepthCount=${e.analysisDepthCount} urlOnly=${e.urlOnlyBibliography} bibliographyPresent=${e.bibliographyPresent} tier1=${e.tier1SourceCount}`,
      );
    } else if (i === 5) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | linkingRatio=${e.bibliographyLinkedRatio.toFixed(3)} missingCount=${e.missingFromBibliographyCount} styleViolations=${e.citationStyleViolations} inTextCount=${e.inTextCitationCount}`,
      );
    } else {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | colloquialSeverity=${e.colloquialSeverity} sentenceVarietyScore=${e.sentenceVarietyScore} colloquialHitCount=${e.colloquialHitCount}`,
      );
    }
  }
  console.log("");
  console.log(
    `TOTAL: ${gate.organicTotal} → ${gate.finalTotal} (after all caps and deductions)`,
  );
  console.log("");
}

function diagnoseIrr(file: string, text: string): void {
  const body = prepareSeminarSubmissionMetrics(text).bodyWordCount;
  const e = buildSeminarEvidence(text, { task: "irr" });
  const rows = scoreIrrRows(e);
  const organic = rows.map((r) => r.score);
  const gate = applyIrrWordCountGates(body, organic, e, rows);

  console.log(`PAPER: ${file}`);
  console.log(`Body word count: ${body}`);
  console.log(`Band: ${gate.band}`);
  console.log(`Word count caps applied: ${capList(gate)}`);
  console.log(
    `Proportional deduction: ${gate.proportionalDeduction > 0 ? `${gate.proportionalDeduction} points` : "none"}`,
  );
  console.log("");
  console.log("ROW SCORES (organic → final after caps):");
  const labels = ["Row 1", "Row 2", "Row 3", "Row 4", "Row 5", "Row 6"];
  for (let i = 0; i < 6; i++) {
    const adj = gate.adjustments[i]!;
    if (i === 0) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | rqContextLinked=${e.rqContextLinked} irrContextA=${e.irrContextConditionA} irrContextB=${e.irrContextConditionB} substantiatedRqContextCount=${e.substantiatedRqContextCount}`,
      );
    } else if (i === 1) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | irrExplanationRatio=${e.irrExplanationRatio.toFixed(3)} irrMechanismCount=${e.irrMechanismCount} irrSummaryOnlyCount=${e.irrSummaryOnlyCount} studentVoice=${e.seminarStudentVoiceScore}`,
      );
    } else if (i === 2) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | totalCredibilityPoints=${e.totalCredibilityPoints} irrCredibilityConsistency=${e.irrCredibilityConsistency} urlOnly=${e.urlOnlyBibliography} bibliographyPresent=${e.bibliographyPresent}`,
      );
    } else if (i === 3) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | irrPerspectiveLensCount=${e.irrPerspectiveLensCount} irrStrongSynthesisCount=${e.irrStrongSynthesisCount} irrModerateSynthesisCount=${e.irrModerateSynthesisCount} evaluativeLinkingCount=${e.evaluativeLinkingCount}`,
      );
    } else if (i === 4) {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | linkingRatio=${e.bibliographyLinkedRatio.toFixed(3)} missingCount=${e.missingFromBibliographyCount} inTextCount=${e.inTextCitationCount}`,
      );
    } else {
      console.log(
        `${labels[i]}: ${adj.organicScore} → ${adj.finalScore} | colloquialSeverity=${e.colloquialSeverity} sentenceVarietyScore=${e.sentenceVarietyScore}`,
      );
    }
  }
  console.log("");
  console.log(
    `TOTAL: ${gate.organicTotal} → ${gate.finalTotal} (after all caps and deductions)`,
  );
  console.log("");
}

for (const file of FILES) {
  const text = fs.readFileSync(path.join(DIR, file), "utf8");
  if (file.startsWith("iwa_")) diagnoseIwa(file, text);
  else diagnoseIrr(file, text);
  console.log("---");
}
