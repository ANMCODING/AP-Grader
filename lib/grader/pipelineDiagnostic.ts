import type { PaperZones } from "@/lib/grader/paperBoundaries";
import type { CleaningCheckpoints } from "@/lib/grader/cleanDocument";

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

export function buildSubmissionPipelineDiagnostic(
  originalInputWordCount: number,
  checkpoints: CleaningCheckpoints,
  zones: PaperZones,
  options: {
    joinSoftLineBreaksWordCount?: number | null;
    statedWordCountSource?: string;
    collegeBoardCleanRan?: boolean;
    coverPageLinesStripped?: number;
    coverPageWordsStripped?: number;
  } = {},
): SubmissionPipelineDiagnostic {
  const bodyToOriginalRatio =
    originalInputWordCount > 0
      ? Math.round((zones.bodyWordCount / originalInputWordCount) * 1000) / 10
      : 0;

  const bodyToStatedRatio =
    zones.statedWordCount && zones.statedWordCount > 0
      ? Math.round((zones.bodyWordCount / zones.statedWordCount) * 1000) / 10
      : null;

  let detectedBoundaryHeading: string | "none found" = "none found";
  if (zones.referencesBoundary >= 0) {
    const lineStart = zones.fullDocument.lastIndexOf(
      "\n",
      zones.referencesBoundary - 1,
    );
    const chunk = zones.fullDocument
      .slice(lineStart + 1, zones.referencesBoundary + 120)
      .split("\n")[0]
      ?.trim();
    if (chunk) detectedBoundaryHeading = chunk.slice(0, 120);
  }

  const fallbackTriggered = Boolean(zones.boundaryDetectionWarning);
  let fallbackReason: string | null = null;
  if (fallbackTriggered && zones.boundaryDetectionWarning) {
    if (zones.boundaryDetectionWarning.includes("last-resort")) {
      fallbackReason = "body far below original length; last-resort body partition";
    } else if (zones.boundaryDetectionWarning.includes("conservative")) {
      fallbackReason = "body/raw or body/stated below threshold; conservative 80% split";
    } else {
      fallbackReason = "boundary adjusted after early references detection";
    }
  }

  return {
    originalInputWordCount,
    afterControlCharNormWordCount: checkpoints.afterControlCharNorm,
    afterCoverPageStripWordCount: checkpoints.afterCoverPageStrip,
    afterCollegeBoardCleanWordCount: checkpoints.afterCollegeBoardClean,
    afterNormalizePaperTextWordCount: checkpoints.afterNormalizePaperText,
    afterJoinSoftLineBreaksWordCount:
      options.joinSoftLineBreaksWordCount ?? "n/a",
    afterAllCleaningWordCount: checkpoints.afterAllCleaning,
    detectedBoundaryPosition:
      zones.referencesBoundary >= 0 ? zones.referencesBoundary : "none found",
    detectedBoundaryHeading,
    bodyWordCount: zones.bodyWordCount,
    referencesWordCount: zones.referencesZone
      ? zones.referencesZone.split(/\s+/).filter(Boolean).length
      : 0,
    appendixWordCount: zones.appendixZone
      ? zones.appendixZone.split(/\s+/).filter(Boolean).length
      : 0,
    fallbackTriggered,
    fallbackReason,
    bodyToOriginalRatio,
    bodyToStatedRatio,
    statedWordCount: zones.statedWordCount,
    statedWordCountSource: options.statedWordCountSource ?? "not found",
    collegeBoardCleanRan: options.collegeBoardCleanRan ?? false,
    coverPageLinesStripped: options.coverPageLinesStripped ?? 0,
    coverPageWordsStripped: options.coverPageWordsStripped ?? 0,
  };
}

export function completenessIndicator(
  diagnostic: SubmissionPipelineDiagnostic,
): {
  level: "green" | "yellow" | "neutral" | "orange" | "red";
  message: string;
} {
  const stated = diagnostic.statedWordCount;
  const body = diagnostic.bodyWordCount;
  if (stated && stated > 0) {
    const ratio = body / stated;
    if (ratio < 0.5) {
      return {
        level: "red",
        message:
          "Urgent: The engine received far less text than your stated word count. Resubmit using file upload (.docx recommended) instead of paste.",
      };
    }
    if (ratio < 0.75) {
      return {
        level: "orange",
        message: `Submission may be incomplete (${Math.round(ratio * 100)}% of stated ${stated.toLocaleString()} words in scored body).`,
      };
    }
    if (ratio >= 0.95) {
      return {
        level: "green",
        message: "Complete submission detected.",
      };
    }
    return {
      level: "yellow",
      message: "Submission appears mostly complete.",
    };
  }
  if (diagnostic.bodyToOriginalRatio < 70) {
    return {
      level: "orange",
      message: `Warning: The engine processed only ${diagnostic.bodyToOriginalRatio}% of your submitted text.`,
    };
  }
  return {
    level: "neutral",
    message:
      "No stated word count found. Add Word Count: N to your cover page for completeness verification.",
  };
}

export function formatDiagnosticWarning(
  diagnostic: SubmissionPipelineDiagnostic,
): string | null {
  if (diagnostic.bodyToOriginalRatio >= 70) return null;
  return (
    `Warning: The engine processed only ${diagnostic.bodyToOriginalRatio}% of your submitted text. ` +
    `This usually indicates a boundary detection error. Please report this submission using the feedback button.`
  );
}
