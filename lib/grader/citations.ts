import { isBibliographyHeadingLine } from "@/lib/grader/paperBoundaries";
import { firstPercent } from "@/lib/grader/text";

/** Split prose into sentences without breaking on years inside parentheses e.g. (2011). */
function splitIntoSentences(text: string): string[] {
  const normalized = text
    .replace(/\.\s*\n+/g, ". ")
    .replace(/\?\s*\n+/g, "? ")
    .replace(/!\s*\n+/g, "! ");

  const result: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (c === "(") parenDepth++;
    if (c === ")") parenDepth = Math.max(0, parenDepth - 1);
    current += c;

    if (parenDepth === 0 && /[.!?]/.test(c)) {
      const before = normalized.slice(Math.max(0, i - 8), i);
      if (/\bet\s+al$/i.test(before)) continue;
      if (/\b(?:eg|ie|vs|etc|approx|Dr|Mr|Mrs|Ms|Prof)\.?$/i.test(before)) continue;
      if (/\b[A-Z]\.$/.test(before + c)) continue;

      const next = normalized[i + 1];
      if (next === undefined || /\s/.test(next)) {
        const sent = current.trim();
        if (sent.length > 15) result.push(sent);
        current = "";
      }
    }
  }

  const tail = current.trim();
  if (tail.length > 15) result.push(tail);
  return result;
}

/** Normalized citation identity for deduplication. */
export interface CitationKey {
  kind: "author-year" | "numbered";
  author: string;
  year: string;
}

export interface CitationAnalysis {
  uniqueSources: CitationKey[];
  uniqueCount: number;
  multiCiteSentenceCount: number;
}

const YEAR = "(?:19|20)\\d{2}[a-z]?";

/** Humanities / theoretical synthesis connectives (FIX 1). */
export const HUMANITIES_SYNTHESIS_PHRASES: RegExp[] = [
  /\bbuilding\s+on\b/i,
  /\bextending\s+this\b/i,
  /\bextends\s+this\b/i,
  /\bin\s+response\s+to\b/i,
  /\bargues?\s+in\s+response\b/i,
  /\bcritiques?\b/i,
  /\bchallenges?\s+this\b/i,
  /\bconsistent\s+with\b/i,
  /\binconsistent\s+with\b/i,
  /\baligns?\s+with\b/i,
  /\bcontradicts?\b/i,
  /\bin\s+dialogue\s+with\b/i,
  /\bpositions?\s+this\b/i,
  /\bsituates?\s+this\b/i,
  /\bcomplicates?\b/i,
  /\bnuances?\s+this\b/i,
  /\bpushes?\s+back\b/i,
  /\bmoves?\s+beyond\b/i,
  /\bdeparts?\s+from\b/i,
  /\bconverges?\s+with\b/i,
  /\bdiverges?\s+from\b/i,
  /\bin\s+tension\s+with\b/i,
  /\balongside\b/i,
  /\bdrawing\s+on\b/i,
  /\binformed\s+by\b/i,
  /\bgrounded\s+in\b/i,
  /\brooted\s+in\b/i,
  /\btheorized\s+by\b/i,
  /\bconceptualized\s+by\b/i,
  /\bframed\s+by\b/i,
  /\bsituated\s+within\b/i,
  /\bdeveloped\s+primarily\s+through\b/i,
  /\bextended\s+this\s+framework\b/i,
  /\bin\s+contrast\s+to\b/i,
  /\bunlike\b/i,
  /\bwhereas\b/i,
];

/** Character span covering `wordRadius` words before and after `center`. */
function wordWindowAround(text: string, center: number, wordRadius = 100): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  let charPos = 0;
  let centerWord = 0;
  for (let i = 0; i < words.length; i++) {
    const idx = text.indexOf(words[i], charPos);
    if (idx === -1) break;
    if (idx <= center) centerWord = i;
    charPos = idx + words[i].length;
  }

  const startWord = Math.max(0, centerWord - wordRadius);
  const endWord = Math.min(words.length, centerWord + wordRadius + 1);
  return words.slice(startWord, endWord).join(" ");
}

