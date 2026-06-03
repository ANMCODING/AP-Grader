/**
 * CB-aligned word count enforcement (seminar-3.1.1).
 * Post-scoring layer: caps and proportional deductions after organic scoring.
 */
import type { SeminarEvidence, SeminarRowScore } from "@/lib/seminar/seminarTypes";
import {
  IWA_BAND_MINOR_MAX,
  IWA_BAND_MODERATE_MAX,
  IWA_BAND_SIGNIFICANT_MAX,
  IWA_BAND_SEVERE_MAX,
  IWA_CB_MAX,
  IWA_CB_MIN,
  IWA_PREFLIGHT_FLOOR,
  IRR_BAND_MINOR_MAX,
  IRR_BAND_MODERATE_MAX,
  IRR_BAND_SIGNIFICANT_MAX,
  IRR_BAND_SEVERE_MAX,
  IRR_CB_MAX,
  IRR_CB_MIN,
  IRR_PREFLIGHT_FLOOR,
} from "@/lib/seminar/seminarPolicy";

export type WordCountBand =
  | "preflight"
  | "severe"
  | "significant"
  | "moderate"
  | "minor"
  | "full"
  | "over";

export interface WordCountRowAdjustment {
  rowId: string;
  rowName: string;
  organicScore: number;
  cappedScore: number;
  capApplied: number | null;
  proportionalLoss: number;
  finalScore: number;
}

export interface WordCountGateResult {
  band: WordCountBand;
  statusLabel: string;
  rowCaps: Partial<Record<string, number>>;
  proportionalDeduction: number;
  totalWordCountDeduction: number;
  warningMessage: string | null;
  deductionMessage: string | null;
  studentMessage: string;
  adjustments: WordCountRowAdjustment[];
  organicScores: number[];
  cappedScores: number[];
  finalScores: number[];
  organicTotal: number;
  cappedTotal: number;
  finalTotal: number;
}

const IWA_ROW_IDS = [
  "row1_stimulus",
  "row2_context",
  "row3_perspective",
  "row4_argument",
  "row5_evidence",
  "row6_citation",
  "row7_style",
] as const;

const IRR_ROW_IDS = [
  "row1_context",
  "row2_argument",
  "row3_sources",
  "row4_perspective",
  "row5_citation",
  "row6_style",
] as const;

function sum(scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0);
}

function classifyIwaBand(bodyWordCount: number): WordCountBand {
  if (bodyWordCount <= IWA_PREFLIGHT_FLOOR) return "preflight";
  if (bodyWordCount <= IWA_BAND_SEVERE_MAX) return "severe";
  if (bodyWordCount <= IWA_BAND_SIGNIFICANT_MAX) return "significant";
  if (bodyWordCount <= IWA_BAND_MODERATE_MAX) return "moderate";
  if (bodyWordCount <= IWA_BAND_MINOR_MAX) return "minor";
  if (bodyWordCount <= IWA_CB_MAX) return "full";
  return "over";
}

function classifyIrrBand(bodyWordCount: number): WordCountBand {
  if (bodyWordCount <= IRR_PREFLIGHT_FLOOR) return "preflight";
  if (bodyWordCount <= IRR_BAND_SEVERE_MAX) return "severe";
  if (bodyWordCount <= IRR_BAND_SIGNIFICANT_MAX) return "significant";
  if (bodyWordCount <= IRR_BAND_MODERATE_MAX) return "moderate";
  if (bodyWordCount <= IRR_BAND_MINOR_MAX) return "minor";
  if (bodyWordCount <= IRR_CB_MAX) return "full";
  return "over";
}

function statusLabel(band: WordCountBand): string {
  switch (band) {
    case "full":
      return "Within range";
    case "over":
      return "Above maximum";
    case "preflight":
      return "Below minimum (not scored)";
    default:
      return "Below minimum";
  }
}

function isAnalyticallyThin(evidence: SeminarEvidence): boolean {
  return (
    evidence.echoRatio > 0.4 && evidence.commentaryDepthRatio < 0.35
  );
}

