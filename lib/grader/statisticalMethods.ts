/** Statistical / analysis terms for rigor detection (Improvement 4). */
export const STATISTICAL_METHOD_TERMS: { label: string; pattern: RegExp }[] = [
  { label: "Pearson", pattern: /\bPearson\b/i },
  { label: "Spearman", pattern: /\bSpearman\b/i },
  { label: "ANOVA", pattern: /\bANOVA\b/i },
  { label: "MANOVA", pattern: /\bMANOVA\b/i },
  { label: "t-test", pattern: /\bt-?test\b/i },
  { label: "chi-square", pattern: /\bchi-?square\b/i },
  { label: "regression", pattern: /\bregression\b/i },
  { label: "logistic regression", pattern: /\blogistic\s+regression\b/i },
  { label: "linear regression", pattern: /\blinear\s+regression\b/i },
  { label: "multiple regression", pattern: /\bmultiple\s+regression\b/i },
  { label: "correlation coefficient", pattern: /\bcorrelation\s+coefficient\b/i },
  { label: "r=", pattern: /\br\s*=\s*[-+]?\d/i },
  { label: "p<", pattern: /\bp\s*</i },
  { label: "p=", pattern: /\bp\s*=/i },
  { label: "p value", pattern: /\bp\s*value\b/i },
  { label: "effect size", pattern: /\beffect\s+size\b/i },
  { label: "Cohen's d", pattern: /\bCohen'?s\s+d\b/i },
  { label: "confidence interval", pattern: /\bconfidence\s+interval\b/i },
  { label: "standard deviation", pattern: /\bstandard\s+deviation\b/i },
  { label: "standard error", pattern: /\bstandard\s+error\b/i },
  { label: "mean difference", pattern: /\bmean\s+difference\b/i },
  { label: "median", pattern: /\bmedian\b/i },
  { label: "interquartile range", pattern: /\binterquartile\s+range\b/i },
  { label: "thematic coding", pattern: /\bthematic\s+coding\b/i },
  { label: "thematic analysis", pattern: /\bthematic\s+analysis\b/i },
  { label: "axial coding", pattern: /\baxial\s+coding\b/i },
  { label: "open coding", pattern: /\bopen\s+coding\b/i },
  { label: "content analysis coding", pattern: /\bcontent\s+analysis\s+coding\b/i },
  { label: "frequency analysis", pattern: /\bfrequency\s+analysis\b/i },
  { label: "descriptive statistics", pattern: /\bdescriptive\s+statistics\b/i },
  { label: "inferential statistics", pattern: /\binferential\s+statistics\b/i },
  { label: "Likert scale analysis", pattern: /\bLikert\s+scale\s+analysis\b/i },
  { label: "factor analysis", pattern: /\bfactor\s+analysis\b/i },
  { label: "SEM", pattern: /\bstructural\s+equation\s+modeling\b/i },
  { label: "grounded theory coding", pattern: /\bgrounded\s+theory\s+coding\b/i },
];

export function countDistinctStatisticalMethods(methodAndResultsText: string): number {
  const found = new Set<string>();
  for (const { label, pattern } of STATISTICAL_METHOD_TERMS) {
    if (pattern.test(methodAndResultsText)) found.add(label);
  }
  return found.size;
}
