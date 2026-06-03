import type { BandScore } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";
import { lacksStudentGeneratedData } from "@/lib/grader/evidence";

function scoreNumeric(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

/** Explain why overall may be lower than category scores suggest (GRADING_SPEC §L9–L10). */
export function buildCapExplanationFlags(
  ev: PaperEvidence,
  categories: BandScore[],
  overall: BandScore,
): string[] {
  const flags: string[] = [];
  const weighted =
    scoreNumeric(categories[0]) * 0.1 +
    scoreNumeric(categories[1]) * 0.25 +
    scoreNumeric(categories[2]) * 0.3 +
    scoreNumeric(categories[3]) * 0.3 +
    scoreNumeric(categories[4]) * 0.05;
  const categoryImplied = weighted;
  if (scoreNumeric(overall) >= categoryImplied - 0.15) return flags;

  if (ev.fabricatedDataAdmission || ev.methodNotExecutedHard) {
    flags.push(
      "Overall score capped at Mid 2 because the method was not executed or data were not collected. Individual category scores reflect the quality of your writing in each area.",
    );
    return flags;
  }
  if (ev.literatureReviewOnlyMethod) {
    flags.push(
      "Overall score capped at Mid 2 because this submission is primarily a literature review without an executed research method. Individual category scores reflect writing quality in each area.",
    );
    return flags;
  }
  if (lacksStudentGeneratedData(ev) && !ev.strongEmpiricalOverride) {
    flags.push(
      "Overall score capped because no student-generated data were detected. Category scores may reflect design and writing quality that could not be fully executed.",
    );
    return flags;
  }
  if (ev.methodPartialExecution) {
    flags.push(
      "Overall score capped at High 3 because only part of the planned method was executed.",
    );
    return flags;
  }
  if (
    ev.gapQuality === "asserted" &&
    !ev.borderlineDemonstratedGap &&
    !ev.synthesisContrastGap
  ) {
    flags.push(
      "Overall score capped at High 3 because the literature gap is asserted rather than demonstrated from prior research.",
    );
  }
  if (!ev.methodDefended && overall.band >= 4) {
    flags.push(
      "Overall score capped at High 3 because method choices were not defended with scholarly citations.",
    );
  }
  if (
    (ev.limitationsWeakOnly || !ev.limitationsSection.trim()) &&
    ev.weakImplications
  ) {
    flags.push(
      "Overall score capped because limitations and implications need more depth and specificity.",
    );
  }
  if (categories[2].band === 1) {
    flags.push(
      "Overall score capped at Mid 2 because method and replicability are at band 1.",
    );
  }
  return flags;
}
