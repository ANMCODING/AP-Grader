import { makeBand } from "@/lib/grader/format";
import type { BandScore, BandTier } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";
import {
  detectMethodDefended as detectMethodDefendedShared,
  lacksStudentGeneratedData,
} from "@/lib/grader/evidence";
import {
  CALIBRATION_PAPERS,
  ALL_CALIBRATION_PAPERS,
  type CalibrationFeatures,
  type CalibrationPaper,
} from "@/lib/grader/calibrationPapers";

export interface StudentProfile extends CalibrationFeatures {
  gapCount: number;
  methodElements: number;
  citationCount: number;
  multiCiteSentences: number;
  strongEmpirical: boolean;
  gapDemonstrated: boolean;
  qualitativeResultsPresent: boolean;
}

export interface CalibrationResult {
  categories: BandScore[];
  overall: BandScore;
  closestMatch: CalibrationPaper;
  adjustments: string[];
}

function scoreNumeric(score: BandScore): number {
  const tierOffset: Record<BandTier, number> = {
    Low: 0,
    Mid: 0.35,
    High: 0.7,
  };
  return score.band - 1 + tierOffset[score.tier];
}

function numericToBand(n: number): BandScore {
  const clamped = Math.min(4.7, Math.max(0, n));
  const band = Math.min(5, Math.max(1, Math.floor(clamped) + 1)) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  const frac = clamped - (band - 1);
  let tier: BandTier = "Low";
  if (frac >= 0.55) tier = "High";
  else if (frac >= 0.2) tier = "Mid";
  return makeBand(band, tier);
}

function capScore(score: BandScore, ceiling: BandScore): BandScore {
  return scoreNumeric(score) > scoreNumeric(ceiling) ? ceiling : score;
}

function floorScore(score: BandScore, floor: BandScore): BandScore {
  return scoreNumeric(score) < scoreNumeric(floor) ? floor : score;
}

function bumpScoreOneTier(score: BandScore, max: BandScore): BandScore {
  return capScore(numericToBand(scoreNumeric(score) + 0.4), max);
}

function dropScoreOneTier(score: BandScore, min: BandScore): BandScore {
  return floorScore(numericToBand(scoreNumeric(score) - 0.45), min);
}

/** Detect list-style literature review ("In this article…") like Score 1. */
export function detectLitReviewIsolation(ev: PaperEvidence): boolean {
  const lit = ev.literatureReview.trim() || ev.introRegion;
  if (lit.length < 200) return false;
  const isolationHits =
    (
      lit.match(
        /\b(?:In this article|This article (?:explains|explores|discusses|is a review|is a review of))\b/gi,
      ) ?? []
    ).length;
  const litSentences = lit.split(/[.!?]+\s+/).filter((s) => s.length > 20).length;
  return isolationHits >= 3 && isolationHits / Math.max(litSentences, 1) >= 0.12;
}

/** Method described but results never collected (Score 2 pattern). */
export function detectMethodNotExecuted(ev: PaperEvidence): boolean {
  if (ev.explicitNoDataCollected) return true;
  if (ev.unseenVisual.creditsStudentDataFromText) return false;
  if (ev.hasDataSignals && ev.hasResultsSection) return false;
  const region = `${ev.resultsSection}\n${ev.conclusionSection}\n${ev.fullText}`;
  return /\b(?:was not performed|not performed|regrettably not|hypothetical (?:projected )?results|will be (?:used|outlined) to analyze|not carried out|method outlined .{0,80} was not)\b/i.test(
    region,
  );
}

/** Method choice defended with citations (Score 5 pattern). */
export function detectMethodDefended(ev: PaperEvidence): boolean {
  return detectMethodDefendedShared(ev.methodSection, ev.methodElements);
}

function detectStrongEmpiricalResearch(ev: PaperEvidence): boolean {
  const body = ev.fullText;
  const hasStats =
    ev.distinctStatMethods >= 1 ||
    ev.unseenVisual.hasStatisticalProse ||
    /\b(?:ANOVA|p\s*[<=>]\s*0\.|chi-?square|regression|t-test|statistically significant)\b/i.test(
      body,
    );
  const hasQuantResults =
    /\b\d+(?:\.\d+)?\s*%/.test(body) &&
    /\b(?:results?|found|showed|demonstrated|hypothesis|trial|experiment)\b/i.test(
      body,
    );
  const hasVisualData =
    ev.visualEvidence.figureRefsAnalyzed + ev.visualEvidence.tableRefsAnalyzed >=
    2;
  const hasAppendix =
    ev.visualEvidence.appendixRefs >= 1 ||
    /\bappendix\s+[A-H]\b/i.test(body);
  return (
    (hasStats && hasQuantResults) ||
    (hasVisualData && hasStats) ||
    (hasAppendix && hasQuantResults && ev.methodElements >= 3)
  );
}

