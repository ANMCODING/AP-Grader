/**
 * Content fingerprints for functional regions when headings are missing or weak.
 */

import { countWords } from "@/lib/grader/text";

export const MIN_CONTENT_BLOCK_WORDS = 80;
export const REGION_FILL_WORD_THRESHOLD = 100;
export const LIT_REVIEW_RESTRICT_WORD_THRESHOLD = 800;

const PAST_THIRD_PERSON_REPORTING =
  /\b(?:found\s+that|reported\s+that|argued\s+that|demonstrated\s+that|showed\s+that|noted\s+that|concluded\s+that|suggested\s+that|indicated\s+that|established\s+that|identified\s+that|observed\s+that|documented\s+that|revealed\s+that|confirmed\s+that|supported\s+that|examined|investigated|studied|analyzed|explored|reviewed|has\s+shown|have\s+shown|was\s+found|were\s+found)\b/i;

const AUTHOR_NAME_PATTERNS =
  /\b(?:[A-Z][a-z]+\s+and\s+colleagues|[A-Z][a-z]+\s+et\s+al\.?|\(\d{4}\)|a\s+study\s+by|research\s+by|a\s+meta-analysis\s+by|a\s+review\s+by|a\s+survey\s+by|an\s+experiment\s+by|a\s+longitudinal\s+study|a\s+cross-sectional\s+study|a\s+randomized\s+controlled\s+trial|a\s+systematic\s+review)\b/i;

const SYNTHESIS_LANGUAGE =
  /\b(?:however|similarly|in\s+contrast|while\s+[A-Z]|building\s+on|extending\s+this|consistent\s+with|inconsistent\s+with|contradicting|supporting|in\s+agreement\s+with|in\s+disagreement\s+with|whereas|on\s+the\s+other\s+hand|although|despite|unlike|taken\s+together|collectively)\b/i;

const THEORY_FRAMEWORK =
  /\b(?:theory|framework|model|perspective|approach|paradigm|lens|construct|principle|concept|hypothesis)\b/i;

const LIT_SUMMARY_LANGUAGE =
  /\b(?:this\s+research\s+establishes|this\s+study\s+establishes|this\s+provides\s+evidence|this\s+confirms|this\s+suggests\s+that|this\s+demonstrates\s+that|this\s+highlights|this\s+is\s+relevant\s+because|this\s+is\s+helpful\s+because|this\s+supports\s+the\s+idea)\b/i;

const FIRST_PERSON_COLLECTION =
  /\b(?:I\s+collected|I\s+administered|I\s+recruited|I\s+surveyed|I\s+interviewed|participants\s+were\s+recruited\s+by\s+me|data\s+were\s+gathered\s+by)\b/i;

