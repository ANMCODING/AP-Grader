export type BandTier = "Low" | "Mid" | "High";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface BandScore {
  band: 1 | 2 | 3 | 4 | 5;
  tier: BandTier;
}

export interface CategoryResult {
  name: string;
  score: BandScore;
  label: string;
  fillPercent: number;
}

export interface CategoryEvidenceSummary {
  name: string;
  signals: string[];
}

import type { SubmissionPipelineDiagnostic } from "@/lib/grader/pipelineDiagnostic";

export interface CompletenessIndicator {
  level: "green" | "yellow" | "neutral" | "orange" | "red";
  message: string;
}

export interface GradeResult {
  categories: CategoryResult[];
  evidenceSummaries?: CategoryEvidenceSummary[];
  overall: BandScore;
  overallLabel: string;
  overallFillPercent: number;
  /** Integer 1–5 for AP prediction pill (tiers omitted). */
  apScore: number;
  apLabel: BandTier;
  apDisplay: string;
  confidence: ConfidenceLevel;
  confidenceExplanation: string | null;
  /** Shown above disclaimers when body words are far below stated cover-page count. */
  incompleteSubmissionWarning: string | null;
  /** Shown when PDF extraction quality is low (docx upload recommended). */
  pdfExtractionQualityWarning: string | null;
  flags: string[];
  practiceDisclaimer: string;
  wordCount: number;
  citationStyleDetected: string;
  pipelineDiagnostic?: SubmissionPipelineDiagnostic;
  completenessIndicator?: CompletenessIndicator;
  rejected: boolean;
  /** Reserved for teacher override UI. */
  teacherOverrideScore?: BandScore | null;
  teacherOverrideReason?: string | null;
  /** Reserved for revision delta UI. */
  previousOverallScore?: BandScore | null;
}

export const CATEGORY_NAMES = [
  "Focus and Scope",
  "Scholarly Grounding",
  "Method and Replicability",
  "Argument and Evidence",
  "Communication and Citation",
] as const;
