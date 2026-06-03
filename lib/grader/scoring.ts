import type { BandScore, BandTier } from "@/lib/grader/types";
import {
  countParentheticalInText,
  countUniqueAuthorYearNarrative,
} from "@/lib/grader/citations";
import { makeBand } from "@/lib/grader/format";
import { detectStudentGraphSynthesis } from "@/lib/grader/studentGraphSynthesis";
import {
  collectEvidence,
  isBroadQuestion,
  hasQualitativeResultsCollected,
  lacksStudentGeneratedData,
  questionConsistency,
  type PaperEvidence,
} from "@/lib/grader/evidence";
import {
  detectExplicitLiteratureReviewIntro,
  hasInvestigableResearchQuestion,
  isActionResearchFraming,
} from "@/lib/grader/focusRules";
import type { DocumentPartition } from "@/lib/grader/gradingPipeline";
import { applyHardOverallCaps } from "@/lib/grader/overallCaps";
import {
  applyOverallFourQualification,
  applyOverallFiveQualification,
  qualifiesForOverallFive,
} from "@/lib/grader/scoreQualification";
import {
  effectiveIsolationCount,
  scholarlyIsolationCap,
} from "@/lib/grader/highScoringBoost";
import { shouldSuppressPartialExecutionCap } from "@/lib/grader/methodExecution";
import { qualifiesExecutedSpecificResearch } from "@/lib/grader/researchExecutionRules";
import {
  METHOD_CONTENT_MIN_CHARS,
  OVERALL_WEIGHTS,
} from "@/lib/grader/gradingSpec";
import { applyVisualBonuses } from "@/lib/grader/visualEvidence";

function clampBand(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}

function isLowOne(score: BandScore): boolean {
  return score.band === 1 && score.tier === "Low";
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
  const clamped = Math.min(5, Math.max(0, n));
  const band = clampBand(Math.floor(clamped) + 1);
  const frac = clamped - (band - 1);
  let tier: BandTier = "Low";
  if (frac >= 0.55) tier = "High";
  else if (frac >= 0.2) tier = "Mid";
  return makeBand(band, tier);
}

function bumpBand(
  band: 1 | 2 | 3 | 4 | 5,
  steps: number,
  max: 1 | 2 | 3 | 4 | 5,
): 1 | 2 | 3 | 4 | 5 {
  return Math.min(max, Math.max(1, band + steps)) as 1 | 2 | 3 | 4 | 5;
}

function capBandScore(score: BandScore, ceiling: BandScore): BandScore {
  return scoreNumeric(score) > scoreNumeric(ceiling) ? ceiling : score;
}

function reduceScholarlyOneTier(score: BandScore): BandScore {
  if (score.tier === "High") return makeBand(score.band, "Mid");
  if (score.tier === "Mid") return makeBand(score.band, "Low");
  if (score.band > 1) return makeBand((score.band - 1) as 1 | 2 | 3 | 4 | 5, "High");
  return score;
}

function bumpScholarlyOneFullBand(score: BandScore): BandScore {
  const nextBand = clampBand(score.band + 1) as 1 | 2 | 3 | 4 | 5;
  if (nextBand > score.band) {
    return makeBand(nextBand, score.tier === "Low" ? "Mid" : score.tier);
  }
  if (score.tier === "Low") return makeBand(score.band, "Mid");
  if (score.tier === "Mid") return makeBand(score.band, "High");
  return score;
}

function floorScholarlyAtMid3(score: BandScore): BandScore {
  const floor = makeBand(3, "Mid");
  return scoreNumeric(score) < scoreNumeric(floor) ? floor : score;
}

function capFocusWithoutExecutedMethod(score: BandScore, ev: PaperEvidence): BandScore {
  const noMethodSection =
    !ev.methodSection.trim() ||
    ev.methodSection.trim().length < METHOD_CONTENT_MIN_CHARS;
  const methodBase = scoreMethodBase(ev);
  const methodMissingOrLow1 =
    noMethodSection || (methodBase.band === 1 && methodBase.tier === "Low");
  if (
    methodMissingOrLow1 &&
    scoreNumeric(score) > scoreNumeric(makeBand(3, "Mid"))
  ) {
    return capBandScore(score, makeBand(3, "Mid"));
  }
  return score;
}