function iwaModerateBandCaps(
  bodyWordCount: number,
  evidence: SeminarEvidence,
): Partial<Record<string, number>> {
  const caps: Partial<Record<string, number>> = {
    row2_context: 5,
  };
  const thin = isAnalyticallyThin(evidence);
  if (thin) {
    caps.row1_stimulus = 4;
    caps.row4_argument = 8;
    return caps;
  }
  if (bodyWordCount < 1400) {
    caps.row1_stimulus = 4;
    caps.row4_argument = 8;
    return caps;
  }
  return caps;
}

function iwaRowCaps(
  band: WordCountBand,
  bodyWordCount: number,
  evidence: SeminarEvidence,
): Partial<Record<string, number>> {
  switch (band) {
    case "severe":
      return {
        row1_stimulus: 2,
        row2_context: 3,
        row3_perspective: 6,
        row4_argument: 0,
        row5_evidence: 6,
        row6_citation: 3,
        row7_style: 2,
      };
    case "significant":
      return {
        row1_stimulus: 3,
        row2_context: 5,
        row3_perspective: 6,
        row4_argument: 8,
        row5_evidence: 6,
        row6_citation: 3,
        row7_style: 2,
      };
    case "moderate":
      return iwaModerateBandCaps(bodyWordCount, evidence);
    case "minor":
      if (isAnalyticallyThin(evidence)) {
        return { row4_argument: 8 };
      }
      return {};
    default:
      return {};
  }
}

function irrRowCaps(
  band: WordCountBand,
  evidence: SeminarEvidence,
): Partial<Record<string, number>> {
  switch (band) {
    case "severe":
      return {
        row1_context: 2,
        row2_argument: 2,
        row3_sources: 2,
        row4_perspective: 2,
        row5_citation: 1,
        row6_style: 1,
      };
    case "significant":
      return {
        row1_context: 4,
        row2_argument: 4,
        row3_sources: 4,
        row4_perspective: 4,
        row5_citation: 2,
        row6_style: 2,
      };
    case "moderate":
      return {
        row2_argument: 4,
        row3_sources: 4,
        row4_perspective: 4,
      };
    case "minor":
      if (evidence.irrExplanationRatio < 0.3) {
        return { row2_argument: 4 };
      }
      return {};
    default:
      return {};
  }
}

function iwaProportionalDeduction(
  band: WordCountBand,
  bodyWordCount: number,
): number {
  if (band === "significant") {
    return Math.max(0, Math.floor((1200 - bodyWordCount) / 100));
  }
  if (band === "moderate") {
    return Math.max(0, Math.floor((1600 - bodyWordCount) / 150));
  }
  return 0;
}

function irrProportionalDeduction(
  band: WordCountBand,
  bodyWordCount: number,
): number {
  if (band === "significant") {
    return Math.max(0, Math.floor((800 - bodyWordCount) / 100));
  }
  if (band === "moderate") {
    return Math.max(0, Math.floor((1000 - bodyWordCount) / 150));
  }
  return 0;
}

function iwaStudentMessage(
  band: WordCountBand,
  n: number,
  proportionalDeduction: number,
): string {
  const toMin = IWA_CB_MIN - n;
  const distBelow = IWA_CB_MIN - n;
  switch (band) {
    case "severe":
      return `Your paper is ${n} words. The IWA requires 1,800–2,200 words. At this length, a full argument structure (thesis, counterargument, rebuttal, conclusion) is not achievable. Row 4 is capped at 0. Rows 1, 2, 3, 5 are capped at reduced maximums. Add ${toMin} words to reach the minimum.`;
    case "significant": {
      const prop =
        proportionalDeduction > 0
          ? ` An additional ${proportionalDeduction} point${proportionalDeduction === 1 ? "" : "s"} has been deducted for being ${distBelow} words below the minimum.`
          : "";
      return `Your paper is ${n} words — below the 1,800-word minimum. Row 4 is capped at 8 (full argument development requires more space). Row 1 is capped at 3 (deep multi-section integration requires more space).${prop} Add ${toMin} words to reach the minimum and remove all word count penalties.`;
    }
    case "moderate": {
      const prop =
        proportionalDeduction > 0
          ? ` An additional ${proportionalDeduction} point${proportionalDeduction === 1 ? "" : "s"} has been deducted.`
          : "";
      return `Your paper is ${n} words — below the 1,800-word minimum. Row 1 is capped at 4 (deepest integration requires the full length) and Row 4 is capped at 8 (full argument development requires more space).${prop} Add ${toMin} words to reach the minimum.`;
    }
    case "minor":
      return `Your paper is ${n} words — slightly below the 1,800-word minimum. No score deductions apply, but consider expanding to at least 1,800 words for full compliance with CB guidelines.`;
    case "over":
      return `Your paper is ${n} words — above the 2,200-word maximum. AP Seminar readers score only up to the word limit. Consider trimming your paper to under 2,200 words to ensure all your work is evaluated.`;
    default:
      return "";
  }
}

