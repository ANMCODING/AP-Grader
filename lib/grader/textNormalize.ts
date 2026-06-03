/**
 * Text normalization before regex and section detection (GRADING_SPEC §B).
 */

import { countWords } from "@/lib/grader/text";

const SMART_QUOTES: [RegExp, string][] = [
  [/\u201C|\u201D/g, '"'],
  [/\u2018|\u2019/g, "'"],
  [/\u00AB|\u00BB/g, '"'],
];

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

const LATEX_REPLACEMENTS: [RegExp, string][] = [
  [/\\chi\s*\^?\s*2/gi, "chi-square"],
  [/\\alpha/gi, "alpha"],
  [/\\beta/gi, "beta"],
  [/\\mu/gi, "mu"],
  [/χ²/g, "chi-square"],
];

/** Normalize line endings and remove control characters (except tab/newline). */
export function normalizeControlCharacters(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n\n")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ")
    .replace(/\u00ad/g, "");
}

/** Normalize quotes, dashes, zero-width, and common math notation. Does not remove words. */
export function normalizePaperText(text: string): string {
  let t = text.replace(/\r\n/g, "\n");
  for (const [re, rep] of SMART_QUOTES) {
    t = t.replace(re, rep);
  }
  t = t.replace(ZERO_WIDTH, "");
  t = t.replace(/\u2013|\u2014/g, "-");
  for (const [re, rep] of LATEX_REPLACEMENTS) {
    t = t.replace(re, rep);
  }
  return t;
}

const COVER_LINE =
  /^(?:AP\s*RESEARCH\b|Word\s+Count\s*:|(?:April|May|June)\s+\d{4}|(?:Submitted\s+to|Teacher|School|Date)\b|(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?\s*)$/i;

/** Student name on cover (2–4 Title Case words); never strip section headings like "Literature Review". */
export function isCoverAuthorNameLine(trimmed: string): boolean {
  // WHITELIST: never strip bibliography/reference section headings
  const BIB_HEADING_WHITELIST =
    /^(?:works?\s+cited|references?|bibliography|bibliograph[yi]a?|sources?|works?\s+consulted|literature\s+cited|annotated\s+bibliography|citations?|works?\s+referenced|list\s+of\s+references?|reference\s+list|endnotes?|footnotes?|consulted\s+works?|research\s+sources?|source\s+list|cited\s+sources?|cited\s+works?|selected\s+bibliography|further\s+reading|suggested\s+reading|additional\s+sources?|works?\s+used|sources?\s+consulted|references?\s+cited|references?\s+used|references?\s+and\s+notes?|notes?\s+and\s+references?|bibliographical\s+references?|bibliographic\s+notes?|source\s+notes?|citation\s+list|reference\s+page|references?\s+page|works?\s+cited\s+page|bibliography\s+page|obras?\s+citadas?|bibliograf[íi]a|referencias?|fuentes?|bibliographie|références?|literaturverzeichnis|quellen|referências?|fonti|opere\s+citate|bib|refs)$/i;
  if (BIB_HEADING_WHITELIST.test(trimmed)) return false;

  if (/^(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i.test(trimmed)) return true;
  if (!/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(trimmed)) return false;
  if (
    /\b(?:review|research|introduction|method|results|discussion|conclusion|limitations|implications|abstract|appendix|analysis|question|gap|assumptions)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  return true;
}

const MAX_COVER_SCAN_LINES = 30;
const MAX_COVER_WORDS_REMOVED = 200;

export interface StripCoverPageResult {
  text: string;
  linesStripped: number;
  wordsStripped: number;
  strippedLineSamples: string[];
}

/** Strip cover-page metadata from the first 30 lines only; hard caps on lines and words removed. */
export function stripCoverPageLines(
  text: string,
  options: { log?: boolean } = {},
): StripCoverPageResult {
  const lines = text.split("\n");
  if (lines.length === 0) {
    return { text, linesStripped: 0, wordsStripped: 0, strippedLineSamples: [] };
  }

  const headEnd = Math.min(MAX_COVER_SCAN_LINES, lines.length);
  const keptHead: string[] = [];
  let linesStripped = 0;
  let wordsStripped = 0;
  const strippedLineSamples: string[] = [];

  for (let i = 0; i < headEnd; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed &&
      (COVER_LINE.test(trimmed) || isCoverAuthorNameLine(trimmed)) &&
      linesStripped < MAX_COVER_SCAN_LINES &&
      wordsStripped < MAX_COVER_WORDS_REMOVED
    ) {
      const w = countWords(trimmed);
      if (wordsStripped + w > MAX_COVER_WORDS_REMOVED) {
        keptHead.push(lines[i]);
        continue;
      }
      linesStripped++;
      wordsStripped += w;
      if (strippedLineSamples.length < 8) {
        strippedLineSamples.push(trimmed.slice(0, 80));
      }
      if (options.log) {
        console.log(
          `[stripCoverPageLines] removed line ${i + 1} (${w} words): ${trimmed.slice(0, 60)}`,
        );
      }
      continue;
    }
    keptHead.push(lines[i]);
  }

  return {
    text: [...keptHead, ...lines.slice(headEnd)].join("\n"),
    linesStripped,
    wordsStripped,
    strippedLineSamples,
  };
}

/** Strip College Board PDF running headers / page numbers before region detection. */
export function stripCollegeBoardRunningHeaders(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push("");
      continue;
    }
    if (/^AP\s*Research\s*$/i.test(trimmed)) continue;
    if (/^Research\s+Sample\s+[A-J]\s+\d+\s+of\s+\d+/i.test(trimmed)) continue;
    if (/^Running\s+head:/i.test(trimmed)) continue;
    if (/^\d{1,4}$/.test(trimmed)) continue;
    if (/^[A-Z][a-zA-Z\s,'-]{3,60}\s+\d{1,4}\s*$/i.test(trimmed)) continue;
    if (/^[A-Z\s]{5,40}\s+\d{1,4}$/i.test(trimmed)) continue;
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Reject multi-paper paste separated by horizontal rules. */
export function detectMultiplePapers(text: string): boolean {
  const rules = (text.match(/^---+\s*$/gm) ?? []).length;
  return rules >= 2;
}

/** Strip bracket teacher notes without destroying line breaks. */
export function stripBracketComments(text: string): string {
  return text.replace(/\[[^\]]{0,200}\]/g, " ");
}
