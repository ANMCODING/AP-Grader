import { makeBand } from "@/lib/grader/format";
import type { BandScore } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";
import { lacksStudentGeneratedData } from "@/lib/grader/evidence";
import { scholarlyIsolationCap } from "@/lib/grader/highScoringBoost";
import { shouldSuppressPartialExecutionCap } from "@/lib/grader/methodExecution";
import {
  qualifiesExecutedSpecificResearch,
  qualifiesStrongExecutedEmpiricalProfile,
} from "@/lib/grader/researchExecutionRules";

function scoreNumeric(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

function capOverall(overall: BandScore, ceiling: BandScore): BandScore {
  return scoreNumeric(overall) > scoreNumeric(ceiling) ? ceiling : overall;
}

function isLowOne(score: BandScore): boolean {
  return score.band === 1 && score.tier === "Low";
}

function band1(score: BandScore): boolean {
  return score.band === 1;
}

export interface CapResult {
  categories: BandScore[];
  overall: BandScore;
  activeCapReasons: string[];
}

/**
 * Apply hard caps in College Board priority order (Priorities 2–10).
 * Priority 1 (rejection) is handled before grading.
 */
export function applyHardOverallCaps(
  categories: BandScore[],
  overall: BandScore,
  ev: PaperEvidence,
): CapResult {
  const cats = categories.map((c) => ({ ...c }));
  let hol = { ...overall };
  const activeCapReasons: string[] = [];

  // Priority 2 — hard non-execution
  if (ev.methodNotExecutedHard || ev.fabricatedDataAdmission) {
    cats[2] = makeBand(1, "Low");
    hol = capOverall(hol, makeBand(2, "Mid"));
    activeCapReasons.push(
      "The paper explicitly states that no original data was collected. Method is scored at Low 1 and overall score is capped at Mid 2.",
    );
    return { categories: cats, overall: hol, activeCapReasons };
  }

  // Priority 3 — Focus L1 + Argument L1
  if (isLowOne(cats[0]) && isLowOne(cats[3])) {
    activeCapReasons.push("Focus and Argument both at Low 1 — overall forced to Low 1.");
    return { categories: cats, overall: makeBand(1, "Low"), activeCapReasons };
  }

  // Priority 4 — Method L1 + Argument L1 (any tier on method/arg band 1)
  if (band1(cats[2]) && band1(cats[3])) {
    activeCapReasons.push("Method and Argument both at band 1 — overall forced to Low 1.");
    return { categories: cats, overall: makeBand(1, "Low"), activeCapReasons };
  }

  // Priority 5 — Scholarly L1 + Argument L1
  if (isLowOne(cats[1]) && isLowOne(cats[3])) {
    activeCapReasons.push("Scholarly Grounding and Argument both at Low 1 — overall forced to Low 1.");
    return { categories: cats, overall: makeBand(1, "Low"), activeCapReasons };
  }

  // Focus L1 + Method L1 with Argument below Mid 3 → overall Low 1
  if (
    isLowOne(cats[0]) &&
    isLowOne(cats[2]) &&
    scoreNumeric(cats[3]) < scoreNumeric(makeBand(3, "Mid"))
  ) {
    hol = makeBand(1, "Low");
    activeCapReasons.push(
      "Focus and Method at Low 1 with weak Argument — overall forced to Low 1.",
    );
    return { categories: cats, overall: hol, activeCapReasons };
  }

  // Priority 7 — no student data (overall max Mid 2)
  const strongEmpiricalResults =
    ev.studentResultsSignals >= 3 &&
    ev.methodElements >= 4 &&
    ev.hasResultsSection &&
    (ev.hasDataSignals ||
      ev.contentAnalysisExecuted ||
      ev.correlationStudyExecuted);
  if (
    lacksStudentGeneratedData(ev) &&
    !ev.strongEmpiricalOverride &&
    !ev.highScoringPaperDetected &&
    !strongEmpiricalResults
  ) {
    hol = capOverall(hol, makeBand(2, "Mid"));
    activeCapReasons.push("No student-generated data — overall capped at Mid 2.");
  }

  // Lit-review-only: Method L1, Argument L1, overall max Mid 2
  if (ev.literatureReviewOnlyMethod) {
    cats[2] = makeBand(1, "Low");
    cats[3] = makeBand(1, "Low");
    hol = capOverall(hol, makeBand(2, "Mid"));
    activeCapReasons.push("Literature review only — overall capped at Mid 2.");
    return { categories: cats, overall: hol, activeCapReasons };
  }

  // Priority 8 — partial execution
  if (
    ev.methodPartialExecution &&
    !shouldSuppressPartialExecutionCap(ev, !lacksStudentGeneratedData(ev))
  ) {
    if (cats[2].band > 2) cats[2] = makeBand(2, "Low");
    hol = capOverall(hol, makeBand(3, "High"));
    activeCapReasons.push("Partial method execution — overall capped at High 3.");
  }

  // Priority 9 — asserted gap + weak synthesis
  if (
    ev.gapQuality === "asserted" &&
    !ev.borderlineDemonstratedGap &&
    !ev.synthesisContrastGap
  ) {
    const scholarlyAssertedCap = ev.highScoringPaperDetected
      ? makeBand(4, "Low")
      : makeBand(3, "Mid");
    if (scoreNumeric(cats[1]) > scoreNumeric(scholarlyAssertedCap)) {
      cats[1] = scholarlyAssertedCap;
    }
    const holAssertedCap = ev.highScoringPaperDetected
      ? makeBand(4, "Low")
      : makeBand(3, "High");
    hol = capOverall(hol, holAssertedCap);
    activeCapReasons.push("Asserted gap — Scholarly and overall capped.");
  } else if (ev.borderlineDemonstratedGap) {
    hol = capOverall(hol, makeBand(4, "Low"));
  }

  // Priority 10 — synthesis isolation
  const isoCap = scholarlyIsolationCap(ev);
  if (isoCap && scoreNumeric(cats[1]) > scoreNumeric(isoCap)) {
    cats[1] = isoCap;
    activeCapReasons.push(
      "Synthesis isolation pattern (3+ strikes) — Scholarly capped at Low 2.",
    );
  }

  // Q3: no student data → overall max Mid 2
  if (lacksStudentGeneratedData(ev) && isLowOne(cats[3])) {
    hol = capOverall(hol, makeBand(2, "Mid"));
  }

  // Mid 4 separator: no method defense → max High 3 overall
  if (!ev.methodDefended && scoreNumeric(hol) > scoreNumeric(makeBand(3, "High"))) {
    hol = capOverall(hol, makeBand(3, "High"));
    activeCapReasons.push("Method not defended — overall capped at High 3.");
  }

  // Weak implications + limitations prevent Mid 4+
  if (
    (ev.limitationsWeakOnly || !ev.limitationsSection.trim()) &&
    ev.weakImplications &&
    scoreNumeric(hol) > scoreNumeric(makeBand(4, "Low"))
  ) {
    hol = capOverall(hol, makeBand(3, "High"));
    activeCapReasons.push("Weak limitations and implications — overall capped at High 3.");
  }

  if (
    qualifiesExecutedSpecificResearch(ev, cats) &&
    scoreNumeric(hol) < scoreNumeric(makeBand(3, "Low"))
  ) {
    hol = makeBand(3, "Low");
    activeCapReasons.push(
      "Highly specific focus with executed method and detected results — overall floored at Low 3.",
    );
  }

  if (
    qualifiesStrongExecutedEmpiricalProfile(ev, cats) &&
    scoreNumeric(hol) < scoreNumeric(makeBand(4, "Low"))
  ) {
    hol = makeBand(4, "Low");
    activeCapReasons.push(
      "Strong executed empirical profile with demonstrated gap or inferential results — overall floored at Low 4.",
    );
  }

  return { categories: cats, overall: hol, activeCapReasons };
}

export interface ConservativeAdjustmentOptions {
  ev?: PaperEvidence;
  activeCapReasons?: string[];
}

/** Reduce overall one tier when Claude unavailable in band 3–4 range. */
export function applyConservativeUnavailableAdjustment(
  overall: BandScore,
  inBorderlineRange: boolean,
  claudeAvailable: boolean,
  options?: ConservativeAdjustmentOptions,
): BandScore {
  if (claudeAvailable || !inBorderlineRange) return overall;

  const ev = options?.ev;
  const caps = options?.activeCapReasons ?? [];
  if (ev) {
    const hardCapFired = caps.some((r) =>
      /not executed|no student-generated data|partial method execution|forced to Low 1|Literature review only|overall capped at Mid 2/i.test(
        r,
      ),
    );
    const onlyAssertedOrNoCaps =
      caps.length === 0 ||
      caps.every((r) => /asserted gap/i.test(r));
    if (
      overall.band >= 4 &&
      !hardCapFired &&
      onlyAssertedOrNoCaps &&
      ev.demonstratedGapSignals >= 2 &&
      ev.studentResultsSignals >= 4 &&
      ev.methodElements >= 6 &&
      !ev.methodNotExecutedHard &&
      !lacksStudentGeneratedData(ev)
    ) {
      return overall;
    }
  }

  const n = scoreNumeric(overall);
  if (n >= scoreNumeric(makeBand(4, "Low")) && n < scoreNumeric(makeBand(4, "High"))) {
    return makeBand(3, "High");
  }
  if (n >= scoreNumeric(makeBand(3, "High"))) {
    return makeBand(3, "Mid");
  }
  if (n >= scoreNumeric(makeBand(4, "High"))) {
    return makeBand(4, "Mid");
  }
  if (n >= scoreNumeric(makeBand(3, "Mid"))) {
    return makeBand(3, "Low");
  }
  return overall;
}