function irrStudentMessage(
  band: WordCountBand,
  n: number,
  proportionalDeduction: number,
): string {
  const toMin = IRR_CB_MIN - n;
  switch (band) {
    case "severe":
      return `Your report is ${n} words. The IRR requires 1,080–1,320 words. At this length, full analytical development across all six dimensions is not achievable. All rows are severely capped. Add ${toMin} words to reach the minimum.`;
    case "significant": {
      const prop =
        proportionalDeduction > 0
          ? ` An additional ${proportionalDeduction} point${proportionalDeduction === 1 ? "" : "s"} deducted for length.`
          : "";
      return `Your report is ${n} words — significantly below the 1,080-word minimum. All content rows are capped at 4.${prop} Add ${toMin} words to reach the minimum.`;
    }
    case "moderate": {
      const prop =
        proportionalDeduction > 0
          ? ` An additional ${proportionalDeduction} point${proportionalDeduction === 1 ? "" : "s"} deducted.`
          : "";
      return `Your report is ${n} words — below the 1,080-word minimum. Rows 2, 3, and 4 are capped at 4.${prop} Add ${toMin} words to reach the minimum.`;
    }
    case "minor":
      return `Your report is ${n} words — slightly below the 1,080-word minimum. No deductions apply. Consider expanding to 1,080+ words for full CB compliance.`;
    case "over":
      return `Your report is ${n} words — above the 1,320-word maximum. AP Seminar readers score only up to the word limit. Consider trimming to under 1,320 words.`;
    default:
      return "";
  }
}

function applyCaps(
  organicScores: number[],
  rowIds: readonly string[],
  caps: Partial<Record<string, number>>,
): number[] {
  return organicScores.map((score, i) => {
    const id = rowIds[i]!;
    const cap = caps[id];
    if (cap == null) return score;
    return Math.min(score, cap);
  });
}

function applyProportionalDeductionWithAmount(
  scores: number[],
  deduction: number,
): { scores: number[]; perRow: number[] } {
  const out = [...scores];
  const perRow = scores.map(() => 0);
  let remaining = deduction;
  while (remaining > 0) {
    let minIdx = -1;
    let minVal = Infinity;
    for (let i = 0; i < out.length; i++) {
      if (out[i]! > 0 && out[i]! < minVal) {
        minVal = out[i]!;
        minIdx = i;
      }
    }
    if (minIdx < 0) break;
    out[minIdx]!--;
    perRow[minIdx]!++;
    remaining--;
  }
  return { scores: out, perRow };
}

