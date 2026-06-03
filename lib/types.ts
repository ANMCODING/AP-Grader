export type ApLabel = "Low" | "Mid" | "High";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type GradingCourse = "research" | "seminar";
export type SeminarTaskType = "iwa" | "irr";
export type SeminarQualityLabel =
  | "High"
  | "Strong"
  | "Developing"
  | "Beginning"
  | "Below Minimum";

export interface RowFeedbackItem {
  row: string;
  message: string;
}

export interface CategoryScore {
  name: string;
  /** Display label e.g. "Mid 4" */
  label: string;
  /** 0–100 for progress bar width */
  fillPercent: number;
}

export interface CompletenessIndicator {
  level: "green" | "yellow" | "neutral" | "orange" | "red";
  message: string;
}

export interface WordCountGateReport {
  band: string;
  statusLabel: string;
  studentMessage: string;
  totalDeduction: number;
  deductionSummary: string | null;
  proportionalDeduction: number;
  rowCapDetails: {
    row: string;
    cappedAt: number;
    organicScore: number;
  }[];
  show: boolean;
}

export interface SubmissionPipelineDiagnostic {
  originalInputWordCount: number;
  afterControlCharNormWordCount: number;
  afterCoverPageStripWordCount: number;
  afterCollegeBoardCleanWordCount: number | "skipped";
  afterNormalizePaperTextWordCount: number;
  afterJoinSoftLineBreaksWordCount: number | "n/a";
  afterAllCleaningWordCount: number;
  detectedBoundaryPosition: number | "none found";
  detectedBoundaryHeading: string | "none found";
  bodyWordCount: number;
  referencesWordCount: number;
  appendixWordCount: number;
  fallbackTriggered: boolean;
  fallbackReason: string | null;
  bodyToOriginalRatio: number;
  bodyToStatedRatio: number | null;
  statedWordCount: number | null;
  statedWordCountSource: string;
  collegeBoardCleanRan: boolean;
  coverPageLinesStripped: number;
  coverPageWordsStripped: number;
}

export interface ScoreReport {
  categories: CategoryScore[];
  overallLabel: string;
  overallFillPercent: number;
  apScore: number;
  apLabel: ApLabel | SeminarQualityLabel;
  apDisplay: string;
  gradingCourse?: GradingCourse;
  seminarTask?: SeminarTaskType;
  graderVersion?: string;
  qualityMessage?: string;
  rowFeedback?: RowFeedbackItem[];
  seminarComparisonNote?: string;
  seminarRow1InfoNote?: string;
  seminarMaxTotal?: number;
  seminarAnchorNote?: string | null;
  seminarRowDetectionNotes?: { row: string; note: string }[];
  confidence: ConfidenceLevel;
  confidenceExplanation: string | null;
  incompleteSubmissionWarning?: string | null;
  pdfExtractionQualityWarning?: string | null;
  flags: string[];
  practiceDisclaimer?: string;
  wordCount: number;
  citationStyleDetected: string;
  pipelineDiagnostic?: SubmissionPipelineDiagnostic;
  completenessIndicator?: CompletenessIndicator;
  rejected?: boolean;
  wordCountGate?: WordCountGateReport | null;
}
