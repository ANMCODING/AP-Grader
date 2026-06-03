import {
  bandScoreToFillPercent,
  formatBandScore,
  allLowOne,
  makeBand,
} from "@/lib/grader/format";
import {
  CATEGORY_NAMES,
  type CategoryResult,
  type GradeResult,
} from "@/lib/grader/types";
import { validateSubmission } from "@/lib/grader/validate";
import { applyCalibration } from "@/lib/grader/calibration";
import { gradeWithClaude, isClaudeGradingAvailable } from "@/lib/grader/claudeGrader";
import {
  confidenceForHybrid,
  needsSecondaryReview,
  SECONDARY_REVIEW_NOTE,
} from "@/lib/grader/hybridGrading";
import {
  applyEvidenceCategoryAndOverallCaps,
  buildVisualFlags,
  computeConfidence,
  finalizeOverallScore,
  scoreAllCategories,
  scoreOverall,
} from "@/lib/grader/scoring";
import { applyConservativeUnavailableAdjustment } from "@/lib/grader/overallCaps";
import { applyDisciplineOverallAdjustment } from "@/lib/grader/disciplineProfiles";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import {
  buildClaudeEvidenceDigest,
  buildEvidenceSummaries,
} from "@/lib/grader/evidenceSummary";
import { buildCapExplanationFlags } from "@/lib/grader/capFlags";
import {
  AP_TRADEMARK_DISCLAIMER,
  BAND_34_AMBIGUITY_NOTE,
  BODY_WORD_COUNT_FLAG,
  CALIBRATION_CAP_DISCREPANCY_NOTE,
  CALIBRATION_STUDENT_NOTE,
  GRADER_VERSION,
  PRACTICE_DISCLAIMER,
} from "@/lib/grader/gradingSpec";
import { shouldFlagNonEnglishPaper } from "@/lib/grader/languageDetect";
import {
  buildIncompleteSubmissionWarning,
  INCOMPLETE_SUBMISSION_CONFIDENCE_NOTE,
  INCOMPLETE_SUBMISSION_TIP,
  isIncompleteSubmission,
  isUrgentIncompleteSubmission,
} from "@/lib/grader/incompleteSubmission";
import {
  completenessIndicator,
  formatDiagnosticWarning,
} from "@/lib/grader/pipelineDiagnostic";
import { evaluateFunctionalRegionCoverage } from "@/lib/grader/functionalRegionCompleteness";
import { identifyFunctionalRegions } from "@/lib/grader/functionalRegions";
import {
  buildPdfQualityWarning,
  buildPdfSubmissionFlags,
} from "@/lib/grader/pdfSubmissionFlags";
import type { PdfSubmissionMeta } from "@/lib/server/pdfCleanTypes";

export interface GradePaperOptions {
  pdfSubmission?: PdfSubmissionMeta | null;
  joinSoftLineBreaksWordCount?: number | null;
}
const ANALYSIS_STEPS = [
  "Reading your paper…",
  "Analyzing your literature review…",
  "Evaluating your methodology…",
  "Comparing against scoring guidelines…",
  "Comparing your paper against scoring benchmarks…",
  "Calculating your scores…",
] as const;

function rejectionResult(flag: string, wordCount: number): GradeResult {
  const low = allLowOne();
  const categories: CategoryResult[] = CATEGORY_NAMES.map((name) => ({
    name,
    score: low,
    label: formatBandScore(low),
    fillPercent: bandScoreToFillPercent(low),
  }));
  return {
    categories,
    overall: low,
    overallLabel: formatBandScore(low),
    overallFillPercent: bandScoreToFillPercent(low),
    apScore: 1,
    apLabel: "Low",
    apDisplay: "1",
    confidence: "HIGH",
    confidenceExplanation: null,
    incompleteSubmissionWarning: null,
    pdfExtractionQualityWarning: null,
    flags: [flag, PRACTICE_DISCLAIMER],
    practiceDisclaimer: `${PRACTICE_DISCLAIMER} ${AP_TRADEMARK_DISCLAIMER}`,
    wordCount,
    citationStyleDetected: "N/A",
    rejected: true,
    teacherOverrideScore: null,
    teacherOverrideReason: null,
    previousOverallScore: null,
  };
}

export type GradeProgressCallback = (message: string) => void;

/**
 * Grade a student paper locally with evidence-based rules only.
 * Runs validation first; short or gibberish submissions get hard Low 1 rejection.
 */
