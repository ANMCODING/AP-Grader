import {
  IWA_WORD_COUNT_HARD_FLOOR,
  IWA_WORD_COUNT_WARNING_CEILING,
  IWA_WORD_COUNT_WARNING_FLOOR,
  IRR_WORD_COUNT_HARD_FLOOR,
  IRR_WORD_COUNT_WARNING_FLOOR,
} from "@/lib/seminar/seminarPolicy";
import type {
  SeminarEvidence,
  SeminarGradeResult,
  SeminarRowScore,
  SeminarTask,
} from "@/lib/seminar/seminarTypes";
import { SEMINAR_GRADER_VERSION } from "@/lib/seminar/seminarTypes";
import type { SeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";

const IWA_ROW_META = [
  { id: "row1_stimulus", name: "Understand and Analyze Context (Stimulus)", max: 5 },
  { id: "row2_context", name: "Understand and Analyze Context (Significance)", max: 5 },
  { id: "row3_perspective", name: "Understand and Analyze Perspective", max: 9 },
  { id: "row4_argument", name: "Establish Argument", max: 12 },
  { id: "row5_evidence", name: "Select and Use Evidence", max: 9 },
  { id: "row6_citation", name: "Apply Conventions (Citation)", max: 5 },
  { id: "row7_style", name: "Apply Conventions (Grammar and Style)", max: 3 },
];

const IRR_ROW_META = [
  { id: "row1_context", name: "Understand and Analyze Context", max: 6 },
  { id: "row2_argument", name: "Establish Argument", max: 6 },
  { id: "row3_sources", name: "Select and Use Evidence", max: 6 },
  { id: "row4_perspective", name: "Understand and Analyze Perspective", max: 6 },
  { id: "row5_citation", name: "Apply Conventions (Citation)", max: 5 },
  { id: "row6_style", name: "Apply Conventions (Grammar and Style)", max: 3 },
];

function emptyEvidence(
  metrics: SeminarSubmissionMetrics,
): SeminarEvidence {
  return {
    bodyText: metrics.bodyText,
    referencesText: metrics.referencesText,
    bodyWordCount: metrics.bodyWordCount,
    fullWordCount: metrics.fullWordCount,
    statedWordCount: metrics.statedWordCount,
    namedSourceCount: 0,
    contextSignalCount: 0,
    seminarContextScore: 0,
    synthesisPhraseCount: 0,
    contrastiveLinkCount: 0,
    perspectiveSynthesisScore: 0,
    thesisPresent: false,
    studentVoiceScore: 0,
    seminarStudentVoiceScore: 0,
    sourceToCommentaryRatio: 0,
    wellVettedSourceCount: 0,
    journalisticSourceCount: 0,
    purposefulAnalysisCount: 0,
    bibliographyPresent: false,
    bibliographyEntryCount: 0,
    inTextCitationCount: 0,
    citationStyleConsistent: false,
    bibliographyLinkedRatio: 0,
    attributivePhraseCount: 0,
    colloquialHitCount: 0,
    academicStyleSignalCount: 0,
    quoteProportion: 0,
    stimulusIntegrationHits: 0,
    integratedCitationCount: 0,
    tangentialCitationCount: 0,
    summaryOnlyMode: true,
    stimulusMentioned: false,
    vagueImportanceCount: 0,
    statisticalUrgencyCount: 0,
    rqContextLinked: false,
    significanceFramingPresent: false,
    namedPerspectiveCount: 0,
    comparisonSignalCount: 0,
    evaluativePerspectiveCount: 0,
    inconsistentAttribution: false,
    reasoningExplanationCount: 0,
    credentialMentionCount: 0,
    sourceEvaluationCount: 0,
    citationDensityPer100Words: 0,
    urlOnlyBibliography: false,
    synthesisIsolationCount: 0,
    stimulusYearDetected: null,
    stimulusTopicDetected: null,
    stimulusAuthorsMatched: [],
    stimulusIntegrationQuality: 0,
    stimulusDefinitionOnly: false,
    stimulusIntroductionOnly: false,
    beyondStimulusWellVettedCount: 0,
    exploratoryMode: true,
    sourceSentenceRatio: 0,
    commentarySentenceRatio: 0,
    regionsLocatedByHeading: false,
    irrMethodologySignalCount: 0,
    irrBiasEvaluationCount: 0,
    irrOrganizationalPreview: false,
    detectedPerspectives: [],
    totalNonStimulusSources: 0,
    scholarlySourceCount: 0,
    scholarlyRatio: 0,
    analysisDepthCount: 0,
    missingFromBibliographyCount: 0,
    missingFromTextCount: 0,
    descriptiveLinkingCount: 0,
    evaluativeLinkingCount: 0,
    commentaryEchoCount: 0,
    commentaryDevelopCount: 0,
    commentaryDepthRatio: 0,
    substantiatedRqContextCount: 0,
    irrMechanismCount: 0,
    irrSummaryOnlyCount: 0,
    irrMultiSourceSynthesisCount: 0,
    irrGeneralConnectionCount: 0,
    irrBiasAcknowledgmentCount: 0,
    namedStimulusInBody: false,
    stimulusAuthorsInBody: [],
    stimulusBodyIntegrated: false,
    namedSourceInBody: false,
    integrationFunctionDetected: false,
    row1Tangential: true,
    row1TypeCOnly: false,
    row1BibliographyOnly: false,
    row1IntroOnly: false,
    row1DefinitionOnly: false,
    row1ZeroReason: "no_named_source",
    namedSourcesFound: [],
    row1IntegrationQuality: {
      primaryAuthor: null,
      appearanceCount: 0,
      isMultiSection: false,
      sections: [],
      functionCount: 0,
      functions: [],
      commentaryQuality: "none",
      dialogueScore: 0,
      agreesWithSource: false,
      extendsSource: false,
      qualifiesSource: false,
      challengesSource: false,
      passesDeleteTest: false,
    },
    thesisInOpening: false,
    conclusionAligned: false,
    counterclaimPresent: false,
    irrCredentialScore: 0,
    irrCitedSourceCount: 0,
    irrMechanismAfterCount: 0,
    irrPerspectiveSynthesisScore: 0,
    dictionaryContextOpening: false,
    studentCommentarySentenceCount: 0,
    row1DiagnosticIntegrationLevel: 0,
    stimulusTangential: false,
    stimulusZeroReason: "no_stimulus_author",
    weakPerspectiveCount: 0,
    specificityScore: 0,
    namedPerspectiveTypeA: 0,
    perspectiveIsolated: false,
    commentaryStructureScore: 0,
    echoRatio: 1,
    strongCounterclaimEngaged: false,
    totalCredibilityPoints: 0,
    tier1SourceCount: 0,
    citationStyleViolations: 0,
    attributivePhraseRatio: 0,
    sentenceVarietyScore: 0,
    colloquialSeverity: 0,
    irrContextConditionA: false,
    irrContextConditionB: false,
    irrExplanationRatio: 0,
    irrCredibilityConsistency: 0,
    irrTierACredentialCount: 0,
    irrPerspectiveLensCount: 0,
    irrStrongSynthesisCount: 0,
    irrModerateSynthesisCount: 0,
    hedgedThesisDetected: false,
    bothSidesMode: false,
    bothSidesModeLocation: null,
    hasCommittedPosition: false,
    descriptiveParagraphOpenerCount: 0,
    argumentativeTopicSentenceCount: 0,
    irrRqSpecificityLow: false,
    irrAttributiveCitationCount: 0,
    irrDistinctAttributedSourceCount: 0,
    irrCrossSourceComparison: false,
    irrPerspectiveEvaluationCount: 0,
    irrDistinctDiscussedPerspectiveCount: 0,
    isMlaCitationFormat: false,
    contextSpecificityPenalty: 0,
    inTextCitationCountRow6: 0,
  };
}

function preflightRows(task: SeminarTask): SeminarRowScore[] {
  const meta = task === "iwa" ? IWA_ROW_META : IRR_ROW_META;
  const summary =
    task === "iwa"
      ? `This response is below the ${IWA_WORD_COUNT_HARD_FLOOR}-word minimum for IWA scoring eligibility. No row scores have been calculated.`
      : `This response is below the ${IRR_WORD_COUNT_HARD_FLOOR}-word minimum for IRR scoring eligibility. No row scores have been calculated.`;

  return meta.map((m) => ({
    id: m.id,
    name: m.name,
    score: 0,
    maxScore: m.max,
    feedback: summary,
    confidence: "HIGH" as const,
    detectionNote: null,
  }));
}

export function computeWordCountWarning(
  task: SeminarTask,
  bodyWordCount: number,
): string | null {
  if (task === "iwa") {
    if (bodyWordCount < IWA_WORD_COUNT_WARNING_FLOOR) {
      return `This response is ${bodyWordCount} words, below the recommended minimum of ${IWA_WORD_COUNT_WARNING_FLOOR} words. Scores may not reflect full potential — the rubric requires developed argument structure, multiple perspectives, and analytical commentary that are difficult to demonstrate in a brief response.`;
    }
    if (bodyWordCount > IWA_WORD_COUNT_WARNING_CEILING) {
      return `This response is ${bodyWordCount} words, above the recommended maximum of 2,200 words. Scores are not affected, but consider whether all content serves the argument.`;
    }
    return null;
  }
  if (bodyWordCount < IRR_WORD_COUNT_WARNING_FLOOR) {
    return `This response is ${bodyWordCount} words, below the recommended minimum of ${IRR_WORD_COUNT_WARNING_FLOOR} words for an IRR. Scores may not reflect full research-report depth.`;
  }
  return null;
}

export function iwaHardFloor(bodyWordCount: number): boolean {
  return bodyWordCount < IWA_WORD_COUNT_HARD_FLOOR;
}

export function irrHardFloor(bodyWordCount: number): boolean {
  return bodyWordCount < IRR_WORD_COUNT_HARD_FLOOR;
}

export function buildIwaPreflightResult(
  metrics: SeminarSubmissionMetrics,
): SeminarGradeResult {
  const summary = `This response is ${metrics.bodyWordCount} words and cannot be scored. AP Seminar IWA responses require a minimum of ${IWA_WORD_COUNT_WARNING_FLOOR} words to demonstrate the argument development, perspective analysis, and evidence use that the rubric assesses. A response this brief does not provide sufficient evidence for any rubric row.`;
  const wordCountWarning = `Response is ${metrics.bodyWordCount} words — below the ${IWA_WORD_COUNT_HARD_FLOOR}-word minimum for scoring eligibility. No row scores have been calculated.`;

  return {
    task: "iwa",
    rows: preflightRows("iwa"),
    total: 0,
    maxTotal: 48,
    qualityLevel: "Below Minimum",
    qualityMessage:
      "The submission is below the minimum word count for IWA scoring eligibility.",
    flags: [summary, wordCountWarning],
    confidence: "HIGH",
    confidenceExplanation:
      "Pre-flight word count gate: submission is below the hard floor for row-level scoring.",
    wordCount: metrics.fullWordCount,
    bodyWordCount: metrics.bodyWordCount,
    graderVersion: SEMINAR_GRADER_VERSION,
    citationStyleDetected: "N/A",
    evidence: emptyEvidence(metrics),
    anchorComparisonNote: null,
    rowDetectionNotes: [
      {
        row: "Pre-flight",
        note: `bodyWordCount=${metrics.bodyWordCount}, hardFloor=${IWA_WORD_COUNT_HARD_FLOOR}`,
      },
    ],
    wordCountGate: null,
    preflightFailed: true,
    preflightReason: "BELOW_HARD_FLOOR",
    wordCountWarning,
    preflightFeedback: {
      summary,
      wordCountWarning,
    },
  };
}

export function buildIrrPreflightResult(
  metrics: SeminarSubmissionMetrics,
): SeminarGradeResult {
  const summary = `This response is ${metrics.bodyWordCount} words and cannot be scored. AP Seminar IRR responses require substantive research reporting; submissions below ${IRR_WORD_COUNT_HARD_FLOOR} words do not provide sufficient evidence for rubric rows.`;
  const wordCountWarning = `Response is ${metrics.bodyWordCount} words — below the ${IRR_WORD_COUNT_HARD_FLOOR}-word minimum for IRR scoring eligibility.`;

  return {
    task: "irr",
    rows: preflightRows("irr"),
    total: 0,
    maxTotal: 30,
    qualityLevel: "Below Minimum",
    qualityMessage:
      "The submission is below the minimum word count for IRR scoring eligibility.",
    flags: [summary, wordCountWarning],
    confidence: "HIGH",
    confidenceExplanation:
      "Pre-flight word count gate: submission is below the hard floor for row-level scoring.",
    wordCount: metrics.fullWordCount,
    bodyWordCount: metrics.bodyWordCount,
    graderVersion: SEMINAR_GRADER_VERSION,
    citationStyleDetected: "N/A",
    evidence: emptyEvidence(metrics),
    anchorComparisonNote: null,
    rowDetectionNotes: [
      {
        row: "Pre-flight",
        note: `bodyWordCount=${metrics.bodyWordCount}, hardFloor=${IRR_WORD_COUNT_HARD_FLOOR}`,
      },
    ],
    wordCountGate: null,
    preflightFailed: true,
    preflightReason: "BELOW_HARD_FLOOR",
    wordCountWarning,
    preflightFeedback: {
      summary,
      wordCountWarning,
    },
  };
}

export function attachWordCountWarningToRows(
  rows: SeminarRowScore[],
  warning: string | null,
): SeminarRowScore[] {
  if (!warning) return rows;
  return rows.map((r) => ({
    ...r,
    feedback: r.feedback ? `${r.feedback} ${warning}` : warning,
  }));
}
