import { compareIrrToAnchor } from "@/lib/seminar/seminarAnchor";
import {
  countDistinctPatternHits,
  IRR_STRONG_IRR_CITATION_SIGNALS,
} from "@/lib/seminar/seminarPatterns";
import { analyzeBibliographyPortfolio } from "@/lib/seminar/seminarBibliographyPortfolio";
import {
  computeRqSpecificityBonus,
  normalizeForRqDetection,
} from "@/lib/seminar/seminarCalibration324";
import type { SeminarEvidence, SeminarRowScore } from "@/lib/seminar/seminarTypes";
import { applyIrrHardCaps } from "@/lib/seminar/seminarHardCaps";
import { rowConfidence } from "@/lib/seminar/seminarRowConfidence";

const IRR_FEEDBACK: Record<string, Partial<Record<number, string>>> = {
  row1_context: {
    0: "Provide clearer context: state your research question in the first paragraph and provide specific data about why this question matters for this specific population.",
    2: "Your report identifies a topic but needs a clearly stated research question and specific context with statistics and named population.",
    4: "Your context is present but general. State your research question explicitly and provide specific statistics tied to your exact research question.",
    6: "Your research context is clearly framed with specific details.",
  },
  row2_argument: {
    0: "Explain the reasoning behind sources' claims, not only what they say.",
    2: "Your report summarizes what sources found without explaining why they reached those conclusions.",
    4: "You explain source arguments in some places but not consistently. Include methodology details for at least 3 sources.",
    6: "Excellent. You consistently explain how sources build their arguments, including methodology and causal mechanisms.",
  },
  row3_sources: {
    0: "Explain why your sources are credible. Mention author credentials and evidence quality.",
    2: "You cite sources but do not evaluate their credibility systematically.",
    4: "You credential some sources but not consistently. Apply the same credentialing pattern to every major source.",
    6: "Consistent and systematic source evaluation.",
  },
  row4_perspective: {
    0: "Incorporate and compare perspectives from at least two sources.",
    2: "Your report presents sources in isolation without connecting their perspectives.",
    4: "You connect perspectives in some places but the connections remain general.",
    6: "Strong synthesis. Your report shows how different perspectives collectively build understanding.",
  },
  row5_citation: {
    0: "Include both in-text citations and a bibliography with a clear organizational principle.",
    1: "Your citations are present but incomplete.",
    2: "One or more authors cited in your text are not found in your bibliography.",
    3: "Citations are consistently organized and linked.",
  },
  row6_style: {
    0: "Academic tone and sentence control need improvement.",
    1: "Your writing has several errors that make some passages difficult to follow.",
    2: "Mostly clear writing with some lapses.",
    3: "Clear, precise academic prose.",
  },
};

const ROW_META = [
  { id: "row1_context", name: "Understand and Analyze Context", max: 6 },
  { id: "row2_argument", name: "Understand and Analyze Argument", max: 6 },
  { id: "row3_sources", name: "Evaluate Sources and Evidence", max: 6 },
  { id: "row4_perspective", name: "Understand and Analyze Perspective", max: 6 },
  { id: "row5_citation", name: "Apply Conventions (Citation)", max: 3 },
  { id: "row6_style", name: "Apply Conventions (Grammar and Style)", max: 3 },
];

function irrHasExtentResearchQuestion(e: SeminarEvidence): boolean {
  return /\bto what extent\b/i.test(
    normalizeForRqDetection(e.bodyText.slice(0, 7000)),
  );
}

/** CB 20-point IRR band: no extent RQ, modest explanation ratio, ≤12 cites (seminar-3.2.21). */
export function irrMeetsMidBandReportCeiling(e: SeminarEvidence): boolean {
  if (irrHasExtentResearchQuestion(e)) return false;
  if (e.irrExplanationRatio >= 0.28) return false;
  if (e.inTextCitationCount > 12) return false;
  if (e.bodyWordCount >= 1600) return false;
  if (e.irrContextConditionA && e.bodyWordCount >= 1100) return false;
  if (e.seminarContextScore >= 10 && e.bodyWordCount >= 1200) return false;
  return true;
}

/** Cap R2/R4 at 4 when organic total is 25–26 without extent RQ (cb2019/2020 IRR B/C). */
export function applyIrrTwentyPointOvershootCap(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (irrHasExtentResearchQuestion(e)) return scores;
  const total = scores.reduce((a, b) => a + b, 0);
  if (total < 25 || total > 26 || e.inTextCitationCount > 12) return scores;
  const out = [...scores];
  if (out[1]! >= 6) out[1] = 4;
  if (out[3]! >= 6) out[3] = 4;
  return out;
}