/** Weighted focus specificity caps (0–4 decimal score from focusRules). */
function capFocusByWeightedSpecificity(
  score: BandScore,
  spec: number,
  ev: PaperEvidence,
): BandScore {
  const rq = (ev.researchQuestions[0] ?? ev.researchQuestionText).trim();
  const hasParsedRq = ev.researchQuestions.length > 0 || rq.length > 0;
  if (!hasParsedRq || ev.highlySpecificFocus) return score;
  if (spec < 1.5) return capBandScore(score, makeBand(2, "Low"));
  if (spec < 2) {
    if (spec >= 1.5 && rq && !isBroadQuestion(rq)) {
      return capBandScore(score, makeBand(3, "Mid"));
    }
    return capBandScore(score, makeBand(2, "Mid"));
  }
  if (spec < 2.5) return capBandScore(score, makeBand(3, "Low"));
  if (spec < 3) return capBandScore(score, makeBand(3, "High"));
  if (spec < 3.5) return capBandScore(score, makeBand(4, "Low"));
  if (spec < 4) return capBandScore(score, makeBand(4, "High"));
  return score;
}

function applyFocusSecondaryDataCaps(score: BandScore, ev: PaperEvidence): BandScore {
  let s = score;
  if (
    lacksStudentGeneratedData(ev) &&
    ev.methodElements < 2 &&
    !ev.hasResultsSection
  ) {
    s = capBandScore(s, makeBand(3, "Mid"));
  }
  if (!ev.hasDetectedSectionHeadings && lacksStudentGeneratedData(ev)) {
    if (ev.focusSpecificityScore >= 4) {
      s = capBandScore(s, makeBand(3, "Mid"));
    } else if (ev.focusSpecificityScore >= 3) {
      s = capBandScore(s, makeBand(2, "Mid"));
    }
  }
  const rq = ev.researchQuestions[0] ?? ev.researchQuestionText;
  if (
    /\b(?:take notice|people take notice|contribut(?:e|ing) to people taking notice|bringing attention|awareness of the issue)\b/i.test(
      rq,
    )
  ) {
    s = capBandScore(s, makeBand(2, "Mid"));
  }
  return s;
}

/** CATEGORY 1 — Focus and Scope */
export function scoreFocusAndScope(ev: PaperEvidence): BandScore {
  const reviewIntro = detectExplicitLiteratureReviewIntro(ev.introRegion);
  const investigableRq = hasInvestigableResearchQuestion(
    ev.introRegion,
    ev.researchQuestionText,
  );

  if (
    reviewIntro &&
    ev.researchQuestions.length === 0 &&
    !ev.highlySpecificFocus
  ) {
    return makeBand(1, "Low");
  }

  const capReviewFocus = (band: BandScore): BandScore => {
    let s = band;
    if (reviewIntro && !investigableRq) {
      s = capBandScore(s, makeBand(2, "Low"));
    }
    s = capFocusWithoutExecutedMethod(s, ev);
    return capFocusByWeightedSpecificity(s, ev.focusSpecificityScore, ev);
  };

  if (ev.exploratoryFramingOnly && ev.researchQuestions.length === 0) {
    return capReviewFocus(makeBand(2, "Low"));
  }

  if (ev.hypothesisOnly && ev.researchQuestions.length === 0) {
    return capReviewFocus(makeBand(3, "Mid"));
  }

  if (
    ev.hypothesisOnly &&
    ev.researchQuestions.length > 0 &&
    !/\?/.test(ev.researchQuestions[0])
  ) {
    return capReviewFocus(
      capBandScore(makeBand(3, "Mid"), makeBand(3, "Mid")),
    );
  }

  if (ev.researchQuestions.length === 0 && ev.focusSpecificityScore === 0) {
    return capReviewFocus(makeBand(1, "Low"));
  }

  const rq = ev.researchQuestions[0] ?? "";
  if (rq && isBroadQuestion(rq)) {
    return capReviewFocus(makeBand(2, "Low"));
  }
  if (rq && isActionResearchFraming(rq)) {
    return capReviewFocus(
      capBandScore(makeBand(3, "Mid"), makeBand(3, "Mid")),
    );
  }

  const hasParsedRq =
    ev.researchQuestions.length > 0 ||
    (ev.researchQuestionText ?? "").trim().length > 0;
  const consistency = questionConsistency(ev);
  const spec = ev.focusSpecificityScore;

  if (hasParsedRq) {
    if (spec >= 4) {
      if (consistency === "drift") {
        return applyFocusSecondaryDataCaps(
          capReviewFocus(makeBand(4, "High")),
          ev,
        );
      }
      return applyFocusSecondaryDataCaps(
        capReviewFocus(makeBand(5, "High")),
        ev,
      );
    }
    if (spec >= 3.5) {
      if (consistency === "drift") {
        return capReviewFocus(makeBand(2, "Mid"));
      }
      return capReviewFocus(makeBand(4, "Mid"));
    }
    if (spec >= 3 && spec < 3.5) {
      return capReviewFocus(makeBand(4, "Mid"));
    }
    if (spec >= 2.5) {
      return capReviewFocus(makeBand(3, "High"));
    }
    if (spec >= 2) {
      return capReviewFocus(makeBand(4, "Low"));
    }
    if (spec >= 1.5) {
      const rqText = (ev.researchQuestions[0] ?? ev.researchQuestionText).trim();
      if (rqText && !isBroadQuestion(rqText)) {
        return capReviewFocus(makeBand(3, "Mid"));
      }
      return capReviewFocus(makeBand(2, "Mid"));
    }
  }

  if (ev.highlySpecificFocus) {
    if (consistency === "narrow" || consistency === "consistent") {
      return applyFocusSecondaryDataCaps(
        capReviewFocus(makeBand(5, "High")),
        ev,
      );
    }
    return applyFocusSecondaryDataCaps(
      capReviewFocus(makeBand(4, "High")),
      ev,
    );
  }

  if (consistency === "drift") {
    return applyFocusSecondaryDataCaps(
      capReviewFocus(makeBand(2, "Mid")),
      ev,
    );
  }
  if (consistency === "consistent") {
    return applyFocusSecondaryDataCaps(
      capReviewFocus(makeBand(4, "Mid")),
      ev,
    );
  }
  if (consistency === "narrow") {
    return applyFocusSecondaryDataCaps(
      capReviewFocus(makeBand(5, "High")),
      ev,
    );
  }
  return applyFocusSecondaryDataCaps(capReviewFocus(makeBand(3, "Mid")), ev);
}

