import { countWords } from "@/lib/grader/text";
import { identifyIwaRegions } from "@/lib/seminar/seminarFunctionalRegions";
import { countSynthesisIsolation } from "@/lib/seminar/seminarSynthesis";
import {
  detectStimulusYear,
  stimulusAuthorsInText,
} from "@/lib/seminar/seminarStimulus";
import {
  clearBibliographyAnalysisCache,
  countBibliographyEntries,
  countCommentaryDepth,
  countSubstantiatedRqContext,
  extractInTextAuthors,
  getBibliographyAnalysis,
} from "@/lib/seminar/seminarBibliographyAnalysis";
import {
  DESCRIPTIVE_LINKING_PATTERNS,
  EVALUATIVE_LINKING_PATTERNS,
  IRR_BIAS_ACKNOWLEDGMENT_PATTERNS,
  IRR_GENERAL_CONNECTION_PATTERNS,
  IRR_MECHANISM_PATTERNS,
  IRR_MULTI_SOURCE_SYNTHESIS_PATTERNS,
  IRR_SUMMARY_ONLY_PATTERNS,
  ROW2_ZERO_CONTEXT_PATTERNS,
} from "@/lib/seminar/seminarCalibrationPatterns";
import {
  computeIrrCredentialScore,
  computeIrrPerspectiveSynthesisScore,
  countMechanismAfterCitations,
} from "@/lib/seminar/seminarIrrSignals";
import {
  hasNamedStimulusInBody,
  scoreStimulusIntegrationInBody,
} from "@/lib/seminar/seminarStimulusBody";
import { buildBodyTextIndex } from "@/lib/seminar/seminarBodyIndex";
import {
  buildDeepCalibrationSignals,
  linkingPatternScanText,
} from "@/lib/seminar/seminarDeepCalibration";
import { runWithPatternScanCache } from "@/lib/seminar/patternScanCache";
import { analyzeRow1SourceIntegration } from "@/lib/seminar/row1SourceIntegration";
import { EMPTY_ROW1_INTEGRATION_QUALITY } from "@/lib/seminar/row1IntegrationQuality";
import {
  detectDistributedThesis,
  detectThesis,
} from "@/lib/seminar/seminarThesisDetection";
import {
  partitionSeminarText,
  stripSeminarBoilerplate,
} from "@/lib/seminar/seminarBodyPrep";
import {
  countConcessiveRebuttalLinking,
  detectCalibration324Signals,
  detectRqContextLinkInOpening,
  detectSignificanceFraming,
  getOpeningSubstantiveParagraph,
  hasEvaluativeConcession,
  stripFigureCaptionLines,
} from "@/lib/seminar/seminarCalibration324";
import {
  detectIsMlaCitationFormat,
  extractInTextCitations,
} from "@/lib/seminar/seminarInTextCitations";
import { countMethodologyCategories } from "@/lib/seminar/seminarMethodology";
export { partitionSeminarText } from "@/lib/seminar/seminarBodyPrep";
import type { IwaGradeOptions, SeminarEvidence } from "@/lib/seminar/seminarTypes";
import {
  BIBLIOGRAPHY_HEADING_PATTERNS,
  COLLOQUIAL_PATTERNS,
  COMPARISON_PATTERNS,
  EVALUATIVE_PERSPECTIVE_PATTERNS,
  GROUP_NOUN_PERSPECTIVE,
  IRR_BIAS_EVALUATION_PATTERNS,
  IRR_ORGANIZATIONAL_PREVIEW,
  JOURNALISTIC_SOURCE_PATTERNS,
  NO_ARGUMENT_PATTERNS,
  PERSONAL_ANECDOTE_PATTERNS,
  RESEARCH_QUESTION_LINE,
  STATISTICAL_URGENCY_PATTERNS,
  STUDENT_COMMENTARY_PATTERNS,
  TANGENTIAL_SOURCE_PATTERNS,
  VAGUE_IMPORTANCE_PATTERNS,
  commentaryAfterCitation,
  countBeyondStimulusWellVetted,
  countDistinctPatternHits,
  countNamedPerspectives,
  countPatternHits,
  countPatternHitsInSlice,
  countPatternHitsWithCombined,
  buildCombinedRegexChunks,
  combinedChunksMatch,
  IRR_ACADEMIC_IRR_REGISTER_SIGNALS,
  IRR_ADEQUATE_CONTEXT_SIGNALS,
  IRR_INFORMAL_IRR_REGISTER_SIGNALS,
  IRR_STRONG_CONTEXT_SIGNALS,
  IRR_WEAK_CONTEXT_SIGNALS,
  countPerspectivesWithPosition,
  detectBestStimulusIntegration,
  estimateQuoteProportion,
  extractAuthorCitations,
  extractResearchQuestionKeywords,
  rqContextLinkInOpening,
  expandBibliographyLines,
  urlOnlyBibliography,
} from "@/lib/seminar/seminarPatterns";

const REF_HEADING =
  /^(?:references?|works\s+cited|bibliography|sources|works consulted|literature cited)\s*$/im;