function countCitationsInRadius(
  text: string,
  center: number,
  wordRadius = 100,
): number {
  return citationsInSentence(wordWindowAround(text, center, wordRadius)).length;
}

function countHumanitiesSynthesisSentences(text: string, seen: Set<string>): number {
  if (!text.trim()) return 0;
  let added = 0;
  for (const pattern of HUMANITIES_SYNTHESIS_PHRASES) {
    const re = new RegExp(pattern.source, "gi");
    for (const match of text.matchAll(re)) {
      const idx = match.index ?? 0;
      if (countCitationsInRadius(text, idx, 100) >= 2) {
        const key = `h:${idx}:${match[0].slice(0, 24)}`;
        if (!seen.has(key)) {
          seen.add(key);
          added++;
        }
      }
    }
  }
  return added;
}

function normalizeAuthor(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'")
    .toLowerCase();
}

function authorYearKey(author: string, year: string): string {
  const y = year.replace(/[a-z]$/i, "");
  return `ay:${normalizeAuthor(author)}|${y}`;
}

function numberedKey(n: string): string {
  return `num:${n}`;
}

function stripPageSuffix(part: string): string {
  return part
    .replace(/,?\s*(?:p\.?|pp\.?)\s*[\d\-–—]+(?:\s*[-–—]\s*[\d\-–—]+)?\s*$/i, "")
    .trim();
}

/** Parse one segment inside parentheses (may be one of several semicolon-separated cites). */
function parseParentheticalPart(part: string): CitationKey | null {
  let p = stripPageSuffix(part.trim());
  if (!new RegExp(YEAR).test(p)) return null;

  let m: RegExpMatchArray | null;

  m = p.match(
    new RegExp(
      `^([A-Z][A-Za-z'\\-]+(?:\\s+[A-Z][A-Za-z'\\-]+)*)\\s+et\\s+al\\.?,?\\s*(${YEAR})`,
      "i",
    ),
  );
  if (m) {
    return {
      kind: "author-year",
      author: m[1].trim(),
      year: m[2].replace(/[a-z]$/i, ""),
    };
  }

  m = p.match(
    new RegExp(
      `^([A-Z][A-Za-z'\\-]+)\\s+(?:&|and)\\s+([A-Z][A-Za-z'\\-]+),?\\s*(${YEAR})`,
      "i",
    ),
  );
  if (m) {
    return {
      kind: "author-year",
      author: m[1].trim(),
      year: m[3].replace(/[a-z]$/i, ""),
    };
  }

  m = p.match(
    new RegExp(
      `^([A-Z][A-Za-z'\\-]+(?:\\s*,\\s*[A-Z][A-Za-z'\\-]+)*(?:\\s*,\\s*&\\s*[A-Z][A-Za-z'\\-]+)?),?\\s*(${YEAR})`,
    ),
  );
  if (m) {
    const firstAuthor = m[1].split(/\s*,\s*/)[0].replace(/\s*&\s*$/, "").trim();
    return {
      kind: "author-year",
      author: firstAuthor,
      year: m[2].replace(/[a-z]$/i, ""),
    };
  }

  m = p.match(new RegExp(`^(.+?),\\s*(${YEAR})`));
  if (m && !/\bet\s+al\b/i.test(m[1])) {
    const author = m[1].trim();
    if (author.length >= 2) {
      return {
        kind: "author-year",
        author: author.split(/\s*,\s*/)[0].trim(),
        year: m[2].replace(/[a-z]$/i, ""),
      };
    }
  }

  m = p.match(new RegExp(`^([A-Z][A-Za-z'\\-]+(?:\\s+[A-Z][A-Za-z'\\-]+)*)\\s+(${YEAR})`));
  if (m) {
    return {
      kind: "author-year",
      author: m[1].trim(),
      year: m[2].replace(/[a-z]$/i, ""),
    };
  }

  return null;
}

