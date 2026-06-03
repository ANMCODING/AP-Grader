/**
 * Policies for papers where figures/tables exist as images and only text is graded.
 * The engine cannot read embedded images; text references are treated as real data.
 */

const VISUAL_LABEL =
  /\b(?:Figure|Fig\.?)\s+\d{1,2}\b|\bTable\s+\d{1,2}\b|\b(?:Chart|Graph)\s+\d{1,2}\b|\bAppendix\s+[A-Z]\b|\bsee appendix\b|\brefer to appendix\b/i;

const ANALYTICAL_VISUAL_PROSE =
  /\b(?:Figure|Fig\.?|Table|Chart|Graph)\s+\d{1,2}\b[^.!?]{0,120}\b(?:shows?|demonstrates?|reveals?|indicates?|suggests?|found|displays?|illustrates?|compares?|confirms?)\b|\b(?:as demonstrated in|as shown in|results displayed in|data in)\s+(?:Figure|Fig\.?|Table|Chart|Graph)\s+\d/i;

const LOST_VISUAL_POINTER =
  /\b(?:as shown above|as demonstrated above|the graph above|graph above demonstrates|see the table below|table below shows|the figure below|figure below|the figure illustrates|figure illustrates|as illustrated in the (?:figure|table|chart|graph) above)\b/i;

const STATISTICAL_PROSE =
  /\b(?:correlation coefficient|positively correlated|negatively correlated|statistically significant|p\s*value|p\s*[<=>]\s*0?\.|r\s*=\s*[-+]?\d|ANOVA|chi-?square|regression coefficient|effect size|confidence interval|t-test|Spearman|Pearson)\b/i;

const VISIBLE_NUMERICAL_DATA =
  /\b\d+(?:\.\d+)?\s*%|\bn\s*=\s*\d+|\b\d+\s+participants?\b|\bmean\s+(?:of|difference|score)/i;

export interface UnseenVisualAssumptions {
  hasVisualLabelReferences: boolean;
  hasAnalyticalVisualProse: boolean;
  hasStatisticalProse: boolean;
  hasLostVisualPointers: boolean;
  hasVisibleNumericalData: boolean;
  /** Credit student data from text-only visual/stat signals (images may be unread). */
  creditsStudentDataFromText: boolean;
  /** Show paste limitation note in confidence/flags. */
  visualRefsWithoutVisibleNumbers: boolean;
}

export function analyzeUnseenVisualContent(fullText: string): UnseenVisualAssumptions {
  const hasVisualLabelReferences = VISUAL_LABEL.test(fullText);
  const hasAnalyticalVisualProse = ANALYTICAL_VISUAL_PROSE.test(fullText);
  const hasStatisticalProse = STATISTICAL_PROSE.test(fullText);
  const hasLostVisualPointers = LOST_VISUAL_POINTER.test(fullText);
  const hasVisibleNumericalData = VISIBLE_NUMERICAL_DATA.test(fullText);

  const creditsStudentDataFromText =
    hasAnalyticalVisualProse ||
    hasLostVisualPointers ||
    (hasVisualLabelReferences &&
      (hasVisibleNumericalData || hasAnalyticalVisualProse));

  const visualRefsWithoutVisibleNumbers =
    hasLostVisualPointers ||
    (hasVisualLabelReferences &&
      !hasVisibleNumericalData &&
      !hasAnalyticalVisualProse &&
      !hasStatisticalProse);

  return {
    hasVisualLabelReferences,
    hasAnalyticalVisualProse,
    hasStatisticalProse,
    hasLostVisualPointers,
    hasVisibleNumericalData,
    creditsStudentDataFromText,
    visualRefsWithoutVisibleNumbers,
  };
}

export const UNSEEN_VISUAL_CONFIDENCE_NOTE =
  "This paper appears to contain visual data such as figures, tables, or charts that could not be read by the engine. If your paper contains images or embedded tables, some data may not have been captured in this analysis. Scores for Argument and Evidence and Method and Replicability may be slightly underestimated as a result.";