const EVALUATIVE_LINKING_COMBINED = buildCombinedRegexChunks(
  EVALUATIVE_LINKING_PATTERNS,
);

const BIB_HEADING_COMBINED = buildCombinedRegexChunks(
  BIBLIOGRAPHY_HEADING_PATTERNS,
);

const CONTEXT_SIGNALS = [
  /\b\d{4}\b/,
  /\b\d+(?:\.\d+)?%\b/,
  /\b(?:United States|U\.S\.|courtroom|jury|orthopedic|burnout)\b/i,
  /\b(?:CDC|WHO|NIH|FBI|Innocence Project|Guardian)\b/i,
  /\b(?:million|billion|\$\d)/i,
  /\b(?:pandemic|COVID|wrongful conviction|eyewitness)\b/i,
  /\b(?:increasing|escalating|skyrocketed)\b/i,
];

const WELL_VETTED = [
  /\bJournal of\b/i,
  /\bProceedings of\b/i,
  /\bdoi\.org\b/i,
  /\b(?:professor|Ph\.?D|Dr\.)\b/i,
  /\bUniversity\b/i,
  /\bpeer-?reviewed\b/i,
];

const JOURNALISTIC = [
  /\b(?:National Geographic|New York Times|Guardian|Forbes|Time Magazine)\b/i,
];

