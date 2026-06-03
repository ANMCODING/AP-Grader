import { compareIwaToAnchor } from "@/lib/seminar/seminarAnchor";
import { classifyIwaAnchor } from "@/lib/seminar/seminarEvidence";
import type {
  IwaGradeOptions,
  SeminarEvidence,
  SeminarRowScore,
} from "@/lib/seminar/seminarTypes";
import { rowDetectionNote } from "@/lib/seminar/seminarDetectionNotes";
import { analyzeBibliographyPortfolio } from "@/lib/seminar/seminarBibliographyPortfolio";
import { applyIwaHardCaps, evaluateIwaHardCaps } from "@/lib/seminar/seminarHardCaps";
import { rowConfidence } from "@/lib/seminar/seminarRowConfidence";
import {
  ROW1_DEEP_INTEGRATION_FUNCTIONS_MIN,
  ROW1_MARGINAL_APPEARANCE_MAX,
  ROW1_STRONG_INTEGRATION_FUNCTIONS_MIN,
  ROW2_SPECIFICITY_THRESHOLD,
  ROW5_NINE_ANALYSIS_DEPTH_MIN,
  ROW5_NINE_CREDIBILITY_MIN,
  ROW5_NINE_MIN_TIER1_OR_TIER2_SOURCES,
  ROW5_NINE_SCHOLARLY_RATIO_MIN,
  ROW6_LINKING_RATIO_FIVE,
  ROW6_LINKING_RATIO_THREE,
} from "@/lib/seminar/seminarPolicy";
import {
  normalizeForRqDetection,
} from "@/lib/seminar/seminarCalibration324";
import {
  countDistinctPatternHits,
  IWA_ROW4_CAP8_TRIGGERS,
  IWA_ROW4_ZERO_TRIGGERS,
  IWA_ROW5_DEDUCTION_TRIGGERS,
  IWA_ROW6_DEDUCTION_TRIGGERS,
  IWA_ROW3_ZERO_TRIGGERS,
} from "@/lib/seminar/seminarPatterns";
import {
  isArgumentOrganized,
  shouldScoreRow4Zero,
} from "@/lib/seminar/seminarThesisDetection";

/** Row scoring uses evidence from seminarDeepCalibration + seminarCalibrationPatterns (v2.5.4 phrase expansion). */

const FEEDBACK: Record<string, Partial<Record<number, string>>> = {
  row1_stimulus: {
    0: "Your paper does not appear to integrate any external source into the argument. To earn points in this row, name a specific author or institution, cite their specific finding or argument, and use it to advance your thesis — not just mention it in passing. A source that could be deleted without weakening the argument is not integrated.",
    1: "A source is named in your paper, but its presence is barely argumentative. The source appears only once and the commentary around it restates what the source said rather than developing an implication. To improve: use the source in at least one more section for a different purpose, and after each citation write a sentence that introduces a consequence or application not stated in the source.",
    2: "Your source performs one clear argumentative function — it supports a specific claim or establishes context. To move to the next level: use the same source in a second section for a different purpose (for example, as context in the introduction and as evidence in a body paragraph), and after at least one citation write commentary that derives an implication the source itself does not state.",
    3: "Your source is integrated purposefully and appears in more than one section. The commentary connects the source to your thesis. To reach the highest levels: use the source in three or more sections performing genuinely different functions (context, evidence, counterargument, conclusion), and engage analytically — agree with it and extend it, qualify it, or push back on it with specific reasons.",
    4: "Your source integration is strong. The source appears across multiple sections, performs different argumentative functions, and your commentary develops genuine implications. To reach the highest level: demonstrate analytical dialogue with the source — show where you agree and extend, where you qualify, and where you push back. The source should appear in at least three distinct sections and your argument should go beyond what the source itself claims.",
    5: "Your source integration is at the highest level. The source is woven throughout your argument, performs multiple distinct functions, and you are in genuine analytical dialogue with it — agreeing, extending, qualifying, and developing implications the source itself does not state. The argument would be structurally weaker without this source.",
  },
  row2_context: {
    0: "No context or significance established in the opening. State why your topic matters with specific stakes tied to your argument.",
    1: "Your topic is introduced but the significance is not substantiated. Explain specifically what is at stake if this question goes unaddressed.",
    3: "Your introduction touches on significance but lacks the specific statistics, stakes framing, or urgency language needed for full credit. Add a concrete scale (how many people are affected, what costs, what timeline) linked to your central argument.",
    5: "Your context establishes the significance of the research question with specific evidence. To make it even stronger, ensure your context remains relevant throughout the paper — not just in the introduction.",
  },
  row3_perspective: {
    0: "No named source perspectives were detected in dialogue. Name specific authors and state their specific arguments, then compare or connect their positions directly.",
    6: "You describe multiple perspectives but the connections between them are mostly descriptive. To reach the highest score, evaluate what the tension or relationship between perspectives reveals.",
    9: "Excellent perspective synthesis. Your paper places sources in genuine dialogue and draws implications from their relationships.",
  },
  row4_argument: {
    0: "No clear argument was detected. Your IWA must take a position on the research question with a clear thesis and a conclusion that answers the question.",
    8: "Your argument is present and organized, but your commentary tends to restate what sources said rather than developing the implications. After each piece of evidence, explain what the evidence implies for your specific argument.",
    12: "Strong argument. Your voice controls the essay and your commentary develops beyond source findings.",
  },
  row5_evidence: {
    0: "No well-vetted sources beyond the stimulus were detected. Include peer-reviewed journals, government agencies, or credentialed academic authors cited in the body text.",
    6: "Your sources are relevant. Strengthen your evidence portfolio by incorporating more peer-reviewed sources and engaging with them analytically after each citation.",
    9: "Strong evidence portfolio with credible sources used analytically.",
  },
  row6_citation: {
    0: "No bibliography or works cited was detected, or in-text citations are largely missing.",
    3: "One or more in-text citations could not be matched to bibliography entries. Every source cited in the body must have a complete bibliography entry.",
    5: "Citations are well-organized and consistently linked.",
  },
  row7_style: {
    0: "Your writing style contains multiple informal elements that make it difficult to read as an academic argument.",
    2: "Your writing is mostly clear but has some informal phrases or imprecise word choices.",
    3: "Your academic prose is clear and precise.",
  },
};

