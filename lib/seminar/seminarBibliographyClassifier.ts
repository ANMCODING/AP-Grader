/**
 * Format-first bibliography entry classification (v3.0).
 * Replaces separate tier regex lists, isScholarlyEntry, and computeCredibilityScore paths.
 */

import {
  BIB_CLASSIFIER_FORMAT_HIGH,
  BIB_CLASSIFIER_FORMAT_LOW,
  BIB_CLASSIFIER_TIER0,
  BIB_CLASSIFIER_TIER1,
  BIB_CLASSIFIER_TIER2,
  BIB_CLASSIFIER_TIER3,
} from "@/lib/seminar/seminarBibliographyClassifierPatterns.generated";

export type BibliographyEntryTier = 0 | 1 | 2 | 3;

export interface ClassifiedBibliographyEntry {
  tier: BibliographyEntryTier;
  credibilityPoints: number;
  isScholarly: boolean;
  isJunk: boolean;
  detectionBasis: string;
}

const TIER1_NAME_HINTS =
  /\b(?:Nature|Science|PNAS|NEJM|New England Journal of Medicine|JAMA|The Lancet|BMJ|Cell|American Economic Review|Journal of Political Economy|American Political Science Review|American Sociological Review|Psychological Science|Journal of Personality and Social Psychology|Developmental Psychology|Child Development|Journal of Neuroscience|Annual Review of Psychology|Harvard Law Review|Yale Law Journal|Stanford Law Review|Columbia Law Review|American Journal of Public Health|Health Affairs|Journal of Urban Economics|Nature Climate Change|American Educational Research Journal|Harvard Educational Review|Academy of Management Journal)\b/i;

const TIER2_NAME_HINTS =
  /\b(?:CDC|NIH|WHO|EPA|FBI|DOJ|FDA|NSF|CBO|GAO|National Institutes of Health|Centers for Disease Control|Environmental Protection Agency|World Health Organization|World Bank|Pew Research Center|Brookings Institution|RAND Corporation|McKinsey Global Institute|Urban Institute|Kaiser Family Foundation|National Academies of Sciences|National Academies Press|Innocence Project|Equal Justice Initiative|Vera Institute|Prison Policy Initiative|International Journal of Environmental Research|Journal of Correctional Education|Journal of Sport History|SSM\s*-\s*Population Health|British Journal o f Education)\b/i;

const TIER3_NAME_HINTS =
  /\b(?:New York Times|Washington Post|Wall Street Journal|The Guardian|The Atlantic|The Economist|NPR|BBC|Reuters|Associated Press|ProPublica|Harvard Business Review|Scientific American|National Geographic|Psychology Today|Vox|Politico|The Hill|Time Magazine|Newsweek)\b/i;

const JUNK_DOMAIN_HINTS =
  /\b(?:wikipedia\.org|Wikipedia|blogspot\.com|wordpress\.com|medium\.com|reddit\.com|quora\.com|BuzzFeed|Daily Mail|TMZ|tumblr\.com|TikTok|Instagram|Facebook|Twitter)\b/i;

const TIER1_PRESS =
  /\b(?:MIT Press|Harvard University Press|Yale University Press|Princeton University Press|Stanford University Press|Oxford University Press|Cambridge University Press|University of Chicago Press|Columbia University Press|Duke University Press|University of California Press)\b/i;

const TIER2_PRESS =
  /\b(?:Routledge|Sage Publications|Springer|Elsevier|Wiley-Blackwell|Palgrave Macmillan|Johns Hopkins University Press)\b/i;

const PREDATORY_JOURNAL =
  /\b(?:Global Journal of|International Journal of Latest Research|Research Journal of)\b/i;