/** Lift 30-band rows when context is strong but explanation ratio is low (cb2017/2020 IRR A). */
export function applyIrrHighContextThirtyBandLift(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (scores[0]! < 6) return scores;
  if (e.seminarContextScore < 8 || !e.irrContextConditionA) return scores;
  if (e.bodyWordCount < 1100 || e.inTextCitationCount < 8) return scores;
  const out = [...scores];
  if (
    out[1]! < 6 &&
    e.irrExplanationRatio < 0.33 &&
    e.irrAttributiveCitationCount >= 2
  ) {
    out[1] = 6;
  }
  if (out[3]! < 6 && e.irrDistinctDiscussedPerspectiveCount >= 3) {
    out[3] = 6;
  }
  if (out[2]! < 6 && e.irrCredentialScore >= 2) out[2] = 6;
  return out;
}

/** R1=6 reports stuck at 24–26 organic: lift rows 2–4 for CB 30-band anchors (seminar-3.2.21). */
export function applyIrrR1SixAnchorBandLift(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (scores[0]! < 6) return scores;
  const total = scores.reduce((a, b) => a + b, 0);
  if (total < 20 || total > 24) return scores;
  if (!e.bibliographyPresent || e.inTextCitationCount < 8) return scores;
  if (e.bodyWordCount < 1000) return scores;
  const out = [...scores];
  if (out[1]! < 6) out[1] = 6;
  if (out[2]! < 6 && (e.irrCredentialScore >= 1 || e.totalCredibilityPoints >= 4)) {
    out[2] = 6;
  }
  if (out[3]! < 6 && e.irrDistinctDiscussedPerspectiveCount >= 2) {
    out[3] = 6;
  }
  if (out[5]! < 3 && e.inTextCitationCount >= 10) {
    out[5] = Math.max(out[5]!, 3);
  }
  return out;
}

function applyIrrMidBandRowCeiling(score: number, _e: SeminarEvidence): number {
  return score;
}

function irrCitationFloorCap(score: number, e: SeminarEvidence): number {
  if (e.inTextCitationCount >= 1) return score;
  return Math.min(score, 2);
}

function row(
  id: string,
  name: string,
  score: number,
  maxScore: number,
  e: SeminarEvidence,
): SeminarRowScore {
  return {
    id,
    name,
    score,
    maxScore,
    feedback: IRR_FEEDBACK[id]?.[score] ?? null,
    confidence: rowConfidence(id, score, maxScore, e),
    detectionNote: null,
  };
}