const URL_ONLY_ROW5_FEEDBACK =
  "Your bibliography contains only web addresses with no author, date, or title information. A URL alone does not establish source credibility. Add complete citation information for each source: author last name, first initial, year, title, source name, and DOI or URL.";
const URL_ONLY_ROW6_FEEDBACK =
  "Your bibliography contains only URLs — no author names to link to your in-text citations. Add complete bibliography entries with author last names so the engine can verify your citation system.";

const ROW_META = [
  { id: "row1_stimulus", name: "Understand and Analyze Context (Stimulus)", max: 5 },
  { id: "row2_context", name: "Understand and Analyze Context (Significance)", max: 5 },
  { id: "row3_perspective", name: "Understand and Analyze Perspective", max: 9 },
  { id: "row4_argument", name: "Establish Argument", max: 12 },
  { id: "row5_evidence", name: "Select and Use Evidence", max: 9 },
  { id: "row6_citation", name: "Apply Conventions (Citation)", max: 5 },
  { id: "row7_style", name: "Apply Conventions (Grammar and Style)", max: 3 },
];

function row(
  id: string,
  name: string,
  score: number,
  maxScore: number,
  e: SeminarEvidence,
): SeminarRowScore {
  let feedback = FEEDBACK[id]?.[score] ?? null;
  if (e.urlOnlyBibliography) {
    if (id === "row5_evidence" && score === 0) {
      feedback = URL_ONLY_ROW5_FEEDBACK;
    }
    if (id === "row6_citation" && score === 0) {
      feedback = URL_ONLY_ROW6_FEEDBACK;
    }
  }
  if (id === "row1_stimulus" && score === 0) {
    const reason = e.row1ZeroReason ?? e.stimulusZeroReason;
    if (reason === "tangential" || reason === "mention_only" || reason === "intro_only") {
      feedback =
        "Your source reference appears tangential — it could be removed without affecting your argument. After citing it, write 2-3 sentences explaining exactly how it advances your argument.";
    } else if (reason === "definition_only" || e.row1DefinitionOnly) {
      feedback =
        "You used a source only for a definition. Connect the source's argument to your thesis, not just terminology.";
    } else if (reason === "type_c_only" || e.row1TypeCOnly) {
      feedback =
        "You named sources but did not state their specific arguments or findings. Attribute a clear position or finding to each named author.";
    } else if (reason === "bibliography_only" || e.row1BibliographyOnly) {
      feedback =
        "A source appears in your bibliography but not in the body of your essay. Cite and engage with the source in your argument, not only on the works cited page.";
    }
  }
  return {
    id,
    name,
    score,
    maxScore,
    feedback,
    confidence: rowConfidence(id, score, maxScore, e),
    detectionNote: rowDetectionNote(id, score, e),
  };
}

function capRow1WikipediaAnchor(score: number, e: SeminarEvidence): number {
  const author = e.row1IntegrationQuality.primaryAuthor ?? "";
  if (score > 3 && /wikipedia/i.test(author)) return 3;
  return score;
}