/** CATEGORY 2 — Scholarly Grounding */
export function scoreScholarlyGrounding(ev: PaperEvidence): BandScore {
  const u = ev.citationCount;
  const multi = ev.multiCitationSentences;
  const gaps = ev.gapSentences.length;
  const hasBib = ev.hasBibliography;
  const bibEntries = ev.bibliographyEntryCount;

  const litRegion = ev.literatureReview.trim() || ev.introRegion;
  const parentheticalInLit = countParentheticalInText(litRegion);
  const wellSourcedBib = hasBib && bibEntries >= 8;

  let score: BandScore;

  if (u < 3) score = makeBand(1, "Low");
  else if (u <= 4) score = makeBand(1, "Mid");
  else if (u <= 6) {
    score = multi >= 2 ? makeBand(3, "Mid") : makeBand(2, "Low");
  } else if (u <= 9) {
    if (multi >= 3 && gaps >= 2) score = makeBand(4, "High");
    else if (multi >= 2 && gaps >= 1) score = makeBand(4, "Mid");
    else score = makeBand(3, "Mid");
  } else if (multi >= 5 && gaps >= 2 && hasBib) {
    score = makeBand(5, "High");
  } else if (multi >= 3 && gaps >= 2) {
    score = makeBand(5, "Low");
  } else if (multi >= 2 && gaps >= 1) {
    score = makeBand(4, "High");
  } else {
    score = makeBand(4, "Mid");
  }

  if (ev.scholarlyUndercountLikely) {
    score = makeBand(
      clampBand(score.band + 1) as 1 | 2 | 3 | 4 | 5,
      score.band >= 3 ? "Mid" : score.tier,
    );
  }

  if (
    !wellSourcedBib &&
    u >= 7 &&
    multi < 2 &&
    parentheticalInLit < 2 &&
    score.band >= 4
  ) {
    score = makeBand(3, "Mid");
  }

  if (
    !wellSourcedBib &&
    u >= 5 &&
    multi < 2 &&
    parentheticalInLit < 2 &&
    score.band >= 3
  ) {
    score = makeBand(2, "Mid");
  }

  if (wellSourcedBib && u >= 8 && gaps >= 1 && score.band < 4) {
    score = makeBand(4, multi >= 2 ? "High" : "Mid");
  }

  if (
    ev.gapQuality === "asserted" &&
    !ev.humanitiesDemonstratedGap &&
    !ev.synthesisContrastGap
  ) {
    const assertedCap = ev.highScoringPaperDetected
      ? makeBand(4, "Low")
      : makeBand(3, "Mid");
    score = capBandScore(score, assertedCap);
  } else if (ev.gapQuality === "none") {
    score = capBandScore(score, makeBand(3, "Low"));
  }

  if (ev.humanitiesDemonstratedGap && ev.synthesisIsolationCount < 3) {
    if (u >= 12 && multi >= 4 && gaps >= 1) {
      score = capBandScore(
        bumpScholarlyOneFullBand(score),
        makeBand(5, "Low"),
      );
    } else if (u >= 10 && (multi >= 2 || ev.theoreticalFrameworkSynthesis)) {
      const floor = makeBand(4, multi >= 3 ? "High" : "Mid");
      if (scoreNumeric(score) < scoreNumeric(floor)) {
        score = floor;
      }
    }
  }

  const isoCap = scholarlyIsolationCap(ev);
  if (isoCap) {
    score = capBandScore(score, isoCap);
  } else if (effectiveIsolationCount(ev) >= 1) {
    score = reduceScholarlyOneTier(score);
  }

  if (
    ev.citationCount >= 5 &&
    !detectExplicitLiteratureReviewIntro(ev.introRegion) &&
    score.band < 2
  ) {
    score = makeBand(2, "Low");
  }
  if (
    ev.citationCount >= 5 &&
    ev.gapQuality !== "none" &&
    scoreNumeric(score) < scoreNumeric(makeBand(3, "Mid"))
  ) {
    score = makeBand(3, "Mid");
  }

  if (ev.crossSectionSynthesis && ev.synthesisIsolationCount < 3) {
    score = bumpScholarlyOneFullBand(score);
  }

  const mid3 = makeBand(3, "Mid");
  if (
    ev.bibliographyEntryCount >= 7 &&
    scoreNumeric(score) < scoreNumeric(mid3) &&
    effectiveIsolationCount(ev) < 3
  ) {
    const narrativeCites = countUniqueAuthorYearNarrative(ev.fullText);
    if (narrativeCites >= 6) {
      score = floorScholarlyAtMid3(score);
    }
  }

  const extendedScholarlyPath =
    ev.humanitiesDemonstratedGap ||
    (ev.theoreticalFrameworkSynthesis &&
      /\b(?:education|pedagogy|curriculum|social science|sociology|psychology)\b/i.test(
        litRegion,
      ));

  if (
    (ev.sparseParentheticalInLit || ev.citationStuffing) &&
    !extendedScholarlyPath
  ) {
    score = capBandScore(score, makeBand(3, "Mid"));
  }

  if (ev.literatureReviewOnlyMethod) {
    score = capBandScore(score, makeBand(2, "Mid"));
  }

  const lateIsoCap = scholarlyIsolationCap(ev);
  if (lateIsoCap) {
    score = capBandScore(score, lateIsoCap);
  } else if (
    ev.crossSectionSynthesis &&
    effectiveIsolationCount(ev) <= 1 &&
    ev.borderlineDemonstratedGap
  ) {
    score = capBandScore(
      bumpScholarlyOneFullBand(score),
      makeBand(4, "Mid"),
    );
  }

  if (ev.humanitiesDemonstratedGap && multi < 5) {
    score = capBandScore(score, makeBand(4, "High"));
  }

  if (ev.chicagoFootnoteStyle && ev.bibliographyEntryCount >= 8) {
    const bibFloor = makeBand(4, multi >= 2 ? "Mid" : "Low");
    if (scoreNumeric(score) < scoreNumeric(bibFloor)) {
      score = bibFloor;
    }
    if (ev.theoreticalFrameworkSynthesis || ev.humanitiesDemonstratedGap) {
      const humFloor = makeBand(4, "High");
      if (scoreNumeric(score) < scoreNumeric(humFloor)) {
        score = humFloor;
      }
    }
  }

  return score;
}

