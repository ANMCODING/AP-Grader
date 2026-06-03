import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";
import { buildIwaDetectionNotes } from "@/lib/seminar/seminarDetectionNotes";
import {
  iwaAnchorComparison,
  iwaOrganicScores,
  isAllZeroSubmission,
  scoreIwaRows,
} from "@/lib/seminar/iwaRows";
import { iwaConfidence } from "@/lib/seminar/iwaCalibration";
import {
  attachWordCountWarningToRows,
  buildIwaPreflightResult,
  computeWordCountWarning,
  iwaHardFloor,
} from "@/lib/seminar/seminarPreflight";
import { qualityForIwa } from "@/lib/seminar/qualityLevel";
import { seminarWordCountFlags } from "@/lib/seminar/seminarWordCount";
import {
  applyIwaWordCountGates,
  applyWordCountGatesToRows,
} from "@/lib/seminar/seminarWordCountGates";
import {
  SEMINAR_DISCLAIMER,
  SEMINAR_GRADER_VERSION,
  type IwaGradeOptions,
  type SeminarGradeResult,
} from "@/lib/seminar/seminarTypes";

export function gradeIwa(
  text: string,
  options?: IwaGradeOptions,
): SeminarGradeResult {
  const metrics = prepareSeminarSubmissionMetrics(text);

  if (iwaHardFloor(metrics.bodyWordCount)) {
    return buildIwaPreflightResult(metrics);
  }

  const wordCountWarning = computeWordCountWarning("iwa", metrics.bodyWordCount);

  const practiceMode = Boolean(options?.practiceMode);
  const gradeOptions = {
    ...options,
    skipWordCountGates: options?.skipWordCountGates || practiceMode,
  };
  const evidence = buildSeminarEvidence(text, gradeOptions);
  let rows = scoreIwaRows(evidence, gradeOptions);
  let wordCountGate = null;
  if (!gradeOptions?.isOfficialSample && !gradeOptions?.skipWordCountGates) {
    const organicScores = rows.map((r) => r.score);
    wordCountGate = applyIwaWordCountGates(
      evidence.bodyWordCount,
      organicScores,
      evidence,
      rows,
    );
    rows = applyWordCountGatesToRows(rows, wordCountGate);
  }
  rows = attachWordCountWarningToRows(rows, wordCountWarning);

  const organicRows = iwaOrganicScores(evidence);
  const organicTotal = organicRows.reduce((a, b) => a + b, 0);
  const allZeroResult = isAllZeroSubmission(evidence, organicRows);
  const allZeroGate = allZeroResult.fires;
  let total = wordCountGate
    ? wordCountGate.finalTotal
    : rows.reduce((s, r) => s + r.score, 0);
  let displayTotal: number | undefined;
  let scoringNote: string | undefined;
  if (allZeroGate && organicTotal > 0) {
    displayTotal = organicTotal;
    scoringNote =
      "Score based on independently-scored rows. Rows 1, 3, 4, 5 scored 0 because " +
      "no thesis was detected. Add a clear argumentative claim to unlock these rows.";
  }
  const maxTotal = 48;
  const { level, message } = qualityForIwa(total, false);
  const wc = seminarWordCountFlags("iwa", evidence.bodyWordCount, evidence.statedWordCount);
  const flags: string[] = [...wc.flags];
  if (wordCountWarning) {
    flags.push(wordCountWarning);
  }
  if (evidence.stimulusYearDetected) {
    flags.push(
      `Likely stimulus year: ${evidence.stimulusYearDetected} (${evidence.stimulusTopicDetected ?? "performance task"}).`,
    );
  }
  const r4 = rows.find((r) => r.id === "row4_argument")?.score ?? 0;
  if (r4 === 0) {
    flags.push(
      "No argument detected: your essay must answer the research question with a clear position, not only explain or explore the topic.",
    );
  }
  if (!evidence.bibliographyPresent) {
    flags.push("No bibliography or works cited section was detected.");
  }
  if (allZeroGate) {
    flags.push(
      scoringNote ??
        "This submission does not demonstrate the core requirements of an IWA response. No defensible thesis was detected and no functional citation system was found.",
    );
  }
  const citeBibDelta = Math.abs(
    evidence.bibliographyEntryCount - evidence.inTextCitationCount,
  );
  if (citeBibDelta > 3) {
    flags.push(
      `Bibliography entry count (${evidence.bibliographyEntryCount}) and in-text citation count (${evidence.inTextCitationCount}) differ by ${citeBibDelta}. This may indicate bibliography formatting issues.`,
    );
  }

  if (gradeOptions?.skipWordCountGates && !gradeOptions?.isOfficialSample) {
    const gatePreview = applyIwaWordCountGates(
      evidence.bodyWordCount,
      rows.map((r) => r.score),
      evidence,
      rows,
    );
    if (gatePreview.finalTotal !== total && gatePreview.totalWordCountDeduction > 0) {
      console.warn(
        `[CALIBRATION_PARITY] IWA body ${evidence.bodyWordCount} words: calibration total ${total}, ` +
          `production with word-count gates would be ~${gatePreview.finalTotal}.`,
      );
    }
  }

  const rowScores = rows.map((r) => r.score);
  const { confidence, explanation } = iwaConfidence(total, rowScores, evidence);
  const anchor = iwaAnchorComparison(evidence, rowScores);
  const rowDetectionNotes = buildIwaDetectionNotes(rows, evidence);

  return {
    task: "iwa",
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
    rowDetectionNotes,
    wordCountGate,
    preflightFailed: false,
    preflightReason: null,
    wordCountWarning,
    preflightFeedback: null,
    displayTotal,
    allZeroGateFired: allZeroGate,
    scoringNote,
    practiceMode,
  };
}

export function iwaGradeToApiReport(result: SeminarGradeResult) {
  const fill = (score: number, max: number) =>
    Math.round((score / max) * 100);
  const wc = seminarWordCountFlags(
    "iwa",
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
    seminarTask: "iwa" as const,
    graderVersion: result.graderVersion,
    categories: result.rows.map((r) => ({
      name: r.name,
      label: `${r.score} / ${r.maxScore}`,
      fillPercent: fill(r.score, r.maxScore),
    })),
    rowFeedback,
    seminarAnchorNote: result.anchorComparisonNote,
    seminarRowDetectionNotes: result.rowDetectionNotes,
    overallLabel: `${result.displayTotal ?? result.total} / ${result.maxTotal}`,
    overallFillPercent: fill(
      result.displayTotal ?? result.total,
      result.maxTotal,
    ),
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
      "Note: The IWA is one component of your total AP Seminar score. Your overall AP course score also depends on your team performance task scores and end-of-course exam results. This tool scores the written essay only.",
    seminarRow1InfoNote:
      "About Row 1: This engine scores how well you integrate your sources into your argument — not which specific sources you use. At the highest level (5 points), a source should appear in multiple sections of your essay performing different argumentative functions. If you are responding to an official AP Seminar prompt, your integrated source should be from the provided stimulus packet.",
    seminarMaxTotal: 48,
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
