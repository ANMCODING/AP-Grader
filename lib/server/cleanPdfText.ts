import {
  normalizeControlCharacters,
  normalizePaperText,
  stripCoverPageLines,
} from "@/lib/grader/textNormalize";
import { countWords } from "@/lib/grader/text";
import type { PdfCleaningStats } from "@/lib/server/pdfCleanTypes";

const MAX_HEADER_LINE_LEN = 120;
const MAX_HEADING_LINE_LEN = 80;

const PAGE_NUMBER_ONLY = /^\d{1,4}$/;
const PAGE_OF = /^Page\s+\d{1,4}\s+of\s+\d{1,4}\s*$/i;
const BIB_HEADING_LINE =
  /^(?:sources?|references?|works?\s+cited|work\s+cited|bibliography|bibliograf[íi]a|referencias?|fuentes?|bib|refs)\s*[:.]?\s*$/i;
const PDF_PAGE_JOINER = /^--\s*\d{1,4}\s+of\s+\d{1,4}\s+--$/;

const CITATION_IN_LINE = /\(\s*(?:19|20)\d{2}[a-z]?\s*\)|\(\s*[A-Z][a-z]+(?:\s+et\s+al\.?)?\s*,\s*(?:19|20)\d{2}/i;
const STAT_NOTATION_IN_LINE =
  /\b(?:p\s*[<=>]|p\s*=\s*|r\s*=\s*|F\s*\(|t\s*\(|M\s*=\s*|SD\s*=\s*|η²|chi-?square)\b/i;
const SENTENCE_END_PUNCT = /[.!?](?:["')\]])?\s*$/;

const AP_RESEARCH_HEADER = /^AP\s+Research\s*\d{1,3}\s*$/i;
const RUNNING_HEAD_PREFIX = /^Running head:\s*/i;

const SECTION_HEADING_LINE =
  /^(?:introduction|literature\s+review|method(?:ology|s)?|results?|findings?|discussion|conclusion|limitations?|implications?|references?|works?\s+cited|bibliography|appendix|abstract|gap)\s*:?\s*$/i;

const BULLET_LINE = /^[\u2022\u2023\u25E6\u2043\u2219•●○◦▪▫–—\-]\s*/;

function normalizeLineKey(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

function endsWithPageNumber(line: string): boolean {
  return /\s+\d{1,3}\s*$/.test(line.trim());
}

function isStructuralRunningHeaderCandidate(trimmed: string): boolean {
  if (!trimmed || trimmed.length >= MAX_HEADER_LINE_LEN) return false;
  if (!endsWithPageNumber(trimmed)) return false;
  if (SENTENCE_END_PUNCT.test(trimmed)) return false;
  if (CITATION_IN_LINE.test(trimmed)) return false;
  if (STAT_NOTATION_IN_LINE.test(trimmed)) return false;
  if (PAGE_NUMBER_ONLY.test(trimmed)) return false;
  if (PAGE_OF.test(trimmed)) return false;
  if (AP_RESEARCH_HEADER.test(trimmed)) return false;
  if (RUNNING_HEAD_PREFIX.test(trimmed)) return false;
  return true;
}

function isForcedRunningHeaderLine(trimmed: string): boolean {
  if (!trimmed) return false;
  if (AP_RESEARCH_HEADER.test(trimmed)) return true;
  if (RUNNING_HEAD_PREFIX.test(trimmed)) return true;
  return false;
}

function runningHeaderTitleKey(trimmed: string): string | null {
  if (!isStructuralRunningHeaderCandidate(trimmed)) return null;
  const withoutPage = trimmed.replace(/\s+\d{1,3}\s*$/, "").trim();
  if (!withoutPage || withoutPage.length >= MAX_HEADER_LINE_LEN) return null;
  return normalizeLineKey(withoutPage);
}

/** Headers that repeat each page differ only by page number — count by title prefix. */
function buildRepeatedRunningHeaderPrefixes(lines: string[]): Set<string> {
  const exactFreq = new Map<string, number>();
  const prefixFreq = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= MAX_HEADER_LINE_LEN) continue;
    const exact = normalizeLineKey(trimmed);
    if (exact) exactFreq.set(exact, (exactFreq.get(exact) ?? 0) + 1);
    const prefix = runningHeaderTitleKey(trimmed);
    if (prefix) prefixFreq.set(prefix, (prefixFreq.get(prefix) ?? 0) + 1);
  }

  const stripPrefixes = new Set<string>();
  for (const [key, count] of prefixFreq) {
    if (count >= 3) stripPrefixes.add(key);
  }

  const stripExact = new Set<string>();
  for (const [key, count] of exactFreq) {
    if (count < 3) continue;
    const sample =
      lines.find((l) => normalizeLineKey(l.trim()) === key)?.trim() ?? "";
    if (isStructuralRunningHeaderCandidate(sample)) {
      stripExact.add(key);
    }
  }

  return new Set([...stripPrefixes, ...stripExact]);
}

function stripRunningHeaders(
  text: string,
): { text: string; removed: number } {
  const lines = text.split("\n");
  const repeatedKeys = buildRepeatedRunningHeaderPrefixes(lines);
  let removed = 0;
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const exactKey = normalizeLineKey(trimmed);
    const prefixKey = runningHeaderTitleKey(trimmed);
    if (
      isForcedRunningHeaderLine(trimmed) ||
      (exactKey &&
        repeatedKeys.has(exactKey) &&
        isStructuralRunningHeaderCandidate(trimmed)) ||
      (prefixKey && repeatedKeys.has(prefixKey))
    ) {
      removed++;
      continue;
    }
    kept.push(line);
  }

  return { text: kept.join("\n"), removed };
}

function stripPdfArtifactLines(text: string): {
  text: string;
  pageNumbersRemoved: number;
} {
  const lines = text.split("\n");
  let pageNumbersRemoved = 0;
  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;
    if (PAGE_NUMBER_ONLY.test(t) || PAGE_OF.test(t)) {
      pageNumbersRemoved++;
      return false;
    }
    return true;
  });
  return { text: filtered.join("\n"), pageNumbersRemoved };
}

const STUDENT_NAME_PAGE = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d{1,3}\s*$/;

function countParagraphBreaks(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
}

function isLikelySectionHeadingLine(line: string): boolean {
  const cur = line.trim();
  return (
    cur.length > 0 &&
    cur.length < 60 &&
    /^[A-Z]/.test(cur) &&
    !SENTENCE_END_PUNCT.test(cur) &&
    !CITATION_IN_LINE.test(cur)
  );
}

function joinSoftLineBreaks(text: string): string {
  const lines = text.split("\n");
  const originalParagraphs = countParagraphBreaks(text);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      const cur = line.trimEnd();
      if (
        !cur ||
        !next ||
        PDF_PAGE_JOINER.test(next) ||
        PAGE_NUMBER_ONLY.test(next) ||
        isStructuralRunningHeaderCandidate(next) ||
        isForcedRunningHeaderLine(next) ||
        SENTENCE_END_PUNCT.test(cur) ||
        isLikelySectionHeadingLine(cur) ||
        BIB_HEADING_LINE.test(cur.trim()) ||
        BIB_HEADING_LINE.test(next) ||
        !/^[a-z(,;]/.test(next)
      ) {
        break;
      }
      line = `${cur} ${next}`;
      i++;
    }
    out.push(line);
  }

  let joined = out.join("\n");
  const newParagraphs = countParagraphBreaks(joined);
  if (
    originalParagraphs > 5 &&
    newParagraphs < originalParagraphs * 0.8
  ) {
    return text;
  }
  return joined;
}

