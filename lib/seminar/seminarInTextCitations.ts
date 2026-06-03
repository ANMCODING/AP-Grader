/**
 * In-text citation counting — APA + MLA (seminar-3.2.17, consolidated 3.2.24).
 */

import { extractInTextCitationRefs } from "@/lib/seminar/seminarBibliographyLinking";

const ATTRIBUTIVE =
  /\b(?:according to|as (?:noted|explained|argued|found) by|[A-Z][a-z]+ argues that|[A-Z][a-z]+ notes that)\b/gi;

const APA_PAREN_FORMAT =
  /\([A-Z][a-zA-Z'&]+(?:(?:\s+and\s+[A-Z][a-zA-Z'&]+)|\s+et\s+al\.)?,?\s*(?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?)(?:\s*,\s*p\.?\s*[\d–-]+)?\)/gi;
const MLA_PAGE_PAREN_FORMAT =
  /\([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-zA-Z'&]+)?\s+\d{1,4}\b(?!\d)\)/g;
const MLA_NAME_PAREN_FORMAT =
  /\([A-Z][a-zA-Z'&]+(?:\s+and\s+[A-Z][a-zA-Z'&]+)?\)/g;
const APA_TWO_AUTHOR_FORMAT =
  /\([A-Z][a-zA-Z'&]+\s+and\s+[A-Z][a-zA-Z'&]+,?\s*(?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?)/gi;
const APA_ND_FORMAT =
  /\([A-Z][a-zA-Z'&]+(?:(?:\s+and\s+[A-Z][a-zA-Z'&]+)|\s+et\s+al\.)?,?\s*n\.?\s*d\.?\s*\)/gi;

export interface CountInTextCitationsOptions {
  bibliographyPresent?: boolean;
  includeAttributiveCap?: boolean;
}

export interface CitationFormatCounts {
  apa: number;
  mlaPage: number;
  mlaNameOnly: number;
}

export interface CitationExtractionResult {
  apaCount: number;
  mlaPageCount: number;
  mlaNameOnlyCount: number;
  ndCount: number;
  twoAuthorCount: number;
  totalCount: number;
  uniqueAuthorSurnames: string[];
  distinctAttributedSources: number;
  /** Parenthetical refs only (Row 6 linking). */
  parentheticalCount: number;
  attributiveCount: number;
}

function uniqueMatchCount(body: string, pattern: RegExp): number {
  return new Set([...body.matchAll(pattern)].map((m) => m[0])).size;
}

