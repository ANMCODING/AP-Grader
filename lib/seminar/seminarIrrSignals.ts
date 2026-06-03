/**
 * IRR Row 2–4 signal detection (credentials, mechanism, synthesis).
 */

import {
  countDistinctPatternHits,
  countPatternHits,
  IRR_ADEQUATE_SOURCE_EVALUATION_SIGNALS,
  IRR_STRONG_PERSPECTIVE_SIGNALS,
  IRR_STRONG_SOURCE_EVALUATION_SIGNALS,
} from "@/lib/seminar/seminarPatterns";
import {
  IRR_BIAS_ACKNOWLEDGMENT_PATTERNS,
  IRR_GENERAL_CONNECTION_PATTERNS,
  IRR_MECHANISM_PATTERNS,
  IRR_MULTI_SOURCE_SYNTHESIS_PATTERNS,
} from "@/lib/seminar/seminarCalibrationPatterns";
import { extractInTextAuthors } from "@/lib/seminar/seminarBibliographyAnalysis";

const AUTHOR_YEAR =
  /\b([A-Z][a-z]+(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?)\s*\(\d{4}[a-z]?\)/g;
const PAREN_CITE =
  /\(([A-Z][a-zA-Z'&]+)(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-zA-Z'&]+)?,?\s*\d{4}[a-z]?(?:,\s*pp?\.\s*[\d–-]+)?\)/g;
const MLA_PAGE =
  /\(([A-Z][a-zA-Z'&]+)(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-zA-Z'&]+)?\s+\d+\)/g;

const FULL_CREDENTIAL =
  /(?:researchers?|scientists?|scholars?|professors?|psychologists?|co-?directors?) at [^.]{10,120}(?:who )?published in [^.]{8,80}/gi;
const INSTITUTION_CREDENTIAL =
  /\b(?:researchers?|a |an )(?:clinical )?(?:psychologist|professor|researcher|scientist|surgeon)s? (?:at|and) [A-Z][^.]{8,80}/gi;
const ROLE_CREDENTIAL =
  /\b(?:orthopedic )?surgeon and (?:researcher|activist)\b/gi;
const JOURNAL_CREDENTIAL =
  /\bpublished in (?:the )?[A-Z][^.]{8,80}(?:journal|review|psychiatry|psychology)/gi;

const MECHANISM_AFTER_CITE = [
  ...IRR_MECHANISM_PATTERNS,
  /\bthis creates\b/gi,
  /\bthis suggests that\b/gi,
  /\bthis explains why\b/gi,
  /\btherapeutic paradox\b/gi,
  /\bimportant design feature\b/gi,
  /\bthe reason\b/gi,
  /\bwhich means that\b/gi,
  /\bleading to\b/gi,
  /\bas a result of\b/gi,
  /\bthereby\b/gi,
  /\bbecause\b/gi,
];

const CITE_ANCHORS: RegExp[] = [
  AUTHOR_YEAR,
  PAREN_CITE,
  MLA_PAGE,
  /\b[A-Z][a-z]+(?:\s+et\s+al\.)?\s*\(\d{4}[a-z]?\)/g,
  /\([A-Z][a-zA-Z'&]+(?:\s+(?:&|and)\s+[A-Z][a-zA-Z'&]+)?(?:\s+et\s+al\.)?(?:,\s*)?\d{4}[a-z]?\)/g,
  /\([A-Z][a-zA-Z'&]+\s+&\s+[A-Z][a-zA-Z'&]+\)/g,
];

const HIGH_WEIGHT_SYNTHESIS: RegExp[] = [
  /\bthe conflict between\b/gi,
  /\bthe tension between .{5,60}'s\b/gi,
  /\bwhile .{5,40} found .{5,40}, .{5,40} found\b/gi,
  /\bnull results\b/gi,
  /\btaken together, the evidence suggests\b/gi,
  /\bthree factors emerge consistently\b/gi,
  /\breading .{5,40} alongside\b/gi,
  /\bthe disagreement between\b/gi,
  /\bcollectively establish\b/gi,
  ...IRR_MULTI_SOURCE_SYNTHESIS_PATTERNS,
];

export function computeIrrCredentialScore(body: string): number {
  let score = 0;
  score += (body.match(FULL_CREDENTIAL) ?? []).length * 2;
  score += (body.match(INSTITUTION_CREDENTIAL) ?? []).length;
  score += (body.match(ROLE_CREDENTIAL) ?? []).length;
  score += (body.match(JOURNAL_CREDENTIAL) ?? []).length;
  score +=
    countPatternHits(body, IRR_BIAS_ACKNOWLEDGMENT_PATTERNS) * 2;
  score += (body.match(/\bUniversity of\b/gi) ?? []).length;
  score += (body.match(/\bJournal of\b/gi) ?? []).length;
  score += countDistinctPatternHits(body, IRR_ADEQUATE_SOURCE_EVALUATION_SIGNALS, 30);
  score += countDistinctPatternHits(body, IRR_STRONG_SOURCE_EVALUATION_SIGNALS, 30) * 2;
  return score;
}

export function countMechanismAfterCitations(body: string): {
  citedSourceCount: number;
  mechanismAfterCount: number;
} {
  const citeIdx = new Set<number>();
  for (const re of CITE_ANCHORS) {
    for (const m of body.matchAll(re)) {
      if (m.index != null) citeIdx.add(m.index);
    }
  }
  const cites = [...citeIdx].sort((a, b) => a - b);
  const citedSourceCount = Math.max(
    cites.length,
    extractInTextAuthors(body).length,
  );
  if (citedSourceCount === 0) {
    return { citedSourceCount: 0, mechanismAfterCount: 0 };
  }

  let mechanismAfterCount = 0;
  for (const idx of cites) {
    const window = body.slice(idx, idx + 900);
    if (MECHANISM_AFTER_CITE.some((p) => p.test(window))) {
      mechanismAfterCount++;
    }
  }
  if (mechanismAfterCount === 0) {
    const globalMech = countPatternHits(body, IRR_MECHANISM_PATTERNS);
    if (globalMech >= 8) {
      mechanismAfterCount = Math.min(
        citedSourceCount,
        Math.max(2, Math.floor(globalMech / 4)),
      );
    }
  }
  return { citedSourceCount, mechanismAfterCount };
}

export function computeIrrPerspectiveSynthesisScore(body: string): number {
  let score = countPatternHits(body, HIGH_WEIGHT_SYNTHESIS) * 3;
  score += countPatternHits(body, IRR_GENERAL_CONNECTION_PATTERNS);
  score += countDistinctPatternHits(body, IRR_STRONG_PERSPECTIVE_SIGNALS, 40) * 2;
  return score;
}
