/**
 * Bibliography portfolio signals for CB-aligned source-count gates (seminar-3.2.8).
 */
import type { ClassifiedBibliographyEntry } from "@/lib/seminar/seminarBibliographyClassifier";
import { classifyBibliographyEntry } from "@/lib/seminar/seminarBibliographyClassifier";
import {
  countBibliographyEntries,
  countBibliographyYearsInSection,
} from "@/lib/seminar/seminarBibliographyAnalysis";
import { joinBrokenBibliographyUrls } from "@/lib/seminar/seminarBibliographyLinking";

const GOV_TESTIMONY_LEGISLATION =
  /(?:\.gov\b|Testimony before|Senate Committee|legislation\.gov|Government policy|Legislative testimony|Federal Trade Commission|Australian Government)/i;

const TIER2_ACADEMIC_RESEARCH =
  /(?:University of|Center for Applied Research|National Bureau of Economic Research|RAND Corporation|Brookings Institution|Urban Institute|Pew Research Center|doi\.org|Journal of|Review of|vol\.\s*\d|National Academies)/i;

const FALSE_TIER1_SENATE_FRAGMENT =
  /^(?:Commerce,|Committee on Commerce|U\.S\.\s+Senate)/i;

export interface BibliographyPortfolioSignals {
  biblioCount: number;
  tier1Count: number;
  tier1PeerReviewedCount: number;
  tier2AcademicCount: number;
  allGovOrTestimony: boolean;
  allWikipediaOrJunk: boolean;
}

function isPeerReviewedTier1(entry: string, classified: ClassifiedBibliographyEntry): boolean {
  if (classified.tier !== 1 || classified.isJunk) return false;
  if (FALSE_TIER1_SENATE_FRAGMENT.test(entry.trim())) return false;
  if (/Testimony before|Senate Committee/i.test(entry)) return false;
  const basis = classified.detectionBasis;
  return (
    /DOI|Journal article|peer-reviewed|MLA journal|APA journal|university press/i.test(
      basis,
    ) || /doi\.org/i.test(entry)
  );
}

function isGovTestimonyOrLegislation(
  entry: string,
  classified: ClassifiedBibliographyEntry,
): boolean {
  if (classified.isJunk) return false;
  return (
    GOV_TESTIMONY_LEGISLATION.test(entry) ||
    /Government policy|Legislative testimony|\.gov\b/i.test(classified.detectionBasis)
  );
}

function isTier2AcademicResearch(
  entry: string,
  classified: ClassifiedBibliographyEntry,
): boolean {
  if (classified.isJunk || classified.tier === 0) return false;
  if (isGovTestimonyOrLegislation(entry, classified)) return false;
  if (/Trade book press/i.test(classified.detectionBasis)) return false;
  if (classified.tier === 1 && isPeerReviewedTier1(entry, classified)) return true;
  if (classified.tier !== 2 || !classified.isScholarly) return false;
  return TIER2_ACADEMIC_RESEARCH.test(entry) || /Institutional working|Academic press|Tier 2 classifier/i.test(classified.detectionBasis);
}

export function analyzeBibliographyPortfolio(
  referencesText: string,
): BibliographyPortfolioSignals {
  const refsJoined = joinBrokenBibliographyUrls(referencesText);
  const entries = countBibliographyEntries(refsJoined);
  const yearEntryCount = countBibliographyYearsInSection(refsJoined);

  let biblioCount = 0;
  let tier1Count = 0;
  let tier1PeerReviewedCount = 0;
  let tier2AcademicCount = 0;
  let govTestimonyCount = 0;
  let wikipediaOrJunkCount = 0;

  for (const entry of entries) {
    const classified = classifyBibliographyEntry(entry);
    if (classified.isJunk) {
      wikipediaOrJunkCount++;
      continue;
    }
    biblioCount++;
    if (classified.tier === 1) {
      tier1Count++;
      if (isPeerReviewedTier1(entry, classified)) tier1PeerReviewedCount++;
    }
    if (isTier2AcademicResearch(entry, classified)) tier2AcademicCount++;
    if (isGovTestimonyOrLegislation(entry, classified)) govTestimonyCount++;
    if (/wikipedia/i.test(entry) || classified.tier === 0) wikipediaOrJunkCount++;
  }

  if (entries.length < yearEntryCount) {
    biblioCount = Math.max(biblioCount, yearEntryCount);
  }

  return {
    biblioCount,
    tier1Count,
    tier1PeerReviewedCount,
    tier2AcademicCount,
    allGovOrTestimony:
      biblioCount > 0 &&
      govTestimonyCount === biblioCount &&
      tier1PeerReviewedCount === 0 &&
      tier2AcademicCount === 0,
    allWikipediaOrJunk:
      entries.length > 0 && wikipediaOrJunkCount === entries.length,
  };
}