function stripPageArtifactLines(text: string): {
  text: string;
  shortLinesRemoved: number;
  namePageLinesRemoved: number;
} {
  const lines = text.split("\n");
  let shortLinesRemoved = 0;
  let namePageLinesRemoved = 0;
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) {
      kept.push(lines[i]);
      continue;
    }
    if (PAGE_NUMBER_ONLY.test(t) || PAGE_OF.test(t) || STUDENT_NAME_PAGE.test(t)) {
      if (STUDENT_NAME_PAGE.test(t)) namePageLinesRemoved++;
      else shortLinesRemoved++;
      continue;
    }
    if (/^\s*\d+\s*$/.test(t)) {
      shortLinesRemoved++;
      continue;
    }
    if (t.length < 4 && !/[a-zA-Z]{2,}/.test(t)) {
      shortLinesRemoved++;
      continue;
    }
    kept.push(lines[i]);
  }

  return { text: kept.join("\n"), shortLinesRemoved, namePageLinesRemoved };
}

function applyGoogleDocsFormatting(text: string): string {
  let t = text.replace(/\n{3,}/g, "\n\n");

  const lines = t.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    out.push(line);

    if (i + 1 >= lines.length) continue;
    const nextTrimmed = lines[i + 1].trim();
    if (!trimmed || !nextTrimmed) continue;

    const looksLikeHeading =
      trimmed.length > 0 &&
      trimmed.length < MAX_HEADING_LINE_LEN &&
      !SENTENCE_END_PUNCT.test(trimmed) &&
      !isStructuralRunningHeaderCandidate(trimmed) &&
      !isForcedRunningHeaderLine(trimmed) &&
      !PAGE_NUMBER_ONLY.test(trimmed) &&
      (SECTION_HEADING_LINE.test(trimmed) ||
        (/^[A-Z]/.test(trimmed) && !/[.!?]$/.test(trimmed)));

    if (looksLikeHeading) {
      out.push("");
    }
  }

  t = out.join("\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

function normalizeBulletLines(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (BULLET_LINE.test(line)) {
        return line.replace(BULLET_LINE, "- ");
      }
      return line;
    })
    .join("\n");
}

