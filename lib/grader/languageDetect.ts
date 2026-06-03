import { sentences } from "@/lib/grader/text";

const CITATION_PATTERNS: RegExp[] = [
  /\([^)]*\d{4}[a-z]?[^)]*\)/g,
  /\[[\d,\s]+\]/g,
  /[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*\(\d{4}[a-z]?\)/g,
  /https?:\/\/\S+/g,
  /doi:\s*\S+/gi,
  /^\s*\d+\.\s+[A-Z][^\n]{20,}/gm,
  /^[A-Z][A-Za-z'\\-]+,?\s+[A-Z]\..{0,120}\(\s*\d{4}/gm,
];

const SCIENTIFIC_SUFFIX =
  /\b[a-z]{4,}(?:ology|itis|emia|osis|plasty|tomy|ectomy|scopy|graphy|metry|lysis|genesis|philia|phobia)\b/gi;

const ACCENTED_PROPER_NOUN = /\b[A-Z][\p{L}]*[àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀ-ÿ][\p{L}'\\-]*\b/gu;

const ENGLISH_SENTENCE_MARKERS =
  /\b(?:the|and|of|to|in|that|this|was|were|is|are|for|with|as|by|from|study|research|students?|participants?|method|results?|analysis|however|therefore|findings?)\b/i;

const ROMANCE_GERMAN_FUNCTION =
  /\b(?:el|la|los|las|les|des|une|étude|por|que|und|die|der|das|ein|eine|pour|avec|dans|sur|est|son|sa|ses|notre|votre)\b/gi;

/** Strip citations, scientific terms, and accented proper nouns before language checks. */
export function stripForLanguageDetection(text: string): string {
  let t = text;
  for (const re of CITATION_PATTERNS) {
    t = t.replace(re, " ");
  }
  t = t.replace(SCIENTIFIC_SUFFIX, " ");
  t = t.replace(ACCENTED_PROPER_NOUN, " ");
  return t.replace(/\s+/g, " ").trim();
}

/**
 * True when the document is predominantly English prose (55% sentence threshold).
 */
export function isPredominantlyEnglish(text: string): boolean {
  const sample = stripForLanguageDetection(text.slice(0, 12_000));
  const sents = sentences(sample).filter((s) => s.trim().length > 25);
  if (sents.length === 0) {
    return ENGLISH_SENTENCE_MARKERS.test(sample);
  }

  let english = 0;
  for (const s of sents) {
    if (ENGLISH_SENTENCE_MARKERS.test(s)) english++;
  }

  return english / sents.length >= 0.55;
}

/** Student-facing flag only when Romance/German function words exceed 10% of cleaned sample. */
export function shouldFlagNonEnglishPaper(text: string): boolean {
  if (isPredominantlyEnglish(text)) return false;

  const cleaned = stripForLanguageDetection(text.slice(0, 2000));
  const words = cleaned.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 20) return false;

  const hits = (cleaned.match(ROMANCE_GERMAN_FUNCTION) ?? []).length;
  return hits / words.length > 0.1;
}
