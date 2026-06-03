/**
 * Results subsection headings must not split the results functional region.
 */

const RESULTS_SUBSECTION_KEYWORDS =
  /^(?:descriptive\s+statistics|descriptive\s+results|descriptive\s+findings|summary\s+statistics|overview\s+of\s+results|main\s+results|main\s+findings|primary\s+results|primary\s+findings|secondary\s+results|secondary\s+findings|supplementary\s+results|supplementary\s+analysis|supplementary\s+findings|correlation\s+analysis|group\s+comparisons|subgroup\s+analysis|moderation\s+analysis|mediation\s+analysis|regression\s+results|anova\s+results|t-?test\s+results|chi-?square\s+results|multilevel\s+results|mixed\s+effects\s+results|fixed\s+effects\s+results|difference-?in-?differences\s+results|main\s+effects|interaction\s+effects|time-?varying\s+effects|heterogeneity\s+analysis|sensitivity\s+analysis\s+results|robustness\s+checks|quantitative\s+findings|qualitative\s+findings|thematic\s+findings|emergent\s+themes|major\s+themes|key\s+themes|core\s+themes|central\s+findings|key\s+findings|notable\s+findings|significant\s+findings|research\s+findings|empirical\s+findings|data\s+findings|survey\s+results|interview\s+results|observation\s+results|focus\s+group\s+results|experiment\s+results|trial\s+results|test\s+results|outcome\s+results|analysis\s+results|findings\s+and\s+analysis|data\s+and\s+analysis|participants?|analysis|theme\s+\d{1,2})(?:\s*[:.]|\s*$)/i;

const THEME_HEADING = /^theme\s+\d{1,2}\b/i;

export function isResultsSubsectionHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 80) return false;
  if (t.length <= 60 && /:\s*$/.test(t)) return true;
  const normalized = t.replace(/:\s*$/, "").trim();
  if (RESULTS_SUBSECTION_KEYWORDS.test(normalized)) return true;
  if (RESULTS_SUBSECTION_KEYWORDS.test(t)) return true;
  if (THEME_HEADING.test(t)) return true;
  return false;
}
