/**
 * Method subsection headings must not split the method functional region.
 */

const METHOD_SUBSECTION_KEYWORDS =
  /^(?:research\s+design|study\s+design|participants?|sample(?:\s+description)?|sampling(?:\s+strategy|\s+method|\s+procedure)?|recruitment(?:\s+procedure)?|materials?|instruments?|instrumentation|measures?|apparatus|survey\s+instrument|interview\s+protocol|interview\s+guide|data\s+(?:sources?|collection(?:\s+procedure|\s+methods)?)|collection\s+procedure|procedure|procedures|protocol|research\s+protocol|study\s+protocol|data\s+analysis(?:\s+plan)?|analysis\s+plan|statistical\s+analysis|analytical\s+approach|qualitative\s+analysis|quantitative\s+analysis|mixed\s+methods\s+analysis|coding\s+(?:procedure|protocol)|thematic\s+analysis\s+procedure|ethical\s+considerations?|ethics|irb(?:\s+and\s+ethical\s+considerations)?|institutional\s+review|human\s+subjects|validity|reliability|validity\s+and\s+reliability|trustworthiness|rigor|methodological\s+limitations|limitations\s+of\s+method|units?\s+of\s+analysis|inclusion\s+criteria|exclusion\s+criteria|eligibility\s+criteria|search\s+strategy|database\s+search|boolean\s+search|screening(?:\s+process)?|data\s+extraction|quality\s+assessment|risk\s+of\s+bias|replicability|transparency|power\s+analysis|sample\s+size\s+justification|pilot(?:\s+study|\s+testing)?|instrumentation\s+validation|measurement|operationalization|independent\s+variable|dependent\s+variable|covariates|control\s+variables|data\s+management|data\s+cleaning|data\s+screening|data\s+preparation|descriptive\s+statistics|effect\s+size\s+calculation|heterogeneity\s+assessment|sensitivity\s+analysis|publication\s+bias(?:\s+assessment)?|quantitative\s+approach|qualitative\s+approach|mixed\s+methods\s+approach|case\s+study\s+design|survey\s+design|experimental\s+design|quasi-?experimental\s+design|research\s+site|research\s+setting|study\s+setting|site\s+description|participants?\s+and\s+setting|hypothesis|method\s+of\s+analysis|boolean|step\s+\d+|phase\s+\d+|stage\s+\d+)(?:\s*[:.]|\s*$)/i;

const METHOD_SUBSECTION_COLON_MAX = 60;

/** True when line is a method-internal subheading, not a new top-level section. */
export function isMethodSubsectionHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;

  if (t.length <= METHOD_SUBSECTION_COLON_MAX && /:\s*$/.test(t)) {
    return true;
  }

  if (/^step\s+\d+\s*:/i.test(t)) return true;
  if (/^phase\s+\d+\s*:/i.test(t)) return true;
  if (/^stage\s+\d+\s*:/i.test(t)) return true;

  const normalized = t.replace(/:\s*$/, "").trim();
  if (METHOD_SUBSECTION_KEYWORDS.test(normalized)) return true;
  if (METHOD_SUBSECTION_KEYWORDS.test(t)) return true;

  if (/\bboolean\b/i.test(t) && t.length < 80) return true;

  return false;
}