/** In-text ("Title or Source", YYYY) or ("Title", YYYY-YYYY) — common in humanities papers. */
function extractQuotedTitleYearCitations(text: string): CitationKey[] {
  const found: CitationKey[] = [];
  const re = /\(["']([^"']{4,120})["'],?\s*((?:19|20)\d{2})(?:-(?:19|20)\d{2})?\)/g;
  for (const m of text.matchAll(re)) {
    const title = m[1].trim().slice(0, 48);
    if (title.length < 4) continue;
    found.push({
      kind: "author-year",
      author: title,
      year: m[2],
    });
  }
  return found;
}

function extractParentheticalCitations(text: string): CitationKey[] {
  const found: CitationKey[] = [];
  const re = new RegExp(`\\(([^)]*${YEAR}[^)]*)\\)`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const inner = match[1];
    const segments = inner.split(";").map((s) => s.trim());
    for (const seg of segments) {
      const key = parseParentheticalPart(seg);
      if (key) found.push(key);
    }
  }
  return [...found, ...extractQuotedTitleYearCitations(text)];
}

const INVALID_AUTHOR_WORDS = new Set([
  "in",
  "the",
  "and",
  "or",
  "but",
  "while",
  "when",
  "if",
  "as",
  "for",
  "not",
  "this",
  "these",
  "that",
  "with",
  "from",
  "here",
  "used",
  "developed",
  "measures",
  "again",
  "both",
  "however",
  "although",
  "research",
  "studies",
  "figure",
  "table",
  "page",
  "vol",
  "no",
  "many",
  "several",
]);

function isValidAuthorName(author: string): boolean {
  const trimmed = author.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > 4) return false;
  for (const w of words) {
    if (INVALID_AUTHOR_WORDS.has(w.toLowerCase())) return false;
  }
  if (!/^[A-Z]/.test(trimmed)) return false;
  return true;
}

function extractInlineCitations(text: string): CitationKey[] {
  const found: CitationKey[] = [];
  const usedSpans: [number, number][] = [];

  const claimSpan = (start: number, end: number): boolean => {
    if (usedSpans.some(([s, e]) => start < e && end > s)) return false;
    usedSpans.push([start, end]);
    return true;
  };

  const add = (author: string, year: string, start: number, end: number) => {
    if (!isValidAuthorName(author)) return;
    if (!claimSpan(start, end)) return;
    found.push({
      kind: "author-year",
      author: author.trim(),
      year: year.replace(/[a-z]$/i, ""),
    });
  };

  const etAlRe = new RegExp(
    `\\b([A-Z][A-Za-z'\\-]+)\\s+et\\s+al\\.?\\s*\\(\\s*(${YEAR})(?:\\s*,\\s*(?:p\\.?|pp\\.?)\\s*[\\d\\-–—]+)?\\s*\\)`,
    "gi",
  );
  for (const m of text.matchAll(etAlRe)) {
    add(m[1], m[2], m.index ?? 0, (m.index ?? 0) + m[0].length);
  }

  const etAlCommaYearRe = new RegExp(
    `\\b([A-Z][A-Za-z'\\-]+)\\s+et\\s+al\\.?,?\\s+(${YEAR})\\b`,
    "gi",
  );
  for (const m of text.matchAll(etAlCommaYearRe)) {
    add(m[1], m[2], m.index ?? 0, (m.index ?? 0) + m[0].length);
  }

  const twoAuthorRe = new RegExp(
    `\\b([A-Z][A-Za-z'\\-]+)\\s+(?:&|and)\\s+([A-Z][A-Za-z'\\-]+)\\s*\\(\\s*(${YEAR})(?:\\s*,\\s*(?:p\\.?|pp\\.?)\\s*[\\d\\-–—]+)?\\s*\\)`,
    "gi",
  );
  for (const m of text.matchAll(twoAuthorRe)) {
    add(m[1], m[3], m.index ?? 0, (m.index ?? 0) + m[0].length);
  }

  const singleRe = new RegExp(
    `(?<![A-Za-z])([A-Z][A-Za-z'\\-]+)\\s*\\(\\s*(${YEAR})(?:\\s*,\\s*(?:p\\.?|pp\\.?)\\s*[\\d\\-–—]+)?\\s*\\)`,
    "gi",
  );
  for (const m of text.matchAll(singleRe)) {
    add(m[1], m[2], m.index ?? 0, (m.index ?? 0) + m[0].length);
  }

  // Multi-author inline: Patall, Cooper, and Robinson (2008); Silinskas and Kikas (2019)
  const multiAuthorRe = new RegExp(
    `\\b([A-Z][A-Za-z'\\-]+(?:\\s*,\\s*[A-Z][A-Za-z'\\-]+)*(?:\\s*,\\s*(?:&|and)\\s+[A-Z][A-Za-z'\\-]+)?)\\s*\\(\\s*(${YEAR})(?:\\s*,\\s*(?:p\\.?|pp\\.?)\\s*[\\d\\-–—]+)?\\s*\\)`,
    "gi",
  );
  for (const m of text.matchAll(multiAuthorRe)) {
    const author = m[1].split(/\s*,\s*/)[0].replace(/\s*(?:&|and)\s*$/i, "").trim();
    add(author, m[2], m.index ?? 0, (m.index ?? 0) + m[0].length);
  }

  return found;
}