function scoreMethodBase(ev: PaperEvidence): BandScore {
  if (
    ev.methodNotExecutedHard ||
    ev.explicitNoDataCollected ||
    (ev.literatureReviewOnlyMethod && !ev.unverifiableLiteratureSynthesisMethod) ||
    ev.futureTenseMethodDominant
  ) {
    return makeBand(1, "Low");
  }

  if (ev.unverifiableLiteratureSynthesisMethod) {
    const graphSynth = detectStudentGraphSynthesis(ev.fullText).detected;
    if (graphSynth) {
      return makeBand(2, "Mid");
    }
    return makeBand(2, "Low");
  }

  if (!ev.methodSection.trim() || ev.methodSection.trim().length < METHOD_CONTENT_MIN_CHARS) {
    return makeBand(1, "Low");
  }

  const el = ev.methodElements;
  let band: 1 | 2 | 3 | 4 | 5;
  let tier: BandTier;

  if (el <= 2) {
    band = el === 0 ? 1 : 2;
    tier = "Low";
  } else if (el <= 4) {
    band = 3;
    tier = "Mid";
  } else if (el <= 6) {
    band = 4;
    tier = "Mid";
  } else {
    band = 5;
    tier = "Low";
  }

  if (el >= 8) {
    band = 5;
    tier = "High";
  } else if (el >= 6 && el <= 7) {
    band = 4;
    tier = "High";
  }

  if (!ev.methodHasResultsAfter && !ev.hasDataSignals) {
    band = clampBand(band - 2) as 1 | 2 | 3 | 4 | 5;
    if (band <= 2) tier = "Low";
  }

  let result = makeBand(band, tier);

  if (el >= 8 && lacksStudentGeneratedData(ev)) {
    result = capBandScore(result, makeBand(2, "Low"));
  }

  if (ev.humanSubjectsNoEthics) {
    result = capBandScore(result, makeBand(3, "Mid"));
  }

  if (!ev.methodDefended) {
    result = capBandScore(result, makeBand(3, "Mid"));
  }

  if (
    ev.methodPartialExecution &&
    !shouldSuppressPartialExecutionCap(ev, !lacksStudentGeneratedData(ev))
  ) {
    result = capBandScore(result, makeBand(2, "Low"));
  }

  if (ev.rigorousSimulationMethod) {
    const floor = makeBand(3, "Mid");
    if (scoreNumeric(result) < scoreNumeric(floor)) {
      result = floor;
    }
  }

  if (ev.unverifiableLiteratureSynthesisMethod) {
    const graphSynth = detectStudentGraphSynthesis(ev.fullText).detected;
    result = capBandScore(
      result,
      graphSynth ? makeBand(2, "Mid") : makeBand(2, "Low"),
    );
  }

  if (ev.correlationStudyExecuted && ev.studentResultsSignals >= 1) {
    const corrFloor = makeBand(3, "Mid");
    if (scoreNumeric(result) < scoreNumeric(corrFloor)) {
      result = corrFloor;
    }
  }

  return result;
}