/** Hard both-sides caps apply only in opening/throughout (seminar-3.2.14). */
function bothSidesHardCapsIwa(e: SeminarEvidence): boolean {
  if (!e.bothSidesMode) return false;
  const loc = e.bothSidesModeLocation;
  return loc === "opening" || loc === "throughout" || loc === null;
}

export function scoreIwaRow1(e: SeminarEvidence): number {
  return capRow1WikipediaAnchor(scoreIwaRow1Inner(e), e);
}

function stimulusMentionedOnlyInOpening(e: SeminarEvidence): boolean {
  const body = e.bodyText;
  const opening = body.slice(0, 2500);
  const mentionsStimulus =
    /\bstimulus material\b/i.test(opening) ||
    /\b(?:Gulf Motel|Looking for The Gulf Motel)\b/i.test(body);
  if (!mentionsStimulus) return false;
  const anchorRe = /\b(?:Blanco|Richard Blanco)\b/gi;
  const inOpening = anchorRe.test(opening);
  anchorRe.lastIndex = 0;
  const afterOpening = anchorRe.test(body.slice(2000));
  return inOpening && !afterOpening;
}

function countIwaLabeledPerspectiveSections(body: string): number {
  return (
    body.match(/\b[A-Za-z][A-Za-z\s']{2,40}?\s+Perspective\s*:/gi) ?? []
  ).length;
}

function scoreIwaRow1Inner(e: SeminarEvidence): number {
  if (!e.namedSourceInBody) return 0;
  if (e.row1TypeCOnly) return 0;
  if (e.row1BibliographyOnly) return 0;
  if (e.stimulusIntroductionOnly || stimulusMentionedOnlyInOpening(e)) {
    return 0;
  }

  const q = e.row1IntegrationQuality;

  if (q.functionCount === 0) return 0;
  if (e.row1DefinitionOnly && q.functionCount < 2) return 0;
  if (
    e.row1Tangential &&
    q.appearanceCount <= ROW1_MARGINAL_APPEARANCE_MAX &&
    q.commentaryQuality === "none"
  ) {
    return 0;
  }

  if (
    q.appearanceCount <= ROW1_MARGINAL_APPEARANCE_MAX &&
    q.commentaryQuality === "echo" &&
    q.functionCount >= 1 &&
    q.dialogueScore === 0
  ) {
    return 1;
  }

  if (
    q.appearanceCount <= ROW1_MARGINAL_APPEARANCE_MAX &&
    q.commentaryQuality === "none" &&
    q.functionCount >= 1 &&
    e.integrationFunctionDetected
  ) {
    return 2;
  }

  if (
    q.functionCount >= 3 &&
    q.sections.length >= 3 &&
    q.appearanceCount >= 6 &&
    q.isMultiSection &&
    q.dialogueScore >= 2 &&
    q.qualifiesSource &&
    (q.challengesSource || q.extendsSource || q.agreesWithSource)
  ) {
    return 5;
  }

  if (
    q.functionCount >= ROW1_DEEP_INTEGRATION_FUNCTIONS_MIN &&
    q.appearanceCount >= 20 &&
    q.dialogueScore >= 3 &&
    q.extendsSource &&
    q.qualifiesSource &&
    q.challengesSource &&
    q.isMultiSection &&
    (q.commentaryQuality === "deep" || q.commentaryQuality === "developing")
  ) {
    return 5;
  }

  if (
    q.functionCount >= ROW1_DEEP_INTEGRATION_FUNCTIONS_MIN &&
    q.appearanceCount >= 4 &&
    q.dialogueScore >= 4 &&
    q.agreesWithSource &&
    q.extendsSource &&
    q.qualifiesSource &&
    q.challengesSource &&
    q.isMultiSection &&
    q.commentaryQuality === "deep"
  ) {
    return 5;
  }

  if (
    q.functionCount >= ROW1_STRONG_INTEGRATION_FUNCTIONS_MIN &&
    q.sections.length >= 3 &&
    q.appearanceCount >= 5 &&
    q.extendsSource &&
    q.qualifiesSource &&
    (q.dialogueScore === 3 ||
      (q.dialogueScore >= 4 &&
        q.appearanceCount >= 8 &&
        q.challengesSource)) &&
    !e.exploratoryMode &&
    !bothSidesHardCapsIwa(e) &&
    !e.hedgedThesisDetected
  ) {
    return 5;
  }

  if (
    q.functionCount >= ROW1_STRONG_INTEGRATION_FUNCTIONS_MIN &&
    q.appearanceCount >= 2 &&
    q.isMultiSection &&
    (q.commentaryQuality === "developing" || q.commentaryQuality === "deep") &&
    (q.dialogueScore >= 1 || q.functionCount >= 3)
  ) {
    // Delete test: positive signal (+1), not a gate (not validated on CB 5/5 anchors).
    return q.passesDeleteTest ? 5 : 4;
  }

  if (
    q.functionCount >= 1 &&
    q.sections.length >= 3 &&
    q.appearanceCount >= 4 &&
    q.isMultiSection &&
    q.dialogueScore >= 2 &&
    q.qualifiesSource &&
    q.challengesSource
  ) {
    return 5;
  }

  if (
    q.functionCount >= 1 &&
    q.isMultiSection &&
    q.commentaryQuality !== "none" &&
    q.commentaryQuality !== "echo"
  ) {
    return 3;
  }

  if (
    q.functionCount >= 1 &&
    (q.commentaryQuality === "basic" ||
      q.commentaryQuality === "developing" ||
      q.commentaryQuality === "deep") &&
    !q.isMultiSection
  ) {
    return 2;
  }

  if (q.functionCount >= 1 && q.commentaryQuality === "echo") return 1;

  const introPlusBody =
    q.sections.includes("introduction") &&
    (q.sections.includes("body") || q.sections.includes("counterargument")) &&
    q.appearanceCount >= 2;
  if (e.integrationFunctionDetected && introPlusBody) return 3;

  if (e.integrationFunctionDetected && q.appearanceCount >= 1) return 2;
  if (e.integrationFunctionDetected) return 1;
  return 0;
}

export function scoreIwaRow2(e: SeminarEvidence): number {
  const openingNorm = normalizeForRqDetection(e.bodyText.slice(0, 5000));
  // IWA opening context: substantiated stats or urgency-linked opening (not bare rqContextLinked).
  const iwaOpeningContextStrong =
    e.substantiatedRqContextCount >= 1 ||
    (e.statisticalUrgencyCount >= 1 && e.rqContextLinked);
  if (
    iwaOpeningContextStrong &&
    e.specificityScore >= ROW2_SPECIFICITY_THRESHOLD
  ) {
    return 5;
  }
  const openingSlice = e.bodyText.slice(0, 2500);
  const openingParas = openingSlice
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 25);
  const openingWords = openingParas
    .slice(0, 4)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const hasTitleQuestion =
    /\?/.test(openingSlice) &&
    /\b(?:how|what|why|whether|should|to what extent)\b/i.test(openingSlice);
  const scopeOpening =
    /\b(?:popular|entertainment|perception|opinion|children|adults|worldwide|affect|trust|news|journalism)\b/i.test(
      openingSlice,
    );
  if (
    hasTitleQuestion &&
    openingWords >= 50 &&
    scopeOpening &&
    e.specificityScore >= 6
  ) {
    return 5;
  }
  if (!e.significanceFramingPresent) {
    return 0;
  }
  if (e.specificityScore >= ROW2_SPECIFICITY_THRESHOLD) return 5;
  if (e.specificityScore >= 8) return 3;
  return 1;
}

export function scoreIwaRow3(e: SeminarEvidence): number {
  const labeledSections = countIwaLabeledPerspectiveSections(e.bodyText);
  const named = Math.max(
    e.namedPerspectiveTypeA,
    e.namedPerspectiveCount,
    labeledSections >= 3 ? 3 : labeledSections >= 2 ? 2 : 0,
  );
  const row3ZeroDominant =
    countDistinctPatternHits(
      e.bodyText.slice(0, 8000),
      IWA_ROW3_ZERO_TRIGGERS,
      14,
    ) >= 7;
  const loc = e.bothSidesModeLocation;
  const capAt3 = e.hedgedThesisDetected || bothSidesHardCapsIwa(e);
  const capAt6 = e.bothSidesMode && loc === "conclusion";

  if (row3ZeroDominant && named < 2) return 0;
  if (labeledSections >= 3 && e.bodyWordCount >= 800) {
    return capAt6 ? 6 : 9;
  }
  if (named <= 1) return 0;
  if (capAt3 && named >= 2) return 3;

  if (named >= 2 && e.evaluativeLinkingCount >= 1) {
    return capAt6 ? 6 : 9;
  }
  if (
    named >= 2 &&
    e.descriptiveLinkingCount >= 2 &&
    (e.comparisonSignalCount >= 1 || e.evaluativePerspectiveCount >= 1)
  ) {
    return capAt6 ? 6 : 9;
  }
  if (
    labeledSections >= 3 &&
    (e.comparisonSignalCount >= 1 || e.descriptiveLinkingCount >= 1)
  ) {
    return 6;
  }
  if (
    named >= 2 &&
    (e.descriptiveLinkingCount >= 1 || e.comparisonSignalCount >= 1) &&
    !e.perspectiveIsolated
  ) {
    return 6;
  }
  return 0;
}

export function scoreIwaRow4(e: SeminarEvidence): number {
  const thesisCheck = {
    thesisPresent: e.thesisPresent,
    thesisInOpening: e.thesisInOpening,
    conclusionAligned: e.conclusionAligned,
    counterclaimPresent: e.counterclaimPresent,
    exploratoryOnly: e.exploratoryMode && !e.thesisInOpening,
    studentSentenceCount: e.studentCommentarySentenceCount,
  };
  if (shouldScoreRow4Zero(thesisCheck)) return 0;
  const row4ZeroDominant =
    countDistinctPatternHits(
      e.bodyText.slice(0, 5000),
      IWA_ROW4_ZERO_TRIGGERS,
      8,
    ) >= 5;
  if (row4ZeroDominant && !e.thesisInOpening) return 0;

  const counterclaimFor12 =
    e.strongCounterclaimEngaged ||
    (e.counterclaimPresent &&
      e.evaluativeLinkingCount >= 1 &&
      e.descriptiveLinkingCount >= 2 &&
      e.commentaryStructureScore >= 25 &&
      e.echoRatio < 0.3) ||
    (e.counterclaimPresent &&
      e.commentaryStructureScore >= 50 &&
      (e.evaluativeLinkingCount >= 1 || e.descriptiveLinkingCount >= 2)) ||
    (e.counterclaimPresent &&
      e.thesisInOpening &&
      e.conclusionAligned &&
      e.commentaryDepthRatio >= 0.35 &&
      e.commentaryStructureScore >= 40) ||
    (e.commentaryStructureScore >= 75 &&
      e.descriptiveLinkingCount >= 2 &&
      e.namedPerspectiveCount >= 2);
  const thisPaperArguesInBody =
    /\bthis paper (?:argues?|contends?|maintains?|demonstrates?)\b/i.test(
      e.bodyText,
    );
  const organizedOverride =
    e.thesisPresent &&
    (e.strongCounterclaimEngaged || e.counterclaimPresent) &&
    thisPaperArguesInBody;
  const organized =
    e.comparisonSignalCount >= 1 ||
    isArgumentOrganized(e.bodyText) ||
    organizedOverride;
  const hasThesis = e.thesisInOpening || e.thesisPresent;

  /** developHits/(echoHits+developHits); CB 12-point gate is ≥0.3, not 0.5. */
  const developedCommentary =
    e.commentaryDepthRatio >= 0.3 ||
    e.commentaryStructureScore >= 5 ||
    e.echoRatio < 0.35 ||
    (e.commentaryStructureScore >= 80 && e.commentaryDepthRatio >= 0.4);

  const row4Cap8 =
    countDistinctPatternHits(
      e.bodyText.slice(0, 8000),
      IWA_ROW4_CAP8_TRIGGERS,
      12,
    ) >= 4;

  const echoOkFor12 =
    e.echoRatio < 0.45 ||
    (e.commentaryDepthRatio >= 0.35 && e.commentaryStructureScore >= 50) ||
    (e.thesisInOpening &&
      e.conclusionAligned &&
      e.commentaryDepthRatio >= 0.35 &&
      e.echoRatio <= 0.55) ||
    (e.commentaryStructureScore >= 75 &&
      e.thesisInOpening &&
      e.conclusionAligned &&
      e.echoRatio <= 0.55) ||
    (e.strongCounterclaimEngaged &&
      e.counterclaimPresent &&
      e.thesisInOpening &&
      e.conclusionAligned &&
      e.commentaryDepthRatio >= 0.5 &&
      e.echoRatio <= 0.65);

  if (
    e.hedgedThesisDetected &&
    e.descriptiveParagraphOpenerCount >= 3
  ) {
    return 4;
  }
  if (
    bothSidesHardCapsIwa(e) &&
    !e.thesisInOpening &&
    (e.exploratoryMode || e.inTextCitationCount < 5)
  ) {
    return 0;
  }
  if (e.hedgedThesisDetected || bothSidesHardCapsIwa(e)) {
    return 4;
  }

  /**
   * Block org-only R4=8 when depth=0, high structure, many named perspectives,
   * but no evaluative linking (batch4 junk food pattern).
   */
  const zeroDepthShellArgument =
    e.commentaryDepthRatio <= 0 &&
    e.commentaryStructureScore >= 25 &&
    e.evaluativeLinkingCount < 1 &&
    e.namedPerspectiveCount >= 4;
  const organizedGateOk = !zeroDepthShellArgument;

  const argumentativeOpeners =
    e.argumentativeTopicSentenceCount >= 2 ||
    (e.commentaryStructureScore >= 50 && e.thesisInOpening);

  if (
    hasThesis &&
    e.counterclaimPresent &&
    e.thesisInOpening &&
    e.conclusionAligned &&
    e.commentaryDepthRatio >= 0.9 &&
    e.echoRatio <= 0.4 &&
    !row4Cap8 &&
    !bothSidesHardCapsIwa(e)
  ) {
    return 12;
  }
  if (
    hasThesis &&
    counterclaimFor12 &&
    e.conclusionAligned &&
    organized &&
    developedCommentary &&
    echoOkFor12 &&
    !row4Cap8
  ) {
    return 12;
  }
  if (hasThesis && organized && organizedGateOk) return 8;
  if (hasThesis && (e.conclusionAligned || organized) && organizedGateOk) {
    return 8;
  }
  return 0;
}

/** Row 5 = 9 from portfolio quality without analysisDepth (high-anchor papers). */
function scoreIwaRow5OrganicNine(e: SeminarEvidence): number {
  if (e.urlOnlyBibliography) return 0;
  if (
    e.totalCredibilityPoints >= ROW5_NINE_CREDIBILITY_MIN &&
    e.scholarlyRatio >= ROW5_NINE_SCHOLARLY_RATIO_MIN &&
    Math.max(e.tier1SourceCount, e.scholarlySourceCount) >=
      ROW5_NINE_MIN_TIER1_OR_TIER2_SOURCES
  ) {
    return 9;
  }
  return 0;
}

function capRow5WithoutTier1(score: number, e: SeminarEvidence): number {
  if (
    (e.bothSidesMode || e.hedgedThesisDetected) &&
    e.tier1SourceCount < 2 &&
    e.totalNonStimulusSources >= 2
  ) {
    return Math.min(score, 4);
  }
  if (e.tier1SourceCount >= 1) return score;
  if (e.scholarlyRatio === 0 && e.totalNonStimulusSources >= 2) {
    return Math.min(score, 4);
  }
  if (e.totalNonStimulusSources >= 2) return Math.min(score, 4);
  return score;
}

export function scoreIwaRow5(e: SeminarEvidence): number {
  return scoreIwaRow5Inner(e);
}

function scoreIwaRow5Inner(e: SeminarEvidence): number {
  if (e.urlOnlyBibliography) return 0;
  const row5HardZero =
    countDistinctPatternHits(
      e.referencesText + "\n" + e.bodyText.slice(0, 1500),
      IWA_ROW5_DEDUCTION_TRIGGERS,
      12,
    ) >= 6 &&
    e.totalCredibilityPoints < 4 &&
    e.beyondStimulusWellVettedCount < 2 &&
    e.scholarlySourceCount < 2;
  if (row5HardZero) return 0;
  if (
    e.beyondStimulusWellVettedCount < 1 &&
    e.totalCredibilityPoints < 4 &&
    e.scholarlySourceCount < 1
  ) {
    return 0;
  }

  const scholarlySources = Math.max(
    e.tier1SourceCount,
    e.scholarlySourceCount,
  );

  const row5PortfolioWeak =
    countDistinctPatternHits(
      e.referencesText,
      IWA_ROW5_DEDUCTION_TRIGGERS,
      10,
    ) >= 5;

  const scholarlyOk =
    e.scholarlyRatio >= ROW5_NINE_SCHOLARLY_RATIO_MIN ||
    (e.tier1SourceCount >= 2 && e.totalCredibilityPoints >= 8) ||
    (e.totalCredibilityPoints >= 28 &&
      e.scholarlySourceCount >= ROW5_NINE_MIN_TIER1_OR_TIER2_SOURCES);

  if (
    e.totalCredibilityPoints >= ROW5_NINE_CREDIBILITY_MIN &&
    scholarlyOk &&
    e.analysisDepthCount >= ROW5_NINE_ANALYSIS_DEPTH_MIN &&
    scholarlySources >= ROW5_NINE_MIN_TIER1_OR_TIER2_SOURCES
  ) {
    if (e.tier1SourceCount < 1 && e.totalNonStimulusSources >= 3) {
      return capRow5WithoutTier1(4, e);
    }
    if (row5PortfolioWeak && e.scholarlyRatio < 0.55) return 6;
    return capRow5WithoutTier1(9, e);
  }
  if (
    e.totalCredibilityPoints >= 6 ||
    e.tier1SourceCount >= 1 ||
    (e.scholarlySourceCount >= 1 && e.totalNonStimulusSources >= 2) ||
    (e.beyondStimulusWellVettedCount >= 4 && e.inTextCitationCount >= 8)
  ) {
    return capRow5WithoutTier1(6, e);
  }
  if (e.beyondStimulusWellVettedCount >= 2 && e.inTextCitationCount >= 6) {
    return capRow5WithoutTier1(6, e);
  }
  return 0;
}

export function scoreIwaRow6(e: SeminarEvidence): number {
  const citeCount = e.inTextCitationCount;
  if (!e.bibliographyPresent || citeCount < 2) return 0;
  if (e.urlOnlyBibliography) return 0;
  const row6Zero =
    countDistinctPatternHits(
      e.bodyText.slice(0, 2000) + e.referencesText.slice(0, 1500),
      IWA_ROW6_DEDUCTION_TRIGGERS,
      10,
    ) >= 4 &&
    e.inTextCitationCount < 2;
  if (row6Zero) return 0;
  const wordsPerCite =
    e.bodyWordCount > 0 ? e.bodyWordCount / Math.max(citeCount, 1) : 0;
  if (e.bodyWordCount > 1200 && wordsPerCite > 400 && citeCount < 3) {
    return 0;
  }

  const link = e.bibliographyLinkedRatio;
  const missing = e.missingFromBibliographyCount;
  const row6Cap3 =
    countDistinctPatternHits(e.bodyText, IWA_ROW6_DEDUCTION_TRIGGERS, 12) >= 5 ||
    e.citationStyleViolations >= 5;
  if (missing > 4 || link < 0.5) return 0;
  if (
    link >= 0.85 &&
    missing <= 1 &&
    e.citationStyleViolations === 0 &&
    !row6Cap3 &&
    citeCount >= 2
  ) {
    return 5;
  }
  if (
    link >= 0.75 &&
    citeCount >= 15 &&
    e.bibliographyPresent &&
    missing <= 4 &&
    !row6Cap3
  ) {
    return 5;
  }
  if (link >= 0.65 || missing <= 3) {
    return 3;
  }
  if (e.citationStyleViolations >= 5 || e.attributivePhraseRatio < 0.35) {
    return 3;
  }
  if (e.bibliographyPresent && e.inTextCitationCount >= 3) return 3;
  return 0;
}

export function scoreIwaRow7(e: SeminarEvidence): number {
  if (e.colloquialSeverity >= 3) return 0;
  if (
    e.sentenceVarietyScore > 0.6 &&
    e.colloquialSeverity <= 1 &&
    e.colloquialHitCount <= 5
  ) {
    return 3;
  }
  if (
    e.colloquialSeverity === 2 &&
    e.colloquialHitCount === 0 &&
    e.bodyWordCount >= 1200
  ) {
    return 3;
  }
  if (e.colloquialSeverity === 2) return 2;
  if (e.colloquialSeverity === 1 || e.colloquialHitCount <= 9) return 2;
  if (
    e.sentenceVarietyScore > 0.5 &&
    e.colloquialSeverity <= 1 &&
    e.bodyWordCount >= 1400
  ) {
    return 3;
  }
  return 3;
}

/** CB-aligned bibliography breadth gates (seminar-3.2.8). */
function applyIwaBibliographySourceGates(
  scores: number[],
  e: SeminarEvidence,
): number[] {
  if (!e.bibliographyPresent) return scores;
  const p = analyzeBibliographyPortfolio(e.referencesText);
  const out = [...scores];
  if (p.biblioCount < 3) {
    out[2] = Math.min(out[2]!, 3);
    out[4] = Math.min(out[4]!, 3);
  }
  if (p.biblioCount < 5 && p.tier1PeerReviewedCount === 0) {
    out[4] = Math.min(out[4]!, 6);
  }
  if (p.allGovOrTestimony && p.biblioCount < 6) {
    out[4] = Math.min(out[4]!, 4);
  }
  return out;
}

function applyIwaCrossRowTieBreakers(scores: number[], e: SeminarEvidence): number[] {
  const out = [...scores];
  if (out[4] === 0) {
    out[2] = Math.min(out[2]!, 6);
  }
  return out;
}

function signalScores(e: SeminarEvidence): number[] {
  const raw = [
    scoreIwaRow1(e),
    scoreIwaRow2(e),
    scoreIwaRow3(e),
    scoreIwaRow4(e),
    scoreIwaRow5(e),
    scoreIwaRow6(e),
    scoreIwaRow7(e),
  ];
  return applyIwaBibliographySourceGates(
    applyIwaCrossRowTieBreakers(raw, e),
    e,
  );
}

export type AllZeroGateResult = { fires: boolean; reason: string };

/** CB zero-sample pattern: spurious row credit without bibliography / real argument. */
export function isAllZeroSubmission(
  e: SeminarEvidence,
  signal: number[],
): AllZeroGateResult {
  const organicTotal = signal.reduce((a, b) => a + b, 0);
  if (organicTotal <= 8) {
    return { fires: false, reason: "" };
  }

  if (
    !e.thesisPresent &&
    !e.bibliographyPresent &&
    e.inTextCitationCount < 3 &&
    organicTotal > 8
  ) {
    return { fires: true, reason: "no_thesis_no_bibliography" };
  }

  if (
    e.exploratoryMode &&
    !e.thesisPresent &&
    e.namedPerspectiveCount < 2 &&
    organicTotal > 8
  ) {
    return { fires: true, reason: "exploratory_no_argument" };
  }

  if (
    e.exploratoryMode &&
    !e.bibliographyPresent &&
    e.inTextCitationCount < 3 &&
    organicTotal > 8
  ) {
    return { fires: true, reason: "exploratory_no_citation_system" };
  }

  if (
    !e.thesisInOpening &&
    !e.bibliographyPresent &&
    organicTotal > 8
  ) {
    return { fires: true, reason: "no_opening_thesis_no_bibliography" };
  }

  return { fires: false, reason: "" };
}

function mergeScores(signal: number[], e: SeminarEvidence): number[] {
  const caps = evaluateIwaHardCaps(e);
  const anchor = classifyIwaAnchor(e);

  if (caps.allZeros) {
    return applyIwaHardCaps([0, 0, 0, 0, 0, 0, 0], e, caps);
  }

  // p01 and similar: exploratoryMode zeros Row 4 before this gate is evaluated.
  const allZero = isAllZeroSubmission(e, signal);
  if (allZero.fires) {
    if (
      (e.bothSidesMode || e.exploratoryMode) &&
      !e.thesisPresent
    ) {
      return applyIwaHardCaps(
        [
          Math.min(scoreIwaRow1(e), 2),
          scoreIwaRow2(e),
          0,
          0,
          0,
          scoreIwaRow6(e),
          scoreIwaRow7(e),
        ],
        e,
        caps,
      );
    }
    return applyIwaHardCaps([0, 0, 0, 0, 0, 0, 0], e, caps);
  }

  const minimalDraft =
    (!e.bibliographyPresent &&
      e.inTextCitationCount < 4 &&
      !e.thesisInOpening) ||
    (e.exploratoryMode &&
      !e.thesisPresent &&
      e.inTextCitationCount < 4 &&
      e.totalCredibilityPoints < 4);
  if (minimalDraft && signal.reduce((a, b) => a + b, 0) <= 15) {
    if ((e.bothSidesMode || e.exploratoryMode) && !e.thesisPresent) {
      return applyIwaHardCaps(
        [
          Math.min(scoreIwaRow1(e), 2),
          scoreIwaRow2(e),
          0,
          0,
          0,
          scoreIwaRow6(e),
          scoreIwaRow7(e),
        ],
        e,
        caps,
      );
    }
    return applyIwaHardCaps([0, 0, 0, 0, 0, 0, 0], e, caps);
  }
  if (
    !e.thesisPresent &&
    e.inTextCitationCount < 4 &&
    signal.reduce((a, b) => a + b, 0) <= 24
  ) {
    if (e.bothSidesMode || (e.exploratoryMode && !e.thesisPresent)) {
      return applyIwaHardCaps(
        [
          Math.min(scoreIwaRow1(e), 2),
          scoreIwaRow2(e),
          0,
          0,
          0,
          scoreIwaRow6(e),
          scoreIwaRow7(e),
        ],
        e,
        caps,
      );
    }
    return applyIwaHardCaps([0, 0, 0, 0, 0, 0, 0], e, caps);
  }

  if (anchor === "low") {
    const belowMinimum =
      (!e.bibliographyPresent &&
        scoreIwaRow4(e) === 0 &&
        e.inTextCitationCount < 12) ||
      (!e.thesisPresent &&
        scoreIwaRow4(e) === 0 &&
        e.inTextCitationCount < 8 &&
        e.colloquialSeverity >= 2);
    if (belowMinimum) {
      return applyIwaHardCaps([0, 0, 0, 0, 0, 0, 0], e, caps);
    }
    return applyIwaHardCaps(signal, e, caps);
  }

  return applyIwaHardCaps(signal, e, caps);
}

export function scoreIwaRows(
  e: SeminarEvidence,
  _options?: IwaGradeOptions,
): SeminarRowScore[] {
  const scores = mergeScores(signalScores(e), e);
  return ROW_META.map((meta, i) =>
    row(meta.id, meta.name, scores[i]!, meta.max, e),
  );
}

export function iwaAnchorComparison(e: SeminarEvidence, scores: number[]) {
  return compareIwaToAnchor(scores, e);
}

export function iwaSignalTotal(e: SeminarEvidence): number {
  return signalScores(e).reduce((a, b) => a + b, 0);
}

export function iwaOrganicScores(e: SeminarEvidence): number[] {
  return signalScores(e);
}
