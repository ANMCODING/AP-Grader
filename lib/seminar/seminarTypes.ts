export type SeminarTask = "iwa" | "irr";

export type IwaRowId =
  | "row1_stimulus"
  | "row2_context"
  | "row3_perspective"
  | "row4_argument"
  | "row5_evidence"
  | "row6_citation"
  | "row7_style";

export type IrrRowId =
  | "row1_context"
  | "row2_argument"
  | "row3_sources"
  | "row4_perspective"
  | "row5_citation"
  | "row6_style";

export type RowConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type Row1CommentaryQuality =
  | "none"
  | "echo"
  | "basic"
  | "developing"
  | "deep";

export type Row1IntegrationFunction =
  | "context"
  | "evidence"
  | "counterargument"
  | "confirmation"
  | "framework"
  | "extension";

export interface Row1IntegrationQuality {
  primaryAuthor: string | null;
  appearanceCount: number;
  isMultiSection: boolean;
  sections: string[];
  functionCount: number;
  functions: Row1IntegrationFunction[];
  commentaryQuality: Row1CommentaryQuality;
  dialogueScore: number;
  agreesWithSource: boolean;
  extendsSource: boolean;
  qualifiesSource: boolean;
  challengesSource: boolean;
  passesDeleteTest: boolean;
}

export interface SeminarRowScore {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  feedback: string | null;
  confidence: RowConfidenceLevel;
  detectionNote: string | null;
}