function classifyParentheticalRef(raw: string): {
  apa: boolean;
  mlaPage: boolean;
  mlaNameOnly: boolean;
  nd: boolean;
  twoAuthor: boolean;
} {
  const inner = raw.startsWith("(") ? raw.slice(1, -1) : raw;
  const nd = /,\s*n\.?\s*d\.?\s*$/i.test(inner);
  const twoAuthor =
    /\s+and\s+[A-Z]/.test(inner) &&
    /(?:19|20)\d{2}|n\.?\s*d\.?/i.test(inner);
  const apaYear = /(?:19|20)\d{2}/i.test(inner) || nd;
  const mlaPage =
    !apaYear &&
    /\d{1,4}\s*\)$/.test(raw) &&
    /[A-Z][a-zA-Z'&]+/.test(inner);
  const mlaNameOnly =
    !apaYear && !mlaPage && /^\([A-Z][a-zA-Z'&]+/.test(raw);
  return {
    apa: apaYear && !nd,
    mlaPage,
    mlaNameOnly,
    nd,
    twoAuthor,
  };
}

/**
 * Single canonical in-text citation extraction for scoring and calibration.
 */
export function extractInTextCitations(
  body: string,
  hasBibliography: boolean,
  opts: CountInTextCitationsOptions = {},
): CitationExtractionResult {
  const allowMlaNameOnly = hasBibliography;
  const refs = extractInTextCitationRefs(body, {
    allowMlaNameOnly,
  });
  const parentheticalRefs = refs.filter((r) => r.parenthetical);
  const attributiveRefs = refs.filter((r) => !r.parenthetical);

  let apaCount = 0;
  let mlaPageCount = 0;
  let mlaNameOnlyCount = 0;
  let ndCount = 0;
  let twoAuthorCount = 0;

  for (const ref of parentheticalRefs) {
    const c = classifyParentheticalRef(ref.raw);
    if (c.nd) ndCount++;
    if (c.twoAuthor) twoAuthorCount++;
    if (c.apa) apaCount++;
    if (c.mlaPage) mlaPageCount++;
    if (c.mlaNameOnly) mlaNameOnlyCount++;
  }

  const apaParenSignals = uniqueMatchCount(body, APA_PAREN_FORMAT);
  const mlaPageSignals = uniqueMatchCount(body, MLA_PAGE_PAREN_FORMAT);
  apaCount = Math.max(apaCount, apaParenSignals);
  mlaPageCount = Math.max(mlaPageCount, mlaPageSignals);
  if (allowMlaNameOnly) {
    mlaNameOnlyCount = Math.max(
      mlaNameOnlyCount,
      uniqueMatchCount(body, MLA_NAME_PAREN_FORMAT),
    );
  }
  ndCount = Math.max(ndCount, uniqueMatchCount(body, APA_ND_FORMAT));
  twoAuthorCount = Math.max(
    twoAuthorCount,
    uniqueMatchCount(body, APA_TWO_AUTHOR_FORMAT),
  );

  const uniqueAuthorSurnames = [
    ...new Set(
      refs.map((r) => r.key).filter((k) => k.length >= 3),
    ),
  ];
  const distinctAttributedSources = uniqueAuthorSurnames.length;

  const parentheticalCount = parentheticalRefs.length;
  const attributiveCount = attributiveRefs.length;
  const attributiveCap = opts.includeAttributiveCap !== false ? 25 : 0;
  const totalCount =
    parentheticalCount +
    Math.min(body.match(ATTRIBUTIVE)?.length ?? 0, attributiveCap);

  return {
    apaCount,
    mlaPageCount,
    mlaNameOnlyCount,
    ndCount,
    twoAuthorCount,
    totalCount,
    uniqueAuthorSurnames,
    distinctAttributedSources,
    parentheticalCount,
    attributiveCount,
  };
}

/** Count APA vs MLA parenthetical signals for format detection. */
export function countCitationFormatSignals(
  body: string,
  bibliographyPresent = false,
): CitationFormatCounts {
  const ext = extractInTextCitations(body, bibliographyPresent, {
    includeAttributiveCap: false,
  });
  return {
    apa: ext.apaCount,
    mlaPage: ext.mlaPageCount,
    mlaNameOnly: ext.mlaNameOnlyCount,
  };
}

/** True when MLA-style parentheticals outnumber APA (seminar-3.2.18). */
export function detectIsMlaCitationFormat(
  body: string,
  bibliographyPresent = false,
): boolean {
  const { apa, mlaPage, mlaNameOnly } = countCitationFormatSignals(
    body,
    bibliographyPresent,
  );
  if (mlaPage < 1) return false;
  return mlaPage + mlaNameOnly > apa;
}

/**
 * Distinct in-text citations (APA + MLA page + optional MLA surname-only when bib present).
 */
export function countInTextCitations(
  body: string,
  opts: CountInTextCitationsOptions = {},
): number {
  return extractInTextCitations(
    body,
    opts.bibliographyPresent === true,
    opts,
  ).totalCount;
}

/** Unique author surnames for perspective / source counting. */
export function extractDistinctInTextAuthorSurnames(
  body: string,
  opts: CountInTextCitationsOptions = {},
): string[] {
  return extractInTextCitations(
    body,
    opts.bibliographyPresent === true,
    opts,
  ).uniqueAuthorSurnames;
}