function buildGateResult(
  task: "iwa" | "irr",
  bodyWordCount: number,
  organicScores: number[],
  rows: SeminarRowScore[],
  evidence: SeminarEvidence,
): WordCountGateResult {
  const rowIds = task === "iwa" ? IWA_ROW_IDS : IRR_ROW_IDS;
  const band =
    task === "iwa"
      ? classifyIwaBand(bodyWordCount)
      : classifyIrrBand(bodyWordCount);
  const caps =
    task === "iwa"
      ? iwaRowCaps(band, bodyWordCount, evidence)
      : irrRowCaps(band, evidence);
  const proportionalDeduction =
    task === "iwa"
      ? iwaProportionalDeduction(band, bodyWordCount)
      : irrProportionalDeduction(band, bodyWordCount);

  const cappedScores = applyCaps(
    [...organicScores],
    rowIds,
    caps,
  );
  const { scores: afterProp, perRow: propLoss } =
    applyProportionalDeductionWithAmount(cappedScores, proportionalDeduction);

  const adjustments: WordCountRowAdjustment[] = rows.map((r, i) => {
    const id = rowIds[i]!;
    const organic = organicScores[i] ?? 0;
    const capped = cappedScores[i] ?? 0;
    const capVal = caps[id] ?? null;
    const final = afterProp[i] ?? 0;
    return {
      rowId: id,
      rowName: r.name,
      organicScore: organic,
      cappedScore: capped,
      capApplied: capVal,
      proportionalLoss: propLoss[i] ?? 0,
      finalScore: final,
    };
  });

  const organicTotal = sum(organicScores);
  const cappedTotal = sum(cappedScores);
  const finalTotal = sum(afterProp);
  const capPointsLost = adjustments.reduce(
    (a, adj) => a + Math.max(0, adj.organicScore - adj.cappedScore),
    0,
  );
  const totalWordCountDeduction =
    capPointsLost + proportionalDeduction;

  let warningMessage: string | null = null;
  let deductionMessage: string | null = null;
  const studentMessage =
    task === "iwa"
      ? iwaStudentMessage(band, bodyWordCount, proportionalDeduction)
      : irrStudentMessage(band, bodyWordCount, proportionalDeduction);

  if (band === "over") {
    warningMessage = studentMessage;
  } else if (band !== "full" && band !== "preflight" && studentMessage) {
    if (totalWordCountDeduction > 0) {
      deductionMessage = `Word count deductions: −${totalWordCountDeduction} point${totalWordCountDeduction === 1 ? "" : "s"}`;
    }
  }

  return {
    band,
    statusLabel: statusLabel(band),
    rowCaps: caps,
    proportionalDeduction,
    totalWordCountDeduction,
    warningMessage,
    deductionMessage,
    studentMessage:
      band === "full" || band === "preflight" ? "" : studentMessage,
    adjustments,
    organicScores: [...organicScores],
    cappedScores,
    finalScores: afterProp,
    organicTotal,
    cappedTotal,
    finalTotal,
  };
}

export function applyIwaWordCountGates(
  bodyWordCount: number,
  organicScores: number[],
  evidence: SeminarEvidence,
  rows: SeminarRowScore[],
): WordCountGateResult {
  return buildGateResult("iwa", bodyWordCount, organicScores, rows, evidence);
}

export function applyIrrWordCountGates(
  bodyWordCount: number,
  organicScores: number[],
  evidence: SeminarEvidence,
  rows: SeminarRowScore[],
): WordCountGateResult {
  return buildGateResult("irr", bodyWordCount, organicScores, rows, evidence);
}

export function applyWordCountGatesToRows(
  rows: SeminarRowScore[],
  gate: WordCountGateResult,
): SeminarRowScore[] {
  return rows.map((r, i) => {
    const adj = gate.adjustments[i];
    const finalScore = adj?.finalScore ?? r.score;
    let detectionNote = r.detectionNote;
    if (adj && adj.organicScore !== finalScore) {
      const parts: string[] = [];
      if (adj.capApplied != null && adj.organicScore > adj.cappedScore) {
        parts.push(
          `Word count cap: ${adj.organicScore}→${adj.cappedScore} (max ${adj.capApplied})`,
        );
      }
      if (adj.proportionalLoss > 0) {
        parts.push(`Proportional length deduction: −${adj.proportionalLoss}`);
      }
      if (parts.length) {
        detectionNote = detectionNote
          ? `${detectionNote} ${parts.join("; ")}`
          : parts.join("; ");
      }
    }
    return { ...r, score: finalScore, detectionNote };
  });
}

export { classifyIwaBand, classifyIrrBand };
