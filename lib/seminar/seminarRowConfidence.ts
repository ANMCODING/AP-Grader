import type { RowConfidenceLevel, SeminarEvidence } from "@/lib/seminar/seminarTypes";

export function rowConfidence(
  rowId: string,
  score: number,
  maxScore: number,
  e: SeminarEvidence,
): RowConfidenceLevel {
  if (rowId === "row5_evidence" && e.urlOnlyBibliography) return "HIGH";
  if (rowId === "row6_citation" && !e.bibliographyPresent) return "HIGH";
  if (rowId === "row4_argument" && e.exploratoryMode) return "HIGH";
  if (rowId === "row3_perspective" && e.inconsistentAttribution && score === 6) {
    return "MEDIUM";
  }
  if (rowId === "row3_perspective" && score === 9 && e.evaluativePerspectiveCount < 2) {
    return "LOW";
  }
  if (rowId === "row2_context" && !e.rqContextLinked && e.statisticalUrgencyCount >= 1) {
    return "HIGH";
  }
  if (score === 0 || score === maxScore) return "HIGH";
  if (score === maxScore - 3 || score === maxScore / 2) return "MEDIUM";
  return "MEDIUM";
}