function applyMethodStatBoost(base: BandScore, ev: PaperEvidence): BandScore {
  if (
    ev.methodNotExecutedHard ||
    (ev.methodPartialExecution &&
      !shouldSuppressPartialExecutionCap(ev, !lacksStudentGeneratedData(ev)))
  ) {
    return base;
  }
  if (ev.distinctStatMethods >= 3) {
    return makeBand(
      bumpBand(base.band, 1, 5),
      base.band >= 4 ? "High" : "Mid",
    );
  }
  return base;
}

function tierAfterBump(
  base: BandScore,
  newBand: 1 | 2 | 3 | 4 | 5,
): BandTier {
  if (newBand > base.band) return newBand >= 4 ? "High" : "Mid";
  if (newBand < base.band) return "Low";
  return base.tier;
}

/** CATEGORY 3 — Method and Replicability (base; visual applied in scoreAllCategories). */
export function scoreMethodAndReplicability(ev: PaperEvidence): BandScore {
  return applyMethodStatBoost(scoreMethodBase(ev), ev);
}

function scoreArgumentBase(ev: PaperEvidence): BandScore {
  if (lacksStudentGeneratedData(ev)) {
    return makeBand(1, "Low");
  }

  const textOnlyVisualData = ev.unseenVisual.creditsStudentDataFromText;
  const noVisibleNumbers =
    ev.resultsSignals === 0 && !ev.unseenVisual.hasVisibleNumericalData;

  if (
    !textOnlyVisualData &&
    (!ev.resultsSection.trim() || ev.resultsSignals === 0)
  ) {
    return makeBand(1, "Low");
  }

  if (textOnlyVisualData && noVisibleNumbers) {
    let band: 1 | 2 | 3 | 4 | 5 = 2;
    let tier: BandTier = "Mid";
    if (ev.unseenVisual.hasAnalyticalVisualProse || ev.unseenVisual.hasStatisticalProse) {
      band = 3;
      tier = "Mid";
    }
    if (ev.limitationsStrong) {
      band = clampBand(band + 1) as 1 | 2 | 3 | 4 | 5;
    }
    if (ev.implicationsMissing) {
      band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
    }
    return makeBand(clampBand(band), tier);
  }

  const sig = ev.resultsSignals;
  let band: 1 | 2 | 3 | 4 | 5;
  let tier: BandTier;

  if (sig <= 1) {
    band = 2;
    tier = "Low";
  } else if (sig <= 3) {
    band = 3;
    tier = "Mid";
  } else if (sig <= 6) {
    band = 4;
    tier = "Mid";
  } else if (sig <= 10) {
    band = 4;
    tier = "High";
  } else {
    band = 5;
    tier = "Mid";
  }

  if (!ev.limitationsSection.trim()) {
    if (tier === "High") tier = "Mid";
    else if (tier === "Mid") tier = "Low";
    else band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  } else if (ev.limitationsStrong) {
    band = clampBand(band + 1) as 1 | 2 | 3 | 4 | 5;
    if (band >= 4) tier = "High";
  } else if (ev.limitationsWeakOnly) {
    band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  }

  if (ev.implicationsMissing || ev.weakImplications) {
    band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  } else if (ev.implicationsStrong) {
    band = clampBand(Math.min(5, band + 1)) as 1 | 2 | 3 | 4 | 5;
  }

  if (ev.descriptiveOnlyResults && band > 3) {
    band = 3;
    tier = "Mid";
  }

  if (ev.limitationsWeakOnly && band >= 5) {
    band = 4;
    tier = "High";
  }

  let result = makeBand(clampBand(band), tier);

  if (ev.simulationEmpiricalResults) {
    const floor = makeBand(3, "Mid");
    if (scoreNumeric(result) < scoreNumeric(floor)) {
      result = floor;
    }
  }

  if (ev.unverifiableLiteratureSynthesisMethod) {
    const extensiveSecondaryAnalysis =
      !lacksStudentGeneratedData(ev) && ev.studentResultsSignals >= 10;
    result = capBandScore(
      result,
      extensiveSecondaryAnalysis ? makeBand(2, "Mid") : makeBand(2, "Low"),
    );
  }

  if (ev.priorAuthorResultsRatio > 0.3) {
    result = capBandScore(result, makeBand(2, "Mid"));
  }

  if (
    ev.descriptiveOnlyResults &&
    hasQualitativeResultsCollected(ev.resultsSection, ev.fullText)
  ) {
    const floor = makeBand(4, "Low");
    if (scoreNumeric(result) < scoreNumeric(floor)) {
      result = floor;
    }
  }

  const humanitiesCloseReading =
    ev.humanitiesDemonstratedGap ||
    ev.theoreticalFrameworkSynthesis ||
    ev.contentAnalysisExecuted ||
    /\b(?:close reading|textual evidence|primary sources?|interpretive conclusions?)\b/i.test(
      `${ev.resultsSection}\n${ev.literatureReview}`,
    );
  if (ev.descriptiveOnlyResults && humanitiesCloseReading && band < 4) {
    band = 4;
    tier = "Low";
    result = makeBand(band, tier);
  }

  if (ev.contradictoryFindingHandled) {
    const bumped = makeBand(
      clampBand(result.band + 1) as 1 | 2 | 3 | 4 | 5,
      result.band >= 3 ? "High" : "Mid",
    );
    if (scoreNumeric(bumped) > scoreNumeric(result)) {
      result = bumped;
    }
  }

  return result;
}