export function buildStudentProfile(ev: PaperEvidence): StudentProfile {
  const litIsolation = detectLitReviewIsolation(ev);
  const methodNotExecuted =
    detectMethodNotExecuted(ev) || ev.methodNotExecutedHard;
  const strongEmpirical = detectStrongEmpiricalResearch(ev);
  const hasStudentData = !lacksStudentGeneratedData(ev);
  const executedMethod =
    hasStudentData && !methodNotExecuted && (ev.hasResultsSection || strongEmpirical);
  const statisticalAnalysis =
    ev.distinctStatMethods >= 1 ||
    /\b(?:ANOVA|p\s*[<=>]|chi-?square|regression|t-test)\b/i.test(
      `${ev.methodSection}\n${ev.resultsSection}\n${ev.fullText}`,
    );
  const methodDefended = ev.methodDefended || detectMethodDefended(ev);

  const qualitativeResultsPresent = /\b(?:theme\s+\d|themes?\s+(?:emerged|produced)|representative\s+quote|analysis\s+of\s+(?:the\s+)?\d+\s+interviews?)\b/i.test(
    ev.resultsSection,
  );

  return {
    executedMethod,
    hasStudentData,
    litSynthesis:
      !litIsolation &&
      (ev.multiCitationSentences >= 1 || ev.citationCount >= 10),
    litIsolation,
    methodDefended,
    sophisticatedLimitations: ev.limitationsStrong,
    gapDemonstrated:
      ev.gapQuality === "demonstrated" || ev.borderlineDemonstratedGap,
    qualitativeResultsPresent,
    practicalLimitationsOnly:
      ev.limitationsWeakOnly ||
      (Boolean(ev.limitationsSection.trim()) &&
        !ev.limitationsStrong &&
        /\b(?:sample size|honest|genuine|gender|question quality)\b/i.test(
          ev.limitationsSection,
        )),
    strongImplications: ev.implicationsStrong,
    statisticalAnalysis,
    gapExplicit: ev.gapSentences.length >= 1,
    methodNotExecuted,
    gapCount: ev.gapSentences.length,
    methodElements: ev.methodElements,
    citationCount: ev.citationCount,
    multiCiteSentences: ev.multiCitationSentences,
    strongEmpirical,
  };
}

const CALIBRATION_FEATURE_WEIGHTS: Partial<
  Record<keyof CalibrationFeatures, number>
> = {
  methodDefended: 3.5,
  sophisticatedLimitations: 3.0,
  statisticalAnalysis: 3.0,
  executedMethod: 2.5,
  hasStudentData: 2.5,
  methodNotExecuted: 2.5,
  litIsolation: 2.5,
};

function featureSimilarity(
  student: StudentProfile,
  anchor: CalibrationFeatures,
  officialApScore: number,
): number {
  const keys = Object.keys(anchor) as (keyof CalibrationFeatures)[];
  let match = 0;
  let weight = 0;
  for (const k of keys) {
    const w = CALIBRATION_FEATURE_WEIGHTS[k] ?? 1;
    weight += w;
    if (student[k] === anchor[k]) match += w;
  }

  const gapDemoWeight = 3.0;
  const anchorGapDemonstrated = anchor.gapExplicit && officialApScore >= 4;
  weight += gapDemoWeight;
  if (student.gapDemonstrated === anchorGapDemonstrated) match += gapDemoWeight;

  const richResultsWeight = 3.0;
  const studentRichResults =
    student.statisticalAnalysis || student.qualitativeResultsPresent;
  const anchorRichResults =
    anchor.statisticalAnalysis ||
    (officialApScore >= 4 && anchor.executedMethod && anchor.hasStudentData);
  weight += richResultsWeight;
  if (studentRichResults === anchorRichResults) match += richResultsWeight;

  return match / weight;
}

function shouldRestrictCalibrationAnchors(
  ev: PaperEvidence,
  profile: StudentProfile,
): boolean {
  return (
    lacksStudentGeneratedData(ev) &&
    (ev.methodNotExecutedHard ||
      ev.futureTenseMethodDominant ||
      profile.methodElements < 3) &&
    !ev.inferentialStatsPresent
  );
}

/** Closest calibration paper by feature similarity. */
export function findClosestCalibration(
  profile: StudentProfile,
  options?: { maxOfficialScore?: number },
): CalibrationPaper {
  const pool = options?.maxOfficialScore
    ? ALL_CALIBRATION_PAPERS.filter(
        (p) => p.officialApScore <= options.maxOfficialScore!,
      )
    : ALL_CALIBRATION_PAPERS;
  const candidates = pool.length > 0 ? pool : ALL_CALIBRATION_PAPERS;
  let best = candidates[0];
  let bestScore = -1;
  for (const paper of candidates) {
    const sim = featureSimilarity(
      profile,
      paper.features,
      paper.officialApScore,
    );
    if (sim > bestScore) {
      bestScore = sim;
      best = paper;
    }
  }
  return best;
}

/** At least three categories Mid 4+ and none below Mid 2 (Section 13.4). */
function isClearlyStrongerThanScore3(categories: BandScore[]): boolean {
  const mid4Plus = categories.filter((c) => c.band >= 4).length;
  const anyBelowMid2 = categories.some((c) => c.band < 2);
  return mid4Plus >= 3 && !anyBelowMid2;
}

