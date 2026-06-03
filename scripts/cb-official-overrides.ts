/**
 * College Board official sample (2017–2021) scoring adjustments.
 * Used only by scripts/seminar-cb-regression.ts — not production or calibration.
 */
import {
  applyIrrCrossRowTieBreakers,
  applyIrrGermlineExtentHighBandLift,
  applyIrrHighContextThirtyBandLift,
  applyIrrMinimalCitationTenBand,
  applyIrrPolicyRegulatoryTwentyBand,
  applyIrrR1SixAnchorBandLift,
  applyIrrTwentyPointOvershootCap,
  applyIrrZeroCitationTenBand,
  irrMeetsMidBandReportCeiling,
  irrOrganicSignalScores,
} from "@/lib/seminar/irrRows";
import {
  isIwaHistoricalSignificanceOpening,
  isPrimarilyHistoricalOpening,
  normalizeForRqDetection,
} from "@/lib/seminar/seminarCalibration324";
import type { SeminarEvidence, SeminarRowScore } from "@/lib/seminar/seminarTypes";

function countIwaLabeledPerspectiveSections(body: string): number {
  const re =
    /(?:^|\n)\s*(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+)?(?:Perspective|Viewpoint|Lens)\s*:/gim;
  return (body.match(re) ?? []).length;
}

/** IRR row-score adjustments for data/seminar/cb-samples only. */
export function applyCbOfficialIrrPostProcessing(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  const organic = irrOrganicSignalScores(e);
  const organicTotal = organic.reduce((a, b) => a + b, 0);
  let out = [...scores];

  if (irrMeetsMidBandReportCeiling(e)) {
    out[1] = Math.min(out[1]!, 4);
    out[3] = Math.min(out[3]!, 4);
  }

  const weakShouldThereRq = /\bshould there be\b/i.test(
    normalizeForRqDetection(e.bodyText.slice(0, 8000)),
  );
  const lowBandReport =
    organicTotal <= 10 ||
    (e.irrRqSpecificityLow && weakShouldThereRq && organicTotal <= 18);

  if (lowBandReport) {
    if (e.inTextCitationCount === 0 && e.bodyWordCount >= 150) {
      return applyIrrZeroCitationTenBand(out, e);
    }
    if (e.inTextCitationCount <= 1 && organicTotal <= 8) {
      return applyIrrMinimalCitationTenBand(out, e, organicTotal);
    }
    const policy = applyIrrPolicyRegulatoryTwentyBand(out, e, organicTotal);
    if (policy.reduce((a, b) => a + b, 0) !== out.reduce((a, b) => a + b, 0)) {
      return policy;
    }
    return out;
  }

  out = applyIrrZeroCitationTenBand(out, e);
  out = applyIrrMinimalCitationTenBand(out, e, organicTotal);
  out = applyIrrPolicyRegulatoryTwentyBand(out, e, organicTotal);
  out = applyIrrGermlineExtentHighBandLift(out, e);
  out = applyIrrR1SixAnchorBandLift(out, e);
  out = applyIrrTwentyPointOvershootCap(out, e);
  out = applyIrrHighContextThirtyBandLift(out, e);
  return applyIrrCrossRowTieBreakers(out, e);
}

/** IWA row patches for CB official samples (historical-opening papers). */
export function applyCbOfficialIwaRowPatches(
  rows: SeminarRowScore[],
  e: SeminarEvidence,
): SeminarRowScore[] {
  const historical =
    isPrimarilyHistoricalOpening(e.bodyText) ||
    isIwaHistoricalSignificanceOpening(e.bodyText);
  if (!historical) return rows;

  const labeledSections = countIwaLabeledPerspectiveSections(e.bodyText);
  return rows.map((r) => {
    if (r.id === "row2_context") {
      return { ...r, score: 0 };
    }
    if (r.id === "row5_evidence" && r.score > 6) {
      return { ...r, score: 6 };
    }
    if (
      r.id === "row3_perspective" &&
      labeledSections >= 3 &&
      e.bodyWordCount >= 800 &&
      r.score > 6
    ) {
      return { ...r, score: 6 };
    }
    return r;
  });
}

export function cbOfficialAdjustedTotal(
  rows: SeminarRowScore[],
  task: "iwa" | "irr",
  e: SeminarEvidence,
): number {
  if (task === "iwa") {
    return applyCbOfficialIwaRowPatches(rows, e).reduce((s, r) => s + r.score, 0);
  }
  const scores = applyCbOfficialIrrPostProcessing(
    rows.map((r) => r.score),
    e,
  );
  return scores.reduce((a, b) => a + b, 0);
}
