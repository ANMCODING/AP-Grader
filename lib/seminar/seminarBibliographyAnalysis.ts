/**
 * Bibliography / citation linkage analysis for IWA Row 5–6 and IRR Row 5.
 */

import {
  commentaryWithinWordsAfter,
  countDistinctPatternHits,
  countPatternHits,
  countPatternHitsInSlice,
  countPatternHitsWithCombined,
} from "@/lib/seminar/seminarPatterns";
import {
  buildCombinedRegexChunks,
  combinedChunksMatch,
  countDistinctPatternHitsWithCombined,
} from "@/lib/seminar/seminarPatternScan";
import {
  DEVELOPING_COMMENTARY_PATTERNS,
  ECHO_COMMENTARY_PATTERNS,
  UNSUBSTANTIATED_CONTEXT_PATTERNS,
} from "@/lib/seminar/seminarCalibrationPatterns";
import { STATISTICAL_URGENCY_PATTERNS } from "@/lib/seminar/seminarPatterns";
import { ANALYTICAL_USE_SIGNALS } from "@/lib/seminar/seminarIwaPhrasePatterns";
import {
  classifyBibliographyEntry,
  type ClassifiedBibliographyEntry,
} from "@/lib/seminar/seminarBibliographyClassifier";
import {
  computeAuthorInReferencesLinkingRatio,
  joinBrokenBibliographyUrls,
  linkCitationsToBibliography,
  normalizeBibliographyLines,
  resolveBibliographyLinkedRatio,
} from "@/lib/seminar/seminarBibliographyLinking";
import { isStimulusAuthor } from "@/lib/seminar/seminarStimulus";

const AUTHOR_YEAR =
  /\b([A-Z][a-z]+(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?)\s*\((?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?)\)/gi;
const PAREN_CITE =
  /\(([A-Z][a-zA-Z'&]+)(?:(?:\s+and\s+[A-Z][a-zA-Z'&-]+)|\s+et\s+al\.)?,?\s*(?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?)(?:,\s*pp?\.\s*[\d–-]+)?\)/gi;
const MLA_PAGE =
  /\(([A-Z][a-zA-Z'&]+)(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-zA-Z'&-]+)?\s+\d+\)/g;
const MLA_NAME_ONLY_CITE =
  /\(([A-Z][a-zA-Z'&-]+)(?:\s+and\s+[A-Z][a-zA-Z'&-]+)?\)/g;