const METHOD_SIGNALS = [
  /\b(?:I|we)\s+(?:collected|administered|recruited|surveyed|interviewed|distributed|conducted)\b/i,
  /\b(?:participants?\s+were\s+recruited|data\s+were\s+gathered|the\s+survey\s+was\s+distributed|interviews?\s+were\s+conducted|participants?\s+completed)\b/i,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(?:was|were)\s+(?:used|administered|applied|employed)\b/,
  /\b(?:n\s*=\s*\d{1,5}|\d{1,5}\s+(?:participants?|students?|respondents?|subjects?|patients?|interviewees?)|(?:participants?|students?|respondents?|subjects?|patients?|interviewees?)[^.]{0,40}\d{1,5})\b/i,
  /\b(?:first|second|third|then|next|finally|subsequently)\b[^.\n]{0,80}\b(?:collect|administer|conduct|survey|interview|analyze|code|screen|extract)\w*/i,
  /\b(?:step\s+\d|^\s*\d+\.\s+)/im,
  /\b(?:databases?\s+were\s+searched|studies\s+were\s+screened|inclusion\s+criteria|exclusion\s+criteria|Boolean)\b/i,
  /\b(?:IRB|institutional\s+review|consent\s+form|informed\s+consent|parental\s+consent)\b/i,
  /\b(?:Pearson\s+correlation|ANOVA|t-?test|chi-?square|thematic\s+analysis|content\s+analysis|regression|random\s+effects|Cohen'?s\s+kappa)\b/i,
  /\b(?:repertory\s+grid|context\s+analysis|narrative\s+method|methods?\s+that\s+this\s+research\s+mainly\s+focused)\b/i,
];

const RESULTS_SIGNALS = [
  /\b\d+(?:\.\d+)?\s*%|\b(?:mean|average|standard\s+deviation|SD|M\s*=|p\s*[<=>]|AUROC|AUC)\b/i,
  /\b(?:I\s+found|the\s+results?\s+showed|the\s+data\s+revealed|analysis\s+revealed|findings?\s+indicate|the\s+survey\s+showed|participants?\s+reported|responses?\s+showed)\b/i,
  /\b(?:significant|p\s*[<=>]|p\s*=|t\s*\(|F\s*\(|r\s*=|chi-?square|AUROC|AUC|effect\s+size|confidence\s+interval)\b/i,
  /\b(?:theme|emerged|coded|participants?\s+described|responses?\s+indicated|common\s+pattern|majority\s+of\s+participants?)\b/i,
  /\b(?:Table\s+\d|Figure\s+\d).{0,80}\b(?:shows?|demonstrates?|illustrates?)\b|\b(?:as\s+shown\s+in|as\s+illustrated\s+in)\b/i,
];

const DISCUSSION_SIGNALS = [
  /\b(?:consistent\s+with|inconsistent\s+with|contrary\s+to|in\s+line\s+with|supports?|contradicts?|extends?|aligns?\s+with)\b[^.\n]{0,120}\b(?:\([A-Z]|\[\d+\]|\d{4})/i,
  /\b(?:these\s+findings?\s+suggest|this\s+indicates|this\s+implies|the\s+results?\s+demonstrate|this\s+supports\s+the\s+hypothesis|this\s+answers\s+the\s+research\s+question)\b/i,
  /\b(?:one\s+possible\s+explanation|alternatively|another\s+interpretation|this\s+could\s+be\s+explained\s+by|a\s+potential\s+reason)\b/i,
  /\b(?:limitation|generalizability|cannot\s+establish\s+causation|self-?report|sample\s+size|convenience\s+sample)\b/i,
];

function countCitationShapes(text: string): number {
  const parenthetical = (text.match(/\([A-Z][a-zA-Z]+[^)]*\d{4}\)/g) ?? []).length;
  const narrative = (text.match(/[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*\(\d{4}\)/g) ?? [])
    .length;
  const numbered = (text.match(/\[\d+\]/g) ?? []).length;
  return parenthetical + narrative + numbered;
}

function countSignalMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

export function citationDensityPer150Words(text: string): number {
  const words = countWords(text);
  if (words === 0) return 0;
  return countCitationShapes(text) / (words / 150);
}

export function matchesLiteratureReviewFingerprint(text: string): boolean {
  const words = countWords(text);
  if (words < 500) {
    if (words < 200) return false;
    if (citationDensityPer150Words(text) <= 1) return false;
    if (!PAST_THIRD_PERSON_REPORTING.test(text)) return false;
    if (FIRST_PERSON_COLLECTION.test(text)) return false;
    return true;
  }
  let signals = 0;
  if (citationDensityPer150Words(text) > 1) signals++;
  if (PAST_THIRD_PERSON_REPORTING.test(text)) signals++;
  if (AUTHOR_NAME_PATTERNS.test(text)) signals++;
  if (SYNTHESIS_LANGUAGE.test(text)) signals++;
  if (THEORY_FRAMEWORK.test(text)) signals++;
  if (!FIRST_PERSON_COLLECTION.test(text)) signals++;
  if (LIT_SUMMARY_LANGUAGE.test(text)) signals++;
  return signals >= 3;
}

export function matchesMethodFingerprint(text: string): boolean {
  if (countWords(text) < 150) return false;
  return countSignalMatches(text, METHOD_SIGNALS) >= 2;
}

export function matchesResultsFingerprint(text: string): boolean {
  if (countWords(text) < 100) return false;
  return countSignalMatches(text, RESULTS_SIGNALS) >= 2;
}

export function matchesDiscussionFingerprint(text: string): boolean {
  if (countWords(text) < 100) return false;
  return countSignalMatches(text, DISCUSSION_SIGNALS) >= 2;
}

export function matchesConclusionFingerprint(
  text: string,
  blockStart: number,
  paperBodyLength: number,
): boolean {
  if (countWords(text) < 80) return false;
  if (blockStart < paperBodyLength * 0.75) return false;
  const hasSummary =
    /\b(?:in\s+conclusion|in\s+summary|to\s+conclude|overall|taken\s+together|this\s+study\s+found|this\s+research\s+demonstrates|this\s+paper\s+has\s+shown)\b/i.test(
      text,
    );
  const hasForward =
    /\b(?:future\s+research|future\s+studies|further\s+research|implications|recommendations|educators|policymakers|practitioners|clinicians|researchers|teachers|administrators)\b/i.test(
      text,
    );
  return hasSummary && hasForward;
}

const METHOD_SECTION_ANCHOR =
  /\b(?:for\s+this\s+study|in\s+this\s+study|I\s+recruited|I\s+conducted|I\s+administered|participants\s+were\s+recruited|methods?\s+that\s+this\s+research|mainly\s+focused\s+on\s+were|repertory\s+grid|in\s+depth\s+scan\s+at\s+the\s+multiple)\b/i;

/** Split a mixed block at the first method-fingerprint sentence (Case 4). */
export function splitTextAtMethodFingerprint(text: string): {
  literature: string;
  method: string;
} | null {
  const anchorIdx = text.search(METHOD_SECTION_ANCHOR);
  if (anchorIdx >= 80) {
    const literature = text.slice(0, anchorIdx).trim();
    const method = text.slice(anchorIdx).trim();
    if (
      countWords(literature) >= 80 &&
      countWords(method) >= 150 &&
      (matchesMethodFingerprint(method) || METHOD_SECTION_ANCHOR.test(method))
    ) {
      return { literature, method };
    }
  }

  const sents = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 20);
  for (let i = 1; i < sents.length; i++) {
    const literature = sents.slice(0, i).join(" ").trim();
    const method = sents.slice(i).join(" ").trim();
    if (countWords(literature) < 80) continue;
    if (countWords(method) < 150) continue;
    if (!matchesMethodFingerprint(method)) continue;
    return { literature, method };
  }
  return null;
}