export interface SeminarEvidence {
  bodyText: string;
  referencesText: string;
  bodyWordCount: number;
  fullWordCount: number;
  statedWordCount: number | null;
  namedSourceCount: number;
  contextSignalCount: number;
  seminarContextScore: number;
  synthesisPhraseCount: number;
  contrastiveLinkCount: number;
  perspectiveSynthesisScore: number;
  thesisPresent: boolean;
  studentVoiceScore: number;
  seminarStudentVoiceScore: number;
  sourceToCommentaryRatio: number;
  wellVettedSourceCount: number;
  journalisticSourceCount: number;
  purposefulAnalysisCount: number;
  bibliographyPresent: boolean;
  bibliographyEntryCount: number;
  inTextCitationCount: number;
  citationStyleConsistent: boolean;
  bibliographyLinkedRatio: number;
  attributivePhraseCount: number;
  colloquialHitCount: number;
  academicStyleSignalCount: number;
  quoteProportion: number;
  stimulusIntegrationHits: number;
  integratedCitationCount: number;
  tangentialCitationCount: number;
  summaryOnlyMode: boolean;
  stimulusMentioned: boolean;
  vagueImportanceCount: number;
  statisticalUrgencyCount: number;
  rqContextLinked: boolean;
  /** IWA Row 2: opening establishes stakes/urgency (not IRR-style RQ linkage). */
  significanceFramingPresent: boolean;
  namedPerspectiveCount: number;
  comparisonSignalCount: number;
  evaluativePerspectiveCount: number;
  inconsistentAttribution: boolean;
  reasoningExplanationCount: number;
  credentialMentionCount: number;
  sourceEvaluationCount: number;
  citationDensityPer100Words: number;
  urlOnlyBibliography: boolean;
  synthesisIsolationCount: number;
  stimulusYearDetected: string | null;
  stimulusTopicDetected: string | null;
  stimulusAuthorsMatched: string[];
  stimulusIntegrationQuality: number;
  stimulusDefinitionOnly: boolean;
  stimulusIntroductionOnly: boolean;
  beyondStimulusWellVettedCount: number;
  exploratoryMode: boolean;
  sourceSentenceRatio: number;
  commentarySentenceRatio: number;
  regionsLocatedByHeading: boolean;
  irrMethodologySignalCount: number;
  irrBiasEvaluationCount: number;
  irrOrganizationalPreview: boolean;
  detectedPerspectives: string[];
  totalNonStimulusSources: number;
  scholarlySourceCount: number;
  scholarlyRatio: number;
  analysisDepthCount: number;
  missingFromBibliographyCount: number;
  missingFromTextCount: number;
  descriptiveLinkingCount: number;
  evaluativeLinkingCount: number;
  commentaryEchoCount: number;
  commentaryDevelopCount: number;
  commentaryDepthRatio: number;
  substantiatedRqContextCount: number;
  irrMechanismCount: number;
  irrSummaryOnlyCount: number;
  irrMultiSourceSynthesisCount: number;
  irrGeneralConnectionCount: number;
  irrBiasAcknowledgmentCount: number;
  namedStimulusInBody: boolean;
  stimulusAuthorsInBody: string[];
  stimulusBodyIntegrated: boolean;
  /** Row 1 scoring: any named external source with Type A/B (not packet-specific). */
  namedSourceInBody: boolean;
  integrationFunctionDetected: boolean;
  row1Tangential: boolean;
  row1TypeCOnly: boolean;
  row1BibliographyOnly: boolean;
  row1IntroOnly: boolean;
  row1DefinitionOnly: boolean;
  row1ZeroReason: string | null;
  namedSourcesFound: string[];
  row1IntegrationQuality: Row1IntegrationQuality;
  thesisInOpening: boolean;
  conclusionAligned: boolean;
  counterclaimPresent: boolean;
  irrCredentialScore: number;
  irrCitedSourceCount: number;
  irrMechanismAfterCount: number;
  irrPerspectiveSynthesisScore: number;
  dictionaryContextOpening: boolean;
  studentCommentarySentenceCount: number;
  /** Diagnostic only — legacy stimulus depth scan; not used in Row 1 scoring. */
  row1DiagnosticIntegrationLevel: 0 | 1 | 2;
  examYearOverride?: string | null;
  isOfficialSample?: boolean;
  stimulusTangential: boolean;
  stimulusZeroReason: string | null;
  weakPerspectiveCount: number;
  specificityScore: number;
  namedPerspectiveTypeA: number;
  perspectiveIsolated: boolean;
  commentaryStructureScore: number;
  echoRatio: number;
  strongCounterclaimEngaged: boolean;
  totalCredibilityPoints: number;
  tier1SourceCount: number;
  citationStyleViolations: number;
  attributivePhraseRatio: number;
  sentenceVarietyScore: number;
  colloquialSeverity: 0 | 1 | 2 | 3;
  irrContextConditionA: boolean;
  irrContextConditionB: boolean;
  irrExplanationRatio: number;
  irrCredibilityConsistency: number;
  irrTierACredentialCount: number;
  irrPerspectiveLensCount: number;
  irrStrongSynthesisCount: number;
  irrModerateSynthesisCount: number;
  /** seminar-3.2.4 — Batch 2 calibration signals */
  hedgedThesisDetected: boolean;
  bothSidesMode: boolean;
  bothSidesModeLocation:
    | "opening"
    | "conclusion"
    | "body"
    | "throughout"
    | null;
  hasCommittedPosition: boolean;
  descriptiveParagraphOpenerCount: number;
  argumentativeTopicSentenceCount: number;
  irrRqSpecificityLow: boolean;
  contextSpecificityPenalty: number;
  inTextCitationCountRow6: number;
  irrAttributiveCitationCount: number;
  irrDistinctAttributedSourceCount: number;
  irrCrossSourceComparison: boolean;
  irrPerspectiveEvaluationCount: number;
  irrDistinctDiscussedPerspectiveCount: number;
  /** MLA parentheticals dominate over APA (seminar-3.2.18). */
  isMlaCitationFormat: boolean;
}

export type SeminarQualityLevel =
  | "High"
  | "Strong"
  | "Developing"
  | "Beginning"
  | "Below Minimum";

import type { WordCountGateResult } from "@/lib/seminar/seminarWordCountGates";

export interface SeminarGradeResult {
  task: SeminarTask;
  rows: SeminarRowScore[];
  total: number;
  maxTotal: number;
  qualityLevel: SeminarQualityLevel;
  qualityMessage: string;
  flags: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  confidenceExplanation: string | null;
  wordCount: number;
  bodyWordCount: number;
  graderVersion: string;
  citationStyleDetected: string;
  evidence: SeminarEvidence;
  anchorComparisonNote: string | null;
  rowDetectionNotes: { row: string; note: string }[];
  wordCountGate: WordCountGateResult | null;
  preflightFailed?: boolean;
  preflightReason?: string | null;
  wordCountWarning?: string | null;
  preflightFeedback?: {
    summary: string;
    wordCountWarning: string | null;
  } | null;
  /** When all-zero gate fires, show organic partial credit instead of 0. */
  displayTotal?: number;
  allZeroGateFired?: boolean;
  scoringNote?: string;
  practiceMode?: boolean;
}