export function detectPossibleTwoColumnLayout(text: string): boolean {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 50) return false;

  const shortLines = lines.filter((l) => l.length > 0 && l.length < 28).length;
  const shortRatio = shortLines / lines.length;

  const headerRepeats = lines.filter((l) =>
    isStructuralRunningHeaderCandidate(l),
  ).length;

  return shortRatio > 0.38 || headerRepeats >= 4;
}

/** Clean PDF extraction artifacts (Google Docs / Word exports). */
export function cleanPdfExtractedText(raw: string): {
  text: string;
  possibleTwoColumn: boolean;
  stats: PdfCleaningStats;
  joinSoftLineBreaksWordCount: number;
  beforeJoinSoftLineBreaksWordCount: number;
} {
  const stats: PdfCleaningStats = {
    runningHeadersRemoved: 0,
    pageNumberLinesRemoved: 0,
    pageJoinerLinesRemoved: 0,
    hyphenJoinsApplied: 0,
  };

  let text = normalizeControlCharacters(raw);
  const debug = process.env.SEMINAR_DEBUG === "1";
  const logStep = (stepName: string) => {
    if (debug) {
      console.log(`[PDF clean] after ${stepName}: ${countWords(text)} words`);
    }
  };
  logStep("normalizeControlCharacters");

  const beforeHyphen = text;
  text = text.replace(/(\p{L}|\d)-\n(\p{L}|\d)/gu, "$1$2");
  if (text !== beforeHyphen) stats.hyphenJoinsApplied = 1;

  const joinerLines = text.split("\n").filter((line) =>
    PDF_PAGE_JOINER.test(line.trim()),
  ).length;
  stats.pageJoinerLinesRemoved = joinerLines;
  text = text
    .split("\n")
    .filter((line) => !PDF_PAGE_JOINER.test(line.trim()))
    .join("\n");

  const beforeJoinWords = countWords(text);
  text = joinSoftLineBreaks(text);
  const afterJoinWords = countWords(text);
  logStep("joinSoftLineBreaks");

  const pageArtifactStrip = stripPageArtifactLines(text);
  text = pageArtifactStrip.text;
  logStep("stripPageArtifactLines");

  const headerStrip = stripRunningHeaders(text);
  text = headerStrip.text;
  stats.runningHeadersRemoved = headerStrip.removed;

  const artifactStrip = stripPdfArtifactLines(text);
  text = artifactStrip.text;
  stats.pageNumberLinesRemoved = artifactStrip.pageNumbersRemoved;

  text = applyGoogleDocsFormatting(text);
  text = normalizeBulletLines(text);
  text = stripCoverPageLines(text).text;
  text = normalizePaperText(text);
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  logStep("finalize");

  const possibleTwoColumn = detectPossibleTwoColumnLayout(text);
  return {
    text,
    possibleTwoColumn,
    stats,
    joinSoftLineBreaksWordCount: afterJoinWords,
    beforeJoinSoftLineBreaksWordCount: beforeJoinWords,
  };
}

export function estimateBodyToStatedRatio(
  cleanedText: string,
): { stated: number | null; ratio: number | null } {
  const head = cleanedText.split(/\n/).slice(0, 25).join("\n");
  const match = head.match(/^\s*word\s+count\s*:\s*([\d,]+)\s*$/im);
  const stated = match
    ? parseInt(match[1].replace(/,/g, ""), 10)
    : null;
  if (!stated || stated <= 0) return { stated: null, ratio: null };

  const lines = cleanedText.trim().split(/\n/);
  const minCharPos = Math.floor(cleanedText.length * 0.5);
  let charOffset = 0;
  let boundary = -1;
  const refHeading =
    /^(?:References|Reference\s+List|Works?\s+Cited|Bibliography)\s*:?\s*$/i;

  for (const line of lines) {
    const lineStart = charOffset;
    const t = line.trim();
    if (
      t.length > 0 &&
      t.length < 80 &&
      refHeading.test(t) &&
      lineStart >= minCharPos
    ) {
      boundary = lineStart;
      break;
    }
    charOffset += line.length + 1;
  }

  const bodyText =
    boundary >= 0 ? cleanedText.slice(0, boundary) : cleanedText;
  const bodyWords = countWords(bodyText);
  return { stated, ratio: bodyWords / stated };
}
