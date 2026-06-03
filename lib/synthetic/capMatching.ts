import type { DeterministicGradeResult } from "@/lib/grader/deterministicGrade";

export function normalizeCapTokens(
  activeCaps: string[],
  grade: DeterministicGradeResult,
): string[] {
  const tokens = new Set<string>();
  const blob = activeCaps.join(" ").toLowerCase();
  const ev = grade.evidence;

  // hard-non-execution
  if (
    grade.methodNotExecutedHard ||
    (ev && (ev.fabricatedDataAdmission || ev.methodNotExecutedHard)) ||
    /not executed|participant pool will be zero|no original data/i.test(blob)
  ) {
    tokens.add("hard-non-execution");
  }

  // future-tense-method
  if (
    grade.futureTenseMethodDominant ||
    (ev && ev.futureTenseMethodDominant) ||
    /future tense|planned method|will be (?:conducted|distributed|gathered)/i.test(blob)
  ) {
    tokens.add("future-tense-method");
  }

  // no-student-data
  if (
    grade.lacksStudentData ||
    /no student-generated|student-generated data were not/i.test(blob)
  ) {
    tokens.add("no-student-data");
  }

  // lit-review-only
  if (
    (ev && ev.literatureReviewOnlyMethod) ||
    (ev &&
      !ev.methodNotExecutedHard &&
      !ev.futureTenseMethodDominant &&
      ev.methodElements < 2 &&
      !ev.hasResultsSection) ||
    /literature review without an executed|primarily a literature review/i.test(
      blob,
    )
  ) {
    tokens.add("lit-review-only");
  }

  // asserted-gap — check evidence field directly, not just cap message text
  if (
    (ev && ev.gapQuality === "asserted") ||
    (ev && ev.synthesisContrastGap) ||
    /gap is asserted|asserted rather than demonstrated|asserted gap|scholarly and overall capped/i.test(
      blob,
    )
  ) {
    tokens.add("asserted-gap");
  }

  // demonstrated-gap — for completeness so false positives can be detected
  if (
    (ev && (ev.gapQuality === "demonstrated" || ev.borderlineDemonstratedGap)) ||
    /gap is demonstrated|demonstrated gap/i.test(blob)
  ) {
    tokens.add("demonstrated-gap");
  }

  // weak-implications — check evidence fields directly
  if (
    (ev &&
      (ev.weakImplications ||
        ev.limitationsWeakOnly ||
        !ev.limitationsSection?.trim())) ||
    /limitations and implications need more/i.test(blob)
  ) {
    tokens.add("weak-implications");
  }

  // partial-execution
  if (
    (ev && ev.methodPartialExecution) ||
    /partial execution|only part of the planned/i.test(blob)
  ) {
    tokens.add("partial-execution");
  }

  // method-undefended
  if (
    (ev && ev.methodDefended === false) ||
    /method choices were not defended/i.test(blob)
  ) {
    tokens.add("method-undefended");
  }

  return [...tokens];
}

export function capExpectedFired(
  expected: string,
  firedTokens: string[],
): boolean {
  const e = expected.toLowerCase();
  return firedTokens.some((t) => t === e || t.includes(e) || e.includes(t));
}

export function matchManifestCaps(
  expectedCaps: string[],
  grade: DeterministicGradeResult,
): Record<string, boolean> {
  const fired = normalizeCapTokens(grade.activeCaps, grade);
  const out: Record<string, boolean> = {};
  for (const cap of expectedCaps) {
    out[cap] = capExpectedFired(cap, fired);
  }
  return out;
}