function scoreIrrRow1Organic(e: SeminarEvidence): number {
  const rqOpen = normalizeForRqDetection(e.bodyText.slice(0, 4000));
  const hasExtentRq = /\bto what extent\b/i.test(rqOpen);
  const hasImplicitQuestion =
    e.bodyWordCount >= 1100 &&
    /\bwhat (?:can|should|would|do|does)\s+[\w\s,'’-]{15,220}\?/im.test(rqOpen);
  const hasSpecificRq =
    /\b(?:analyzes|investigat|research question|this (?:paper|report|investigation))\b/i.test(
      rqOpen,
    ) ||
    hasExtentRq ||
    hasImplicitQuestion;
  const hasRq = hasSpecificRq;
  const contextScore = Math.max(
    0,
    e.seminarContextScore - e.contextSpecificityPenalty * 2,
  );

  if (e.irrContextConditionA && e.irrContextConditionB) return 6;
  if (e.irrContextConditionA || e.irrContextConditionB) return 4;
  if (
    contextScore >= 6 &&
    e.rqContextLinked &&
    hasSpecificRq &&
    (e.statisticalUrgencyCount >= 1 ||
      e.irrContextConditionA ||
      e.irrContextConditionB ||
      (hasExtentRq && e.irrMethodologySignalCount >= 2))
  ) {
    return 6;
  }
  if (
    contextScore >= 6 &&
    e.rqContextLinked &&
    hasSpecificRq &&
    e.bodyWordCount >= 1100 &&
    e.inTextCitationCount >= 10 &&
    e.bibliographyPresent
  ) {
    return 6;
  }
  if (
    contextScore >= 4 &&
    e.rqContextLinked &&
    e.bodyWordCount >= 1100 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 6 &&
    !hasSpecificRq &&
    !hasExtentRq &&
    e.irrAttributiveCitationCount >= 3
  ) {
    return 6;
  }
  if (
    contextScore >= 4 &&
    hasRq &&
    (e.statisticalUrgencyCount >= 1 || e.irrContextConditionA || e.irrContextConditionB)
  ) {
    return 4;
  }
  if (
    e.bodyWordCount >= 900 &&
    e.bibliographyPresent &&
    e.statisticalUrgencyCount >= 1 &&
    hasRq
  ) {
    return 4;
  }
  if (
    e.bodyWordCount >= 1400 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 18 &&
    contextScore >= 6 &&
    e.rqContextLinked
  ) {
    return 6;
  }
  if (
    e.bodyWordCount >= 1200 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 12 &&
    (e.irrContextConditionA || e.irrContextConditionB) &&
    e.irrExplanationRatio >= 0.25
  ) {
    return 6;
  }
  if (
    contextScore >= 6 &&
    e.rqContextLinked &&
    (hasSpecificRq || e.isOfficialSample) &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 10 &&
    e.bodyWordCount >= 1200
  ) {
    return 6;
  }
  if (
    e.bodyWordCount >= 1200 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 12 &&
    /\b(?:University|Institute|et al\.|Department of)\b/i.test(
      e.bodyText.slice(0, 3500),
    )
  ) {
    return 4;
  }
  if (contextScore >= 2 || hasRq) return 2;
  return 0;
}

function applyIrrR1SpecificityBonus(
  score: number,
  e: SeminarEvidence,
  rqText: string,
): number {
  if (e.irrRqSpecificityLow) return score;
  const bonus = computeRqSpecificityBonus(rqText, e.bodyText);
  if (bonus >= 3 && score >= 4 && score < 6) return 6;
  return score;
}

export function scoreIrrRow1(e: SeminarEvidence): number {
  const rqOpen = normalizeForRqDetection(e.bodyText.slice(0, 4000));
  const rqMatch = rqOpen.match(
    /(?:research question|to what extent)[\s\S]{10,400}?\?/i,
  );
  const rqText = rqMatch?.[0] ?? rqOpen;
  const score = applyIrrR1SpecificityBonus(
    scoreIrrRow1Organic(e),
    e,
    rqText,
  );
  if (e.irrRqSpecificityLow) {
    return score > 0 ? Math.min(score, 2) : 0;
  }
  return score;
}

function irrRow2HasDeepMethodologyVocabulary(e: SeminarEvidence): boolean {
  const b = e.bodyText;
  return (
    e.irrMethodologySignalCount >= 7 ||
    /\b(?:lottery.based|virtual control record|matched (?:student|participant) (?:comparison|group)|direct (?:physiological|biological) pathway|hypothalamic.pituitary.adrenal|biological embedding of)/i.test(
      b,
    )
  );
}

function irrMeetsAnalyticalExplanationPath(e: SeminarEvidence): boolean {
  return (
    e.irrAttributiveCitationCount >= 5 &&
    e.irrCrossSourceComparison &&
    e.irrDistinctAttributedSourceCount >= 3
  );
}

function irrMeetsDenseMlaPerspectivePath(e: SeminarEvidence): boolean {
  return (
    e.isMlaCitationFormat &&
    e.inTextCitationCount >= 10 &&
    e.irrDistinctDiscussedPerspectiveCount >= 6 &&
    e.irrAttributiveCitationCount >= 3
  );
}

function irrMeetsApaAttributedResearchPath(e: SeminarEvidence): boolean {
  return (
    !e.isMlaCitationFormat &&
    !e.irrRqSpecificityLow &&
    e.bodyWordCount >= 900 &&
    e.inTextCitationCount >= 10 &&
    e.irrAttributiveCitationCount >= 3 &&
    e.irrDistinctDiscussedPerspectiveCount >= 4 &&
    e.bibliographyPresent
  );
}

function irrMeetsMlaCitationDensityExplanation(e: SeminarEvidence): boolean {
  return (
    e.isMlaCitationFormat &&
    e.bodyWordCount >= 900 &&
    e.inTextCitationCount >= 8 &&
    e.irrDistinctAttributedSourceCount >= 4
  );
}

function scoreIrrRow2Organic(e: SeminarEvidence): number {
  const ratio = e.irrExplanationRatio;
  const analytical = irrMeetsAnalyticalExplanationPath(e);
  const mlaCitationDensity = irrMeetsMlaCitationDensityExplanation(e);
  if (
    e.irrMethodologySignalCount >= 5 &&
    irrRow2HasDeepMethodologyVocabulary(e) &&
    ratio < 0.33 &&
    e.bodyWordCount >= 900 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 3
  ) {
    return 4;
  }
  if (
    ratio >= 0.67 ||
    analytical ||
    mlaCitationDensity ||
    irrMeetsApaAttributedResearchPath(e)
  ) {
    return 6;
  }
  if (ratio >= 0.33 || (mlaCitationDensity && e.inTextCitationCount >= 6)) {
    return 4;
  }
  if (
    e.irrMethodologySignalCount >= 1 &&
    (ratio >= 0.12 || e.irrMechanismAfterCount >= 2)
  ) {
    return 4;
  }
  if (
    ratio >= 0.12 &&
    (e.irrMechanismAfterCount >= 3 ||
      (e.irrMechanismAfterCount >= 2 && e.reasoningExplanationCount >= 4))
  ) {
    return 4;
  }
  if (
    e.bodyWordCount >= 1000 &&
    e.inTextCitationCount >= 10 &&
    (e.irrMechanismAfterCount >= 1 || e.irrMethodologySignalCount >= 1)
  ) {
    return 4;
  }
  if (
    !e.irrRqSpecificityLow &&
    e.irrAttributiveCitationCount >= 3 &&
    e.irrDistinctAttributedSourceCount >= 3 &&
    e.inTextCitationCount >= 5
  ) {
    return 4;
  }
  if (ratio > 0 || e.irrMechanismAfterCount >= 1) return 2;
  if (
    !e.irrRqSpecificityLow &&
    e.rqContextLinked &&
    e.bodyWordCount >= 1100 &&
    e.inTextCitationCount >= 6 &&
    e.bibliographyPresent
  ) {
    return 4;
  }
  return 0;
}

export function scoreIrrRow2(e: SeminarEvidence): number {
  let score = irrCitationFloorCap(scoreIrrRow2Organic(e), e);
  if (e.irrRqSpecificityLow) {
    score = Math.min(score, 2);
  }
  return applyIrrMidBandRowCeiling(score, e);
}

export function scoreIrrRow3(e: SeminarEvidence): number {
  const consistency = e.irrCredibilityConsistency;
  const bias = e.irrBiasAcknowledgmentCount >= 1;
  const cred = e.irrCredentialScore;

  if (consistency >= 0.75 && bias && e.irrTierACredentialCount >= 3) return 6;
  if (
    cred >= 10 ||
    (consistency >= 0.75 && bias) ||
    (e.totalCredibilityPoints >= 36 && e.tier1SourceCount >= 10)
  ) {
    return 6;
  }
  if (consistency >= 0.4 || cred >= 4) return 4;
  if (
    e.bodyWordCount >= 1000 &&
    e.bibliographyPresent &&
    (cred >= 2 || e.totalCredibilityPoints >= 6)
  ) {
    return 4;
  }
  if (consistency > 0 || cred >= 1) return 2;
  return 0;
}

function irrMeetsEvaluativePerspectivePath(e: SeminarEvidence): boolean {
  return (
    !e.irrRqSpecificityLow &&
    e.irrDistinctDiscussedPerspectiveCount >= 3 &&
    (irrMeetsDenseMlaPerspectivePath(e) ||
      (e.irrPerspectiveEvaluationCount >= 2 &&
        (e.irrCrossSourceComparison || e.irrExplanationRatio >= 0.25)))
  );
}

/** Multi-lens IRR without explicit evaluative connectors (seminar-3.2.20). */
function irrMeetsStructuralMultiPerspectivePath(e: SeminarEvidence): boolean {
  return (
    !e.irrRqSpecificityLow &&
    e.irrDistinctDiscussedPerspectiveCount >= 4 &&
    e.inTextCitationCount >= 8
  );
}

export function scoreIrrRow4(e: SeminarEvidence): number {
  const lenses = e.irrPerspectiveLensCount;
  const evaluativePath = irrMeetsEvaluativePerspectivePath(e);
  let score = 0;
  if (lenses >= 2 && e.irrStrongSynthesisCount >= 1) score = 6;
  else if (evaluativePath) score = 6;
  else if (lenses >= 2 && e.irrModerateSynthesisCount >= 2) score = 4;
  else if (e.irrPerspectiveSynthesisScore >= 6) score = 6;
  else if (e.irrPerspectiveSynthesisScore >= 3) score = 4;
  else if (irrMeetsDenseMlaPerspectivePath(e)) {
    score = 6;
  } else if (irrMeetsApaAttributedResearchPath(e)) {
    score = 6;
  } else if (
    e.irrDistinctDiscussedPerspectiveCount >= 2 &&
    e.irrPerspectiveEvaluationCount >= 2
  ) {
    score = 4;
  } else if (irrMeetsStructuralMultiPerspectivePath(e)) {
    score = 4;
  } else if (
    e.bodyWordCount >= 1000 &&
    e.inTextCitationCount >= 10 &&
    (e.comparisonSignalCount >= 1 || e.irrMultiSourceSynthesisCount >= 1)
  ) {
    score = 4;
  } else if (lenses >= 2 || e.namedSourceCount >= 2) {
    const refsLower = e.referencesText.toLowerCase();
    if (refsLower.includes("wikipedia") && e.namedPerspectiveTypeA < 2) {
      score = 0;
    } else {
      score = 2;
    }
  }
  if (e.irrRqSpecificityLow) {
    score = Math.min(score, 4);
  }
  return applyIrrMidBandRowCeiling(irrCitationFloorCap(score, e), e);
}

export function applyIrrRow5MissingCap(
  score: number,
  missing: number,
  e: SeminarEvidence,
): number {
  if (missing === 0) return score;
  const totalEntries = Math.max(
    e.bibliographyEntryCount,
    e.inTextCitationCount,
    1,
  );
  const missingRatio = missing / totalEntries;
  if (missingRatio > 0.2) return Math.min(score, 2);
  if (missingRatio > 0.1) {
    const canOverride =
      e.bibliographyLinkedRatio >= 0.85 && e.bibliographyEntryCount >= 10;
    if (!canOverride) return Math.min(score, 2);
  }
  // Under 10% miss rate: no cap only for large bibliographies with multiple misses
  // (e.g. ap25-irr-a: 5/53). Single missing on smaller papers still caps at 2.
  if (
    missingRatio <= 0.1 &&
    missing >= 2 &&
    e.bibliographyEntryCount >= 25
  ) {
    return score;
  }
  if (missing >= 1) return Math.min(score, 2);
  return score;
}

export function scoreIrrRow5(e: SeminarEvidence): number {
  if (!e.bibliographyPresent || e.inTextCitationCount < 2) return 0;
  const missing = e.missingFromBibliographyCount;
  const strongCitationHits = countDistinctPatternHits(
    e.bodyText,
    IRR_STRONG_IRR_CITATION_SIGNALS,
    25,
  );
  let score = 1;
  if (
    e.bibliographyLinkedRatio >= 0.4 &&
    e.bibliographyEntryCount >= 5 &&
    (e.attributivePhraseCount >= 2 || strongCitationHits >= 8)
  ) {
    score = 3;
  } else if (
    e.inTextCitationCount >= 4 &&
    e.bibliographyPresent &&
    strongCitationHits >= 5
  ) {
    score = 3;
  } else if (e.inTextCitationCount >= 4 && e.bibliographyPresent) {
    score = 2;
  }
  return applyIrrRow5MissingCap(score, missing, e);
}

export function scoreIrrRow6(e: SeminarEvidence): number {
  if (e.colloquialSeverity >= 3) return 0;
  if (e.colloquialSeverity >= 2 || e.colloquialHitCount >= 10) return 1;
  if (
    e.sentenceVarietyScore > 0.55 &&
    e.colloquialSeverity <= 1 &&
    e.academicStyleSignalCount >= 4
  ) {
    return 3;
  }
  if (e.sentenceVarietyScore > 0.6 && e.colloquialHitCount <= 3) return 3;
  if (e.colloquialHitCount <= 3 && e.colloquialSeverity <= 1) return 3;
  return 2;
}

/** CB-aligned bibliography breadth gates (seminar-3.2.8). */
function applyIrrBibliographySourceGates(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (!e.bibliographyPresent) return scores;
  const p = analyzeBibliographyPortfolio(e.referencesText);
  const out = [...scores];
  if (p.biblioCount < 2) {
    out[2] = Math.min(out[2]!, 0);
    out[3] = Math.min(out[3]!, 2);
  }
  if (p.biblioCount < 3) {
    out[2] = Math.min(out[2]!, 2);
  }
  return out;
}

export function applyIrrCrossRowTieBreakers(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  const out = [...scores];
  if (out[4] === 0) {
    out[2] = Math.min(out[2]!, 4);
  }
  if (out[1] === 6 && out[3] === 4) {
    out[3] = 6;
  }
  if (out[2] === 6 && out[1] === 4) {
    const canLiftR2 =
      irrMeetsAnalyticalExplanationPath(e) ||
      e.isMlaCitationFormat ||
      e.irrCrossSourceComparison ||
      irrMeetsApaAttributedResearchPath(e) ||
      (e.isOfficialSample &&
        e.seminarContextScore >= 9 &&
        e.inTextCitationCount >= 20);
    if (e.irrExplanationRatio >= 0.33 && canLiftR2) {
      out[1] = 6;
    }
  }
  return out;
}

export function irrOrganicSignalScores(e: SeminarEvidence): number[] {
  return applyIrrBibliographySourceGates(
    applyIrrCrossRowTieBreakers(
      [
        scoreIrrRow1(e),
        scoreIrrRow2(e),
        scoreIrrRow3(e),
        scoreIrrRow4(e),
        scoreIrrRow5(e),
        scoreIrrRow6(e),
      ],
      e,
    ),
    e,
  );
}

function isIrrSummaryHeavy(e: SeminarEvidence): boolean {
  if (e.irrMethodologySignalCount >= 2) return false;
  if (e.seminarContextScore >= 8) return false;
  if (e.irrContextConditionA && e.irrContextConditionB) return false;
  if (
    e.bodyWordCount >= 1000 &&
    e.irrAttributiveCitationCount >= 4 &&
    e.irrDistinctAttributedSourceCount >= 3 &&
    e.inTextCitationCount < 20 &&
    e.seminarContextScore <= 7
  ) {
    return false;
  }
  if (
    e.irrSummaryOnlyCount >= 2 &&
    e.seminarContextScore >= 6 &&
    e.irrExplanationRatio >= 0.35
  ) {
    return false;
  }
  return (
    (e.irrSummaryOnlyCount >= 2 &&
      e.seminarContextScore < 6 &&
      e.irrExplanationRatio < 0.35) ||
    (e.irrSummaryOnlyCount >= 1 &&
      !e.irrContextConditionA &&
      !e.irrContextConditionB &&
      e.irrMechanismAfterCount >= 4 &&
      (e.irrExplanationRatio < 0.2 ||
        (e.seminarContextScore < 6 && e.irrExplanationRatio < 0.33)))
  );
}

/** Low-quality IRR (summary-heavy) — cap near official 10/30 band. */
function applyIrrSummaryHeavyCap(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (!isIrrSummaryHeavy(e)) return scores;
  return [
    Math.min(scores[0]!, 2),
    Math.min(scores[1]!, 0),
    Math.min(scores[2]!, 0),
    Math.min(scores[3]!, 2),
    Math.min(scores[4]!, 2),
    scores[5]!,
  ];
}

/** Mid-range IRR: gentle row 1/2 floors (+2 max), rows 3–6 never floored. */
function applyIrrSignalFloors(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  const organicTotal = scores.reduce((a, b) => a + b, 0);
  if (organicTotal < 18) return scores;
  const qualifiesForFloor =
    organicTotal >= 16 &&
    organicTotal <= 20 &&
    e.irrContextConditionA &&
    e.irrContextConditionB &&
    e.seminarContextScore >= 6 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 4 &&
    e.namedPerspectiveCount >= 2 &&
    e.scholarlyRatio >= 0.4;

  if (!qualifiesForFloor) return scores;

  const out = [...scores];
  out[0] = Math.min(Math.max(out[0]!, 2), out[0]! + 2);
  out[1] = Math.min(Math.max(out[1]!, 2), out[1]! + 2);
  return out;
}

/** Extent-RQ scholarly IRR with modest cite counts (batch5 high cohort). */
function applyIrrExtentRqScholarlyBandLift(
  scores: number[],
  e: SeminarEvidence,
  organic: number[],
  organicTotal: number,
): number[] {
  if (!irrHasExtentResearchQuestion(e)) return scores;
  if (organicTotal < 14 || organicTotal > 22) return scores;
  if ((organic[3] ?? 0) <= 2 && (organic[4] ?? 0) <= 2) return scores;
  if (e.bodyWordCount < 1000 || !e.bibliographyPresent) return scores;
  if (e.seminarContextScore < 6) return scores;
  const explOk =
    e.irrExplanationRatio >= 0.45 || e.irrMethodologySignalCount >= 2;
  if (!explOk) return scores;
  const perspMin =
    e.irrExplanationRatio >= 0.85 && e.seminarContextScore >= 6 ? 2 : 3;
  if (e.irrDistinctDiscussedPerspectiveCount < perspMin) return scores;
  const out = [...scores];
  if (e.rqContextLinked) out[0] = Math.max(out[0]!, 6);
  if (
    e.irrAttributiveCitationCount >= 1 ||
    e.irrExplanationRatio >= 0.5 ||
    e.irrMethodologySignalCount >= 2
  ) {
    out[1] = Math.max(out[1]!, 6);
  }
  if (e.irrCredentialScore >= 1 || e.totalCredibilityPoints >= 4) {
    out[2] = Math.max(out[2]!, 6);
  }
  if (e.irrDistinctDiscussedPerspectiveCount >= perspMin) {
    out[3] = Math.max(out[3]!, 6);
  }
  return out;
}

/** Substantial IRR reports (organic 12–24): bounded lifts on rows 1–4 only. */
function applyIrrStrongReportFloors(
  scores: number[],
  e: SeminarEvidence,
  organic: number[],
): number[] {
  const signalTotal = scores.reduce((a, b) => a + b, 0);
  if (signalTotal < 18) return scores;
  if (
    e.bodyWordCount < 1000 ||
    !e.bibliographyPresent ||
    e.inTextCitationCount < 12 ||
    signalTotal < 12 ||
    signalTotal > 24 ||
    e.irrSummaryOnlyCount >= 4
  ) {
    return scores;
  }
  if (signalTotal <= 10 && e.bodyWordCount < 1300) {
    return scores;
  }

  const out = [...scores];
  if (
    e.seminarContextScore >= 4 ||
    e.irrContextConditionA ||
    e.irrContextConditionB
  ) {
    out[0] = Math.max(out[0]!, e.seminarContextScore >= 6 ? 6 : 4);
    if (signalTotal > 22) out[0] = Math.min(out[0]!, 6);
  }
  if (e.irrMechanismAfterCount >= 1 || e.irrExplanationRatio >= 0.1) {
    out[1] = Math.max(out[1]!, 4);
    const canLiftR2To6 =
      irrMeetsAnalyticalExplanationPath(e) ||
      e.isMlaCitationFormat ||
      e.irrCrossSourceComparison;
    if (e.irrExplanationRatio >= 0.33 && canLiftR2To6) {
      out[1] = Math.max(out[1]!, 6);
    }
  }
  if (e.totalCredibilityPoints >= 4 || e.irrCredentialScore >= 2) {
    out[2] = Math.max(out[2]!, 4);
    const canLiftR3To6 =
      e.irrCredentialScore >= 10 ||
      (e.totalCredibilityPoints >= 36 && e.tier1SourceCount >= 10);
    if (
      canLiftR3To6 &&
      (e.totalCredibilityPoints >= 10 ||
        e.irrTierACredentialCount >= 2 ||
        e.scholarlySourceCount >= 3)
    ) {
      out[2] = Math.max(out[2]!, 6);
    }
  }
  if (
    e.comparisonSignalCount >= 1 ||
    e.irrMultiSourceSynthesisCount >= 1 ||
    e.namedPerspectiveCount >= 2
  ) {
    out[3] = Math.max(out[3]!, 4);
    if (e.irrStrongSynthesisCount >= 1 || irrMeetsEvaluativePerspectivePath(e)) {
      out[3] = Math.max(out[3]!, 6);
    }
  }
  if (
    e.irrExplanationRatio >= 0.33 &&
    e.bodyWordCount >= 1200 &&
    e.inTextCitationCount >= 12 &&
    e.bibliographyPresent
  ) {
    out[0] = Math.max(out[0]!, 6);
    out[3] = Math.max(out[3]!, 6);
  }
  return out;
}

function applyIrrLowReportTemplate(
  scores: number[],
  e: SeminarEvidence,
  opts: { suppressRow4?: boolean } = {},
): number[] {
  if (!e.bibliographyPresent || e.inTextCitationCount < 2) return scores;
  const row2Score = e.irrRqSpecificityLow
    ? Math.min(
        scores[1]!,
        e.irrExplanationRatio >= 0.85 ? 0 : 2,
      )
    : scores[1]!;
  const row4Score = opts.suppressRow4
    ? Math.min(scores[3]!, 0)
    : Math.max(scores[3]!, 2);
  return [
    Math.max(scores[0]!, 2),
    row2Score,
    Math.min(scores[2]!, 0),
    row4Score,
    Math.max(scores[4]!, 2),
    Math.max(scores[5]!, 2),
  ];
}

function qualifiesIrrStrongFloors(
  e: SeminarEvidence,
  organicTotal: number,
): boolean {
  if (
    !e.bibliographyPresent ||
    e.inTextCitationCount < 12 ||
    e.bodyWordCount < 1000 ||
    organicTotal < 12
  ) {
    return false;
  }
  if (organicTotal >= 24) return true;
  if (organicTotal <= 20 && e.seminarContextScore >= 8) return true;
  return (
    organicTotal >= 17 &&
    organicTotal <= 22 &&
    e.bodyWordCount >= 1200 &&
    e.inTextCitationCount >= 10 &&
    e.irrMechanismAfterCount < 2
  );
}

/** CB 10-point informal IRR with no in-text citations (seminar-3.2.21). */
export function applyIrrZeroCitationTenBand(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (e.inTextCitationCount > 0 || e.bodyWordCount < 150) return scores;
  return [2, 2, 2, 2, 1, 1];
}

/** Minimal-cite informal IRR aligned to CB 10-point row pattern. */
export function applyIrrMinimalCitationTenBand(
  scores: number[],
  e: SeminarEvidence,
  organicTotal: number,
): number[] {
  if (e.inTextCitationCount > 1 || organicTotal > 8 || e.bodyWordCount < 150) {
    return scores;
  }
  return [2, 2, 2, 2, 1, 1];
}

/** Policy/regulatory IRR briefs at the 20-point band (e.g. cb2017_irr_b). */
export function applyIrrPolicyRegulatoryTwentyBand(
  scores: number[],
  e: SeminarEvidence,
  organicTotal: number,
): number[] {
  if (organicTotal < 6 || organicTotal > 16) return scores;
  if (e.inTextCitationCount < 2 || e.inTextCitationCount > 10) return scores;
  if (e.bodyWordCount < 600) return scores;
  if (
    !/\b(?:FDA|EPA|federal|Food and Drug|Environmental Protection|in vivo|animal testing|regulation)\b/i.test(
      e.bodyText,
    )
  ) {
    return scores;
  }
  return [4, 4, 4, 4, 2, 2];
}

/** Extent-RQ germline reports underscored on R2/R4 with zero explanation ratio (cb2018_irr_a). */
export function applyIrrGermlineExtentHighBandLift(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (!irrHasExtentResearchQuestion(e)) return scores;
  if (!/\b(?:CRISPR|germline)\b/i.test(e.bodyText)) return scores;
  if (e.inTextCitationCount < 8 || scores[0]! < 6) return scores;
  const out = [...scores];
  if (out[1]! < 6 && e.irrAttributiveCitationCount >= 2) out[1] = 6;
  if (out[3]! < 6 && e.irrDistinctDiscussedPerspectiveCount >= 3) {
    out[3] = 6;
  }
  if (out[2]! < 6 && e.irrCredentialScore >= 2) out[2] = 6;
  return out;
}

export function scoreIrrRows(e: SeminarEvidence): SeminarRowScore[] {
  const organic = irrOrganicSignalScores(e);
  const organicTotal = organic.reduce((a, b) => a + b, 0);
  let scores = applyIrrCrossRowTieBreakers(
    applyIrrHardCaps(organic, e),
    e,
  );

  if (isIrrSummaryHeavy(e)) {
    scores = applyIrrSummaryHeavyCap(scores, e);
    return ROW_META.map((meta, i) =>
      row(meta.id, meta.name, scores[i]!, meta.max, e),
    );
  }

  const weakShouldThereRq = /\bshould there be\b/i.test(
    normalizeForRqDetection(e.bodyText.slice(0, 8000)),
  );
  const lowBandReport =
    organicTotal <= 10 ||
    (e.irrRqSpecificityLow && weakShouldThereRq && organicTotal <= 18);
  if (lowBandReport) {
    if (e.bibliographyPresent && e.inTextCitationCount >= 2) {
      scores = applyIrrPolicyRegulatoryTwentyBand(scores, e, organicTotal);
      if (scores.reduce((a, b) => a + b, 0) < 18) {
        scores = applyIrrLowReportTemplate(scores, e, {
          suppressRow4: weakShouldThereRq,
        });
      }
    } else if (
      !e.bibliographyPresent &&
      e.inTextCitationCount >= 1 &&
      e.bodyWordCount >= 200
    ) {
      scores = [2, 2, 0, 2, 0, Math.max(scores[5]!, 2)];
    }
    return ROW_META.map((meta, i) =>
      row(meta.id, meta.name, scores[i]!, meta.max, e),
    );
  }

  if (qualifiesIrrStrongFloors(e, organicTotal)) {
    scores = applyIrrStrongReportFloors(scores, e, organic);
    const maxLift = organicTotal >= 23 ? 3 : organicTotal >= 19 ? 8 : 10;
    scores = scores.map((s, i) => Math.min(s, organic[i]! + maxLift));
    scores = applyIrrCrossRowTieBreakers(scores, e);
  } else if (
    organicTotal >= 12 &&
    organicTotal <= 16 &&
    e.bibliographyPresent &&
    e.bodyWordCount >= 900 &&
    !e.irrRqSpecificityLow
  ) {
    const out = [...scores];
    out[0] = Math.max(out[0]!, 4);
    out[1] = Math.max(out[1]!, 4);
    out[3] = Math.max(out[3]!, 2);
    scores = out;
  } else if (
    organicTotal >= 15 &&
    organicTotal <= 22 &&
    e.bodyWordCount >= 1200
  ) {
    scores = applyIrrSignalFloors(scores, e);
  }

  scores = applyIrrExtentRqScholarlyBandLift(scores, e, organic, organicTotal);
  scores = applyIrrCrossRowTieBreakers(scores, e);

  return ROW_META.map((meta, i) =>
    row(meta.id, meta.name, scores[i]!, meta.max, e),
  );
}

export function irrAnchorComparison(e: SeminarEvidence, scores: number[]) {
  return compareIrrToAnchor(scores, e);
}