const HAS_AUTHOR_COMMA =
  /[A-Z][a-zA-Z'-]+,\s+[A-Z]/;
const HAS_AUTHOR_ET_AL = /^[A-Z][a-z]+\s+et\s+al\./m;
const HAS_AUTHOR_FBI = /^FBI\.\s+\(\d{4}\)/;
const HAS_AUTHOR_CORRIGENDUM = /^Corrigendum:/i;
const HAS_DATE_PAREN = /\(\d{4}[a-z]?\)/;
const HAS_DATE_COMMA_YEAR = /,\s*\d{4}\b/;
const HAS_DATE_PAGE = /\b\d{4},\s*p\./i;
const HAS_DATE_MONTH =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
const HAS_TITLE_QUOTES = /[""][^""]{8,}[""]/;
const HAS_TITLE_TRAILING = /\b\w{4,}\b.*\.\s*(?:https?:\/\/|\n|$)/m;
const DOI_URL_LINE = /^https?:\/\/(?:doi\.)/i;
const RETRACTED_RE = /\bretract(?:ed|ion)\b/i;
const DOI_INLINE = /doi\.org|doi:\s*\S/i;
const JOURNAL_VOL_NO_PP = /\bvol\.\s*\d+.*\bno\.\s*\d+.*\bpp\.\s*\d/i;
const JOURNAL_VOL_PP = /\bvol\.\s*\d+.*\bpp?\.\s*\d/i;
const MLA_JOURNAL_NO = /\bno\.\s*\d+/i;
const APA_JOURNAL =
  /\bJournal of\b|\bReview of\b|\bQuarterly\b|Frontiers in/i;
const NATIONAL_ACADEMIES = /\bNational Academies of Sciences\b/i;
const GOV_DOMAIN = /\.gov\b/i;
const WORKING_PAPER =
  /\bworking paper\b|\btechnical report\b/i;
const UNIV_INSTITUTION =
  /\b(?:University|Institute|Department|Center)\b/i;
const UNIVERSITY_RESEARCH_CENTER =
  /\b(?:university of \w+|center for applied research|national bureau of economic research|rand corporation|brookings institution|urban institute|pew research center)\b/i;
const TIER3_WEB =
  /\.com\b|\.org\b|Magazine|Times|Post|Guardian|National Geographic|apa\.org|berkeley\.edu/i;
const HAS_URL = /https?:\/\//i;

function hasAuthor(entry: string): boolean {
  return (
    HAS_AUTHOR_COMMA.test(entry) ||
    HAS_AUTHOR_ET_AL.test(entry) ||
    HAS_AUTHOR_FBI.test(entry) ||
    HAS_AUTHOR_CORRIGENDUM.test(entry)
  );
}

function hasDate(entry: string): boolean {
  return (
    HAS_DATE_PAREN.test(entry) ||
    HAS_DATE_COMMA_YEAR.test(entry) ||
    HAS_DATE_PAGE.test(entry) ||
    HAS_DATE_MONTH.test(entry)
  );
}

function hasTitle(entry: string): boolean {
  return HAS_TITLE_QUOTES.test(entry) || HAS_TITLE_TRAILING.test(entry);
}

function urlOnlyLine(entry: string): boolean {
  const t = entry.trim();
  return /^https?:\/\//i.test(t) && !hasAuthor(entry) && !hasDate(entry);
}

function firstMatchTier(
  entry: string,
  patterns: RegExp[],
): boolean {
  return patterns.some((p) => p.test(entry));
}

export function classifyBibliographyEntry(entry: string): ClassifiedBibliographyEntry {
  const e = entry
    .trim()
    .replace(/(?<=\/)\s+(?=[A-Za-z0-9])/g, "")
    .replace(/\bo f\b/gi, "of");
  if (e.length < 15) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: false,
      detectionBasis: "Too short to classify",
    };
  }

  if (urlOnlyLine(e) && !/doi\.org|doi:/i.test(e)) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: true,
      detectionBasis: "URL only (no author/title)",
    };
  }

  if (DOI_URL_LINE.test(e.trim()) && e.trim().length < 120) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "DOI URL line",
    };
  }

  if (
    /\b(?:ebscohost\.com|connection\.ebscohost|web\.[ab]\.ebscohost)\b/i.test(e) &&
    hasAuthor(e)
  ) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "EBSCOhost academic database",
    };
  }

  if (
    /\b(?:ncbi\.nlm\.nih\.gov|pubmed\.ncbi|pmc\.ncbi\.nlm\.nih\.gov|\/pmc\/articles\/|PMC\d+)\b/i.test(e) &&
    hasAuthor(e)
  ) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "PubMed/PMC repository",
    };
  }

  if (/\bJSTOR\b/i.test(e) && hasAuthor(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "JSTOR academic repository",
    };
  }

  if (
    /\b(?:www\.)?jstor\.org\b/i.test(e) &&
    hasAuthor(e)
  ) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "JSTOR URL",
    };
  }

  if (
    /\b(?:MDPI|Elsevier|Springer(?:Link)?|Wiley|Taylor(?:\s*&\s*|\s+)Francis|SAGE|Oxford University Press)\b/i.test(
      e,
    ) &&
    hasAuthor(e) &&
    hasDate(e)
  ) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Academic publisher",
    };
  }

  if (firstMatchTier(e, BIB_CLASSIFIER_TIER0) || JUNK_DOMAIN_HINTS.test(e)) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: true,
      detectionBasis: firstMatchTier(e, BIB_CLASSIFIER_TIER0)
        ? "Tier 0 classifier pattern"
        : "Known low-credibility domain",
    };
  }

  if (firstMatchTier(e, BIB_CLASSIFIER_FORMAT_LOW) && !hasAuthor(e)) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: true,
      detectionBasis: "Low-reliability format pattern",
    };
  }

  if (RETRACTED_RE.test(e)) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: true,
      detectionBasis: "Retraction notice",
    };
  }

  if (PREDATORY_JOURNAL.test(e) && !hasAuthor(e)) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: true,
      detectionBasis: "Predatory journal indicator",
    };
  }

  if (!hasAuthor(e) && !hasDate(e) && !hasTitle(e)) {
    return {
      tier: 0,
      credibilityPoints: 0,
      isScholarly: false,
      isJunk: true,
      detectionBasis: "No author, date, or title",
    };
  }

  if (/\bTestimony before\b/i.test(e) || /\bSenate Committee\b/i.test(e)) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Legislative testimony (Tier 2)",
    };
  }

  if (
    /\b(?:Australian Government|Federal Trade Commission)\b/i.test(e) ||
    (/\blegislation\.gov\b/i.test(e) && /\bAct\s+\d{4}\b/i.test(e))
  ) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Government policy / legislation (Tier 2)",
    };
  }

  if (
    /\b(?:Portfolio\/Penguin|Atria Books|St\. Martin's Press|Penguin Books)\b/i.test(
      e,
    ) &&
    !DOI_INLINE.test(e)
  ) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Trade book press (Tier 2)",
    };
  }

  if (/\bCanadian Public Policy\b/i.test(e) && hasAuthor(e) && hasDate(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Canadian Public Policy (peer-reviewed journal)",
    };
  }

  if (DOI_INLINE.test(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "DOI detected",
    };
  }

  if (JOURNAL_VOL_NO_PP.test(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Journal article format (vol./no./pp.)",
    };
  }

  if (JOURNAL_VOL_PP.test(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Journal article format (vol./pp.)",
    };
  }

  if (hasAuthor(e) && MLA_JOURNAL_NO.test(e) && hasDate(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "MLA journal (no. + year)",
    };
  }

  if (
    hasAuthor(e) &&
    hasDate(e) &&
    APA_JOURNAL.test(e)
  ) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "APA journal format",
    };
  }

  if (TIER1_PRESS.test(e) || NATIONAL_ACADEMIES.test(e)) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Tier 1 university press",
    };
  }

  if (
    (firstMatchTier(e, BIB_CLASSIFIER_TIER1) || TIER1_NAME_HINTS.test(e)) &&
    !/\bCommittee on Commerce,\s*Science\b/i.test(e) &&
    !/^(?:Commerce,|Committee on Commerce|U\.S\.\s+Senate)/i.test(e.trim())
  ) {
    return {
      tier: 1,
      credibilityPoints: 3,
      isScholarly: true,
      isJunk: false,
      detectionBasis: firstMatchTier(e, BIB_CLASSIFIER_TIER1)
        ? "Tier 1 classifier pattern"
        : "Named Tier 1 journal (confirmatory)",
    };
  }

  if (
    UNIVERSITY_RESEARCH_CENTER.test(e) &&
    (UNIV_INSTITUTION.test(e) || /,\s*&\s*[A-Z]/.test(e))
  ) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "University research center report (Tier 2)",
    };
  }

  if (GOV_DOMAIN.test(e)) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: ".gov domain",
    };
  }

  if (firstMatchTier(e, BIB_CLASSIFIER_TIER2) || TIER2_NAME_HINTS.test(e)) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: firstMatchTier(e, BIB_CLASSIFIER_TIER2)
        ? "Tier 2 classifier pattern"
        : "Government agency or Tier 2 institution",
    };
  }

  if (TIER2_PRESS.test(e)) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Academic press (Tier 2)",
    };
  }

  if (
    WORKING_PAPER.test(e) && UNIV_INSTITUTION.test(e)
  ) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "Institutional working/technical report",
    };
  }

  if (firstMatchTier(e, BIB_CLASSIFIER_TIER3) || TIER3_NAME_HINTS.test(e)) {
    return {
      tier: 3,
      credibilityPoints: 1,
      isScholarly: false,
      isJunk: false,
      detectionBasis: firstMatchTier(e, BIB_CLASSIFIER_TIER3)
        ? "Tier 3 classifier pattern"
        : "Named journalistic outlet",
    };
  }

  if (firstMatchTier(e, BIB_CLASSIFIER_FORMAT_HIGH) && hasAuthor(e) && hasDate(e)) {
    return {
      tier: 2,
      credibilityPoints: 2,
      isScholarly: true,
      isJunk: false,
      detectionBasis: "High-reliability format pattern",
    };
  }

  if (hasAuthor(e) && (hasTitle(e) || hasDate(e))) {
    const tier3Journalistic =
      TIER3_WEB.test(e);
    return {
      tier: 3,
      credibilityPoints: 1,
      isScholarly: false,
      isJunk: false,
      detectionBasis: tier3Journalistic
        ? "Author + date + web publication"
        : "Author + title + publication",
    };
  }

  if (hasAuthor(e) && hasDate(e) && HAS_URL.test(e)) {
    return {
      tier: 3,
      credibilityPoints: 1,
      isScholarly: false,
      isJunk: false,
      detectionBasis: "Partial citation (author + year + URL)",
    };
  }

  return {
    tier: 0,
    credibilityPoints: 0,
    isScholarly: false,
    isJunk: false,
    detectionBasis: "Unclassified (incomplete format)",
  };
}