function capArgumentAtMid2(band: number, tier: BandTier): BandScore {
  if (band > 2) return makeBand(2, "Mid");
  if (band === 2 && tier === "High") return makeBand(2, "Mid");
  return makeBand(band as 1 | 2 | 3 | 4 | 5, tier);
}

/** Non-significant-only and unexecuted components — cap Argument at Mid 2 max. */
function applyArgumentEvidencePenalties(
  score: BandScore,
  ev: PaperEvidence,
): BandScore {
  let band = score.band;
  let tier = score.tier;

  if (ev.nonSignificantOnlyFinding) {
    band = clampBand(band - 2) as 1 | 2 | 3 | 4 | 5;
    const capped = capArgumentAtMid2(band, tier);
    band = capped.band;
    tier = capped.tier;
  }

  if (ev.plannedComponentNotExecuted) {
    band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
    const capped = capArgumentAtMid2(band, tier);
    band = capped.band;
    tier = capped.tier;
  }

  return makeBand(band, tier);
}

/** CATEGORY 4 — Argument and Evidence (base; visual applied in scoreAllCategories). */
export function scoreArgumentAndEvidence(ev: PaperEvidence): BandScore {
  return scoreArgumentBase(ev);
}

/** CATEGORY 5 — Communication and Citation */
export function scoreCommunication(ev: PaperEvidence): BandScore {
  const cites = ev.citationCount;
  let band: 1 | 2 | 3 | 4 | 5 = 1;
  let tier: BandTier = "Low";

  if (cites < 3) {
    return makeBand(1, "Low");
  }
  if (cites <= 7) {
    band = 3;
    tier = ev.styleInconsistent ? "Low" : "Mid";
  } else if (cites <= 15) {
    band = 4;
    tier = ev.styleInconsistent ? "Mid" : "Mid";
  } else {
    band = 5;
    tier = ev.hasBibliography && !ev.styleInconsistent ? "Low" : "Mid";
    if (ev.hasBibliography && !ev.styleInconsistent) tier = "High";
  }

  if (ev.styleInconsistent) {
    band = clampBand(Math.max(1, band - 2)) as 1 | 2 | 3 | 4 | 5;
    tier = "Low";
  }

  const bodyWords = Math.max(ev.fullText.split(/\s+/).length, 1);
  const bodyParenthetical = countParentheticalInText(ev.fullText);
  if (
    !ev.chicagoFootnoteStyle &&
    ev.hasBibliography &&
    bodyParenthetical / bodyWords < 1 / 200
  ) {
    if (tier === "High") tier = "Mid";
    else if (tier === "Mid") tier = "Low";
    else band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  }

  if (ev.citationStuffing) {
    band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  }

  if (ev.missingReferencedAppendix) {
    if (tier === "High") tier = "Mid";
    else if (tier === "Mid") tier = "Low";
    else band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  }

  if (
    !ev.functionalRegionsLocated &&
    !ev.hasDetectedSectionHeadings &&
    ev.wordCount > 2000
  ) {
    if (tier === "High") tier = "Mid";
    else if (tier === "Mid") tier = "Low";
  }

  if (
    band <= 2 &&
    ev.citationCount >= 5 &&
    ev.hasBibliography &&
    !ev.styleInconsistent
  ) {
    band = 3;
    tier = "Mid";
  }

  if (!ev.hasBibliography && cites >= 5) {
    band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  }

  const asl = ev.avgSentenceLength;
  if (asl > 40 || (asl > 0 && asl < 8)) {
    band = clampBand(band - 1) as 1 | 2 | 3 | 4 | 5;
  }

  return makeBand(band, tier);
}

