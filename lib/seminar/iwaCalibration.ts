import {
  ANCHOR_DISCREPANCY_LOW_CONFIDENCE,
  IWA_MAX_TOTAL_WITHOUT_STIMULUS,
} from "@/lib/seminar/seminarPolicy";
import type { SeminarEvidence } from "@/lib/seminar/seminarTypes";
import { iwaSignalTotal } from "@/lib/seminar/iwaRows";

/** Confidence only — does not change row scores. */
export function iwaConfidence(
  total: number,
  rows: number[],
  e: SeminarEvidence,
): {
  confidence: "HIGH" | "MEDIUM" | "LOW";
  explanation: string | null;
} {
  const signalTotal = iwaSignalTotal(e);
  const delta = Math.abs(signalTotal - total);

  if (rows[0] === 0 && total > IWA_MAX_TOTAL_WITHOUT_STIMULUS) {
    return {
      confidence: "LOW",
      explanation:
        "No named source integration detected in this submission, but the total score is high. Teacher review is recommended. If this paper responds to an official AP Seminar prompt, confirm the student named at least one stimulus packet author.",
    };
  }

  if (rows[4] === 0 && rows[5] === 0 && (rows[3] ?? 0) >= 8) {
    return {
      confidence: "LOW",
      explanation:
        "Strong argument detected but no credible sources or citations found. This combination is unusual — teacher review recommended.",
    };
  }

  if (delta >= ANCHOR_DISCREPANCY_LOW_CONFIDENCE) {
    return {
      confidence: "LOW",
      explanation:
        "Row signal profile differs substantially from the scored total — teacher review recommended.",
    };
  }

  if (signalTotal >= 40 && rows[0]! > 0) {
    return {
      confidence: "HIGH",
      explanation:
        "Organic signal profile meets the high-tier validation threshold.",
    };
  }

  if (total >= 43 || total <= 7) {
    return {
      confidence: "HIGH",
      explanation:
        total >= 43
          ? "Total score aligns with high-performing IWA patterns."
          : "Total score aligns with below-minimum IWA patterns.",
    };
  }

  const spread = Math.max(...rows) - Math.min(...rows);
  if (e.bodyWordCount < 800 || spread > 9) {
    return {
      confidence: "LOW",
      explanation:
        "Short submission or widely varying row scores reduce confidence.",
    };
  }

  return {
    confidence: "MEDIUM",
    explanation: "Total score is in the mid range with mixed row performance.",
  };
}