/** APA-style bibliography entries: Author, A. (YYYY). */
export function extractBibliographyCitations(referencesSection: string): CitationKey[] {
  if (!referencesSection.trim()) return [];
  const found: CitationKey[] = [];
  const lines = referencesSection.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 10) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;

    const m = trimmed.match(
      /^(\d+\.\s+)?([A-Z][A-Za-z'\\-]+)(?:,|\s+)(?:[A-Z]\.?\s*)?(?:.*?)?\(\s*(\d{4})/,
    );
    if (m) {
      found.push({
        kind: "author-year",
        author: m[2].trim(),
        year: m[3],
      });
    }
  }
  return found;
}

function extractNumberedCitations(text: string): CitationKey[] {
  const found: CitationKey[] = [];
  const re = /\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const nums = m[1].split(/\s*,\s*/).map((n) => n.trim());
    for (const n of nums) {
      if (n) {
        found.push({ kind: "numbered", author: n, year: "" });
      }
    }
  }
  return found;
}

function dedupeKeys(keys: CitationKey[]): CitationKey[] {
  const seen = new Set<string>();
  const unique: CitationKey[] = [];
  for (const k of keys) {
    const id =
      k.kind === "numbered"
        ? numberedKey(k.author)
        : authorYearKey(k.author, k.year);
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(k);
    }
  }
  return unique;
}

/** All unique scholarly sources in the full paper text (optional references section). */
export function extractUniqueCitations(
  text: string,
  referencesSection = "",
): CitationKey[] {
  const all = [
    ...extractParentheticalCitations(text),
    ...extractInlineCitations(text),
    ...extractNumberedCitations(text),
    ...extractBibliographyCitations(referencesSection),
  ];
  return dedupeKeys(all);
}

/** Parenthetical (Author, Year) citations in a region — for attribution-quality checks. */
export function countParentheticalInText(text: string): number {
  return extractParentheticalCitations(text).length;
}

export function countUniqueCitations(
  text: string,
  referencesSection = "",
): number {
  return extractUniqueCitations(text, referencesSection).length;
}

/** Unique citations found in a single sentence (parenthetical + inline + numbered). */
export function citationsInSentence(sentence: string): CitationKey[] {
  const keys = [
    ...extractParentheticalCitations(sentence),
    ...extractQuotedTitleYearCitations(sentence),
    ...extractInlineCitations(sentence),
    ...extractNumberedCitations(sentence),
  ];
  return dedupeKeys(keys);
}

/** Count sentences or literature paragraphs containing two or more unique citations. */
export function countMultiCitationSentences(text: string): number {
  if (!text.trim()) return 0;
  const seen = new Set<string>();
  let count = 0;

  const register = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    count++;
  };

  for (const s of splitIntoSentences(text)) {
    if (citationsInSentence(s).length >= 2) {
      register(s.slice(0, 100));
    }
  }

  count += countHumanitiesSynthesisSentences(text, seen);

  for (const block of text.split(/\n\n+/)) {
    const trimmed = block.trim();
    if (trimmed.length < 80) continue;
    if (citationsInSentence(trimmed).length >= 2) {
      register(`p:${trimmed.slice(0, 100)}`);
    }
  }

  return count;
}

