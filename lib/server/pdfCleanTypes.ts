/** Anonymized metrics from PDF cleaning (no paper content). */
export interface PdfCleaningStats {
  runningHeadersRemoved: number;
  pageNumberLinesRemoved: number;
  pageJoinerLinesRemoved: number;
  hyphenJoinsApplied: number;
}

export interface PdfExtractionDiagnostics {
  totalWordsExtracted: number;
  numPages: number;
  wordsPerPage: number;
  runningHeadersRemoved: number;
  pageNumberLinesRemoved: number;
  twoColumnDetected: boolean;
  likelyEmbeddedImages: boolean;
  statedWordCount: number | null;
  bodyToStatedRatio: number | null;
  extractionQuality: "high" | "low";
}

/** Client + server metadata for PDF submissions (no paper text). */
export interface PdfSubmissionMeta {
  numPages: number;
  likelyEmbeddedImages: boolean;
  extractionQuality: "high" | "low";
  wordsExtracted: number;
}
