import type { BandScore } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";
import { makeBand } from "@/lib/grader/format";

function scoreNumeric(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

/** G1 — specific focus + executed method + results signals → overall floor Low 3. */
export function qualifiesExecutedSpecificResearch(
  ev: PaperEvidence,
  categories?: BandScore[],
): boolean {
  if (ev.methodNotExecutedHard || ev.literatureReviewOnlyMethod) return false;

  const focusOk =
    ev.highlySpecificFocus ||
    ev.focusSpecificityScore >= 3 ||
    (categories &&
      scoreNumeric(categories[0]) >= scoreNumeric(makeBand(4, "Mid")));

  const quasiEmpiricalCollection =
    /quasi-?experimental/i.test(ev.methodSection) &&
    /participants/i.test(ev.methodSection);

  const methodOk =
    ev.methodElements >= 4 &&
    (ev.methodCollectionEvidence ||
      ev.contentAnalysisExecuted ||
      ev.correlationStudyExecuted ||
      quasiEmpiricalCollection);

  const resultsOk =
    Math.max(ev.studentResultsSignals, ev.resultsSignals) >= 2;

  return Boolean(focusOk && methodOk && resultsOk);
}

/** Strong executed empirical profile — floor overall at Low 4. */
export function qualifiesStrongExecutedEmpiricalProfile(
  ev: PaperEvidence,
  categories?: BandScore[],
): boolean {
  if (ev.methodNotExecutedHard || ev.literatureReviewOnlyMethod) return false;
  const focusBand = categories?.[0]?.band ?? 0;
  const focusOk =
    ev.highlySpecificFocus ||
    ev.focusSpecificityScore >= 3 ||
    focusBand >= 4 ||
    (ev.focusSpecificityScore >= 2 && focusBand >= 3);

  const minResults = ev.contentAnalysisExecuted ? 2 : 3;

  return (
    Boolean(focusOk) &&
    ev.methodElements >= 4 &&
    (ev.methodCollectionEvidence ||
      ev.contentAnalysisExecuted ||
      ev.correlationStudyExecuted) &&
    Math.max(ev.studentResultsSignals, ev.resultsSignals) >= minResults &&
    (ev.gapQuality === "demonstrated" ||
      ev.borderlineDemonstratedGap ||
      ev.contentAnalysisExecuted ||
      ev.correlationStudyExecuted)
  );
}