/** APA reference lines in the last 30% of the document (FIX 3). */
export function detectApaReferencesInLast30Percent(fullText: string): {
  detected: boolean;
  entryCount: number;
} {
  const tail = fullText.slice(Math.floor(fullText.length * 0.7));
  let count = 0;
  const yearInParens = new RegExp(`\\(${YEAR}\\)`);
  const yearAfterComma = new RegExp(`,\\s*${YEAR}\\b`);

  for (const line of tail.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length < 25) continue;
    if (!/^[A-Z0-9"']/.test(trimmed)) continue;

    const hasYear =
      yearInParens.test(trimmed) ||
      yearAfterComma.test(trimmed) ||
      /\b(?:19|20)\d{2}\b/.test(trimmed);

    if (!hasYear) continue;

    const mlaWorksCitedLine =
      /^[A-Z][A-Za-z'\\-]+,\s+[A-Z]/.test(trimmed) &&
      (trimmed.includes('"') ||
        /\bvol\.\s*\d/i.test(trimmed) ||
        /\bet\s+al\./i.test(trimmed) ||
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d/i.test(
          trimmed,
        ));

    const hasPublisherSignal =
      mlaWorksCitedLine ||
      /\bhttps?:\/\//i.test(trimmed) ||
      /\bdoi\.org\b/i.test(trimmed) ||
      /\bdoi:/i.test(trimmed) ||
      /\bJournal\s+of\b/i.test(trimmed) ||
      /\bReview\s+of\b/i.test(trimmed) ||
      /\bPress\b/i.test(trimmed) ||
      /\bPublishers?\b/i.test(trimmed) ||
      /\bSAGE\b/i.test(trimmed) ||
      /\bSpringer\b/i.test(trimmed) ||
      /\bUniversity\s+of\b/i.test(trimmed) ||
      /\bInstitute\s+of\b/i.test(trimmed) ||
      /\bResearch\s+Center\b/i.test(trimmed) ||
      /\(\d{4}\)\.\s+[A-Z]/i.test(trimmed) ||
      (/^["'][A-Z]/.test(trimmed) && /\b(?:19|20)\d{2}\b/.test(trimmed));

    if (hasPublisherSignal) count++;
  }

  return { detected: count >= 3, entryCount: count };
}

/** Count APA-style reference list entries (Author, A. (YYYY). …). */
/** Narrative author–year cites (e.g. Cepeda et al. (2006) or Cepeda et al., 2006). */
export function countUniqueAuthorYearNarrative(text: string): number {
  return dedupeKeys(extractInlineCitations(text)).length;
}

/** References / works cited / bibliography heading anywhere in the document (FIX 1). */
export function hasReferencesHeadingInDocument(fullText: string): boolean {
  for (const line of fullText.split("\n")) {
    if (isBibliographyHeadingLine(line)) return true;
  }
  return false;
}

/**
 * Bibliography in the final 30%: 3+ APA-style reference lines (primary detector).
 */
export function detectTailBibliographyPattern(fullText: string): boolean {
  return detectApaReferencesInLast30Percent(fullText).detected;
}

export function countBibliographyEntries(referencesSection: string): number {
  if (!referencesSection.trim()) return 0;
  const lines = referencesSection.split("\n");
  let entries = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 15) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;
    if (
      /^(\d+\.\s+)?[A-Z][A-Za-z'\\-]+/.test(trimmed) &&
      (new RegExp(`\\(${YEAR}\\)`).test(trimmed) || /\b(?:19|20)\d{2}\b/.test(trimmed))
    ) {
      entries++;
    }
  }
  return entries;
}

export function analyzeCitations(
  paperBodyText: string,
  literatureReview: string,
  referencesSection = "",
): CitationAnalysis {
  const litRegion = literatureReview.trim()
    ? literatureReview
    : firstPercent(paperBodyText, 0.4);

  const uniqueSources = extractUniqueCitations(paperBodyText, "");

  return {
    uniqueSources,
    uniqueCount: uniqueSources.length,
    multiCiteSentenceCount: countMultiCitationSentences(litRegion),
  };
}

export const GAP_PHRASE_PATTERNS: RegExp[] = [
  /\bthe\s+(?:first|second|third|main|primary|key)\s+gap\b/i,
  /\bgap\s+that\s+has\s+been\s+(?:identified|recognized|noted)\b/i,
  /\bgaps?\s+(?:that\s+(?:have|has)\s+been|identified|recognized)\b/i,
  /\bthere\s+(?:are|is)\s+(?:no|limited|few)\s+(?:studies|research|data)\b/i,
  /\bnoticeable\s+lack\s+of\s+research\b/i,
  /\bhas\s+been\s+overlooked\b/i,
  /\blimited\s+research\s+on\b/i,
  /\bthe\s+rareness\s+of\s+this\s+disease\b/i,
  /\bnot\s+(?:many|enough)\s+treatment\s+options\b/i,
  /no study has/i,
  /no study to date has/i,
  /gap in the literature/i,
  /no research has/i,
  /limited studies/i,
  /this study addresses/i,
  /existing research does not/i,
  /however,?\s+no study/i,
  /to date no/i,
  /understudied/i,
  /little is known/i,
  /few studies have examined/i,
  /\bleaves?\s+unanswered\b/i,
  /\bhas\s+not\s+been\s+examined\b/i,
  /\bhave\s+not\s+been\s+examined\b/i,
  /\bdid\s+not\s+address\b/i,
  /\bdoes\s+not\s+address\b/i,
  /\bremains?\s+unknown\b/i,
  /\bis\s+not\s+well\s+understood\b/i,
  /\bhas\s+been\s+understudied\b/i,
  /\bremains?\s+understudied\b/i,
  /\bexisting\s+research\s+has\s+overlooked\b/i,
  /\bprior\s+studies?\s+have\s+not\b/i,
  /\bat\s+the\s+intersection\s+of\b/i,
  /\bthis\s+distinction\s+has\s+not\s+been\b/i,
  /\bthis\s+combination\s+has\s+not\s+been\s+studied\b/i,
  /\bno\s+controlled\s+study\s+has\s+examined\b/i,
  /\bno\s+research\s+has\s+specifically\s+examined\b/i,
  /\bhas\s+not\s+directly\s+compared\b/i,
  /\bhave\s+not\s+directly\s+tested\b/i,
  /\bcannot\s+be\s+determined\s+from\b/i,
  /\bcannot\s+be\s+inferred\s+from\b/i,
  /\bdoes\s+not\s+account\s+for\b/i,
  /\bfails?\s+to\s+account\s+for\b/i,
  /\boverlooks?\s+the\s+role\s+of\b/i,
  /\bneglects?\s+the\s+role\s+of\b/i,
  /\bdoes\s+not\s+consider\b/i,
  /\bhave\s+not\s+considered\b/i,
  /\bis\s+unclear\s+from\s+existing\b/i,
  /\bremains?\s+unclear\b/i,
  /\bthe\s+mechanism\s+is\s+unknown\b/i,
  /\bthe\s+extent\s+to\s+which\s+is\s+unknown\b/i,
];

export function findGapSentences(text: string): string[] {
  return splitIntoSentences(text).filter((s) =>
    GAP_PHRASE_PATTERNS.some((p) => p.test(s)),
  );
}

export function detectCitationStyle(text: string): string {
  const parenthetical = (
    text.match(new RegExp(`\\([A-Z][^)]*${YEAR}`, "g")) ?? []
  ).length;
  const inline = (
    text.match(new RegExp(`[A-Z][a-z]+\\s*\\(\\s*${YEAR}`, "g")) ?? []
  ).length;
  const apa = parenthetical + inline;
  const numbered = (text.match(/\[\d{1,3}\]/g) ?? []).length;
  const mla = (text.match(/\([A-Z][a-zA-Z]+ \d+\)/g) ?? []).length;
  if (apa > numbered && apa > mla) return "APA";
  if (numbered > apa) return "Numbered";
  if (mla > 0) return "MLA";
  return apa > 0 ? "APA" : numbered > 0 ? "Numbered" : "Unknown";
}
