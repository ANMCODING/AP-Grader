import type { DocumentPartition } from "@/lib/grader/gradingPipeline";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import { METHOD_CONTENT_MIN_CHARS } from "@/lib/grader/gradingSpec";
import {
  analyzeUnseenVisualContent,
  type UnseenVisualAssumptions,
} from "@/lib/grader/visualContentReminder";
import {
  analyzeVisualEvidence,
  type VisualEvidenceResult,
} from "@/lib/grader/visualEvidence";
import { countDistinctStatisticalMethods } from "@/lib/grader/statisticalMethods";
import {
  analyzeCitations,
  countBibliographyEntries,
  detectApaReferencesInLast30Percent,
  detectCitationStyle,
  detectTailBibliographyPattern,
  findGapSentences,
  hasReferencesHeadingInDocument,
} from "@/lib/grader/citations";
import { detectHighScoringPaper } from "@/lib/grader/highScoringBoost";
import {
  detectCrossSectionSynthesis,
  detectTheoreticalFrameworkSynthesis,
  evaluateGapQuality,
  evaluateSynthesisQuality,
  gapNamesMultipleResearchThreads,
  isCollegeBoardScoringRubricProse,
  type GapQuality,
} from "@/lib/grader/literatureQuality";
import {
  computeIntroWindow,
  detectExploratoryFraming,
  detectExplicitLiteratureReviewIntro,
  computeFocusSpecificityScore,
  detectHighlySpecificFocus,
  detectHypothesisOnly,
  extractResearchQuestionsFromPaper,
  isActionResearchFraming,
  isBroadQuestion,
  selectBestResearchQuestion,
} from "@/lib/grader/focusRules";
import {
  countInferentialFallbackSignals,
  countStudentResultsSignals,
  detectChicagoFootnoteStyle,
  detectContentAnalysisExecuted,
  detectContradictoryFindingHandled,
  detectCorrelationStudyExecuted,
  detectFabricatedDataAdmission,
  detectHypotheticalResults,
  detectLiteratureReviewOnlyMethod,
  detectPrismaWithoutExecution,
  detectRigorousSimulationMethod,
  detectSimulationEmpiricalResults,
  detectUnverifiableLiteratureSynthesisMethod,
  expandResultsBodyForSignals,
  methodShowsDataCollection,
} from "@/lib/grader/studentData";
import { detectUnusualSectionOrder } from "@/lib/grader/sectionOrder";
import { isBibliographyHeadingLine } from "@/lib/grader/paperBoundaries";
import { countParentheticalInText } from "@/lib/grader/citations";
import { detectMethodExecution } from "@/lib/grader/methodExecution";
import {
  countInferentialEvidenceSignals,
  countQualitativeInterviewSignals,
  detectQuasiExperimentalExecuted,
  detectSecondaryDataAnalysisExecuted,
} from "@/lib/grader/studentEvidenceSignals";
import { detectPlannedMethod } from "@/lib/grader/plannedMethod";
import {
  countMetaAnalysisMethodElements,
  detectMetaAnalysisStudentData,
  isMetaAnalysisMethod,
} from "@/lib/grader/metaAnalysisDetection";
import { detectStudentGraphSynthesis } from "@/lib/grader/studentGraphSynthesis";
import { identifyFunctionalRegions } from "@/lib/grader/functionalRegions";
import { stripBracketComments } from "@/lib/grader/textNormalize";
import { CONSISTENCY_DRIFT_THRESHOLD } from "@/lib/grader/gradingSpec";
import { buildBoundaryWordCountFlags } from "@/lib/grader/paperBoundaries";
import {
  averageSentenceLength,
  extractSection,
  firstPercent,
  hasSection,
  sentences,
} from "@/lib/grader/text";

export interface PaperEvidence {
  /** Authoritative word count (paper body zone only). */
  wordCount: number;
  fullDocumentWordCount: number;
  statedWordCount: number | null;
  boundaryWordCountFlags: string[];
  /** Scored paper body text (excludes references and appendices). */
  fullText: string;
  fullDocumentText: string;
  referencesZone: string;
  appendixZone: string;
  hasReferencesSection: boolean;
  appendixCount: number;
  appendixReferencedInBody: boolean;
  unusualDocumentStructure: boolean;
  inTextCitationCount: number;
  introRegion: string;
  literatureReview: string;
  methodSection: string;
  resultsSection: string;
  limitationsSection: string;
  implicationsSection: string;
  conclusionSection: string;
  referencesSection: string;
  researchQuestions: string[];
  researchQuestionText: string;
  citationCount: number;
  multiCitationSentences: number;
  gapSentences: string[];
  methodElements: number;
  methodHasResultsAfter: boolean;
  hasResultsSection: boolean;
  resultsWordAfterMethod: boolean;
  hasDataSignals: boolean;
  resultsSignals: number;
  limitationsStrong: boolean;
  limitationsWeakOnly: boolean;
  implicationsStrong: boolean;
  implicationsMissing: boolean;
  citationStyle: string;
  styleInconsistent: boolean;
  hasBibliography: boolean;
  avgSentenceLength: number;
  distinctStatMethods: number;
  visualEvidence: VisualEvidenceResult;
  unseenVisual: UnseenVisualAssumptions;
  explicitNoDataCollected: boolean;
  highlySpecificFocus: boolean;
  bibliographyEntryCount: number;
  scholarlyUndercountLikely: boolean;
  nonSignificantOnlyFinding: boolean;
  plannedComponentNotExecuted: boolean;
  gapQuality: GapQuality;
  synthesisIsolationCount: number;
  methodNotExecutedHard: boolean;
  methodPartialExecution: boolean;
  crossSectionSynthesis: boolean;
  theoreticalFrameworkSynthesis: boolean;
  humanitiesDemonstratedGap: boolean;
  exploratoryFramingOnly: boolean;
  hypothesisOnly: boolean;
  literatureReviewOnlyMethod: boolean;
  unverifiableLiteratureSynthesisMethod: boolean;
  simulationEmpiricalResults: boolean;
  methodCollectionEvidence: boolean;
  metaAnalysisStudentDataExempt: boolean;
  studentResultsSignals: number;
  demonstratedGapSignals: number;
  borderlineDemonstratedGap: boolean;
  /** Contrastive lit-tail gap fallback (asserted-borderline). */
  synthesisContrastGap: boolean;
  weakImplications: boolean;
  methodDefended: boolean;
  humanSubjectsNoEthics: boolean;
  proceduralSequenceMissing: boolean;
  futureTenseMethodDominant: boolean;
  descriptiveOnlyResults: boolean;
  fabricatedDataAdmission: boolean;
  sparseParentheticalInLit: boolean;
  citationStuffing: boolean;
  hasDetectedSectionHeadings: boolean;
  inferentialStatsPresent: boolean;
  strongEmpiricalOverride: boolean;
  functionalRegionsLocated: boolean;
  priorAuthorResultsRatio: number;
  rigorousSimulationMethod: boolean;
  missingReferencedAppendix: boolean;
  usesFootnotesExtensively: boolean;
  chicagoFootnoteStyle: boolean;
  focusSpecificityScore: number;
  gapAbstractFallback: boolean;
  unusualSectionOrder: boolean;
  statsHypothesisContradiction: boolean;
  highScoringPaperDetected: boolean;
  contentAnalysisExecuted: boolean;
  correlationStudyExecuted: boolean;
  contradictoryFindingHandled: boolean;
  secondaryDataAnalysisExempt: boolean;
}

export { isBroadQuestion };

