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

const PAPERS: { name: string; text: string }[] = [
  {
    name: "Paper 1 — Algorithmic curation / epistemic autonomy",
    text: "", // filled below via stdin read
  },
];

// Read from files if we write them; for now grade inline in shell

function report(name: string, text: string): void {
  const m = prepareSeminarSubmissionMetrics(text);
  const r = gradeIwa(text);
  const e = buildSeminarEvidence(text);
  const gate = r.wordCountGate;

  console.log("\n" + "=".repeat(72));
  console.log(name);
  console.log("=".repeat(72));
  console.log(`Body words: ${m.bodyWordCount} | Full: ${m.fullWordCount}`);
  console.log(
    `Band: ${gate?.band ?? "n/a"} | WC deduction: ${gate?.totalWordCountDeduction ?? 0}`,
  );
  console.log(`Engine: ${r.graderVersion}`);
  console.log("\nROW SCORES (final):");
  r.rows.forEach((row, i) => {
    const organic = gate?.organicScores[i] ?? row.score;
    console.log(
      `  Row ${i + 1} ${row.name}: ${organic} → ${row.score} / ${row.maxScore}`,
    );
    if (row.detectionNote) console.log(`    note: ${row.detectionNote}`);
  });
  console.log(`\nTOTAL: ${r.total} / ${r.maxTotal}`);
  console.log(`Quality: ${r.qualityLevel}`);

  const q = e.row1IntegrationQuality;
  console.log("\nEVIDENCE SNAPSHOT:");
  console.log(
    JSON.stringify(
      {
        row1: {
          score: scoreIwaRow1(e),
          namedSourceInBody: e.namedSourceInBody,
          commentaryQuality: q.commentaryQuality,
          dialogueScore: q.dialogueScore,
          functions: q.functions,
          appearances: q.appearanceCount,
          sections: q.sections,
          qualifies: q.qualifiesSource,
          extends: q.extendsSource,
          challenges: q.challengesSource,
        },
        row2: {
          score: scoreIwaRow2(e),
          specificityScore: e.specificityScore,
          rqContextLinked: e.rqContextLinked,
          substantiatedRqContextCount: e.substantiatedRqContextCount,
        },
        row3: {
          score: scoreIwaRow3(e),
          namedPerspectiveCount: e.namedPerspectiveCount,
          evaluativeLinkingCount: e.evaluativeLinkingCount,
          descriptiveLinkingCount: e.descriptiveLinkingCount,
          perspectiveIsolated: e.perspectiveIsolated,
        },
        row4: {
          score: scoreIwaRow4(e),
          thesisPresent: e.thesisPresent,
          thesisInOpening: e.thesisInOpening,
          conclusionAligned: e.conclusionAligned,
          counterclaimPresent: e.counterclaimPresent,
          strongCounterclaimEngaged: e.strongCounterclaimEngaged,
          exploratoryMode: e.exploratoryMode,
          echoRatio: e.echoRatio,
          commentaryDepthRatio: e.commentaryDepthRatio,
        },
        row5: {
          score: scoreIwaRow5(e),
          totalCredibilityPoints: e.totalCredibilityPoints,
          scholarlyRatio: e.scholarlyRatio,
          analysisDepthCount: e.analysisDepthCount,
          bibliographyPresent: e.bibliographyPresent,
          bibliographyEntryCount: e.bibliographyEntryCount,
          urlOnly: e.urlOnlyBibliography,
        },
        row6: {
          score: scoreIwaRow6(e),
          linkingRatio: e.bibliographyLinkedRatio,
          missingCount: e.missingFromBibliographyCount,
          inTextCount: e.inTextCitationCount,
        },
        row7: {
          score: scoreIwaRow7(e),
          colloquialSeverity: e.colloquialSeverity,
          colloquialHitCount: e.colloquialHitCount,
          sentenceVarietyScore: e.sentenceVarietyScore,
        },
      },
      null,
      2,
    ),
  );
}