/** Two+ categories at Mid 2 or below, or asserted gap with undefended method (13.5). */
function isClearlyWeakerThanScore4(
  categories: BandScore[],
  ev: PaperEvidence,
): boolean {
  const weakCount = categories.filter((c) => c.band <= 2).length;
  return (
    weakCount >= 2 ||
    (ev.gapQuality === "asserted" && !ev.methodDefended)
  );
}

function clampCalibrationDelta(original: BandScore, adjusted: BandScore): BandScore {
  const delta = scoreNumeric(adjusted) - scoreNumeric(original);
  if (Math.abs(delta) <= 0.45) return adjusted;
  if (delta > 0) return bumpScoreOneTier(original, makeBand(5, "High"));
  return dropScoreOneTier(original, makeBand(1, "Low"));
}

function isWeakerThanScore4OnLimitationsImplications(
  profile: StudentProfile,
): boolean {
  if (profile.sophisticatedLimitations && profile.strongImplications) {
    return false;
  }
  return (
    profile.practicalLimitationsOnly ||
    (!profile.sophisticatedLimitations && !profile.strongImplications)
  );
}

function hasRichExecutedResearch(profile: StudentProfile): boolean {
  return (
    profile.executedMethod &&
    profile.hasStudentData &&
    profile.statisticalAnalysis &&
    profile.methodElements >= 5
  );
}

/**
 * Calibration adjusts overall only (max one tier). Category scores are unchanged.
 */
export function applyCalibration(
  ev: PaperEvidence,
  categories: BandScore[],
  overall: BandScore,
): CalibrationResult {
  const profile = buildStudentProfile(ev);
  const restrictAnchors = shouldRestrictCalibrationAnchors(ev, profile);
  const closest = findClosestCalibration(profile, {
    maxOfficialScore: restrictAnchors ? 2 : undefined,
  });
  const adjustments: string[] = [];
  const original = { ...overall };
  let hol = { ...overall };

  if (restrictAnchors) {
    adjustments.push(
      "Your paper most closely resembles a College Board paper that received an official score of 1 or 2.",
    );
  }

  if (
    lacksStudentGeneratedData(ev) &&
    scoreNumeric(hol) > scoreNumeric(makeBand(2, "Mid"))
  ) {
    hol = capScore(hol, makeBand(2, "Mid"));
    adjustments.push(
      "Overall capped at Mid 2 — no student-generated data detected; calibration cannot raise the score above this cap.",
    );
  }

  if (
    isClearlyStrongerThanScore3(categories) &&
    hol.band < 3 &&
    !restrictAnchors &&
    !lacksStudentGeneratedData(ev)
  ) {
    hol = clampCalibrationDelta(
      original,
      floorScore(hol, makeBand(3, "Low")),
    );
    adjustments.push(
      "Overall raised one tier — three or more categories at Mid 4+ with no category below Mid 2.",
    );
  }

  if (
    ev.highScoringPaperDetected &&
    profile.methodDefended &&
    (profile.statisticalAnalysis || profile.qualitativeResultsPresent) &&
    hol.band < 4 &&
    !lacksStudentGeneratedData(ev)
  ) {
    hol = clampCalibrationDelta(original, floorScore(hol, makeBand(4, "Low")));
    adjustments.push(
      "High-scoring research profile — overall floored at Low 4.",
    );
  }

  if (isClearlyWeakerThanScore4(categories, ev) && hol.band >= 5) {
    hol = clampCalibrationDelta(
      original,
      capScore(hol, makeBand(4, "High")),
    );
    adjustments.push(
      "Overall capped one tier — profile below Score 4 calibration (weak categories or asserted gap with undefended method).",
    );
  } else if (
    isWeakerThanScore4OnLimitationsImplications(profile) &&
    hol.band >= 5
  ) {
    hol = clampCalibrationDelta(
      original,
      capScore(hol, makeBand(4, "High")),
    );
    adjustments.push(
      "Overall capped one tier — limitations and implications below Score 4 calibration.",
    );
  }

  if (ev.wordCount < 1500 && scoreNumeric(hol) > scoreNumeric(makeBand(2, "Mid"))) {
    hol = clampCalibrationDelta(original, capScore(hol, makeBand(2, "Mid")));
    adjustments.push(
      "Paper body word count is below the typical range for this score level. Length alone does not determine score but very short papers rarely achieve this band.",
    );
  } else if (
    ev.wordCount < 2500 &&
    scoreNumeric(hol) > scoreNumeric(makeBand(3, "High"))
  ) {
    hol = clampCalibrationDelta(original, capScore(hol, makeBand(3, "High")));
    adjustments.push(
      "Paper body word count is below the typical range for this score level. Length alone does not determine score but very short papers rarely achieve this band.",
    );
  }

  if (adjustments.length === 0) {
    adjustments.push(
      `Compared against scoring benchmarks (closest: ${closest.sampleLabel}, official AP score ${closest.officialApScore}).`,
    );
  }

  return {
    categories: categories.map((c) => ({ ...c })),
    overall: hol,
    closestMatch: closest,
    adjustments,
  };
}