const STOP_FOCUS_WORDS = new Set([
  "which",
  "their",
  "there",
  "these",
  "those",
  "about",
  "would",
  "could",
  "should",
  "being",
  "having",
  "through",
  "during",
  "within",
  "without",
  "between",
  "among",
  "other",
  "first",
  "second",
  "third",
  "study",
  "research",
  "paper",
  "question",
  "extent",
  "does",
  "affect",
  "effects",
  "effect",
  "impact",
  "whether",
]);

const EXPLICIT_NO_DATA_PATTERNS = [
  /\bI\s+was\s+not\s+able\s+to\s+collect(?:\s+my\s+own)?\s+data\b/i,
  /\bI\s+did\s+not\s+collect(?:\s+my\s+own)?\s+data\b/i,
  /\bI\s+was\s+unable\s+to\s+collect(?:\s+my\s+own)?\s+data\b/i,
  /\bdata\s+collection\s+was\s+not\s+possible\b/i,
  /\bnot\s+able\s+to\s+collect(?:\s+my\s+own)?\s+data\b/i,
  /\bdue\s+to\s+time\s+constraints[^.]{0,80}could\s+not\b/i,
  /\bcould\s+not\s+collect(?:\s+my\s+own)?\s+data\b/i,
  /\bdid\s+not\s+(?:conduct|perform|carry\s+out)\s+(?:my\s+own\s+)?(?:experiment|study|research)\b/i,
  /\bthere will be no actual experiment conducted\b/i,
  /\bno actual experiment conducted\b/i,
  /\bthe participant pool will be zero\b/i,
  /\bparticipant pool will be zero\b/i,
  /\ball data mentioned in this research paper will have been extracted\b/i,
  /\bwill have been extracted from outside credible sources\b/i,
];

function detectExplicitNoDataCollected(fullText: string): boolean {
  return EXPLICIT_NO_DATA_PATTERNS.some((p) => p.test(fullText));
}

const NON_SIGNIFICANCE_PHRASES = [
  /\b(?:was|were)\s+not\s+statistically\s+significant\b/i,
  /\bnot\s+statistically\s+significant\b/i,
  /\bcould\s+be\s+due\s+to\s+chance\b/i,
  /\bp\s*=\s*\.0?6\b/i,
  /\bp\s*>\s*0?\.05\b/i,
  /\bdid\s+not\s+reach\s+significance\b/i,
  /\bcannot\s+conclude\b/i,
  /\bresults\s+are\s+inconclusive\b/i,
  /\bno\s+significant\s+(?:difference|correlation|effect)\b/i,
];

const NON_SIG_P_NUMERIC = /\bp\s*=\s*(\.?\d+)\b/i;

function hasNonSignificantPValue(text: string): boolean {
  if (NON_SIGNIFICANCE_PHRASES.some((p) => p.test(text))) return true;
  for (const m of text.matchAll(new RegExp(NON_SIG_P_NUMERIC.source, "gi"))) {
    const raw = m[1];
    const val = parseFloat(raw.startsWith(".") ? `0${raw}` : raw);
    if (Number.isFinite(val) && val > 0.05 && val < 1) return true;
  }
  return false;
}

function detectStatsHypothesisContradiction(
  resultsRegion: string,
  conclusionRegion: string,
): boolean {
  const results = resultsRegion.trim();
  const conclusion = conclusionRegion.trim();
  if (!hasNonSignificantPValue(results)) return false;
  return /\b(?:hypothesis\s+was\s+supported|hypothesis\s+confirmed|results\s+support|findings\s+confirm)\b/i.test(
    conclusion,
  );
}

const PLANNED_NOT_EXECUTED_PHRASES = [
  /\bI\s+planned\s+to\s+conduct\b/i,
  /\bI\s+did\s+not\s+end\s+up\s+(?:doing|conducting)\b/i,
  /\bI\s+was\s+not\s+able\s+to\s+conduct\b/i,
  /\bcould\s+not\s+be\s+completed\b/i,
  /\bdue\s+to\s+time\s+constraints[^.]{0,120}could\s+not\b/i,
];

function hasSignificantResults(text: string): boolean {
  if (/\bp\s*(?:<|less\s+than)\s*0?\.0?5\b/i.test(text)) return true;
  if (/\bp\s*=\s*\.?0?0[0-4]\d*\b/i.test(text)) return true;
  if (/\bp\s+less\s+than\s+\.0?0[0-4]/i.test(text)) return true;
  if (/\bstatistically\s+significant\b/i.test(text) && !/\bnot\s+statistically\s+significant\b/i.test(text))
    return true;
  if (/\bsignificant\s+(?:difference|effect|correlation)\b/i.test(text)) return true;
  if (/\bF\s*\([^)]+\)\s*=[^;]+,\s*p\s+less\s+than/i.test(text)) return true;
  if (/\bt\s*\(\s*\d+\s*\)\s*=[^,]+,\s*p\s*=\s*\.?0*0[1-4]/i.test(text)) return true;
  if (/\b(?:r|d)\s*=\s*[^,]+,\s*p\s*=\s*\.?0*0[1-4]/i.test(text)) return true;
  if (/\bchi-?square[^.]{0,80}p\s+less\s+than/i.test(text)) return true;
  return false;
}

export function hasQualitativeResultsCollected(
  resultsRegion: string,
  fullText: string,
): boolean {
  const region = `${resultsRegion}\n${fullText}`;
  if (
    /\b(?:did\s+not\s+end\s+up|was\s+not\s+able\s+to\s+conduct|did\s+not\s+conduct)\b/i.test(
      region,
    ) &&
    /\b(?:interview|qualitative)\b/i.test(region)
  ) {
    return false;
  }
  return /\b(?:theme\s*(?:\d|one|two|three)|themes?\s+(?:emerged|produced|identified)|overarching\s+themes?|thematic\s+coding|representative\s+quote|analysis\s+of\s+(?:the\s+)?\d+\s+interviews?|interview(?:s)?\s+(?:revealed|showed|found|produced))\b/i.test(
    resultsRegion,
  );
}

export function detectNonSignificantOnlyFinding(
  resultsRegion: string,
  discussionRegion: string,
): boolean {
  const region = `${resultsRegion}\n${discussionRegion}`;
  const hasNonSig = NON_SIGNIFICANCE_PHRASES.some((p) => p.test(region));
  if (!hasNonSig) return false;
  if (hasSignificantResults(region)) return false;
  if (hasQualitativeResultsCollected(resultsRegion, "")) return false;
  return true;
}

export function detectPlannedComponentNotExecuted(fullText: string): boolean {
  return PLANNED_NOT_EXECUTED_PHRASES.some((p) => p.test(fullText));
}