/** Apply holistic caps (Priorities 2–10). Returns updated categories and overall. */
export function applyEvidenceOverallCaps(
  categories: BandScore[],
  overall: BandScore,
  ev: PaperEvidence,
): BandScore {
  return applyHardOverallCaps(categories, overall, ev).overall;
}

export function applyEvidenceCategoryAndOverallCaps(
  categories: BandScore[],
  overall: BandScore,
  ev: PaperEvidence,
) {
  return applyHardOverallCaps(categories, overall, ev);
}

/**
 * Holistic overall — weighted mean (GRADING_SPEC §K1) plus hard combo rules.
 */
export function scoreOverall(categories: BandScore[]): BandScore {
  const focus = categories[0];
  const scholarly = categories[1];
  const method = categories[2];
  const argument = categories[3];
  const communication = categories[4];

  if (isLowOne(focus) && isLowOne(argument)) {
    return makeBand(1, "Low");
  }
  if (isLowOne(method) && isLowOne(argument)) {
    return makeBand(1, "Low");
  }
  if (method.band === 1 && argument.band === 1) {
    return makeBand(1, "Low");
  }
  if (isLowOne(scholarly) && isLowOne(argument)) {
    return makeBand(1, "Low");
  }

  let holistic =
    scoreNumeric(focus) * OVERALL_WEIGHTS.focus +
    scoreNumeric(scholarly) * OVERALL_WEIGHTS.scholarly +
    scoreNumeric(method) * OVERALL_WEIGHTS.method +
    scoreNumeric(argument) * OVERALL_WEIGHTS.argument +
    scoreNumeric(communication) * OVERALL_WEIGHTS.communication;

  let ceiling = 5;
  if (method.band === 1) {
    ceiling = Math.min(ceiling, scoreNumeric(makeBand(2, "Mid")));
  }
  if (isLowOne(argument)) {
    ceiling = Math.min(ceiling, scoreNumeric(makeBand(2, "Mid")));
  }
  if (isLowOne(scholarly)) {
    ceiling = Math.min(ceiling, scoreNumeric(makeBand(3, "Mid")));
  }

  holistic = Math.min(ceiling, holistic);

  if (
    isLowOne(focus) &&
    isLowOne(communication) &&
    scoreNumeric(focus) < scoreNumeric(makeBand(3, "Mid")) &&
    scoreNumeric(communication) < scoreNumeric(makeBand(3, "Mid"))
  ) {
    holistic = Math.min(holistic, scoreNumeric(makeBand(3, "Low")));
  }

  const allMid4Plus = categories.every((c) => c.band >= 4);
  const allMid3Plus = categories.every((c) => c.band >= 3);
  if (allMid4Plus && holistic < scoreNumeric(makeBand(4, "Low"))) {
    holistic = scoreNumeric(makeBand(4, "Low"));
  } else if (allMid3Plus && holistic < scoreNumeric(makeBand(3, "Low"))) {
    holistic = scoreNumeric(makeBand(3, "Low"));
  }

  return numericToBand(holistic);
}

