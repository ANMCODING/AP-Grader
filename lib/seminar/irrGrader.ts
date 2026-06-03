import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";
import { buildIrrDetectionNotes } from "@/lib/seminar/seminarDetectionNotes";
import { irrAnchorComparison, scoreIrrRows } from "@/lib/seminar/irrRows";
import { irrConfidence } from "@/lib/seminar/irrCalibration";
import {
  attachWordCountWarningToRows,
  buildIrrPreflightResult,
  computeWordCountWarning,
  irrHardFloor,
} from "@/lib/seminar/seminarPreflight";
import { qualityForIrr } from "@/lib/seminar/qualityLevel";
import { seminarWordCountFlags } from "@/lib/seminar/seminarWordCount";
import {
  applyIrrWordCountGates,
  applyWordCountGatesToRows,
} from "@/lib/seminar/seminarWordCountGates";
import {
  SEMINAR_DISCLAIMER,
  SEMINAR_GRADER_VERSION,
  type IwaGradeOptions,
  type SeminarGradeResult,
} from "@/lib/seminar/seminarTypes";

export function gradeIrr(text: string, options?: IwaGradeOptions): SeminarGradeResult {
  const metrics = prepareSeminarSubmissionMetrics(text);

  if (irrHardFloor(metrics.bodyWordCount)) {
    return buildIrrPreflightResult(metrics);
  }

  const wordCountWarning = computeWordCountWarning("irr", metrics.bodyWordCount);

  const practiceMode = Boolean(options?.practiceMode);
  const gradeOptions = {
    ...options,
    task: "irr" as const,
    skipWordCountGates: options?.skipWordCountGates || practiceMode,
  };
  const evidence = buildSeminarEvidence(text, gradeOptions);
  let rows = scoreIrrRows(evidence);
  let wordCountGate = null;
  if (!gradeOptions?.isOfficialSample && !gradeOptions?.skipWordCountGates) {
    const organicScores = rows.map((r) => r.score);
    wordCountGate = applyIrrWordCountGates(
      evidence.bodyWordCount,
      organicScores,
      evidence,
      rows,
    );
    rows = applyWordCountGatesToRows(rows, wordCountGate);
  }
  rows = attachWordCountWarningToRows(rows, wordCountWarning);

  const total = wordCountGate
    ? wordCountGate.finalTotal
    : rows.reduce((s, r) => s + r.score, 0);
  const maxTotal = 30;
  const { level, message } = qualityForIrr(total, false);
  const wc = seminarWordCountFlags("irr", evidence.bodyWordCount, evidence.statedWordCount);
  const flags: string[] = [...wc.flags];
  if (wordCountWarning) {
    flags.push(wordCountWarning);
  }
  if (!evidence.bibliographyPresent) {
    flags.push("No bibliography or references section was detected.");
  }

  const { confidence, explanation } = irrConfidence(total, evidence);
  const rowScores = rows.map((r) => r.score);
  const anchor = irrAnchorComparison(evidence, rowScores);

  return {
    task: "irr",
    rows,
    total,
    maxTotal,
    qualityLevel: level,
    qualityMessage: message,
    flags,
    confidence,
    confidenceExplanation: explanation,
    wordCount: evidence.fullWordCount,
    bodyWordCount: evidence.bodyWordCount,
    graderVersion: SEMINAR_GRADER_VERSION,
    citationStyleDetected: evidence.citationStyleConsistent ? "APA/MLA" : "Mixed",
    evidence,
    anchorComparisonNote: anchor.note,
    rowDetectionNotes: buildIrrDetectionNotes(rows, evidence),
    wordCountGate,
    preflightFailed: false,
    preflightReason: null,
    wordCountWarning,
    preflightFeedback: null,
  };
}

