import type { BandScore } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";

export interface CategoryEvidenceSummary {
  name: string;
  signals: string[];
  actionableFix?: string;
}

function scoreNumericLocal(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

function fixIfBelow(
  score: BandScore,
  threshold: BandScore,
  fix: string,
): string | undefined {
  return scoreNumericLocal(score) < scoreNumericLocal(threshold) ? fix : undefined;
}

export function buildEvidenceSummaries(
  ev: PaperEvidence,
  categories?: BandScore[],
): CategoryEvidenceSummary[] {
  const cats = categories ?? [];
  const focus = cats[0];
  const scholarly = cats[1];
  const method = cats[2];
  const argument = cats[3];
  const communication = cats[4];
  const mid4 = { band: 4 as const, tier: "Mid" as const };

  return [
    {
      name: "Focus and Scope",
      signals: [
        ev.researchQuestions.length
          ? `Research question detected (${ev.researchQuestions.length})`
          : "No research question detected",
        ev.exploratoryFramingOnly ? "Exploratory framing only" : "",
        ev.highlySpecificFocus ? "Highly specific focus (four elements)" : "",
        ev.hypothesisOnly ? "Hypothesis only" : "",
      ].filter(Boolean),
      actionableFix: focus
        ? fixIfBelow(
            focus,
            mid4,
            "Focus and Scope: State one narrow, investigable research question using 'to what extent' or 'how does' with a named population and measurable outcome.",
          )
        : undefined,
    },
    {
      name: "Scholarly Grounding",
      signals: [
        `${ev.citationCount} unique sources`,
        `${ev.multiCitationSentences} multi-cite sentences`,
        `Gap quality: ${ev.gapQuality}`,
        ev.crossSectionSynthesis ? "Cross-section synthesis" : "",
        `Isolation patterns: ${ev.synthesisIsolationCount}`,
      ].filter(Boolean),
      actionableFix: scholarly
        ? fixIfBelow(
            scholarly,
            mid4,
            "Scholarly Grounding: Add comparative language between sources — e.g., 'while Smith found X, Jones argues Y' — to show synthesis, not just summary.",
          )
        : undefined,
    },
    {
      name: "Method and Replicability",
      signals: [
        `${ev.methodElements} of 9 method elements`,
        ev.methodDefended ? "Method defended with citations" : "Method not defended",
        ev.literatureReviewOnlyMethod ? "Literature review only (not AP method)" : "",
        ev.methodNotExecutedHard ? "Hard non-execution" : "",
        ev.methodPartialExecution ? "Partial execution" : "",
        ev.rigorousSimulationMethod ? "Rigorous simulation method" : "",
      ].filter(Boolean),
      actionableFix: method
        ? fixIfBelow(
            method,
            mid4,
            "Method and Replicability: Name participants, instruments, procedure steps, timeline, ethics, and cite a source defending your design choice.",
          )
        : undefined,
    },
    {
      name: "Argument and Evidence",
      signals: [
        ev.methodCollectionEvidence ? "Method shows data collection" : "No collection in method",
        `${ev.studentResultsSignals} student results signals`,
        ev.descriptiveOnlyResults ? "Descriptive only" : "",
        ev.inferentialStatsPresent ? "Inferential statistics present" : "",
        ev.priorAuthorResultsRatio > 0.3 ? "High prior-author attribution in results" : "",
      ].filter(Boolean),
      actionableFix: argument
        ? fixIfBelow(
            argument,
            mid4,
            "Argument and Evidence: Report your own findings with numbers or themes from your data, then discuss limitations and implications for a specific community of practice.",
          )
        : undefined,
    },
    {
      name: "Communication and Citation",
      signals: [
        `Citation style: ${ev.citationStyle}`,
        ev.styleInconsistent ? "Mixed citation styles" : "",
        ev.hasBibliography ? "Bibliography detected" : "No bibliography",
        ev.sparseParentheticalInLit ? "Sparse in-text citations vs bibliography" : "",
        ev.functionalRegionsLocated ? "Functional regions located by content" : "",
      ].filter(Boolean),
      actionableFix: communication
        ? fixIfBelow(
            communication,
            mid4,
            "Communication and Citation: Add a complete references or works cited section and ensure every in-text citation appears in the bibliography.",
          )
        : undefined,
    },
  ];
}

/** Condensed summary for Claude secondary grading. */
export function buildClaudeEvidenceDigest(ev: PaperEvidence): string {
  return [
    `Body word count: ${ev.wordCount}`,
    `Unique in-text citations: ${ev.citationCount}`,
    `Bibliography entries: ${ev.bibliographyEntryCount}`,
    `Gap quality: ${ev.gapQuality}`,
    `Synthesis isolation count: ${ev.synthesisIsolationCount}`,
    `Method elements (of 9): ${ev.methodElements}`,
    `Student results signals: ${ev.studentResultsSignals}`,
    `Method defended: ${ev.methodDefended}`,
    `Literature-review-only method: ${ev.literatureReviewOnlyMethod}`,
    `Explicit non-execution: ${ev.methodNotExecutedHard || ev.explicitNoDataCollected}`,
  ].join("\n");
}