export function finalizeOverallScore(
  categories: BandScore[],
  overall: BandScore,
  ev: PaperEvidence,
): BandScore {
  let hol = applyOverallFiveQualification(overall, categories, ev);
  hol = applyOverallFourQualification(hol, categories, ev);
  if (!qualifiesForOverallFive(categories, ev) && hol.band >= 5) {
    hol = capBandScore(hol, makeBand(4, "High"));
  }
  if (ev.highScoringPaperDetected) {
    const floor = makeBand(3, "Low");
    if (scoreNumeric(hol) < scoreNumeric(floor)) {
      hol = floor;
    }
  }
  if (
    ev.unverifiableLiteratureSynthesisMethod &&
    detectStudentGraphSynthesis(ev.fullText).detected &&
    !lacksStudentGeneratedData(ev) &&
    ev.studentResultsSignals >= 10 &&
    categories.every((c) => c.band >= 2) &&
    categories.filter((c) => c.band >= 3).length >= 2
  ) {
    const synthesisFloor = makeBand(3, "Low");
    if (scoreNumeric(hol) < scoreNumeric(synthesisFloor)) {
      hol = synthesisFloor;
    }
  }
  return hol;
}

export function computeConfidence(
  categories: BandScore[],
  ev?: PaperEvidence,
): {
  level: "HIGH" | "MEDIUM" | "LOW";
  explanation: string | null;
} {
  const bands = categories.map((c) => c.band);
  const spread = Math.max(...bands) - Math.min(...bands);
  const notes: string[] = [];

  if (ev?.gapQuality === "asserted") {
    notes.push("Gap quality is asserted rather than fully demonstrated.");
  }
  if (ev?.unusualDocumentStructure) {
    notes.push("Unusual document structure detected.");
  }
  if (ev?.usesFootnotesExtensively) {
    notes.push("Footnote-heavy citation style may be incompletely detected.");
  }

  let level: "HIGH" | "MEDIUM" | "LOW" = "HIGH";

  if (spread >= 3) {
    level = "LOW";
    notes.push(
      "Scores across categories span three or more bands without a single coherent performance pattern.",
    );
  } else if (spread >= 2) {
    level = "MEDIUM";
    notes.push("Scores across categories span two or more bands.");
  }

  if (notes.length > 0 && level === "HIGH") {
    level = "MEDIUM";
  }

  return {
    level,
    explanation: notes.length > 0 ? notes.join(" ") : null,
  };
}

export function buildVisualFlags(ev: PaperEvidence): string[] {
  const flags: string[] = [];
  const v = ev.visualEvidence;
  const u = ev.unseenVisual;

  const hasVisuals =
    v.figureRefsAnalyzed + v.tableRefsAnalyzed + v.chartRefs > 0 ||
    v.appendixRefs > 0 ||
    u.hasVisualLabelReferences;

  if (u.visualRefsWithoutVisibleNumbers) {
    flags.push(
      "This paper appears to contain visual data such as figures, tables, or charts that could not be read by the engine. If your paper contains images or embedded tables, some data may not have been captured in this analysis. Scores for Argument and Evidence and Method and Replicability may be slightly underestimated as a result.",
    );
  } else if (hasVisuals && v.inTextDiscussionCount === 0 && !u.hasAnalyticalVisualProse) {
    flags.push(
      "Paper contains visual data that may not be fully analyzed in the text — if your paper has tables or figures make sure they are discussed and interpreted in the prose.",
    );
  }

  if (v.alignmentSignal && (v.inTextDiscussionCount > 0 || u.hasAnalyticalVisualProse)) {
    flags.push(
      "Visual evidence appears well connected to the research question.",
    );
  }

  return flags;
}

export function scoreAllCategories(input: string | DocumentPartition): {
  evidence: PaperEvidence;
  categories: BandScore[];
} {
  const evidence = collectEvidence(input);

  const methodBase = applyMethodStatBoost(scoreMethodBase(evidence), evidence);
  const argumentBase = scoreArgumentBase(evidence);

  const { methodBand, argumentBand } = applyVisualBonuses(
    methodBase,
    argumentBase,
    evidence.visualEvidence,
    evidence.methodElements,
    evidence.resultsSignals,
    evidence.unseenVisual.creditsStudentDataFromText,
    evidence.unseenVisual.hasAnalyticalVisualProse ||
      evidence.unseenVisual.hasStatisticalProse,
  );

  const argumentAfterVisual = makeBand(
    argumentBand,
    tierAfterBump(argumentBase, argumentBand),
  );
  const argumentFinal = applyArgumentEvidencePenalties(
    argumentAfterVisual,
    evidence,
  );

  const categories = [
    scoreFocusAndScope(evidence),
    scoreScholarlyGrounding(evidence),
    makeBand(methodBand, tierAfterBump(methodBase, methodBand)),
    argumentFinal,
    scoreCommunication(evidence),
  ];
  return { evidence, categories };
}