export type { WordCountGateResult } from "@/lib/seminar/seminarWordCountGates";

export const SEMINAR_GRADER_VERSION = "seminar-3.2.24";

// seminar-3.2.24
// - Citation extraction unified (seminarInTextCitations); IRR methodology lists in seminarMethodology.
// - cbOfficialRegression removed from lib/app; CB overrides scripts-only. Regression drift baselines.

// seminar-3.2.13
// - Probe walker: task map from fixture JSON (IWA vs IRR).
// - golden-batch-irr.json + seminar-golden-batch-irr.ts (±1 per row).
// - practiceMode API toggle (?mode=practice).
// - Calibration parity warnings when skipWordCountGates is set.
// - IRR methodology category dedup; irrExplanationRatio body-length denominator.
// - R6 linking ratio: parenthetical-only denominator; proportional missing thresholds.
// - bothSidesModeLocation (opening cap 3 vs conclusion cap 6).
// - Developing-phrase repetition discount; remove exploratoryModeEarly short-circuit.
// - rqContextLinkInOpening structural (IRR); IWA R2 significance-only path.
// - Regression drift baseline + warn on mean shift > 0.5.
// - Multi-line bibliography normalization; hedged thesis proximity guard.
// - AP template phrases → exploratory not thesis; delete test as signal not gate.
// - All-zero gate displays organic partial credit with explanation.

// seminar-3.2.12
// - R4=8 requires thesis AND (conclusionAligned OR organized), not conclusion alone.
// - Removed R4=12 → R3=9 cross-row tie-breaker (rows score independently).
// - Concessive-rebuttal evaluative boost requires strong counterclaim or evaluative concession.
// - IRR evaluative synthesis patterns require perspectiveLensCount >= 2.
// - Full-body linking scan for papers ≤18k chars (~3k words).
// - All-zero merge gate citation threshold 8 → 4.
// - Row 1 cap at 3 when anchor author is Wikipedia.
// - IWA Row 2 feedback for scores 0/1/3.
// - gradeSeminarPaper accepts options; regression uses unified entry point.
// - Calibration scripts still use skipWordCountGates until golden targets are rebased
//   for production parity (see CHANGELOG.md).

// seminar-3.2.11
// - R4: conclusionAligned patterns for "research question admits/yields" and
//   retrospective thesis language; conclusion-end-only scan for broad framing.
// - R4: organized gate — comparison patterns, argument-structure patterns,
//   thesis+counterclaim+"this paper argues" override.
// - R4: counterclaimFor12 requires evaluative/descriptive linking or depth path.
// - R4: documentation — commentaryDepthRatio gate is 0.3, not 0.5.
// - R3/R4: expanded evaluative linking, developing, and echo commentary patterns.
// - IRR R2: statistics/design vocabulary (hazard ratio, Cohen's d, p-value, etc.).
// - IRR R1: positive RQ specificity bonus when not irrRqSpecificityLow.
// - IWA R2: significance scan 5000 chars + first-3-paragraph secondary pass.
// - Distributed thesis detection (≥3 argumentative body openers).
// - scripts/seminar-diagnostic-probe.ts, seminar-irr-r2-phrase-probe.ts.

// seminar-3.2.10
// seminar-3.2.9
// - Bibliography entry counter: Unicode surnames, org authors, year-in-parens floor
//   (fixes Park R3 false penalty from under-counted works cited)
// - extractYearFromEntry exported; Haugen (2021, October 5) links in bibliography index
// - Exploratory/both-sides partial scoring: R1 up to 2 when sources are integrated
// - Torres batch2 fixture rebuilt as fully exploratory (no hedged thesis)
// - Invalid in-text keys (coppa, early, jean) excluded from linking misses