const AUTHOR_YEAR = /\b[A-Z][a-z]+(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?\s*\(\d{4}[a-z]?\)/g;
const PAREN_CITE =
  /\([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-zA-Z'&]+)?,?\s*\d{4}[a-z]?(?:,\s*pp?\.\s*[\d–-]+)?\)/g;
const ATTRIBUTIVE =
  /\b(?:according to|as (?:noted|explained|argued|found) by|[A-Z][a-z]+ argues that|[A-Z][a-z]+ notes that)\b/gi;

const THESIS =
  /(?:this (?:paper|essay) argues|I argue|the argument (?:is|that)|must be considered|will .{5,40} improve|nostalgia improves|juror education|wrongful conviction|most optimal solution|modal shift|the United States should|is essential to|therefore, the)/i;

const SUMMARY_ONLY =
  /(?:there are many perspectives|three ways, for example|here are three ways)/i;

const REASONING =
  /\b(?:because|in order to|which explains why|as a result of|demonstrates that|builds their argument)\b/gi;

const CREDENTIAL =
  /\b(?:professor|researcher|Ph\.?D|Dr\.|Associate Professor|Fellow of|at (?:the )?University)\b/gi;

const PURPOSEFUL_ANALYSIS = [
  /\bthis evidence demonstrates\b/gi,
  /\bthis finding is significant because\b/gi,
  /\bthis supports the argument\b/gi,
  /\bwhat makes this evidence compelling\b/gi,
];

function countRegex(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

function bibliographyEntries(refText: string): number {
  if (!refText.trim()) return 0;
  const lines = refText.split(/\n/).filter((l) => l.trim().length > 20);
  const authorStarts = lines.filter((l) =>
    /^[A-Z][a-zA-Z'-]+,\s+[A-Z]/.test(l.trim()),
  );
  if (authorStarts.length >= 2) return authorStarts.length;
  return lines.length >= 3 ? lines.length - 1 : 0;
}

/** Canonical section heading (not "Work Cited" typo-only blocks). */
function hasCanonicalBibliographyHeading(refText: string): boolean {
  const lines = refText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const canonical =
    /^(?:works\s+cited|references?|bibliography|sources?|works\s+consulted|literature\s+cited|annotated\s+bibliography|works\s+referenced|citations?)$/i;
  return lines.slice(0, 4).some((l) => canonical.test(l.replace(/[:.]+\s*$/, "")));
}

/** At least two entries with real publication years or DOI (excludes n.d.-only URL lists). */
function hasSubstantiveBibliographyEntries(refText: string): boolean {
  const parts = countBibliographyEntries(refText);
  if (parts.length < 2) return false;
  let substantive = 0;
  for (const ent of parts) {
    if (/\((?:19|20)\d{2}[a-z]?\)/.test(ent) && !/\(n\.d\.\)/i.test(ent)) substantive++;
    else if (/doi\.org\/10\.\d{4,}/i.test(ent)) substantive++;
    else if (/\bvol\.\s*\d+/i.test(ent) && /\bpp\.\s*\d+/i.test(ent)) substantive++;
  }
  return substantive >= 2;
}

/** Non-empty lines in the references block (any format, including URLs). */
function countReferenceSectionLines(refText: string): number {
  if (!refText.trim()) return 0;
  return expandBibliographyLines(refText).length;
}

/** CB-style numbered list without a Works Cited heading (e.g. cb2019_iwa_b). */
function hasNumberedBibliographyBlock(refText: string): boolean {
  const numbered = refText.match(/(?:^|\n)\s*\d{1,2}\.\s*(?:\n|$)/g) ?? [];
  return numbered.length >= 3;
}

/** Author-line bibliography without a section heading (e.g. cb2021_iwa_b). */
function hasAuthorLineBibliographyBlock(refText: string): boolean {
  const authorStarts =
    refText.match(/^[A-Z][a-zA-Z'&-]+,?\s+(?:[A-Z][a-z]|[A-Z]\.)/gm) ?? [];
  return authorStarts.length >= 3;
}


function countNamedSources(body: string): number {
  return new Set(extractAuthorCitations(body).map((a) => a.split(/\s+/)[0])).size;
}

function detectStatedWordCount(text: string): number | null {
  const m = text.match(/word count[:\s]*(\d{3,4})/i);
  return m?.[1] ? parseInt(m[1], 10) : null;
}

function computeSeminarContextScore(first500: string): number {
  let score = 0;
  score += countPatternHits(first500, STATISTICAL_URGENCY_PATTERNS) * 2;
  score += CONTEXT_SIGNALS.filter((p) => p.test(first500)).length;
  score += countPatternHits(first500, [
    /\bin the wake of\b/gi,
    /\bfollowing the\b/gi,
    /\bpublic health crisis\b/gi,
    /\bsystemic issue\b/gi,
    /\bachievement gap\b/gi,
  ]);
  score -= countPatternHits(first500, VAGUE_IMPORTANCE_PATTERNS);
  return Math.max(0, score);
}

function computeIrrSeminarContextScore(opening: string): number {
  const weak = countDistinctPatternHits(opening, IRR_WEAK_CONTEXT_SIGNALS, 35);
  const adequate = countDistinctPatternHits(
    opening,
    IRR_ADEQUATE_CONTEXT_SIGNALS,
    35,
  );
  const strong = countDistinctPatternHits(opening, IRR_STRONG_CONTEXT_SIGNALS, 35);
  let score = strong * 2 + adequate - Math.min(weak, 10);
  score += countPatternHits(opening, STATISTICAL_URGENCY_PATTERNS) * 2;
  score += countPatternHits(opening, [
    /\bin the wake of\b/gi,
    /\bfollowing the\b/gi,
    /\bpublic health crisis\b/gi,
    /\bsystemic issue\b/gi,
    /\bachievement gap\b/gi,
  ]);
  return Math.max(0, score);
}

function detectIntegratedCitations(body: string): {
  integrated: number;
  tangential: number;
} {
  const authors = [...new Set(extractAuthorCitations(body))];
  let integrated = 0;
  let tangential = 0;
  for (const author of authors.slice(0, 30)) {
    const commentary = commentaryAfterCitation(body, author.split(/\s+/)[0]!);
    const isTangential = TANGENTIAL_SOURCE_PATTERNS.some((p) => {
      const idx = body.search(new RegExp(author.split(/\s+/)[0]!, "i"));
      return idx >= 0 && p.test(body.slice(idx, idx + 200));
    });
    if (commentary >= 2) integrated++;
    else if (isTangential || commentary === 0) tangential++;
  }
  return { integrated, tangential };
}

function sourceCommentarySentenceCounts(body: string): {
  source: number;
  commentary: number;
  ratio: number;
  sourceSentenceRatio: number;
  commentarySentenceRatio: number;
} {
  const sents = body.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  let source = 0;
  let commentary = 0;
  for (const s of sents) {
    if (AUTHOR_YEAR.test(s) || PAREN_CITE.test(s) || ATTRIBUTIVE.test(s)) {
      source++;
    } else if (STUDENT_COMMENTARY_PATTERNS.some((p) => p.test(s))) {
      commentary++;
    }
  }
  const total = source + commentary;
  const ratio = source > 0 ? commentary / source : commentary > 0 ? 2 : 0;
  return {
    source,
    commentary,
    ratio,
    sourceSentenceRatio: total > 0 ? source / total : 0,
    commentarySentenceRatio: total > 0 ? commentary / total : 0,
  };
}

export function buildSeminarEvidence(
  rawText: string,
  options?: IwaGradeOptions,
): SeminarEvidence {
  return runWithPatternScanCache(() => buildSeminarEvidenceInner(rawText, options));
}

function buildSeminarEvidenceInner(
  rawText: string,
  options?: IwaGradeOptions,
): SeminarEvidence {
  clearBibliographyAnalysisCache();
  const examYear =
    options?.examYear != null ? String(options.examYear) : undefined;
  const stripped = stripSeminarBoilerplate(rawText);
  const { bodyText, referencesText } = partitionSeminarText(stripped.text);
  const iwaRegions = identifyIwaRegions(bodyText);
  const stimulusDetect = detectStimulusYear(bodyText + "\n" + referencesText);
  const stimulusAuthors = stimulusAuthorsInText(bodyText);
  const stimulusBody = scoreStimulusIntegrationInBody(bodyText, examYear);
  const stimulusIntegration = detectBestStimulusIntegration(bodyText, stimulusAuthors);
  const thesis = detectThesis(bodyText);
  const isIrr = options?.task === "irr";
  const mechanismIrr = isIrr
    ? countMechanismAfterCitations(bodyText)
    : { citedSourceCount: 0, mechanismAfterCount: 0 };
  const irrCredScore = isIrr ? computeIrrCredentialScore(bodyText) : 0;
  const irrSynthScore = isIrr
    ? computeIrrPerspectiveSynthesisScore(bodyText)
    : 0;
  const opening400 = bodyText.slice(0, 2500);
  const dictionaryContextOpening = ROW2_ZERO_CONTEXT_PATTERNS.some((p) =>
    p.test(opening400),
  );
  const bodyWordCount = countWords(bodyText);
  const bodyIndex = buildBodyTextIndex(
    bodyText,
    bodyWordCount >= 2000 ? 7000 : 5200,
  );
  const linkingScanText = linkingPatternScanText(bodyText);
  const irrOpeningSubstantive = isIrr
    ? getOpeningSubstantiveParagraph(bodyText)
    : "";
  const first500 = bodyText.slice(0, Math.min(bodyText.length, 2500));
  const combined = bodyText + "\n" + referencesText;
  const rqKeywords = extractResearchQuestionKeywords(bodyText);
  const deep = buildDeepCalibrationSignals(
    bodyText,
    referencesText,
    rqKeywords,
    examYear,
    options?.task ?? "iwa",
    bodyIndex.paragraphs,
    { bestQuality: stimulusBody.bestQuality },
  );
  const row1Integration =
    options?.task === "irr"
      ? {
          namedSourceInBody: false,
          integrationFunctionDetected: false,
          row1Tangential: true,
          row1TypeCOnly: false,
          row1BibliographyOnly: false,
          row1IntroOnly: false,
          row1DefinitionOnly: false,
          row1ZeroReason: null as string | null,
          namedSourcesFound: [] as string[],
          row1IntegrationQuality: { ...EMPTY_ROW1_INTEGRATION_QUALITY },
        }
      : analyzeRow1SourceIntegration(bodyText, referencesText);
  const row1IntegrationQuality =
    options?.task === "irr"
      ? { ...EMPTY_ROW1_INTEGRATION_QUALITY }
      : row1Integration.row1IntegrationQuality;

  const seminarContextScore =
    options?.task === "irr"
      ? computeIrrSeminarContextScore(first500)
      : computeSeminarContextScore(first500);
  const contextSignalCount = CONTEXT_SIGNALS.filter((p) =>
    p.test(first500),
  ).length;
  const statisticalUrgencyCount = countPatternHitsInSlice(
    bodyText,
    STATISTICAL_URGENCY_PATTERNS,
    2500,
  );
  let vagueImportanceCount = countPatternHitsInSlice(
    bodyText,
    VAGUE_IMPORTANCE_PATTERNS,
    2500,
  );
  const bibAnalysis = getBibliographyAnalysis(bodyText, referencesText);
  const commentaryDepth = countCommentaryDepth(
    bodyText,
    bodyIndex.citationPositions,
  );
  const substantiatedRqContextCount = countSubstantiatedRqContext(
    bodyText,
    rqKeywords,
  );
  const rqMatch = bodyText.match(
    /(?:research question|to what extent)[\s\S]{10,400}?\?/i,
  );
  const rqText = rqMatch?.[0] ?? rqKeywords.join(" ");
  const rqContextLinked =
    substantiatedRqContextCount >= 1 ||
    (isIrr
      ? detectRqContextLinkInOpening(
          irrOpeningSubstantive.length > 80
            ? irrOpeningSubstantive
            : bodyText.slice(0, 2500),
          rqText,
        )
      : rqContextLinkInOpening(bodyText, rqKeywords));
  const descriptiveLinkingCount = Math.max(
    countPatternHits(linkingScanText, DESCRIPTIVE_LINKING_PATTERNS),
    deep.descriptiveLinkingCount,
  );
  let evaluativeLinkingCount = countPatternHitsWithCombined(
    linkingScanText,
    EVALUATIVE_LINKING_PATTERNS,
    EVALUATIVE_LINKING_COMBINED,
  );
  evaluativeLinkingCount = Math.max(
    evaluativeLinkingCount,
    deep.evaluativeLinkingCount,
    countConcessiveRebuttalLinking(bodyText),
  );

  const namedPerspectiveCountEarly = Math.max(
    countPerspectivesWithPosition(bodyText),
    deep.namedPerspectiveTypeA,
  );
  if (
    countConcessiveRebuttalLinking(bodyText) > 0 &&
    namedPerspectiveCountEarly >= 2 &&
    (deep.strongCounterclaimEngaged || hasEvaluativeConcession(bodyText))
  ) {
    evaluativeLinkingCount = Math.max(evaluativeLinkingCount, 1);
  }

  let echoRatio = deep.echoRatio;
  if (commentaryDepth.echoCount + commentaryDepth.developCount > 0) {
    echoRatio = Math.min(echoRatio, commentaryDepth.ratio);
  }
  if (echoRatio > 0.45 && deep.commentaryStructureScore >= 28) {
    echoRatio = Math.min(echoRatio, commentaryDepth.ratio);
  }

  const synthesisPhraseCount =
    countPatternHits(bodyText, EVALUATIVE_PERSPECTIVE_PATTERNS) +
    countPatternHits(bodyText, COMPARISON_PATTERNS);
  const contrastiveLinkCount = countPatternHits(bodyText, COMPARISON_PATTERNS);
  const comparisonSignalCount = contrastiveLinkCount;
  const evaluativePerspectiveCount = countPatternHits(
    bodyText,
    EVALUATIVE_PERSPECTIVE_PATTERNS,
  );
  const perspectiveSynthesisScore =
    evaluativePerspectiveCount * 2 + comparisonSignalCount;

  const namedPerspectiveCount = Math.max(
    countPerspectivesWithPosition(bodyText),
    deep.namedPerspectiveTypeA,
  );
  const namedSourceCount = countNamedSources(bodyText);
  const groupNounHits = countRegex(bodyText, GROUP_NOUN_PERSPECTIVE);
  const inconsistentAttribution =
    groupNounHits >= 4 && namedPerspectiveCount < 2;

  const studentVoiceScore =
    countPatternHits(bodyText, STUDENT_COMMENTARY_PATTERNS) +
    countPatternHits(bodyText, [
      /\bthis (?:paper|investigation|essay)\b/gi,
      /\bthe writer\b/gi,
      /\bjuror\b/gi,
      /\bwrongful conviction\b/gi,
      /\bnostalgia\b/gi,
    ]);
  const seminarStudentVoiceScore = Math.min(studentVoiceScore, 12);
  const sentCounts = sourceCommentarySentenceCounts(bodyText);
  const sourceToCommentaryRatio = Math.max(
    sentCounts.ratio,
    seminarStudentVoiceScore >= 3 ? 0.6 : 0,
  );
  const synthesisIsolationCount = countSynthesisIsolation(bodyText);
  const beyondStimulusWellVettedCount = countBeyondStimulusWellVetted(
    bodyText,
    referencesText,
    stimulusAuthors,
  );

  const bibHeading =
    combinedChunksMatch(BIB_HEADING_COMBINED, referencesText) ||
    REF_HEADING.test(referencesText);
  const referenceLineCount = countReferenceSectionLines(referencesText);
  const urlOnlyBib = urlOnlyBibliography(referencesText);
  const bibliographyEntryCount = Math.max(
    bibliographyEntries(referencesText),
    referenceLineCount,
  );
  // Section exists when heading + lines are present; entry block must be substantive (not n.d. URL dumps).
  const numberedBibliography =
    hasNumberedBibliographyBlock(referencesText) &&
    referenceLineCount >= 3 &&
    hasSubstantiveBibliographyEntries(referencesText);
  const authorLineBibliography =
    hasAuthorLineBibliographyBlock(referencesText) &&
    referenceLineCount >= 3 &&
    hasSubstantiveBibliographyEntries(referencesText);
  const bibliographyPresent =
    (bibHeading &&
      referenceLineCount >= 2 &&
      (hasCanonicalBibliographyHeading(referencesText) ||
        hasSubstantiveBibliographyEntries(referencesText))) ||
    numberedBibliography ||
    authorLineBibliography;

  const citationExtraction = extractInTextCitations(
    stripFigureCaptionLines(bodyText),
    bibliographyPresent,
  );
  const inTextCitationCount = citationExtraction.totalCount;
  const isMlaCitationFormat = detectIsMlaCitationFormat(
    bodyText,
    bibliographyPresent,
  );
  const inTextCitationCountRow6 = citationExtraction.parentheticalCount;
  const conclusionText = bodyText.slice(Math.max(0, bodyText.length - 3500));
  const cal324 = detectCalibration324Signals(bodyText, {
    thesisPresent: thesis.thesisPresent,
    conclusionText,
    inTextCitationCount,
    bibliographyPresent,
    isMlaCitationFormat,
  });
  const attributivePhraseCount = countRegex(bodyText, ATTRIBUTIVE);
  let { integrated, tangential } = detectIntegratedCitations(bodyText);
  const namedStimulusInBody = hasNamedStimulusInBody(bodyText, examYear);
  const stimulusMentioned = namedStimulusInBody;
  if (
    integrated < 2 &&
    inTextCitationCount >= 8 &&
    attributivePhraseCount >= 4
  ) {
    integrated = Math.min(4, Math.floor(inTextCitationCount / 4));
  }
  let stimulusIntegrationHits = integrated;
  if (stimulusMentioned && integrated >= 1) stimulusIntegrationHits++;
  const wellVettedSourceCount = WELL_VETTED.filter((p) => p.test(combined)).length;
  const journalisticSourceCount = countPatternHits(bodyText, JOURNALISTIC_SOURCE_PATTERNS);
  const purposefulAnalysisCount = countPatternHits(bodyText, PURPOSEFUL_ANALYSIS);
  const colloquialHitCount =
    options?.task === "irr"
      ? countDistinctPatternHits(bodyText, IRR_INFORMAL_IRR_REGISTER_SIGNALS, 30)
      : countPatternHits(bodyText, COLLOQUIAL_PATTERNS);
  const academicStyleSignalCount =
    options?.task === "irr"
      ? countDistinctPatternHits(bodyText, IRR_ACADEMIC_IRR_REGISTER_SIGNALS, 30)
      : countPatternHits(bodyText, [
          /\bnevertheless\b/gi,
          /\bfurthermore\b/gi,
          /\bconsequently\b/gi,
          /\binsofar as\b/gi,
          /\bdemonstrates\b/gi,
          /\bestablishes\b/gi,
        ]);
  const quoteProportion = estimateQuoteProportion(bodyText);

  let thesisPresent = thesis.thesisPresent || cal324.hedgedThesisDetected;
  if (
    !thesisPresent &&
    !cal324.hedgedThesisDetected &&
    !cal324.bothSidesMode &&
    detectDistributedThesis(bodyText)
  ) {
    thesisPresent = true;
  }

  const significanceFramingPresent =
    options?.task === "irr"
      ? false
      : detectSignificanceFraming(bodyText, {
          thesisPresent,
          thesisInOpening: thesis.thesisInOpening,
          argumentativeTopicSentenceCount:
            cal324.argumentativeTopicSentenceCount,
          exploratoryOpening:
            /\bthis paper will explore\b/i.test(bodyText.slice(0, 2000)) ||
            /\bboth sides of\b/i.test(bodyText.slice(0, 2000)),
        });

  const summaryOnlyMode =
    SUMMARY_ONLY.test(bodyText) ||
    NO_ARGUMENT_PATTERNS.some((p) => p.test(bodyText));

  const exploratoryMode =
    summaryOnlyMode ||
    NO_ARGUMENT_PATTERNS.some((p) => p.test(bodyText.slice(0, 1200)));

  if (countPatternHitsInSlice(bodyText, PERSONAL_ANECDOTE_PATTERNS, 2500) >= 1) {
    vagueImportanceCount += 3;
  }

  const perspectiveNames = [...new Set(extractAuthorCitations(bodyText).map((a) => a.split(/\s+/)[0]!))].slice(
    0,
    8,
  );

  return {
    bodyText,
    referencesText,
    bodyWordCount,
    fullWordCount: countWords(rawText),
    statedWordCount: detectStatedWordCount(rawText),
    namedSourceCount,
    contextSignalCount,
    seminarContextScore,
    synthesisPhraseCount,
    contrastiveLinkCount,
    perspectiveSynthesisScore,
    thesisPresent,
    studentVoiceScore,
    seminarStudentVoiceScore,
    sourceToCommentaryRatio,
    wellVettedSourceCount,
    journalisticSourceCount,
    purposefulAnalysisCount,
    bibliographyPresent,
    bibliographyEntryCount,
    inTextCitationCount,
    citationStyleConsistent:
      countRegex(bodyText, PAREN_CITE) >= 3 ||
      countRegex(bodyText, AUTHOR_YEAR) >= 3,
    bibliographyLinkedRatio: bibAnalysis.linkingRatio,
    attributivePhraseCount,
    colloquialHitCount,
    academicStyleSignalCount,
    quoteProportion,
    stimulusIntegrationHits,
    integratedCitationCount: integrated,
    tangentialCitationCount: tangential,
    summaryOnlyMode,
    stimulusMentioned,
    vagueImportanceCount,
    statisticalUrgencyCount,
    rqContextLinked,
    significanceFramingPresent,
    namedPerspectiveCount,
    comparisonSignalCount,
    evaluativePerspectiveCount,
    inconsistentAttribution,
    reasoningExplanationCount: countRegex(bodyText, REASONING),
    credentialMentionCount: countRegex(bodyText, CREDENTIAL),
    sourceEvaluationCount: countRegex(bodyText, /\b(?:credib|bias|limitation)\b/gi),
    citationDensityPer100Words:
      bodyWordCount > 0 ? (inTextCitationCount / bodyWordCount) * 100 : 0,
    urlOnlyBibliography: urlOnlyBib,
    synthesisIsolationCount,
    stimulusYearDetected: stimulusDetect.year,
    stimulusTopicDetected: stimulusDetect.topic,
    stimulusAuthorsMatched: stimulusDetect.matchedAuthors,
    stimulusIntegrationQuality: stimulusIntegration.qualityScore,
    stimulusDefinitionOnly: stimulusIntegration.definitionOnly,
    stimulusIntroductionOnly: stimulusIntegration.introductionOnly,
    beyondStimulusWellVettedCount,
    exploratoryMode,
    sourceSentenceRatio: sentCounts.sourceSentenceRatio ?? 0,
    commentarySentenceRatio: sentCounts.commentarySentenceRatio ?? 0,
    regionsLocatedByHeading: iwaRegions.regionsLocatedByHeading,
    irrMethodologySignalCount: countMethodologyCategories(bodyText),
    irrBiasEvaluationCount:
      countPatternHits(bodyText, IRR_BIAS_EVALUATION_PATTERNS) +
      countPatternHits(bodyText, IRR_BIAS_ACKNOWLEDGMENT_PATTERNS),
    irrOrganizationalPreview: IRR_ORGANIZATIONAL_PREVIEW.test(bodyText.slice(0, 1200)),
    detectedPerspectives: perspectiveNames,
    totalNonStimulusSources: bibAnalysis.nonStimulusCount,
    scholarlySourceCount: bibAnalysis.scholarlyCount,
    scholarlyRatio: bibAnalysis.scholarlyRatio,
    analysisDepthCount: bibAnalysis.analysisDepthCount,
    missingFromBibliographyCount: bibAnalysis.missingFromBibliographyCount,
    missingFromTextCount: bibAnalysis.missingFromText.length,
    descriptiveLinkingCount,
    evaluativeLinkingCount,
    commentaryEchoCount: commentaryDepth.echoCount,
    commentaryDevelopCount: commentaryDepth.developCount,
    commentaryDepthRatio: commentaryDepth.ratio,
    substantiatedRqContextCount,
    irrMechanismCount: countPatternHits(bodyText, IRR_MECHANISM_PATTERNS),
    irrSummaryOnlyCount: countPatternHits(bodyText, IRR_SUMMARY_ONLY_PATTERNS),
    irrMultiSourceSynthesisCount: countPatternHits(
      bodyText,
      IRR_MULTI_SOURCE_SYNTHESIS_PATTERNS,
    ),
    irrGeneralConnectionCount: countPatternHits(
      bodyText,
      IRR_GENERAL_CONNECTION_PATTERNS,
    ),
    irrBiasAcknowledgmentCount: countPatternHits(
      bodyText,
      IRR_BIAS_ACKNOWLEDGMENT_PATTERNS,
    ),
    namedStimulusInBody,
    stimulusAuthorsInBody: stimulusBody.authorsFound,
    stimulusBodyIntegrated:
      namedStimulusInBody &&
      (stimulusBody.bestQuality >= 1 ||
        stimulusBody.integrated ||
        integrated >= 1) &&
      !stimulusIntegration.definitionOnly,
    namedSourceInBody: row1Integration.namedSourceInBody,
    integrationFunctionDetected: row1Integration.integrationFunctionDetected,
    row1Tangential: row1Integration.row1Tangential,
    row1TypeCOnly: row1Integration.row1TypeCOnly,
    row1BibliographyOnly: row1Integration.row1BibliographyOnly,
    row1IntroOnly: row1Integration.row1IntroOnly,
    row1DefinitionOnly: row1Integration.row1DefinitionOnly,
    row1ZeroReason: row1Integration.row1ZeroReason,
    namedSourcesFound: row1Integration.namedSourcesFound,
    row1IntegrationQuality,
    thesisInOpening: thesis.thesisInOpening,
    conclusionAligned: thesis.conclusionAligned,
    counterclaimPresent: thesis.counterclaimPresent,
    irrCredentialScore: irrCredScore,
    irrCitedSourceCount: mechanismIrr.citedSourceCount,
    irrMechanismAfterCount: mechanismIrr.mechanismAfterCount,
    irrPerspectiveSynthesisScore: irrSynthScore,
    dictionaryContextOpening,
    studentCommentarySentenceCount: thesis.studentSentenceCount,
    row1DiagnosticIntegrationLevel: deep.stimulusLevel,
    stimulusTangential: deep.stimulusTangential,
    stimulusZeroReason: deep.stimulusZeroReason,
    examYearOverride: examYear ?? stimulusDetect.year,
    isOfficialSample: options?.isOfficialSample ?? false,
    weakPerspectiveCount: deep.weakPerspectiveCount,
    specificityScore: deep.specificityScore,
    namedPerspectiveTypeA: deep.namedPerspectiveTypeA,
    perspectiveIsolated: deep.perspectiveIsolated,
    commentaryStructureScore: deep.commentaryStructureScore,
    echoRatio,
    strongCounterclaimEngaged:
      deep.strongCounterclaimEngaged || hasEvaluativeConcession(bodyText),
    totalCredibilityPoints: deep.totalCredibilityPoints,
    tier1SourceCount: deep.tier1SourceCount,
    citationStyleViolations: deep.citationStyleViolations,
    attributivePhraseRatio: deep.attributivePhraseRatio,
    sentenceVarietyScore: deep.sentenceVarietyScore,
    colloquialSeverity: deep.colloquialSeverity,
    irrContextConditionA: deep.irrContextConditionA,
    irrContextConditionB: deep.irrContextConditionB,
    irrExplanationRatio: deep.irrExplanationRatio,
    irrCredibilityConsistency: deep.irrCredibilityConsistency,
    irrTierACredentialCount: deep.irrTierACredentialCount,
    irrPerspectiveLensCount: deep.irrPerspectiveLensCount,
    irrStrongSynthesisCount:
      deep.irrStrongSynthesisCount +
      (deep.irrPerspectiveLensCount >= 2
        ? Math.min(3, cal324.irrEvaluativeSynthesisCount)
        : 0),
    irrModerateSynthesisCount: deep.irrModerateSynthesisCount,
    hedgedThesisDetected: cal324.hedgedThesisDetected,
    bothSidesMode: cal324.bothSidesMode,
    bothSidesModeLocation: cal324.bothSidesModeLocation,
    hasCommittedPosition: cal324.hasCommittedPosition,
    descriptiveParagraphOpenerCount: cal324.descriptiveParagraphOpenerCount,
    argumentativeTopicSentenceCount: cal324.argumentativeTopicSentenceCount,
    irrRqSpecificityLow: cal324.irrRqSpecificityLow,
    contextSpecificityPenalty: cal324.contextSpecificityPenalty,
    inTextCitationCountRow6,
    irrAttributiveCitationCount: cal324.irrAttributiveCitationCount,
    irrDistinctAttributedSourceCount: cal324.irrDistinctAttributedSourceCount,
    irrCrossSourceComparison: cal324.irrCrossSourceComparison,
    irrPerspectiveEvaluationCount: cal324.irrPerspectiveEvaluationCount,
    irrDistinctDiscussedPerspectiveCount:
      cal324.irrDistinctDiscussedPerspectiveCount,
    isMlaCitationFormat,
  };
}

export type IwaAnchor = "high" | "mid" | "low" | "none";

/** Retained for confidence calibration only — not used to override row scores. */
export function classifyIwaAnchor(e: SeminarEvidence): IwaAnchor {
  if (
    (e.exploratoryMode && !e.thesisPresent) ||
    (e.summaryOnlyMode && !e.thesisPresent && e.inTextCitationCount < 3) ||
    (e.colloquialHitCount >= 10 && e.quoteProportion > 0.5 && !e.bibliographyPresent) ||
    (e.bodyWordCount < 500 && e.inTextCitationCount < 2) ||
    (!e.bibliographyPresent && e.inTextCitationCount < 12) ||
    (e.colloquialSeverity >= 2 &&
      e.inTextCitationCount < 8 &&
      e.totalCredibilityPoints < 8)
  ) {
    return "low";
  }
  if (
    e.bodyWordCount >= 1200 &&
    e.bibliographyPresent &&
    !e.urlOnlyBibliography &&
    e.thesisPresent &&
    (e.namedSourceInBody || e.namedStimulusInBody) &&
    (e.integrationFunctionDetected || e.row1DiagnosticIntegrationLevel >= 1) &&
    e.inTextCitationCount >= 8 &&
    e.totalCredibilityPoints >= 6
  ) {
    return "high";
  }
  if (
    e.bibliographyPresent &&
    (e.thesisPresent ||
      e.inTextCitationCount >= 6 ||
      e.namedPerspectiveCount >= 2 ||
      e.namedPerspectiveTypeA >= 1)
  ) {
    return "mid";
  }
  return "none";
}

export type IrrAnchor = "high" | "mid" | "low" | "none";

function isShallowCitationHeavyIrr(e: SeminarEvidence): boolean {
  return (
    e.irrExplanationRatio <= 0.05 &&
    !e.irrContextConditionA &&
    !e.irrContextConditionB &&
    e.irrPerspectiveSynthesisScore < 2 &&
    e.irrCredibilityConsistency < 0.3 &&
    e.inTextCitationCount >= 18 &&
    e.irrCredentialScore <= 4
  );
}

export function classifyIrrAnchor(e: SeminarEvidence): IrrAnchor {
  if (
    e.bodyWordCount < 1100 ||
    !e.bibliographyPresent ||
    e.credentialMentionCount < 2
  ) {
    if (e.bodyWordCount < 900 || !e.bibliographyPresent) return "low";
  }
  if (
    e.credentialMentionCount < 2 &&
    e.irrMethodologySignalCount < 1 &&
    e.colloquialHitCount >= 5
  ) {
    return "low";
  }
  if (
    e.bodyWordCount >= 1100 &&
    e.bibliographyPresent &&
    e.inTextCitationCount >= 8 &&
    e.totalCredibilityPoints >= 8
  ) {
    if (isShallowCitationHeavyIrr(e)) {
      return "low";
    }
    if (
      e.credentialMentionCount >= 5 &&
      e.comparisonSignalCount < 1 &&
      e.irrBiasEvaluationCount < 1
    ) {
      return "mid";
    }
    if (e.inTextCitationCount >= 14 && e.totalCredibilityPoints >= 12) return "high";
    if (
      e.comparisonSignalCount >= 1 ||
      e.irrBiasEvaluationCount >= 1 ||
      e.irrOrganizationalPreview
    ) {
      return "high";
    }
    return "mid";
  }
  if (e.bodyWordCount >= 700 && e.bibliographyPresent) {
    if (isShallowCitationHeavyIrr(e)) return "low";
    return "mid";
  }
  return "low";
}
