import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

const DIR = path.join(process.cwd(), "data/batch-iwa-papers");

function main(): void {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort();
  for (const file of files) {
    const text = fs.readFileSync(path.join(DIR, file), "utf8");
    const r = gradeIwa(text);
    const e = r.evidence;
    console.log("\n" + "=".repeat(80));
    console.log(file);
    console.log("=".repeat(80));
    console.log(
      JSON.stringify(
        {
          total: r.total,
          rows: r.rows.map((x) => ({ id: x.id, score: x.score, feedback: x.feedback })),
          bodyWords: r.bodyWordCount,
          quality: r.qualityLevel,
          flags: r.flags,
          namedStimulusInBody: e.namedStimulusInBody,
          stimulusAuthorsInBody: e.stimulusAuthorsInBody,
          row1DiagnosticIntegrationLevel: e.row1DiagnosticIntegrationLevel,
          stimulusTangential: e.stimulusTangential,
          stimulusZeroReason: e.stimulusZeroReason,
          stimulusBodyIntegrated: e.stimulusBodyIntegrated,
          specificityScore: e.specificityScore,
          dictionaryContextOpening: e.dictionaryContextOpening,
          thesisPresent: e.thesisPresent,
          thesisInOpening: e.thesisInOpening,
          conclusionAligned: e.conclusionAligned,
          counterclaimPresent: e.counterclaimPresent,
          strongCounterclaimEngaged: e.strongCounterclaimEngaged,
          namedPerspectiveTypeA: e.namedPerspectiveTypeA,
          namedPerspectiveCount: e.namedPerspectiveCount,
          evaluativeLinkingCount: e.evaluativeLinkingCount,
          descriptiveLinkingCount: e.descriptiveLinkingCount,
          perspectiveIsolated: e.perspectiveIsolated,
          commentaryStructureScore: e.commentaryStructureScore,
          echoRatio: e.echoRatio,
          commentaryDepthRatio: e.commentaryDepthRatio,
          exploratoryMode: e.exploratoryMode,
          totalCredibilityPoints: e.totalCredibilityPoints,
          tier1SourceCount: e.tier1SourceCount,
          totalNonStimulusSources: e.totalNonStimulusSources,
          scholarlyRatio: e.scholarlyRatio,
          urlOnlyBibliography: e.urlOnlyBibliography,
          bibliographyPresent: e.bibliographyPresent,
          missingFromBibliographyCount: e.missingFromBibliographyCount,
          inTextCitationCount: e.inTextCitationCount,
          colloquialSeverity: e.colloquialSeverity,
          sentenceVarietyScore: e.sentenceVarietyScore,
          anchor: r.anchorComparisonNote,
        },
        null,
        2,
      ),
    );
  }
}

main();