export function irrGradeToApiReport(result: SeminarGradeResult) {
  const fill = (score: number, max: number) =>
    Math.round((score / max) * 100);
  const wc = seminarWordCountFlags(
    "irr",
    result.bodyWordCount,
    result.evidence.statedWordCount,
  );

  const rowFeedback = result.preflightFailed
    ? [
        {
          row: "Submission",
          message: result.preflightFeedback?.summary ?? result.flags[0] ?? "",
        },
      ]
    : result.rows
        .filter((r) => r.feedback || r.detectionNote)
        .map((r) => ({
          row: r.name,
          message: [r.feedback, r.detectionNote].filter(Boolean).join(" "),
        }));

  return {
    gradingCourse: "seminar" as const,
    seminarTask: "irr" as const,
    graderVersion: result.graderVersion,
    categories: result.rows.map((r) => ({
      name: r.name,
      label: `${r.score} / ${r.maxScore}`,
      fillPercent: fill(r.score, r.maxScore),
    })),
    rowFeedback,
    seminarAnchorNote: result.anchorComparisonNote,
    seminarRowDetectionNotes: result.rowDetectionNotes,
    overallLabel: `${result.total} / ${result.maxTotal}`,
    overallFillPercent: fill(result.total, result.maxTotal),
    apScore: 0,
    apLabel: result.qualityLevel,
    apDisplay: result.qualityLevel,
    confidence: result.confidence,
    confidenceExplanation: result.confidenceExplanation,
    incompleteSubmissionWarning: result.preflightFailed
      ? result.preflightFeedback?.summary ?? null
      : null,
    pdfExtractionQualityWarning: null,
    flags: [...result.flags, SEMINAR_DISCLAIMER],
    practiceDisclaimer: SEMINAR_DISCLAIMER,
    wordCount: result.wordCount,
    citationStyleDetected: result.citationStyleDetected,
    qualityMessage: result.qualityMessage,
    pipelineDiagnostic: {
      originalInputWordCount: result.wordCount,
      afterControlCharNormWordCount: result.wordCount,
      afterCoverPageStripWordCount: result.wordCount,
      afterCollegeBoardCleanWordCount: "skipped" as const,
      afterNormalizePaperTextWordCount: result.wordCount,
      afterJoinSoftLineBreaksWordCount: "n/a" as const,
      afterAllCleaningWordCount: result.bodyWordCount,
      detectedBoundaryPosition: "none found" as const,
      detectedBoundaryHeading: "none found",
      bodyWordCount: result.bodyWordCount,
      referencesWordCount: result.wordCount - result.bodyWordCount,
      appendixWordCount: 0,
      fallbackTriggered: false,
      fallbackReason: null,
      bodyToOriginalRatio:
        result.wordCount > 0 ? result.bodyWordCount / result.wordCount : 1,
      statedWordCount: result.evidence.statedWordCount,
      statedWordCountSource: result.evidence.statedWordCount
        ? "cover/metadata"
        : "none",
      bodyToStatedRatio:
        result.evidence.statedWordCount &&
        result.evidence.statedWordCount > 0
          ? result.bodyWordCount / result.evidence.statedWordCount
          : null,
      collegeBoardCleanRan: false,
      coverPageLinesStripped: 0,
      coverPageWordsStripped: 0,
    },
    completenessIndicator: {
      level: wc.completenessLevel,
      message: wc.completenessMessage,
    },
    rejected: result.preflightFailed,
    seminarComparisonNote:
      "Note: The IRR is one component of your total AP Seminar score. This tool scores the written report only.",
    seminarMaxTotal: 30,
    preflightFailed: result.preflightFailed ?? false,
    wordCountWarning: result.wordCountWarning ?? null,
    wordCountGate: result.wordCountGate
      ? {
          band: result.wordCountGate.band,
          statusLabel: result.wordCountGate.statusLabel,
          studentMessage:
            result.wordCountGate.studentMessage ||
            result.wordCountGate.warningMessage ||
            "",
          totalDeduction: result.wordCountGate.totalWordCountDeduction,
          deductionSummary: result.wordCountGate.deductionMessage,
          proportionalDeduction: result.wordCountGate.proportionalDeduction,
          rowCapDetails: result.wordCountGate.adjustments
            .filter(
              (a) =>
                a.capApplied != null && a.organicScore > (a.cappedScore ?? 0),
            )
            .map((a) => ({
              row: a.rowName,
              cappedAt: a.capApplied!,
              organicScore: a.organicScore,
            })),
          show: result.wordCountGate.band !== "full",
        }
      : null,
  };
}
