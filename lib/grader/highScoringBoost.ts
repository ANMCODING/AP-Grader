import type { PaperEvidence } from "@/lib/grader/evidence";
import { hasQualitativeResultsCollected } from "@/lib/grader/evidence";
import { makeBand } from "@/lib/grader/format";
import type { BandScore } from "@/lib/grader/types";

/** Effective isolation count (halved when high-scoring profile detected). */
export function effectiveIsolationCount(ev: PaperEvidence): number {
  const raw = ev.synthesisIsolationCount;
  if (!ev.highScoringPaperDetected) return raw;
  return Math.floor(raw / 2);
}

/** Scholarly cap from isolation patterns (null = no isolation cap). */
export function scholarlyIsolationCap(ev: PaperEvidence): BandScore | null {
  if (ev.synthesisIsolationCount >= 3) {
    return makeBand(2, "Low");
  }
  const iso = effectiveIsolationCount(ev);
  if (iso === 2 && ev.crossSectionSynthesis) {
    return makeBand(3, "Mid");
  }
  return null;
}

/**
 * Score 4–5 profile: long paper, rich citations, executed method/results, bibliography, RQ.
 */
function hasResearchQuestionSignal(ev: PaperEvidence): boolean {
  if (ev.researchQuestionText.trim() || ev.researchQuestions.length > 0) {
    return true;
  }
  if (ev.highlySpecificFocus || ev.focusSpecificityScore >= 2) return true;
  const intro = ev.introRegion.slice(0, 4000);
  return (
    /\b(?:research question|purpose of (?:this|the) study|guiding question)\b/i.test(
      intro,
    ) || /\?\s*$/m.test(intro)
  );
}

export function detectHighScoringPaper(ev: PaperEvidence): boolean {
  const wc = ev.wordCount;
  if (wc < 3200 || wc > 8000) return false;
  if (ev.citationCount < 8) return false;
  if (!ev.hasBibliography) return false;
  if (!hasResearchQuestionSignal(ev)) {
    return false;
  }
  if (ev.methodElements < 4) return false;
  if (!ev.methodSection.trim() || ev.methodSection.length < 80) return false;
  const resultSignalCount = Math.max(ev.studentResultsSignals, ev.resultsSignals);
  if (resultSignalCount < 2 && !ev.contentAnalysisExecuted) return false;

  return (
    ev.inferentialStatsPresent ||
    ev.distinctStatMethods >= 1 ||
    hasQualitativeResultsCollected(ev.resultsSection, ev.fullText) ||
    ev.studentResultsSignals >= 4
  );
}