export async function gradePaper(
  studentText: string,
  onProgress?: GradeProgressCallback,
  options?: GradePaperOptions,
): Promise<GradeResult> {
  const { partition } = prepareGradingInput(studentText, {
    joinSoftLineBreaksWordCount: options?.joinSoftLineBreaksWordCount ?? null,
  });
  const pdfMeta = options?.pdfSubmission ?? null;
  const incompleteSubmission = isIncompleteSubmission(
    partition.statedWordCount,
    partition.bodyWordCount,
    partition.originalInputWordCount,
  );
  const urgentIncomplete =
    partition.statedWordCount !== null &&
    isUrgentIncompleteSubmission(
      partition.statedWordCount,
      partition.bodyWordCount,
    );
  const incompleteSubmissionWarning =
    incompleteSubmission && partition.statedWordCount !== null
      ? buildIncompleteSubmissionWarning(
          partition.statedWordCount,
          partition.originalInputWordCount,
          partition.bodyWordCount,
        )
      : urgentIncomplete && partition.statedWordCount !== null
        ? buildIncompleteSubmissionWarning(
            partition.statedWordCount,
            partition.originalInputWordCount,
            partition.bodyWordCount,
          )
        : null;

  const pipelineDiagnostic = partition.pipelineDiagnostic;
  const completeness = completenessIndicator(pipelineDiagnostic);
  const diagnosticWarning = formatDiagnosticWarning(pipelineDiagnostic);

  const validation = validateSubmission(partition);

  onProgress?.("Validating submission…");

  if (!validation.ok) {
    return rejectionResult(validation.flag!, validation.wordCount);
  }

  for (const step of ANALYSIS_STEPS) {
    onProgress?.(step);
  }

  const { evidence, categories: rawCategories } = scoreAllCategories(partition);
  let categories = rawCategories;

  let overall = scoreOverall(categories);
  overall = finalizeOverallScore(categories, overall, evidence);

  let capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
  categories = capped.categories;
  overall = capped.overall;

  onProgress?.("Comparing your paper against scoring benchmarks…");

  const calibration = applyCalibration(evidence, categories, overall);
  categories = calibration.categories;
  overall = calibration.overall;

  capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
  categories = capped.categories;
  overall = finalizeOverallScore(capped.categories, capped.overall, evidence);

  const { level: baseConfidence, explanation: confidenceExplanation } =
    computeConfidence(categories, evidence);

  let categoriesFinal = categories;
  let overallFinal = overall;
  let usedClaude = false;
  const secondaryReview = needsSecondaryReview(overallFinal, categoriesFinal);
  const flags: string[] = [
    PRACTICE_DISCLAIMER,
    AP_TRADEMARK_DISCLAIMER,
    ...partition.pipelineFlags,
  ];

  if (validation.warningFlag) {
    flags.push(validation.warningFlag);
  }

  if (partition.statedWordCount !== null && partition.bodyWordCount > 0) {
    flags.push(BODY_WORD_COUNT_FLAG(partition.bodyWordCount));
    if (
      partition.statedWordCount !== partition.bodyWordCount &&
      !incompleteSubmission
    ) {
      flags.push(
        `Stated word count on cover page: ${partition.statedWordCount.toLocaleString()} words (for reference).`,
      );
    }
  }

  if (incompleteSubmission) {
    flags.push(INCOMPLETE_SUBMISSION_TIP);
  }

  if (urgentIncomplete) {
    flags.push(
      "Urgent: Your scored body is less than 50% of your stated word count. Resubmit using file upload (.docx or PDF) instead of paste to preserve your full paper.",
    );
  }

  flags.push(completeness.message);

  if (secondaryReview) {
    onProgress?.("Running secondary review for ambiguous score range…");
    if (isClaudeGradingAvailable()) {
      const claudeResult = await gradeWithClaude(
        partition.paperBody,
        buildClaudeEvidenceDigest(evidence),
      );
      if (claudeResult) {
        const claudeCaps = applyEvidenceCategoryAndOverallCaps(
          claudeResult.categories,
          claudeResult.overall,
          evidence,
        );
        categoriesFinal = claudeCaps.categories;
        overallFinal = finalizeOverallScore(
          claudeCaps.categories,
          claudeCaps.overall,
          evidence,
        );
        usedClaude = true;
      }
    }
  }

  if (secondaryReview && !usedClaude) {
    overallFinal = applyConservativeUnavailableAdjustment(
      overallFinal,
      true,
      false,
      { ev: evidence, activeCapReasons: capped.activeCapReasons },
    );
    flags.push(
      "Score may be slightly conservative as full analysis could not be completed.",
    );
  }

  let confidence = confidenceForHybrid(
    baseConfidence,
    usedClaude,
    secondaryReview && !usedClaude,
  );

  if (evidence.styleInconsistent) {
    flags.push("Citation style appears inconsistent across the paper.");
  }
  if (!evidence.hasBibliography && evidence.citationCount >= 3) {
    flags.push(
      "No references or works cited section detected — bibliography may be missing.",
    );
  }
  if (evidence.wordCount > 5500) {
    flags.push("Word count exceeds recommended maximum (5,500).");
  }
  if (shouldFlagNonEnglishPaper(evidence.fullText)) {
    flags.push(
      "Non-English or mixed-language text detected — analysis may be less accurate.",
    );
    if (confidence === "HIGH") confidence = "MEDIUM";
  }
  flags.push(...evidence.boundaryWordCountFlags);
  flags.push(...buildVisualFlags(evidence));

  const summaries = buildEvidenceSummaries(evidence, categoriesFinal);
  for (const s of summaries) {
    if (s.actionableFix) flags.push(s.actionableFix);
  }

  let finalConfidenceExplanation = confidenceExplanation;
  if (evidence.unusualDocumentStructure) {
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} Unusual document structure detected (appendix placement).`
      : "Unusual document structure detected (appendix placement).";
  }
  if (evidence.unusualSectionOrder) {
    confidence =
      confidence === "HIGH" ? "MEDIUM" : confidence === "MEDIUM" ? "LOW" : confidence;
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} Unusual section ordering detected. Some sections may have been mapped incorrectly which could affect score accuracy.`
      : "Unusual section ordering detected. Some sections may have been mapped incorrectly which could affect score accuracy.";
  }
  if (evidence.gapAbstractFallback) {
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} Gap statement detected only in the opening of the paper.`
      : "Gap statement detected only in the opening of the paper.";
  }
  if (evidence.statsHypothesisContradiction) {
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} Possible contradiction detected between non-significant results and conclusion claims. Review your discussion of statistical significance.`
      : "Possible contradiction detected between non-significant results and conclusion claims. Review your discussion of statistical significance.";
    if (confidence === "HIGH") confidence = "MEDIUM";
  }
  if (evidence.chicagoFootnoteStyle) {
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} Chicago-style footnote citations detected. Citation count estimated from bibliography.`
      : "Chicago-style footnote citations detected. Citation count estimated from bibliography.";
  }
  if (evidence.gapQuality === "asserted" && confidence !== "LOW") {
    confidence = confidence === "HIGH" ? "MEDIUM" : confidence;
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} Gap appears asserted rather than fully demonstrated.`
      : "Gap appears asserted rather than fully demonstrated.";
  }
  if (secondaryReview && !usedClaude) {
    confidence = confidence === "HIGH" ? "MEDIUM" : "LOW";
  }

  if (incompleteSubmission) {
    confidence = "LOW";
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${INCOMPLETE_SUBMISSION_CONFIDENCE_NOTE} ${finalConfidenceExplanation}`
      : INCOMPLETE_SUBMISSION_CONFIDENCE_NOTE;
  }

  const calibrationNote = CALIBRATION_STUDENT_NOTE(
    calibration.closestMatch.officialApScore,
  );
  finalConfidenceExplanation = finalConfidenceExplanation
    ? `${finalConfidenceExplanation} ${calibrationNote}`
    : calibrationNote;

  if (secondaryReview) {
    finalConfidenceExplanation = `${finalConfidenceExplanation} ${BAND_34_AMBIGUITY_NOTE}`;
  }

  if (secondaryReview && usedClaude) {
    finalConfidenceExplanation = `${finalConfidenceExplanation} Secondary review applied (analytical grader for band 3–4 range).`;
  } else if (secondaryReview) {
    flags.push(SECONDARY_REVIEW_NOTE);
  }

  if (evidence.visualEvidence.incompleteLabelingNote) {
    const note = evidence.visualEvidence.incompleteLabelingNote;
    finalConfidenceExplanation = finalConfidenceExplanation
      ? `${finalConfidenceExplanation} ${note}`
      : note;
  }

  const finalCaps = applyEvidenceCategoryAndOverallCaps(
    categoriesFinal,
    overallFinal,
    evidence,
  );
  categoriesFinal = finalCaps.categories;
  overallFinal = finalizeOverallScore(
    finalCaps.categories,
    finalCaps.overall,
    evidence,
  );

  const disciplineAdj = applyDisciplineOverallAdjustment(evidence, overallFinal);
  overallFinal = disciplineAdj.overall;

  const postDisciplineCaps = applyEvidenceCategoryAndOverallCaps(
    categoriesFinal,
    overallFinal,
    evidence,
  );
  categoriesFinal = postDisciplineCaps.categories;
  overallFinal = finalizeOverallScore(
    postDisciplineCaps.categories,
    postDisciplineCaps.overall,
    evidence,
  );

  const capReasonsCombined = [
    ...finalCaps.activeCapReasons,
    ...postDisciplineCaps.activeCapReasons,
  ];
  const hardCapLoweredOverall =
    calibration.closestMatch.officialApScore >= 3 &&
    overallFinal.band < 3 &&
    capReasonsCombined.some(
      (r) =>
        /forced to Low 1/i.test(r) ||
        /No student-generated data/i.test(r) ||
        /overall capped at Mid 2/i.test(r),
    );
  if (hardCapLoweredOverall) {
    finalConfidenceExplanation = `${finalConfidenceExplanation} ${CALIBRATION_CAP_DISCREPANCY_NOTE}`;
  }

  flags.unshift(...buildPdfSubmissionFlags(partition, pdfMeta));

  const functionalRegions = identifyFunctionalRegions(partition.paperBody);
  const regionCoverage = evaluateFunctionalRegionCoverage(
    functionalRegions,
    partition.bodyWordCount,
  );
  flags.push(...regionCoverage.flags);
  if (diagnosticWarning) {
    flags.push(diagnosticWarning);
  }

  flags.push(...buildCapExplanationFlags(evidence, categoriesFinal, overallFinal));
  const seenCapReasons = new Set<string>();
  for (const reason of capReasonsCombined) {
    if (seenCapReasons.has(reason)) continue;
    seenCapReasons.add(reason);
    flags.push(reason);
  }
  flags.push(`Grader version: ${GRADER_VERSION}`);

  const pdfExtractionQualityWarning = buildPdfQualityWarning(
    partition,
    pdfMeta,
  );

  const categoryResults: CategoryResult[] = CATEGORY_NAMES.map((name, i) => {
    const score = categoriesFinal[i];
    return {
      name,
      score,
      label: formatBandScore(score),
      fillPercent: bandScoreToFillPercent(score),
    };
  });

  return {
    categories: categoryResults,
    evidenceSummaries: summaries,
    overall: overallFinal,
    overallLabel: formatBandScore(overallFinal),
    overallFillPercent: bandScoreToFillPercent(overallFinal),
    apScore: overallFinal.band,
    apLabel: overallFinal.tier,
    apDisplay: String(overallFinal.band),
    confidence,
    confidenceExplanation: finalConfidenceExplanation,
    incompleteSubmissionWarning,
    pdfExtractionQualityWarning,
    flags,
    practiceDisclaimer: `${PRACTICE_DISCLAIMER} ${AP_TRADEMARK_DISCLAIMER}`,
    wordCount: evidence.wordCount,
    citationStyleDetected: evidence.citationStyle,
    pipelineDiagnostic,
    completenessIndicator: completeness,
    rejected: false,
    teacherOverrideScore: null,
    teacherOverrideReason: null,
    previousOverallScore: null,
  };
}

export function gradeResultToApiReport(result: GradeResult) {
  return {
    evidenceSummaries: result.evidenceSummaries,
    categories: result.categories.map((c) => ({
      name: c.name,
      label: c.label,
      fillPercent: c.fillPercent,
    })),
    overallLabel: result.overallLabel,
    overallFillPercent: result.overallFillPercent,
    apScore: result.apScore,
    apLabel: result.apLabel,
    apDisplay: result.apDisplay,
    confidence: result.confidence,
    confidenceExplanation: result.confidenceExplanation,
    incompleteSubmissionWarning: result.incompleteSubmissionWarning,
    pdfExtractionQualityWarning: result.pdfExtractionQualityWarning,
    flags: result.flags,
    practiceDisclaimer: result.practiceDisclaimer,
    wordCount: result.wordCount,
    citationStyleDetected: result.citationStyleDetected,
    pipelineDiagnostic: result.pipelineDiagnostic,
    completenessIndicator: result.completenessIndicator,
    rejected: result.rejected,
  };
}
