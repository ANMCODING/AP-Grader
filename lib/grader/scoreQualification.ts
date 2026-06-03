import { makeBand } from "@/lib/grader/format";
import type { BandScore } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";

function scoreNumeric(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

function countScoreFiveConditions(
  categories: BandScore[],
  ev: PaperEvidence,
): number {
  const [focus, scholarly, method, argument] = categories;
  let met = 0;
  if (scoreNumeric(focus) >= scoreNumeric(makeBand(4, "Mid"))) met++;
  if (scoreNumeric(scholarly) >= scoreNumeric(makeBand(4, "Mid"))) met++;
  if (scoreNumeric(method) >= scoreNumeric(makeBand(4, "Mid"))) met++;
  if (scoreNumeric(argument) >= scoreNumeric(makeBand(4, "High"))) met++;
  if (
    ev.gapQuality === "demonstrated" ||
    ev.borderlineDemonstratedGap ||
    (ev.multiCitationSentences >= 4 && ev.citationCount >= 10)
  ) {
    met++;
  }
  if (ev.implicationsStrong) met++;
  if (ev.limitationsStrong) met++;
  return met;
}

/** Score 5 qualification — all conditions must hold (Section 11.5). */
export function qualifiesForOverallFive(
  categories: BandScore[],
  ev: PaperEvidence,
): boolean {
  const [focus, scholarly, method, argument, communication] = categories;
  return (
    scoreNumeric(focus) >= scoreNumeric(makeBand(4, "Mid")) &&
    scoreNumeric(scholarly) >= scoreNumeric(makeBand(4, "Mid")) &&
    scoreNumeric(method) >= scoreNumeric(makeBand(4, "Mid")) &&
    scoreNumeric(argument) >= scoreNumeric(makeBand(4, "High")) &&
    scoreNumeric(communication) >= scoreNumeric(makeBand(3, "Mid")) &&
    (ev.gapQuality === "demonstrated" || ev.borderlineDemonstratedGap) &&
    ev.implicationsStrong &&
    ev.limitationsStrong &&
    !ev.methodNotExecutedHard &&
    !ev.literatureReviewOnlyMethod
  );
}

/** Score 4 qualification — at least 5 of 7 Score 5 conditions. */
export function qualifiesForOverallFour(
  categories: BandScore[],
  ev: PaperEvidence,
): boolean {
  if (ev.methodNotExecutedHard || ev.literatureReviewOnlyMethod) return false;
  return countScoreFiveConditions(categories, ev) >= 5;
}

export function applyOverallFiveQualification(
  overall: BandScore,
  categories: BandScore[],
  ev: PaperEvidence,
): BandScore {
  if (!qualifiesForOverallFive(categories, ev)) {
    return overall;
  }
  const floor = makeBand(5, "Low");
  return scoreNumeric(overall) < scoreNumeric(floor) ? floor : overall;
}

export function applyOverallFourQualification(
  overall: BandScore,
  categories: BandScore[],
  ev: PaperEvidence,
): BandScore {
  if (qualifiesForOverallFive(categories, ev)) {
    return overall;
  }
  if (!qualifiesForOverallFour(categories, ev)) {
    return overall;
  }
  const floor = makeBand(4, "Low");
  return scoreNumeric(overall) < scoreNumeric(floor) ? floor : overall;
}
