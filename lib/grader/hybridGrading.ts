import type { BandScore, ConfidenceLevel } from "@/lib/grader/types";

export const SECONDARY_REVIEW_NOTE =
  "This paper scored in a range where additional analysis may improve accuracy. Consider reviewing your gap statement and literature review synthesis.";

/** Overall Low 3 through High 4 — local engine is less reliable on gap/synthesis quality. */
export function isAmbiguousScoreRange(overall: BandScore): boolean {
  return overall.band >= 3 && overall.band <= 4;
}

/**
 * Papers scoring 1–2 or clear 5s with uniformly strong categories skip secondary review.
 * Band 5 with mixed categories still needs review.
 */
export function needsSecondaryReview(
  overall: BandScore,
  categories: BandScore[],
): boolean {
  if (overall.band <= 2) return false;
  if (overall.band === 5) {
    return !categories.every((c) => c.band >= 4);
  }
  return isAmbiguousScoreRange(overall);
}

export function confidenceForHybrid(
  base: ConfidenceLevel,
  usedClaude: boolean,
  secondaryReview: boolean,
): ConfidenceLevel {
  if (usedClaude) return base === "LOW" ? "MEDIUM" : base;
  if (secondaryReview) {
    if (base === "HIGH") return "MEDIUM";
    return "LOW";
  }
  return base;
}
