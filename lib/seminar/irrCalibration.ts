import type { SeminarEvidence } from "@/lib/seminar/seminarTypes";

export function irrConfidence(
  total: number,
  e: SeminarEvidence,
): {
  confidence: "HIGH" | "MEDIUM" | "LOW";
  explanation: string | null;
} {
  if (total >= 27 || total <= 4) {
    return {
      confidence: "HIGH",
      explanation:
        total >= 27
          ? "Total score aligns with high-anchor IRR patterns."
          : "Total score aligns with low-anchor IRR patterns.",
    };
  }
  if (e.bodyWordCount < 400) {
    return {
      confidence: "LOW",
      explanation: "Very short submission limits scoring confidence.",
    };
  }
  return {
    confidence: "MEDIUM",
    explanation: "Total score is in the mid range for IRR.",
  };
}