const ATTRIBUTIVE_NAME = /\b([A-Z][a-z]+)\s+(?:writes|wrote|argues|notes|discusses|found|reports)\b/g;
const CITE_NEAR_BODY =
  /\([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?[^)]*(?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?)[^)]*\)|\([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?\s+\d+\)/;

const JOURNAL_ENTRY =
  /\b(?:Journal of|Review of|Proceedings of|Quarterly|vol\.|volume\s+\d|no\.\s*\d|pp\.\s*\d)/i;
const DOI_ENTRY = /doi\.org|doi:/i;
const GOV_ENTRY = /\.gov\b|(?:CDC|NIH|WHO|FBI|EPA|Department of)/i;
const DOT_COM_ONLY = /^https?:\/\/[^\s]*\.com\b/i;

const DEVELOPING_COMBINED = buildCombinedRegexChunks(DEVELOPING_COMMENTARY_PATTERNS);
const ANALYTICAL_USE_COMBINED = buildCombinedRegexChunks(ANALYTICAL_USE_SIGNALS);

export interface BibliographySourceAnalysis {
  totalEntries: number;
  nonStimulusCount: number;
  scholarlyCount: number;
  scholarlyRatio: number;
  analysisDepthCount: number;
  bibliographyAuthors: string[];
  inTextAuthors: string[];
  missingFromBibliography: string[];
  missingFromText: string[];
  missingFromBibliographyCount: number;
  linkingRatio: number;
  entryClassifications: ClassifiedBibliographyEntry[];
  totalCredibilityPoints: number;
  tier1SourceCount: number;
}

function normalizeAuthor(name: string): string {
  return name.split(/\s+/)[0]!.toLowerCase().replace(/[^a-z]/g, "");
}

export function extractBibliographyAuthors(referencesText: string): string[] {
  const authors: string[] = [];
  const lines = referencesText.split(/\n/).filter((l) => l.trim().length > 15);
  for (const line of lines) {
    const m = line.trim().match(/^([A-Z][a-zA-Z'-]+),/);
    if (m?.[1]) authors.push(normalizeAuthor(m[1]));
    const et = line.match(/^([A-Z][a-z]+)\s+et\s+al\./);
    if (et?.[1]) authors.push(normalizeAuthor(et[1]));
  }
  return [...new Set(authors)].filter((a) => a.length > 2);
}

const INVALID_IN_TEXT_AUTHOR =
  /^(?:p|pp|n|ibid|see|the|this|they|investigation|ifg|mtg)$/i;

/** Distinct normalized author keys cited in body (legacy; used by deep calibration / Row 1). */
export function extractInTextAuthors(body: string): string[] {
  const authors = new Set<string>();
  for (const re of [AUTHOR_YEAR, PAREN_CITE, MLA_PAGE]) {
    for (const m of body.matchAll(re)) {
      const name = m[1];
      if (name && !INVALID_IN_TEXT_AUTHOR.test(name)) {
        authors.add(normalizeAuthor(name));
      }
    }
  }
  for (const m of body.matchAll(ATTRIBUTIVE_NAME)) {
    if (m[1] && !INVALID_IN_TEXT_AUTHOR.test(m[1])) {
      authors.add(normalizeAuthor(m[1]));
    }
  }
  for (const m of body.matchAll(/\(([A-Z][a-zA-Z'&]+)\)/g)) {
    if (m[1] && !INVALID_IN_TEXT_AUTHOR.test(m[1])) {
      authors.add(normalizeAuthor(m[1]));
    }
  }
  for (const m of body.matchAll(/\bAccording to ([A-Z][a-z]+)/g)) {
    authors.add(normalizeAuthor(m[1]!));
  }
  for (const m of body.matchAll(
    /\b([A-Z][a-z]+)\s+and\s+colleagues\s*\(\d{4}/g,
  )) {
    authors.add(normalizeAuthor(m[1]!));
  }
  for (const m of body.matchAll(/\bResearch by ([A-Z][a-z]+)/g)) {
    authors.add(normalizeAuthor(m[1]!));
  }
  return [...authors];
}

/** APA publication years in bibliography text only (seminar-3.2.9). */
export function countBibliographyYearsInSection(referencesText: string): number {
  let body = referencesText.trim();
  const section = body.match(
    /(?:Works Cited|References|Bibliography|Sources|Literature Cited)\s*\n([\s\S]*)$/i,
  );
  if (section?.[1]) body = section[1].trim();
  body = body.replace(
    /^(?:References?|Works Cited|Bibliography|Sources|Literature Cited)\s*$/im,
    "",
  );
  return (body.match(/\(\d{4}[,)a-z]/gi) ?? []).length;
}

const BIB_ENTRY_START =
  /(?=^(?:[A-Z][\w\u00C0-\u017E]+,\s+(?:[A-Z][a-z]+(?:\s+et\s+al\.)?|[A-Z]\.)|[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z&.-]+)*\s+(?:Foundation|Association|Institute|Agency|Project|Center|Centre|Commission|Department|Government|Office|Bureau|Council|Society|Network|Alliance|Organization|Organisation)\.\s*\(\d{4}|\bCorrigendum:|\bFBI\.|\bHowe,|\bStrange,))/m;

function isBibliographyEntryChunk(part: string): boolean {
  const p = part.trim();
  return (
    p.length > 25 &&
    (/\(\d{4}/.test(p) || /\b(19|20)\d{2}\b/.test(p)) &&
    !/^(?:MEMORY|WORKS CITED|REFERENCES)\b/i.test(p) &&
    !/^\d+\s*$/.test(p)
  );
}

export function countBibliographyEntries(referencesText: string): string[] {
  let body = referencesText.trim();
  const section = body.match(
    /(?:Works Cited|References|Bibliography|Sources|Literature Cited)\s*\n([\s\S]*)$/i,
  );
  if (section?.[1]) body = section[1].trim();
  body = body
    .replace(
      /^(?:References?|Works Cited|Bibliography|Sources|Literature Cited)\s*$/im,
      "",
    )
    .trim();

  const parts = body
    .split(BIB_ENTRY_START)
    .map((p) => p.trim())
    .filter(isBibliographyEntryChunk);

  if (parts.length >= 2) return parts;

  const flat = body
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\b[A-Z][A-Z0-9\s]{12,}\s+\d{1,3}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const legacy = flat
    .split(
      /(?=(?:[A-Z][\w\u00C0-\u017E]+,\s+(?:[A-Z][a-z]|[A-Z]\.)|Corrigendum:|FBI\.|Howe,|Strange,))/,
    )
    .map((p) => p.trim())
    .filter(isBibliographyEntryChunk);
  if (legacy.length >= 2) return legacy;
  if (parts.length >= 1) return parts;
  return [flat].filter((p) => p.length > 25);
}

export function collectCitationIndices(body: string): number[] {
  const citePatterns = [AUTHOR_YEAR, PAREN_CITE, MLA_PAGE];
  const seen = new Set<number>();
  for (const re of citePatterns) {
    for (const m of body.matchAll(re)) {
      const idx = m.index ?? -1;
      if (idx >= 0) seen.add(idx);
    }
  }
  for (const m of body.matchAll(MLA_NAME_ONLY_CITE)) {
    const raw = m[0] ?? "";
    if (/(?:19|20)\d{2}|n\.?\s*d\.?/i.test(raw)) continue;
    const idx = m.index ?? -1;
    if (idx >= 0) seen.add(idx);
  }
  return [...seen];
}

export function countAnalysisDepth(
  body: string,
  citationIndices?: number[],
): number {
  let depth = 0;
  const indices = citationIndices ?? collectCitationIndices(body);
  for (const idx of indices) {
      const slice = body.slice(idx, idx + 700);
      const explicit = commentaryWithinWordsAfter(body, idx, 100) >= 1;
      const developing =
        combinedChunksMatch(DEVELOPING_COMBINED, slice) ||
        countDistinctPatternHitsWithCombined(
          slice,
          ANALYTICAL_USE_SIGNALS,
          ANALYTICAL_USE_COMBINED,
          2,
        ) >= 1;
      const studentAfter = slice
        .split(/(?<=[.!?])\s+/)
        .slice(1, 4)
        .some(
          (s) =>
            s.length > 35 &&
            !CITE_NEAR_BODY.test(s) &&
            /\b(?:therefore|thus|this|these|without|illustrat|necessit|demonstrat)\b/i.test(
              s,
            ),
        );
      if (explicit || developing || studentAfter) depth++;
  }
  return depth;
}

/**
 * Module-level cache keyed by references snippet. Cleared at the start of each
 * buildSeminarEvidence call via clearBibliographyAnalysisCache() — safe for
 * concurrent requests because each grade run clears before use.
 */
let _cachedBibAnalysis: BibliographySourceAnalysis | null = null;
let _cachedRefsKey: string | null = null;

export function getBibliographyAnalysis(
  body: string,
  referencesText: string,
): BibliographySourceAnalysis {
  const key = `${referencesText.length}:${referencesText.slice(0, 120)}`;
  if (_cachedRefsKey === key && _cachedBibAnalysis) return _cachedBibAnalysis;
  _cachedBibAnalysis = analyzeBibliographySources(body, referencesText);
  _cachedRefsKey = key;
  return _cachedBibAnalysis;
}

export function clearBibliographyAnalysisCache(): void {
  _cachedBibAnalysis = null;
  _cachedRefsKey = null;
}

export function analyzeBibliographySources(
  body: string,
  referencesText: string,
): BibliographySourceAnalysis {
  const refsJoined = normalizeBibliographyLines(
    joinBrokenBibliographyUrls(referencesText),
  );
  const entries = countBibliographyEntries(refsJoined);
  const linkResult = linkCitationsToBibliography(body, entries, refsJoined);
  const bibliographyAuthors = extractBibliographyAuthors(refsJoined);
  const inTextAuthors = extractInTextAuthors(body);

  let nonStimulusCount = 0;
  let scholarlyCount = 0;
  let totalCredibilityPoints = 0;
  let tier1SourceCount = 0;
  const entryClassifications: ClassifiedBibliographyEntry[] = [];

  for (const entry of entries) {
    const firstAuthor = entry.match(/^([A-Z][a-zA-Z'-]+)/)?.[1] ?? "";
    const isStimulus = Boolean(firstAuthor && isStimulusAuthor(firstAuthor));
    const classified = classifyBibliographyEntry(entry);
    entryClassifications.push(classified);
    if (classified.isJunk) continue;
    if (
      DOT_COM_ONLY.test(entry.trim()) &&
      !JOURNAL_ENTRY.test(entry) &&
      classified.tier === 0
    ) {
      continue;
    }
    totalCredibilityPoints += classified.credibilityPoints;
    if (classified.tier === 1) tier1SourceCount++;
    if (!isStimulus) {
      nonStimulusCount++;
      if (classified.isScholarly) scholarlyCount++;
    }
  }

  const scholarlyRatio =
    nonStimulusCount > 0 ? scholarlyCount / nonStimulusCount : 0;

  const citationIndices = collectCitationIndices(body);

  const linkingRatio = resolveBibliographyLinkedRatio(
    linkResult.linkingRatio,
    linkResult.inTextAuthors,
    refsJoined,
  );
  const missingFromBibliography = linkResult.missingFromBibliography.filter(
    (a) => {
      if (a.length <= 2 || isStimulusAuthor(a)) return false;
      const softRatio = computeAuthorInReferencesLinkingRatio([a], refsJoined);
      return softRatio < 1;
    },
  );
  const missingFromText = bibliographyAuthors.filter(
    (b) =>
      b.length > 2 &&
      !inTextAuthors.some((a) => a === b || a.startsWith(b) || b.startsWith(a)),
  );

  return {
    totalEntries: entries.length,
    nonStimulusCount,
    scholarlyCount,
    scholarlyRatio,
    analysisDepthCount: countAnalysisDepth(body, citationIndices),
    bibliographyAuthors,
    inTextAuthors,
    missingFromBibliography,
    missingFromText,
    missingFromBibliographyCount: missingFromBibliography.length,
    linkingRatio,
    entryClassifications,
    totalCredibilityPoints,
    tier1SourceCount,
  };
}

const CITE_NEAR =
  /\([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?[^)]*\d{4}[a-z]?[^)]*\)|\([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?\s+\d+\)/;

export function countSubstantiatedRqContext(
  body: string,
  rqKeywords: string[],
): number {
  const open = body.slice(0, 2500);
  let count = 0;

  const windows: { start: number; text: string }[] = [];
  for (const kw of rqKeywords) {
    const lower = open.toLowerCase();
    const k = kw.toLowerCase();
    let idx = lower.indexOf(k);
    while (idx >= 0) {
      windows.push({
        start: idx,
        text: open.slice(Math.max(0, idx - 120), idx + 150),
      });
      idx = lower.indexOf(k, idx + 1);
    }
  }
  if (windows.length === 0) {
    windows.push({ start: 0, text: open });
  }

  const seen = new Set<string>();
  for (const { start, text } of windows) {
    const key = text.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);

    const unsubstantiated = UNSUBSTANTIATED_CONTEXT_PATTERNS.some((p) => p.test(text));
    const hasCitation =
      CITE_NEAR.test(text) ||
      CITE_NEAR.test(open.slice(Math.max(0, start - 80), start + 200));
    if (unsubstantiated && !hasCitation) continue;

    const hasStat = STATISTICAL_URGENCY_PATTERNS.some((p) => p.test(text));
    const hasInstitution =
      /\b(?:courtroom|jury|wrongful|nostalgia|well-?being|orthopedic|burnout|criminal justice)\b/i.test(
        text,
      );
    if ((hasStat || hasInstitution) && (hasCitation || rqKeywords.length === 0)) {
      count++;
    } else if (hasCitation && rqKeywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))) {
      count++;
    }
  }

  if (count === 0 && rqKeywords.length > 0) {
    const hasStatOpen = countPatternHitsInSlice(open, STATISTICAL_URGENCY_PATTERNS, 2500) > 0;
    const linked = rqKeywords.some((kw) => open.toLowerCase().includes(kw.toLowerCase()));
    if (hasStatOpen && linked && CITE_NEAR.test(open.slice(0, 2500))) count = 1;
  }

  if (count === 0) {
    const openCtx = body.slice(0, 5200);
    const hasStat = countPatternHitsInSlice(openCtx, STATISTICAL_URGENCY_PATTERNS, 5200) > 0;
    const hasTopic =
      /\b(?:transportation|greenhouse|emissions|climate|percent|°C|CO2)\b/i.test(
        openCtx,
      );
    if (hasStat && hasTopic && CITE_NEAR.test(openCtx)) count = 1;
  }

  return count;
}

export function countCommentaryDepth(
  body: string,
  citationIndices?: number[],
): {
  echoCount: number;
  developCount: number;
  ratio: number;
} {
  let echoCount = 0;
  let developCount = 0;
  const indices = citationIndices ?? collectCitationIndices(body);

  for (const idx of indices) {
    const after = body.slice(idx, idx + 500);
    echoCount += countPatternHits(after, ECHO_COMMENTARY_PATTERNS);
    developCount += countPatternHitsWithCombined(
      after,
      DEVELOPING_COMMENTARY_PATTERNS,
      DEVELOPING_COMBINED,
    );
  }

  const rawDevelopHits = countPatternHitsWithCombined(
    body,
    DEVELOPING_COMMENTARY_PATTERNS,
    DEVELOPING_COMBINED,
  );
  const developOccurrences = Math.max(0, rawDevelopHits - developCount);
  const discountedDevelop =
    developOccurrences > 0
      ? 1.0 + (developOccurrences - 1) * 0.3
      : 0;
  developCount += discountedDevelop;

  const MAX_DEVELOPING_PATTERNS_FOR_RATIO = 20;
  developCount = Math.min(developCount, MAX_DEVELOPING_PATTERNS_FOR_RATIO);

  const total = echoCount + developCount;
  return {
    echoCount,
    developCount,
    ratio: total > 0 ? developCount / total : developCount > 0 ? 1 : 0,
  };
}
