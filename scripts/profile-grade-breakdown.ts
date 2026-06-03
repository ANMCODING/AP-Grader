/**
 * Timing breakdown inside buildSeminarEvidence path.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBodyTextIndex } from "@/lib/seminar/seminarBodyIndex";
import { buildDeepCalibrationSignals } from "@/lib/seminar/seminarDeepCalibration";
import { analyzeRow1SourceIntegration } from "@/lib/seminar/row1SourceIntegration";
import {
  countCommentaryDepth,
  getBibliographyAnalysis,
  clearBibliographyAnalysisCache,
} from "@/lib/seminar/seminarBibliographyAnalysis";
import { extractResearchQuestionKeywords } from "@/lib/seminar/seminarPatterns";
import { partitionSeminarText, stripSeminarBoilerplate } from "@/lib/seminar/seminarBodyPrep";
import { runWithPatternScanCache } from "@/lib/seminar/patternScanCache";
import { detectThesis } from "@/lib/seminar/seminarThesisDetection";

function load(name: string) {
  const raw = readFileSync(join(process.cwd(), "data/batch-iwa-papers", name), "utf8");
  const { bodyText, referencesText } = partitionSeminarText(
    stripSeminarBoilerplate(raw).text,
  );
  return { bodyText, referencesText };
}

function main() {
  const paper = process.argv[2] ?? "p05-ubi-norberg.txt";
  const { bodyText, referencesText } = load(paper);
  const rq = extractResearchQuestionKeywords(bodyText);

  runWithPatternScanCache(() => {
    let t = performance.now();
    const bodyIndex = buildBodyTextIndex(bodyText, 7000);
    console.log("buildBodyTextIndex:", (performance.now() - t).toFixed(1) + "ms");

    clearBibliographyAnalysisCache();
    t = performance.now();
    getBibliographyAnalysis(bodyText, referencesText);
    console.log("getBibliographyAnalysis:", (performance.now() - t).toFixed(1) + "ms");

    t = performance.now();
    buildDeepCalibrationSignals(
      bodyText,
      referencesText,
      rq,
      undefined,
      "iwa",
      bodyIndex.paragraphs,
    );
    console.log("buildDeepCalibrationSignals:", (performance.now() - t).toFixed(1) + "ms");

    t = performance.now();
    analyzeRow1SourceIntegration(bodyText, referencesText);
    console.log("analyzeRow1SourceIntegration:", (performance.now() - t).toFixed(1) + "ms");

    t = performance.now();
    detectThesis(bodyText);
    console.log("detectThesis:", (performance.now() - t).toFixed(1) + "ms");

    t = performance.now();
    countCommentaryDepth(bodyText);
    console.log("countCommentaryDepth:", (performance.now() - t).toFixed(1) + "ms");
  });
}

main();