function stripWordCountLines(text: string): string {
  return text
    .replace(/^Word\s+Count\s*:\s*\d+\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function requiresHumanSubjectsEthics(text: string): boolean {
  return /\b(?:survey|interview|questionnaire|minors?|teenagers?|students?|participants?|human subjects)\b/i.test(
    text,
  );
}

function computePriorAuthorResultsRatio(resultsBody: string): number {
  if (!resultsBody.trim()) return 0;
  const sents = sentences(resultsBody).filter((s) => s.trim().length > 15);
  if (sents.length === 0) return 0;
  let prior = 0;
  for (const s of sents) {
    if (
      /\b(?:I|we|our)\s+(?:found|conducted|collected)\b/i.test(s) ||
      /\b(?:participants?|respondents?|students?)\s+(?:reported|said|indicated)\b/i.test(
        s,
      )
    ) {
      continue;
    }
    if (
      /\b(?!The|This|These|Those|Survey|Results|Discussion)[A-Z][a-zA-Z]{2,}(?:\s+et\s+al\.?)?\s+(?:found|showed|demonstrated|reported|noted|argued)\b/.test(
        s,
      )
    ) {
      prior++;
    }
  }
  return prior / sents.length;
}

function detectWeakImplications(impl: string): boolean {
  if (!impl.trim() || impl.length < 80) return true;
  const strongCommunity =
    /\b(?:this study can help|these findings suggest that coaches|teachers designing|educators should consider|administrators can use|practitioners should|parents and teachers|school counselors|athletic trainers|curriculum designers|program developers|health professionals|policy makers|future researchers should|this research adds to the field of|this contributes to the understanding of|this has practical implications for)\b/i.test(
      impl,
    );
  if (strongCommunity) return false;
  const generic =
    /\b(?:future research should|more research is needed|further study|teachers should consider)\b/i.test(
      impl,
    );
  const namedAudience =
    /\b(?:educators|policymakers|researchers|clinicians|practitioners|coaches|athletic trainers|school board|administrators|curriculum)\b/i.test(
      impl,
    );
  return generic && !namedAudience;
}

function extractFocusKeywords(rq: string, intro: string): string[] {
  const source = `${rq} ${intro.slice(0, 1500)}`.toLowerCase();
  const keywords = new Set<string>();

  for (const m of source.matchAll(/\b([a-z]{3,})\b/g)) {
    if (!STOP_FOCUS_WORDS.has(m[1])) keywords.add(m[1]);
  }

  for (const m of source.matchAll(/\b([a-z]+)\s+([a-z]{3,})\b/g)) {
    if (!STOP_FOCUS_WORDS.has(m[2])) keywords.add(m[2]);
  }

  const domainTerms =
    source.match(
      /\b(?:polyethylene|microplastic|lactuca|sativa|lettuce|germination|germinate|root|concentration|polyethylene|participants?|survey|gpa|music|teenagers?)\b/g,
    ) ?? [];
  for (const t of domainTerms) keywords.add(t);

  return [...keywords];
}

const BIBLIOGRAPHY_HEADING_PATTERNS = [
  /^references\b/i,
  /^reference\s+list\b/i,
  /^reference\s+page\b/i,
  /^works?\s+cited\b/i,
  /^works?\s+referenced\b/i,
  /^bibliography\b/i,
  /^sources(?:\s+cited)?\b/i,
  /^literature\s+cited\b/i,
  /^citations\b/i,
];

function findBibliographyHeadingPosition(text: string): number {
  const lines = text.split("\n");
  let pos = 0;
  let last = -1;
  for (const line of lines) {
    if (isBibliographyHeadingLine(line)) last = pos;
    pos += line.length + 1;
  }
  return last;
}

function hasReferencesHeading(fullText: string): boolean {
  return (
    hasReferencesHeadingInDocument(fullText) ||
    findBibliographyHeadingPosition(fullText) >= 0
  );
}

function resolveReferencesSection(fullText: string): string {
  const fromHeading =
    extractLastSection(fullText, BIBLIOGRAPHY_HEADING_PATTERNS) ||
    extractSection(fullText, BIBLIOGRAPHY_HEADING_PATTERNS);

  if (fromHeading.trim().length > 100) return fromHeading;

  const refPos = findBibliographyHeadingPosition(fullText);
  if (refPos >= 0) return fullText.slice(refPos);

  if (detectTailBibliographyPattern(fullText)) {
    return fullText.slice(Math.floor(fullText.length * 0.75));
  }

  return fromHeading;
}

function isResultsTableMisclassifiedAsMethod(text: string): boolean {
  if (text.trim().length < 80) return false;
  if (
    /quasi-?experimental|self-paced\s+reading|volunteer\s+sampling|research\s+design|participants?\s+were\s+recruited/i.test(
      text,
    )
  ) {
    return false;
  }
  const numericTokens = (text.match(/\b\d{3,5}(?:\.\d+)?\b/g) ?? []).length;
  return (
    /Participant|Word Processing|Comprehension Score/i.test(text) &&
    numericTokens >= 8
  );
}

function resolveMethodsRegion(
  paperBody: string,
  methodSection: string,
  lastMethodHeadingPos: number,
): string {
  if (
    methodSection.trim().length > 80 &&
    !isResultsTableMisclassifiedAsMethod(methodSection)
  ) {
    return methodSection;
  }

  const fromHeading = extractSection(paperBody, [
    /^methods?\b/i,
    /^method\b/i,
    /^procedure\b/i,
    /^research\s+design\b/i,
  ]);
  if (fromHeading.trim().length > 40) return fromHeading;

  if (lastMethodHeadingPos >= 0) {
    const after = paperBody.slice(lastMethodHeadingPos);
    const endMatch = after.search(
      /\n(?:Results?|Data\s+Analysis|Findings|Discussion|Conclusion)\b/i,
    );
    const end =
      endMatch > 0 ? lastMethodHeadingPos + endMatch : paperBody.length;
    return paperBody.slice(lastMethodHeadingPos, end);
  }

  const inlineMethods = paperBody.match(
    /\bmethods?\s*:\s*[\s\S]{0,4000}/i,
  );
  if (inlineMethods) return inlineMethods[0];

  return paperBody.slice(0, Math.min(paperBody.length, 5000));
}

function buildResultsEvidenceRegion(
  paperBody: string,
  lastResultsHeadingPos: number,
): string {
  const chunks: string[] = [];
  if (lastResultsHeadingPos >= 0) {
    chunks.push(extractResultsRegion(paperBody, lastResultsHeadingPos));
  }
  chunks.push(extractSection(paperBody, [/^data\s+analysis\b/i]));
  chunks.push(extractSection(paperBody, [/^discussion\b/i]));
  return chunks.filter((c) => c.trim().length > 40).join("\n\n");
}

function extractGapRegion(paperBody: string, _literatureReview: string): string {
  const gapSection =
    extractSection(paperBody, [
      /^gap\s*:?\s*$/i,
      /^research\s+gap\s*:?\s*$/i,
      /^the\s+gap\s*:?\s*$/i,
      /^gap\s+in\s+the\s+literature\b/i,
      /^gap\s+in\s+the\s+body\s*:?\s*$/i,
      /^what\s+the\s+research\s+has\s+not\s+examined\b/i,
      /^what\s+research\s+has\s+not\s+examined\b/i,
      /^what\s+has\s+not\s+been\s+examined\b/i,
      /^what\s+has\s+not\s+been\s+studied\b/i,
      /^what\s+remains\s+unknown\b/i,
      /^what\s+we\s+do\s+not\s+know\b/i,
      /^what\s+is\s+missing\s+from\s+the\s+literature\b/i,
      /^what\s+is\s+missing\s+from\s+research\b/i,
      /^what\s+the\s+literature\s+has\s+not\s+addressed\b/i,
      /^where\s+research\s+falls\s+short\b/i,
      /^where\s+the\s+evidence\s+falls\s+short\b/i,
      /^where\s+the\s+literature\s+falls\s+short\b/i,
      /^where\s+gaps?\s+remain\b/i,
      /^remaining\s+gaps?\b/i,
      /^how\s+this\s+study\s+is\s+different\b/i,
      /^how\s+this\s+study\s+differs\b/i,
      /^what\s+makes\s+this\s+study\s+different\b/i,
      /^what\s+this\s+study\s+adds\b/i,
      /^what\s+this\s+study\s+contributes\b/i,
    ]) || extractSection(paperBody, [/^research\s+gap\b/i]);
  return gapSection.trim();
}

function extractResultsRegion(
  fullText: string,
  lastResultsHeadingPos: number,
): string {
  if (lastResultsHeadingPos < 0) return "";

  const after = fullText.slice(lastResultsHeadingPos);
  const endMatch = after.search(
    /\n(?:Discussion|Conclusion|Limitations|Implications|References|Works?\s+Cited|Work\s+Cited|Bibliography|Appendix)\b/i,
  );
  return endMatch > 0 ? after.slice(0, endMatch) : after;
}

/** Methodology through subsections (Materials, Procedure) until Results. */
function extractMethodRegion(
  fullText: string,
  lastMethodHeadingPos: number,
  lastResultsHeadingPos: number,
): string {
  if (lastMethodHeadingPos < 0) return "";
  const end =
    lastResultsHeadingPos > lastMethodHeadingPos
      ? lastResultsHeadingPos
      : fullText.length;
  return fullText.slice(lastMethodHeadingPos, end);
}

/** Eight definitive method elements (Section 8.2). */
export function countMethodElements(method: string): number {
  if (!method.trim() || method.trim().length < METHOD_CONTENT_MIN_CHARS) {
    return 0;
  }
  let n = 0;
  if (
    /\b(?:participants?|subjects?|sample\s+(?:of|size)|n\s*=\s*\d+|selection criteria|recruited|sampling strategy|inclusion criteria|exclusion criteria|snowball|purposive sampling|purposive sample|purposive subsample|criterion sampling|theoretical sampling|maximum variation sampling|convenience sampling|stratified sampling)\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (
    /\b(?:instrument|questionnaire|survey|apparatus|materials|scale|simulation|software|SPSS|NVivo|reliability|validity of)\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (
    /\b(?:first|second|then|next|finally|step \d|procedure|protocol|conducted|collected|^\s*[-•]\s)/im.test(
      method,
    )
  ) {
    n++;
  }
  if (
    /\b(?:ANOVA|t-test|chi-?square|regression|thematic coding|content analysis|correlation|descriptive statistics|inferential|Pearson)\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (
    /\b(?:from\s+\d{4}\s+to\s+\d{4}|between\s+\d{4}\s+and\s+\d{4}|across\s+(?:a\s+)?decade|longitudinal|over\s+\d+\s+years?)\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (
    /\b(?:for \d+|over \d+|during \d+|lasting \d+|\d+\s+(?:days?|weeks?|months?|hours?|minutes?))\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (/\([A-Z][a-zA-Z]+[^)]*\d{4}\)|\[[\d]+\]/.test(method)) n++;
  if (
    /\b(?:IRB|ethics|informed consent|anonym|confidential|no human subjects|IACUC)\b/i.test(
      method,
    ) ||
    !requiresHumanSubjectsEthics(method)
  ) {
    n++;
  }
  if (
    /\b(?:dependent variable|independent variable|outcome variable|IV|DV|measured|operationalized)\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (
    /\b(?:recorded|recording|logged|stored|spreadsheet|database|Google Form|survey platform|data (?:were|was) (?:entered|saved))\b/i.test(
      method,
    )
  ) {
    n++;
  }
  if (/\b(?:power analysis|a priori power)\b/i.test(method)) n++;
  if (/\b(?:randomiz|random assign)\b/i.test(method)) n++;
  if (/\b(?:blind|double-blind|single-blind)\b/i.test(method)) n++;
  if (/\b(?:control group|control condition)\b/i.test(method)) n++;
  if (/\b(?:pilot study|pilot test)\b/i.test(method)) n++;
  if (
    /\b(?:member checking|member check|inter-?rater reliability|inter-?rater agreement|Cohen'?s kappa|kappa\s*=|kappa coefficient|intra-?rater|audit trail|reflexivity|transferability|credibility|confirmability|saturation|theoretical saturation|data saturation)\b/i.test(
      method,
    )
  ) {
    n++;
  }
  return n;
}

const METHOD_DEFENSE_PHRASES =
  /\b(?:was\s+chosen\s+because|was\s+selected\s+because|is\s+appropriate\s+for|is\s+well-suited\s+to|allows\s+for|enables|following\s+the\s+approach\s+of|adapted\s+from|based\s+on\s+the\s+methodology\s+of|consistent\s+with|as\s+used\s+by|building\s+on\s+the\s+design\s+of|in\s+accordance\s+with|following\s+established\s+protocols|as\s+recommended\s+by|per\s+the\s+guidelines\s+of|because|therefore|chosen|selected|justify|defended|aligned|appropriate|since|as\s+noted|I\s+selected|I\s+chose|rationale|alternative)\b/i;

export const STRONG_LIMITATIONS_PATTERN =
  /\b(?:generaliz|replication|confound|inherent\s+limitation|alternative\s+explanation|ecological\s+validity|external\s+validity|internal\s+validity|construct\s+validity|measurement\s+invariance|selection\s+bias|response\s+bias|demand\s+characteristics|ceiling\s+effect|floor\s+effect|regression\s+to\s+the\s+mean|causal\s+inference|temporal\s+precedence|directionality|reverse\s+causation|third\s+variable|mediating\s+variable|moderating\s+variable|boundary\s+conditions|scope\s+conditions|transferability|trustworthiness|credibility\s+of\s+findings|limitations\s+of\s+the\s+conclusion|cannot\s+establish\s+causation|correlational\s+nature|cross-sectional\s+design\s+prevents|single-site\s+limitation|self-report\s+bias|social\s+desirability|observer\s+effect|Hawthorne\s+effect|attrition|sample\s+attrition|dropout|intent\s+to\s+treat|per\s+protocol|statistical\s+power|underpowered|Type\s+II\s+error|multiple\s+comparisons|alpha\s+inflation|faced\s+limitations|limitations\s+in\s+(?:its|the)|limitations\s+of\s+(?:a|the)|smaller\s+than\s+intended|sample\s+size|cannot\s+be\s+generalized|not\s+recorded)\b/i;

export function detectMethodDefended(methodSection: string, methodElements: number): boolean {
  if (methodSection.length < 80) return false;
  const hasCite =
    /\([A-Z][a-zA-Z]+[^)]*\d{4}\)|\[[\d]+\]/.test(methodSection) ||
    /\b[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*\(\d{4}\)/.test(methodSection) ||
    /\b(?:Leedy|Ormrod|PRISMA|IRB|Moustakas|Creswell)\b/i.test(methodSection);
  const hasDefensePhrase = METHOD_DEFENSE_PHRASES.test(methodSection);
  if (hasDefensePhrase && hasCite) return true;
  if ((hasDefensePhrase || hasCite) && methodElements >= 3) return true;
  if (methodElements >= 6 && methodSection.length >= 200) return true;
  return false;
}

function looksLikeSectionHeadingLine(line: string, pattern: RegExp): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 150 || !pattern.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 8) return false;
  if (/[.!?]\s*$/.test(trimmed) && trimmed.split(/\s+/).length > 3) return false;
  if (
    /^results?\b/i.test(trimmed) &&
    /\bresults?\s+(?:that|show|indicate|suggest|demonstrate|of\s+the|are|were|will|from)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  if (
    /^method(?:ology|s)?\b/i.test(trimmed) &&
    /\bmethod(?:ology|s)?\s+(?:that|was|were|is|are|will|used|shows)\b/i.test(trimmed)
  ) {
    return false;
  }
  return true;
}

function findLastHeadingPosition(text: string, pattern: RegExp): number {
  const lines = text.split("\n");
  let pos = 0;
  let last = -1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (looksLikeSectionHeadingLine(trimmed, pattern)) {
      last = pos;
    }
    pos += line.length + 1;
  }
  return last;
}

function hasAnySectionHeadings(fullText: string): boolean {
  const headingPatterns = [
    /^introduction\b/i,
    /^literature\s+review/i,
    /^method(?:ology|s)?\b/i,
    /^results?\b/i,
    /^data\s+analysis\b/i,
    /^discussion\b/i,
    /^question\b/i,
    /^research\s+question\b/i,
    /^references\b/i,
    /^works?\s+cited\b/i,
    /^work\s+cited\b/i,
    /^bibliography\b/i,
    /^\d+\.\s+[A-Z]/,
  ];
  const lines = fullText.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 150) continue;
    if (headingPatterns.some((p) => p.test(t))) return true;
  }
  return false;
}

function extractLastSection(text: string, headingPatterns: RegExp[]): string {
  const lines = text.split("\n");
  let lastStart = -1;
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 100) {
      pos += lines[i].length + 1;
      continue;
    }
    for (const pat of headingPatterns) {
      if (pat.test(line)) {
        lastStart = pos;
        break;
      }
    }
    pos += lines[i].length + 1;
  }
  if (lastStart < 0) return "";
  const rest = text.slice(lastStart);
  const nextHeading = rest
    .slice(100)
    .search(/\n[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s*\n/);
  return nextHeading > 0 ? rest.slice(0, nextHeading + 100) : rest;
}

export function collectEvidence(input: string | DocumentPartition): PaperEvidence {
  const partition: DocumentPartition =
    typeof input === "string" ? prepareGradingInput(input).partition : input;
  const cleaned = stripBracketComments(stripWordCountLines(partition.preparedText));
  const zones = partition;
  const paperBody = zones.paperBody;
  const wordCount = zones.bodyWordCount;
  const fullDocumentText = zones.fullDocument;
  const boundaryWordCountFlags = buildBoundaryWordCountFlags(zones);

  const bodyFirst30 = firstPercent(paperBody, 0.3);
  const regions = identifyFunctionalRegions(paperBody);
  let introRegion =
    regions.introRegion.trim() || computeIntroWindow(paperBody);
  const introRegionWords = introRegion.split(/\s+/).filter(Boolean).length;
  const focusIntroWindow =
    introRegionWords < 100
      ? paperBody
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 1500)
          .join(" ")
      : introRegion;

  const rqCandidates = extractResearchQuestionsFromPaper(paperBody);
  const researchQuestions = selectBestResearchQuestion(rqCandidates);
  const researchQuestionText = researchQuestions.join(" ");
  const highlySpecificFocus = detectHighlySpecificFocus(
    focusIntroWindow,
    researchQuestionText,
  );
  const focusSpecificityScore = computeFocusSpecificityScore(
    focusIntroWindow,
    researchQuestionText,
  );
  const exploratoryFramingOnly =
    detectExploratoryFraming(introRegion) && researchQuestions.length === 0;
  const hypothesisOnly = detectHypothesisOnly(
    bodyFirst30,
    researchQuestions.length > 0,
  );
  const explicitNoDataCollected = detectExplicitNoDataCollected(paperBody);
  const fabricatedDataAdmission = detectFabricatedDataAdmission(paperBody);

  const literatureReview =
    regions.literatureReview.trim() ||
    extractSection(paperBody, [
      /^literature\s+review/i,
      /^review\s+of\s+literature/i,
      /^related\s+work/i,
      /^background/i,
    ]);

  const lastMethodHeadingPos = findLastHeadingPosition(paperBody, /^method(?:ology|s)?\b/i);
  const lastResultsHeadingPos = findLastHeadingPosition(paperBody, /^results?\b/i);
  const lastFindingsHeadingPos = findLastHeadingPosition(paperBody, /^findings\b/i);

  const methodRegionFromHeadings = extractMethodRegion(
    paperBody,
    lastMethodHeadingPos,
    lastResultsHeadingPos,
  );
  let methodSection =
    regions.method.trim() ||
    methodRegionFromHeadings ||
    extractLastSection(paperBody, [/^method(?:ology|s)?\b/i]) ||
    extractSection(paperBody, [
      /^method(?:ology|s)?\b/i,
      /^approach\b/i,
      /^procedure\b/i,
      /^research\s+design/i,
    ]);
  if (isResultsTableMisclassifiedAsMethod(methodSection)) {
    methodSection =
      methodRegionFromHeadings ||
      extractSection(paperBody, [/^method(?:ology|s)?\b/i]) ||
      methodSection;
  }

  const resultsSectionExtracted =
    regions.results.trim() ||
    buildResultsEvidenceRegion(paperBody, lastResultsHeadingPos);

  const limitationsSection = regions.limitations.trim();
  const implicationsSection = regions.implications.trim();
  const conclusionSection =
    regions.conclusion.trim() ||
    extractSection(paperBody, [/^conclusion\b/i, /^concluding\b/i]);
  const referencesSection =
    zones.referencesZone.trim() ||
    resolveReferencesSection(fullDocumentText);
  const bibScanText =
    referencesSection.trim() ||
    fullDocumentText.slice(Math.floor(fullDocumentText.length * 0.7));
  const tailApaBibliography = detectApaReferencesInLast30Percent(bibScanText);
  const tailBibliographyPattern = tailApaBibliography.detected;

  const citationAnalysis = analyzeCitations(
    paperBody,
    literatureReview,
    referencesSection,
  );
  const bibliographyEntryCount = Math.max(
    countBibliographyEntries(referencesSection),
    tailApaBibliography.entryCount,
  );
  const inTextCitationCount = citationAnalysis.uniqueCount;
  const chicagoFootnoteStyle = detectChicagoFootnoteStyle(paperBody);
  const effectiveCitationCount =
    chicagoFootnoteStyle ||
    (tailBibliographyPattern &&
      bibliographyEntryCount >= 8 &&
      inTextCitationCount < 6)
      ? Math.max(inTextCitationCount, bibliographyEntryCount)
      : inTextCitationCount;
  const scholarlyUndercountLikely =
    (zones.hasReferencesSection ||
      referencesSection.length > 100 ||
      tailBibliographyPattern) &&
    bibliographyEntryCount >= 8 &&
    effectiveCitationCount < 6;
  const gapRegion =
    regions.gap.trim() || extractGapRegion(paperBody, literatureReview);
  const gapSentences = findGapSentences(gapRegion || introRegion);
  const litForSynthesis = literatureReview.trim() || introRegion;
  const theoreticalFrameworkSynthesis =
    detectTheoreticalFrameworkSynthesis(litForSynthesis);
  const gapFromAbstractOnly =
    findGapSentences(litForSynthesis).length === 0 &&
    findGapSentences(gapRegion || introRegion).length === 0 &&
    findGapSentences(paperBody.slice(0, 500)).length > 0;
  const INTRO_GAP_PHRASE_PATTERNS = [
    /\black\s+of\s+research\b/i,
    /\bhas\s+been\s+overlooked\b/i,
    /\bnoticeable\s+lack\b/i,
    /\blimited\s+research\s+on\b/i,
    /\bno\s+research\s+has\b/i,
    /\bhas\s+not\s+been\s+examined\b/i,
    /\bare\s+not\s+accessible\s+or\s+documented\b/i,
    /\baddressing\s+this\s+gap\b/i,
    /\bclear\s+gap\s+in\s+(?:our\s+)?understanding\b/i,
  ];

  function countIntroGapPhrases(text: string): number {
    let n = 0;
    for (const pattern of INTRO_GAP_PHRASE_PATTERNS) {
      if (pattern.test(text)) n++;
    }
    return n;
  }
  let gapQualityResult = evaluateGapQuality(literatureReview, introRegion, {
    dedicatedGapRegion: gapRegion || undefined,
    fullPaperBody: paperBody,
    humanitiesPaper: theoreticalFrameworkSynthesis,
    abstractFallbackText: (() => {
      if (
        findGapSentences(litForSynthesis).length > 0 ||
        findGapSentences(gapRegion || introRegion).length > 0
      ) {
        return undefined;
      }
      const bodyGaps = findGapSentences(paperBody).filter(
        (s) => !isCollegeBoardScoringRubricProse(s),
      );
      if (bodyGaps.length > 0) return bodyGaps.join(" ");
      const introSlice = paperBody.slice(0, 500);
      return isCollegeBoardScoringRubricProse(introSlice) ? undefined : introSlice;
    })(),
  });

  if (gapQualityResult.quality === "none" && literatureReview.trim().split(/\s+/).length >= 500) {
    gapQualityResult = evaluateGapQuality(literatureReview, introRegion, {
      dedicatedGapRegion: gapRegion || undefined,
      fullPaperBody: paperBody,
      humanitiesPaper: theoreticalFrameworkSynthesis,
    });
  }

  const litWordCountForGap = literatureReview.trim().split(/\s+/).filter(Boolean).length;
  if (gapQualityResult.quality === "none" && litWordCountForGap >= 500) {
    const bodyGapSentences = findGapSentences(paperBody);
    if (bodyGapSentences.length > 0) {
      gapQualityResult = evaluateGapQuality(literatureReview, introRegion, {
        dedicatedGapRegion: bodyGapSentences.join(" "),
        fullPaperBody: paperBody,
        humanitiesPaper: theoreticalFrameworkSynthesis,
      });
    }
  }

  if (
    gapQualityResult.quality === "none" &&
    introRegionWords >= 400 &&
    countIntroGapPhrases(introRegion) >= 2
  ) {
    gapQualityResult = evaluateGapQuality("", introRegion, {
      humanitiesPaper: theoreticalFrameworkSynthesis,
    });
  }
  const demonstratedGapSignals = gapQualityResult.demonstratedSignals;
  const crossSectionSynthesis = detectCrossSectionSynthesis(
    litForSynthesis,
    gapQualityResult.gapText,
  );
  const humanitiesDemonstratedGap =
    theoreticalFrameworkSynthesis &&
    effectiveCitationCount >= 10 &&
    gapNamesMultipleResearchThreads(gapQualityResult.gapText);
  const synthesisContrastGap = Boolean(gapQualityResult.synthesisContrastFallback);
  const borderlineDemonstratedGap =
    crossSectionSynthesis &&
    demonstratedGapSignals >= 4 &&
    gapQualityResult.quality === "asserted";
  let gapQuality: GapQuality = gapQualityResult.quality;
  if (humanitiesDemonstratedGap) gapQuality = "demonstrated";
  else if (borderlineDemonstratedGap) gapQuality = "demonstrated";
  else if (
    crossSectionSynthesis &&
    gapQualityResult.quality === "asserted" &&
    demonstratedGapSignals >= 4
  ) {
    gapQuality = "demonstrated";
  }
  const synthesisQuality = evaluateSynthesisQuality(
    literatureReview.trim(),
    introRegion,
  );
  const methodAndResultsText = [methodSection, resultsSectionExtracted]
    .filter((s) => s.trim().length > 0)
    .join("\n\n");
  const methodExecution = detectMethodExecution(paperBody, {
    methodAndResultsText,
  });

  const discussionSection =
    regions.discussion.trim() || extractSection(paperBody, [/^discussion\b/i]);
  const nonSignificantOnlyFinding = detectNonSignificantOnlyFinding(
    resultsSectionExtracted,
    discussionSection,
  );
  const plannedComponentNotExecuted = detectPlannedComponentNotExecuted(paperBody);

  let resultsBody = expandResultsBodyForSignals(
    resultsSectionExtracted,
    discussionSection,
  );
  const methodsRegion = resolveMethodsRegion(
    paperBody,
    methodSection,
    lastMethodHeadingPos,
  );
  const resultsEvidenceWide = `${resultsBody}\n${discussionSection}`;
  const contentAnalysisExecuted = detectContentAnalysisExecuted(
    methodsRegion,
    resultsEvidenceWide,
    paperBody,
  );
  const correlationStudyExecuted = detectCorrelationStudyExecuted(
    methodsRegion,
    resultsEvidenceWide,
    paperBody,
  );
  const contradictoryFindingHandled = detectContradictoryFindingHandled(
    resultsBody,
    discussionSection,
  );
  const quasiEmpiricalCollection =
    /quasi-?experimental/i.test(methodsRegion) &&
    /participants/i.test(methodsRegion);
  const metaStudentData = detectMetaAnalysisStudentData(paperBody, resultsBody);
  const metaAnalysisCollection =
    metaStudentData.exempt || isMetaAnalysisMethod(methodsRegion);
  const methodCollectionEvidence =
    methodShowsDataCollection(methodsRegion) ||
    contentAnalysisExecuted ||
    quasiEmpiricalCollection ||
    metaAnalysisCollection;
  let literatureReviewOnlyMethod = detectLiteratureReviewOnlyMethod(
    methodSection,
    paperBody,
  );
  if (detectPrismaWithoutExecution(methodSection)) {
    literatureReviewOnlyMethod = true;
  }
  const unverifiableLiteratureSynthesisMethod =
    detectUnverifiableLiteratureSynthesisMethod(methodSection);
  const simulationEmpiricalResults = detectSimulationEmpiricalResults(
    resultsBody,
    methodSection,
  );
  const methodBlock = regions.blocks.find((b) => b.role === "method");
  const resultsBlock = regions.blocks.find((b) => b.role === "results");
  const resultsAfterMethodByBlock =
    Boolean(methodBlock && resultsBlock && resultsBlock.start > methodBlock.start);

  const hasResultsSection =
    regions.hasResultsByContent &&
    resultsSectionExtracted.trim().length > 50;

  const resultsWordAfterMethod =
    resultsAfterMethodByBlock ||
    (lastMethodHeadingPos >= 0 &&
      (lastResultsHeadingPos > lastMethodHeadingPos ||
        lastFindingsHeadingPos > lastMethodHeadingPos));

  const inferentialStatsPresent =
    /\b(?:ANOVA|t-test|F\s*\(|regression|chi-?square|p\s*[<=>]\s*0?\.0?5|r\s*=\s*[\d.]+,\s*p)\b/i.test(
      `${resultsBody}\n${methodSection}`,
    );
  let studentResultsSignals = countStudentResultsSignals(resultsBody);
  if (metaStudentData.exempt) {
    studentResultsSignals += metaStudentData.signalBonus;
  }
  const studentGraphSynthesis = detectStudentGraphSynthesis(paperBody);
  if (studentGraphSynthesis.detected) {
    studentResultsSignals += studentGraphSynthesis.bonusSignals;
  }
  const secondaryData = detectSecondaryDataAnalysisExecuted(
    paperBody,
    `${resultsBody}\n${discussionSection}`,
  );
  if (secondaryData.detected) {
    studentResultsSignals += secondaryData.signalBonus;
  }
  studentResultsSignals += countInferentialEvidenceSignals(
    `${resultsBody}\n${discussionSection}`,
  );
  studentResultsSignals += countQualitativeInterviewSignals(
    `${resultsBody}\n${discussionSection}\n${methodSection}`,
  );
  if (detectQuasiExperimentalExecuted(paperBody)) {
    studentResultsSignals = Math.max(studentResultsSignals, 4);
  }
  if (contentAnalysisExecuted || correlationStudyExecuted) {
    studentResultsSignals = Math.max(
      studentResultsSignals,
      countStudentResultsSignals(resultsEvidenceWide),
    );
  }
  if (
    inferentialStatsPresent ||
    contentAnalysisExecuted ||
    /\bchi-?squared?\b/i.test(resultsEvidenceWide)
  ) {
    if (resultsSectionExtracted.trim().length < 300 || contentAnalysisExecuted) {
      studentResultsSignals += countInferentialFallbackSignals(
        `${resultsEvidenceWide}\n${paperBody}`,
      );
    }
  }
  const resultsSignals = studentResultsSignals;
  const descriptiveOnlyResults =
    resultsSignals > 0 && !inferentialStatsPresent && !hasQualitativeResultsCollected(resultsBody, "");
  const statsHypothesisContradiction = detectStatsHypothesisContradiction(
    resultsSectionExtracted,
    conclusionSection,
  );

  const litRegion = literatureReview.trim() || introRegion;
  const litWords = Math.max(litRegion.split(/\s+/).length, 1);
  const parentheticalInLit = countParentheticalInText(litRegion);
  const sparseParentheticalInLit =
    bibliographyEntryCount >= 8 && parentheticalInLit / litWords < 1 / 150;
  const citationStuffing =
    bibliographyEntryCount >= 15 && citationAnalysis.uniqueCount <= 5;

  const humanSubjectsNoEthics =
    requiresHumanSubjectsEthics(methodSection) &&
    !/\b(?:IRB|ethics|informed consent|ethical|no human subjects)\b/i.test(
      methodSection,
    );
  const proceduralSequenceMissing =
    countMethodElements(methodSection) >= 3 &&
    !/\b(?:first|second|then|next|finally|step \d|procedure|protocol)\b/i.test(
      methodSection,
    );
  let methodElements = Math.max(
    countMethodElements(methodSection),
    countMethodElements(methodsRegion),
    countMethodElements(methodRegionFromHeadings),
  );
  const metaMethodRegion =
    methodsRegion.length > methodSection.length ? methodsRegion : methodSection;
  const metaMethodElements = countMetaAnalysisMethodElements(
    metaMethodRegion,
    resultsBody,
  );
  if (metaMethodElements > 0 && isMetaAnalysisMethod(metaMethodRegion)) {
    methodElements = metaMethodElements;
  } else if (metaMethodElements > 0) {
    methodElements = Math.max(methodElements, metaMethodElements);
  }
  if (proceduralSequenceMissing && methodElements > 0) {
    methodElements -= 1;
  }
  if (secondaryData.detected) {
    literatureReviewOnlyMethod = false;
  }
  if (
    !literatureReviewOnlyMethod &&
    (detectExplicitLiteratureReviewIntro(introRegion || paperBody.slice(0, 2500)) ||
      /\bthis\s+paper\s+will\s+explore\b/i.test(paperBody.slice(0, 2000))) &&
    !methodCollectionEvidence &&
    methodElements < 2 &&
    !hasResultsSection &&
    studentResultsSignals < 2
  ) {
    literatureReviewOnlyMethod = true;
  }
  const functionalMethodWords = regions.method.trim().split(/\s+/).filter(Boolean).length;
  let methodDefendedSource =
    methodsRegion.length > methodSection.length ? methodsRegion : methodSection;
  if (functionalMethodWords < 300) {
    const candidates = [methodSection, methodsRegion, regions.method.trim()].filter(
      (s) => s.length > 0,
    );
    methodDefendedSource = candidates.reduce((a, b) => (b.length > a.length ? b : a), "");
  }
  const methodDefended = detectMethodDefended(methodDefendedSource, methodElements);
  const rigorousSimulationMethod = detectRigorousSimulationMethod(
    methodSection,
    resultsBody,
  );
  const priorAuthorResultsRatio = computePriorAuthorResultsRatio(resultsBody);
  const functionalRegionsLocated =
    regions.blocks.some((b) =>
      [
        "method",
        "results",
        "literatureReview",
        "conclusion",
        "gap",
        "discussion",
      ].includes(b.role),
    ) ||
    regions.hasMethodByContent ||
    regions.hasResultsByContent;
  const missingReferencedAppendix =
    /\b(?:see|refer\s+to|shown\s+in)\s+(?:Appendix|the\s+appendix)\b/i.test(
      paperBody,
    ) && zones.appendixZone.trim().length < 80;
  const usesFootnotesExtensively =
    (paperBody.match(/\[\d+\]/g) ?? []).length >= 8;
  const unusualSectionOrder = detectUnusualSectionOrder(regions);
  const plannedMethodResult = detectPlannedMethod(paperBody, methodSection);
  const legacyFutureInMethod =
    (methodSection.match(/\b(?:will|would)\s+(?:analyze|conduct|collect|survey)\b/gi) ?? [])
      .length >= 2 &&
    !/\b(?:conducted|collected|administered|were\s+surveyed)\b/i.test(methodSection);
  const futureTenseMethodDominant =
    plannedMethodResult.plannedMethodDominant || legacyFutureInMethod;

  const visualEvidence = analyzeVisualEvidence(paperBody, researchQuestionText);
  const unseenVisual = analyzeUnseenVisualContent(paperBody);
  const visualInStudentWork = analyzeVisualEvidence(
    `${methodSection}\n${resultsBody}`,
    researchQuestionText,
  );

  const studentCollectedData =
    /\b(?:I|we|our)\s+(?:conducted|collected|surveyed|interviewed|administered|gathered|analyzed)\b/i.test(
      methodSection,
    ) && /\b\d+\b/.test(methodSection);

  const hasDataSignals =
    !explicitNoDataCollected &&
    !literatureReviewOnlyMethod &&
    !detectHypotheticalResults(paperBody) &&
    (methodCollectionEvidence ||
      contentAnalysisExecuted ||
      correlationStudyExecuted) &&
    (studentResultsSignals > 0 ||
      contentAnalysisExecuted ||
      correlationStudyExecuted ||
      (visualInStudentWork.inTextDiscussionCount > 0 &&
        unseenVisual.creditsStudentDataFromText) ||
      (hasResultsSection && studentResultsSignals > 0));

  const methodHasResultsAfter =
    methodSection.length > 50 &&
    (hasResultsSection ||
      resultsWordAfterMethod ||
      unseenVisual.creditsStudentDataFromText);

  const distinctStatMethods = countDistinctStatisticalMethods(
    `${methodSection}\n${resultsBody}`,
  );

  const lim = limitationsSection || "";
  const limitationsRegion = [
    lim,
    discussionSection,
    conclusionSection,
  ]
    .filter(Boolean)
    .join("\n");
  const limitationsStrong = STRONG_LIMITATIONS_PATTERN.test(limitationsRegion);
  const limitationsWeakOnly =
    /\b(?:time constraint|access to|small sample)\b/i.test(lim) &&
    !limitationsStrong;

  const impl = implicationsSection || conclusionSection;
  const implicationsStrong =
    (/\b(?:educators|policymakers|researchers|clinicians|practitioners)\b/i.test(
      impl,
    ) &&
      /\b(?:prior research|literature|as noted by|\(\w+,\s*\d{4}\))/i.test(impl)) ||
    /\b(?:this study can help|these findings suggest that coaches|teachers designing|administrators can use|practitioners should|parents and teachers|school counselors|athletic trainers|curriculum designers|program developers|health professionals|policy makers|future researchers should|this research adds to the field of|this contributes to the understanding of|this has practical implications for)\b/i.test(
      impl,
    );
  const implicationsMissing = !impl.trim() || impl.length < 80;
  const weakImplications = detectWeakImplications(impl);
  const hasDetectedSectionHeadings = functionalRegionsLocated;
  const strongEmpiricalOverride = false;

  const apa = (paperBody.match(/\([A-Z][a-zA-Z]+,?\s*\d{4}/g) ?? []).length;
  const numbered = (paperBody.match(/\[\d+\]/g) ?? []).length;
  const styleInconsistent = apa >= 3 && numbered >= 3;

  const evidence: PaperEvidence = {
    wordCount,
    fullDocumentWordCount: zones.fullDocumentWordCount,
    statedWordCount: zones.statedWordCount,
    boundaryWordCountFlags: [
      ...partition.pipelineFlags,
      ...boundaryWordCountFlags,
    ],
    fullText: paperBody,
    fullDocumentText,
    referencesZone: referencesSection,
    appendixZone: zones.appendixZone,
    hasReferencesSection: zones.hasReferencesSection,
    appendixCount: zones.appendixCount,
    appendixReferencedInBody: zones.appendixReferencedInBody,
    unusualDocumentStructure: zones.unusualDocumentStructure,
    inTextCitationCount,
    introRegion,
    literatureReview,
    methodSection,
    resultsSection: resultsBody,
    limitationsSection: lim,
    implicationsSection: impl,
    conclusionSection,
    referencesSection,
    researchQuestions,
    researchQuestionText,
    citationCount: effectiveCitationCount,
    multiCitationSentences: citationAnalysis.multiCiteSentenceCount,
    gapSentences,
    methodElements,
    methodHasResultsAfter,
    hasResultsSection,
    resultsWordAfterMethod,
    hasDataSignals,
    resultsSignals,
    limitationsStrong,
    limitationsWeakOnly,
    implicationsStrong,
    implicationsMissing,
    citationStyle: detectCitationStyle(
      `${paperBody}\n${referencesSection.slice(0, 2000)}`,
    ),
    styleInconsistent,
    hasBibliography:
      zones.hasReferencesSection ||
      tailBibliographyPattern ||
      referencesSection.length > 100 ||
      tailApaBibliography.detected,
    avgSentenceLength: averageSentenceLength(paperBody),
    distinctStatMethods,
    visualEvidence,
    unseenVisual,
    explicitNoDataCollected,
    highlySpecificFocus,
    bibliographyEntryCount,
    scholarlyUndercountLikely,
    nonSignificantOnlyFinding,
    plannedComponentNotExecuted,
    gapQuality,
    synthesisIsolationCount: synthesisQuality.isolationPatternCount,
    methodNotExecutedHard:
      methodExecution.notExecutedHard || explicitNoDataCollected,
    methodPartialExecution: (() => {
      let partial =
        methodExecution.partialExecution && !methodExecution.notExecutedHard;
      if (
        partial &&
        !explicitNoDataCollected &&
        !methodExecution.notExecutedHard &&
        studentResultsSignals >= 5
      ) {
        partial = false;
      }
      return partial;
    })(),
    crossSectionSynthesis,
    theoreticalFrameworkSynthesis,
    humanitiesDemonstratedGap,
    exploratoryFramingOnly,
    hypothesisOnly,
    literatureReviewOnlyMethod,
    unverifiableLiteratureSynthesisMethod,
    simulationEmpiricalResults,
    methodCollectionEvidence,
    metaAnalysisStudentDataExempt: metaStudentData.exempt,
    studentResultsSignals,
    demonstratedGapSignals,
    borderlineDemonstratedGap,
    synthesisContrastGap,
    weakImplications,
    methodDefended,
    humanSubjectsNoEthics,
    proceduralSequenceMissing,
    futureTenseMethodDominant,
    descriptiveOnlyResults,
    fabricatedDataAdmission,
    sparseParentheticalInLit,
    citationStuffing,
    hasDetectedSectionHeadings,
    inferentialStatsPresent,
    strongEmpiricalOverride,
    functionalRegionsLocated,
    priorAuthorResultsRatio,
    rigorousSimulationMethod,
    missingReferencedAppendix,
    usesFootnotesExtensively,
    chicagoFootnoteStyle,
    focusSpecificityScore,
    gapAbstractFallback: gapFromAbstractOnly,
    unusualSectionOrder,
    statsHypothesisContradiction,
    highScoringPaperDetected: false,
    contentAnalysisExecuted,
    correlationStudyExecuted,
    contradictoryFindingHandled,
    secondaryDataAnalysisExempt: secondaryData.detected,
  };
  evidence.highScoringPaperDetected = detectHighScoringPaper(evidence);
  return evidence;
}

export function questionConsistency(
  ev: PaperEvidence,
): "none" | "drift" | "consistent" | "narrow" {
  if (ev.researchQuestions.length === 0 && !ev.highlySpecificFocus) return "none";

  const keywords = extractFocusKeywords(
    ev.researchQuestions.join(" ") || ev.researchQuestionText,
    ev.introRegion,
  );
  if (keywords.length === 0) return ev.highlySpecificFocus ? "consistent" : "none";

  const method = ev.methodSection.toLowerCase();
  const results = ev.resultsSection.toLowerCase();
  const conclusion = (
    ev.conclusionSection || ev.fullText.slice(-4000)
  ).toLowerCase();
  const methodHits = keywords.filter((t) => method.includes(t)).length;
  const conclusionHits = keywords.filter((t) => conclusion.includes(t)).length;
  const resultsHits = keywords.filter((t) => results.includes(t)).length;
  const ratio =
    (methodHits + conclusionHits + resultsHits * 0.5) / keywords.length;

  if (ev.highlySpecificFocus && ratio >= CONSISTENCY_DRIFT_THRESHOLD) return "narrow";
  if (ratio < CONSISTENCY_DRIFT_THRESHOLD) return "drift";
  const rq = ev.researchQuestions.join(" ").toLowerCase();
  const hasNamedParams =
    /\b(?:between|among|effect of|impact of|relationship|to what extent|concentration)\b/i.test(
      rq,
    ) && keywords.length >= 6;
  if (hasNamedParams && ratio >= 0.35) return "narrow";
  if (ratio >= CONSISTENCY_DRIFT_THRESHOLD + 0.05) return "consistent";
  return "drift";
}

/** BUG FIX 2: no results section, no results after method, no data signals. */
export function lacksStudentGeneratedData(ev: PaperEvidence): boolean {
  if (detectStudentGraphSynthesis(ev.fullText).detected) {
    return false;
  }
  if (ev.metaAnalysisStudentDataExempt) {
    return false;
  }
  if (
    !ev.methodNotExecutedHard &&
    !ev.explicitNoDataCollected &&
    ev.hasResultsSection &&
    ev.studentResultsSignals >= 2
  ) {
    return false;
  }
  if (ev.contentAnalysisExecuted && ev.studentResultsSignals >= 2) {
    return false;
  }
  if (ev.correlationStudyExecuted && ev.studentResultsSignals >= 1) {
    return false;
  }
  if (ev.secondaryDataAnalysisExempt) {
    return false;
  }
  if (ev.simulationEmpiricalResults && ev.studentResultsSignals > 0) {
    return false;
  }
  if (
    ev.methodNotExecutedHard ||
    ev.explicitNoDataCollected ||
    ev.literatureReviewOnlyMethod ||
    ev.fabricatedDataAdmission
  ) {
    return true;
  }
  if (
    ev.unseenVisual.creditsStudentDataFromText &&
    ev.unseenVisual.hasAnalyticalVisualProse
  ) {
    return false;
  }
  if (!ev.methodCollectionEvidence) return true;
  if (ev.studentResultsSignals <= 0 && !ev.unseenVisual.creditsStudentDataFromText) {
    return true;
  }
  return !ev.hasDataSignals;
}
