import type { BandScore, BandTier } from "@/lib/grader/types";

export function formatBandScore(score: BandScore): string {
  return `${score.tier} ${score.band}`;
}

import { FILL_PERCENT_BY_BAND_TIER } from "@/lib/grader/gradingSpec";

/** Bar fill from locked band+tier table (GRADING_SPEC §K6). */
export function bandScoreToFillPercent(score: BandScore): number {
  const key = `${score.tier}-${score.band}`;
  return FILL_PERCENT_BY_BAND_TIER[key] ?? 50;
}

export function bandScoreToApNumber(score: BandScore): number {
  return score.band;
}

export function makeBand(
  band: 1 | 2 | 3 | 4 | 5,
  tier: BandTier,
): BandScore {
  return { band, tier };
}

export function allLowOne(): BandScore {
  return { band: 1, tier: "Low" };
}
