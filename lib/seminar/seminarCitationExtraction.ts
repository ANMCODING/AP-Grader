/**
 * Canonical in-text citation extraction (seminar-3.2.13, delegates to seminarInTextCitations 3.2.24).
 */

import {
  extractInTextCitations,
  type CitationExtractionResult,
} from "@/lib/seminar/seminarInTextCitations";
import type { InTextCitationRef } from "@/lib/seminar/seminarBibliographyLinking";

export type { CitationExtractionResult };

export interface LegacyCitationExtractionResult {
  parentheticalCount: number;
  attributiveCount: number;
  etAlCount: number;
  totalCount: number;
  uniqueAuthors: string[];
  parentheticalRefs: InTextCitationRef[];
  allRefs: InTextCitationRef[];
}

/** @deprecated Use extractInTextCitations from seminarInTextCitations.ts */
export function extractCitations(body: string): LegacyCitationExtractionResult {
  const ext = extractInTextCitations(body, true);
  return {
    parentheticalCount: ext.parentheticalCount,
    attributiveCount: ext.attributiveCount,
    etAlCount: 0,
    totalCount: ext.totalCount,
    uniqueAuthors: ext.uniqueAuthorSurnames,
    parentheticalRefs: [],
    allRefs: [],
  };
}