// seminar-3.2.5
// - Rivera: Row 1 multi-section anchor 5/5 without evaluative-on-anchor; concessive-rebuttal evaluative linking
// - Torres: Row 5 cap 4 when no Tier 1; gov/FTC bibliography tier fix (Science committee false positive)
// - Microplastics: IRR RQ specificity override; scientific mechanism signals; IRR R1/R2 pathways

// seminar-3.2.4
// - Batch 2 calibration: IWA R1/R3/R4 discrimination, IRR R1–R4 false negative/positive fixes
// - Hard caps for both-sides / hedged thesis; IRR summary-heavy methodology exemption
// - R5=9 requires Tier 1 source; R6 figure-caption exclusion; batch2-calibration fixture

// seminar-3.2.3
// - Version string drift fixed: scripts and generated headers updated to 3.2.2/3.2.3
// - Dead exports removed: extractAuthorToken, mergeRegex, qualityForTask,
//   resolveIrrWithAnchor, THESIS_FRAMING_PATTERNS, PASTE_PDF_MAX_TOTAL_DELTA
// - IWA_REGRESSION_TOLERANCE / IRR_REGRESSION_TOLERANCE wired into regression script
// - seminarAnchor.ts delta >= 12 replaced with ANCHOR_DISCREPANCY_LOW_CONFIDENCE
// - New: scripts/test-irr-row5-cap.ts (8 branch tests for proportional missing cap)
// - New: scripts/test-bibliography-normalization.ts (normalizeAbbreviations + linksBibliography)
// - No scoring changes. No pattern changes. No architecture changes.

// seminar-3.2.2
// - Proportional IRR Row 5 missing cap
// - Bibliography token matcher (normalizeAbbreviations, institutional aliases, et al., particles)
// - seminarBibliographyLinking.ts module

// seminar-3.2.1
// - Golden batch rebased: 10/11 papers +1 Row 7 (colloquial false positive fix)
// - test-row1-quality-scale: skipWordCountGates restores 6/6
// - Moderate band Row 4/1 caps conditional on analytical quality (echo/commentary depth)
// - PDF joinSoftLineBreaks bibliography guard; conservative stripPageArtifactLines
// - ORGANIZED_ARGUMENT_PATTERNS expanded; Row 1 CHALLENGE_SOURCE_PATTERNS expanded
// - IRR scoring logic unchanged

// seminar-3.2.0
// - Bibliography detection: whitelist protects all heading variants from cover strip
// - BIBLIOGRAPHY_HEADING_PATTERNS expanded to 700+ patterns across 10 categories
//   (standard, AP-specific, discipline, student variants, non-English, entry-level detection)
// - seminarBibliographyClassifier: 700+ entry classification patterns
//   (Tier 1: peer-reviewed journals, government, university press)
//   (Tier 2: established journalism, think tanks, research orgs)
//   (Tier 0: Wikipedia, AI-generated, social media, URL-only, vanity press)
// - COUNTERCLAIM_PATTERNS expanded from 14 to ~200 patterns
// - STRONG_COUNTERCLAIM expanded from 11 to ~200 patterns
// - Fixes Row 6 = 0 on all paste submissions with valid Works Cited sections
// - Fixes Row 4 = 8 on papers with genuine academic counterargument prose
// - IRR scoring unchanged
// - lib/grader/ unchanged except isCoverAuthorNameLine bibliography whitelist

/** Optional metadata for regression / teacher context. */
export interface IwaGradeOptions {
  examYear?: number | string;
  isOfficialSample?: boolean;
  /** Skip CB word-count caps (regression official samples, golden batch calibration). */
  skipWordCountGates?: boolean;
  /** When "irr", use IRR-specific phrase calibration (not IWA essay patterns). */
  task?: SeminarTask;
  /** Practice/draft grading — word-count gates not applied. */
  practiceMode?: boolean;
}

export const SEMINAR_DISCLAIMER =
  "This score is an automated estimate for practice and feedback purposes only. It is not an official AP score and should not be used in place of teacher feedback or College Board evaluation. The IWA and IRR are components of the total AP Seminar score — this tool scores only the written essay, not the full AP Seminar assessment. AP Seminar is a trademark registered by the College Board, which is not affiliated with and does not endorse this tool.";
