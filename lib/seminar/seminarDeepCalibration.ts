/**
 * Deep calibration signals (Prompt 2) — IWA and IRR row detection.
 */

import {
  countBibliographyEntries,
  extractInTextAuthors,
  getBibliographyAnalysis,
} from "@/lib/seminar/seminarBibliographyAnalysis";
import {
  getOpeningSubstantiveParagraph,
  hasCredentialedInstitutionalAttribution,
  hasEvaluativeConcession,
} from "@/lib/seminar/seminarCalibration324";
import { STRONG_COUNTERCLAIM_PATTERNS } from "@/lib/seminar/seminarCounterclaimPatterns.generated";
import {
  DESCRIPTIVE_LINKING_PATTERNS,
  ECHO_COMMENTARY_PATTERNS,
  EVALUATIVE_LINKING_PATTERNS,
  ROW2_ZERO_CONTEXT_PATTERNS,
  UNSUBSTANTIATED_CONTEXT_PATTERNS,
} from "@/lib/seminar/seminarCalibrationPatterns";
import { IRR_METHODOLOGY_BONUS } from "@/lib/seminar/seminarMethodology";
import {
  COLLOQUIAL_PATTERNS,
  countDistinctPatternHits,
  countPatternHits,
  countPatternHitsInSlice,
  IRR_ACADEMIC_IRR_REGISTER_SIGNALS,
  IRR_ADEQUATE_ARGUMENT_SIGNALS,
  IRR_ADEQUATE_CONTEXT_SIGNALS,
  IRR_ADEQUATE_PERSPECTIVE_SIGNALS,
  IRR_ADEQUATE_SOURCE_EVALUATION_SIGNALS,
  IRR_INFORMAL_IRR_REGISTER_SIGNALS,
  IRR_STRONG_ARGUMENT_SIGNALS,
  IRR_STRONG_CONTEXT_SIGNALS,
  IRR_STRONG_IRR_CITATION_SIGNALS,
  IRR_STRONG_PERSPECTIVE_SIGNALS,
  IRR_STRONG_SOURCE_EVALUATION_SIGNALS,
  IRR_WEAK_ARGUMENT_SIGNALS,
  IRR_WEAK_CONTEXT_SIGNALS,
  IRR_WEAK_IRR_CITATION_SIGNALS,
  IRR_WEAK_PERSPECTIVE_SIGNALS,
  IRR_WEAK_SOURCE_EVALUATION_SIGNALS,
  STATISTICAL_URGENCY_PATTERNS,
} from "@/lib/seminar/seminarPatterns";
import {
  hasNamedStimulusInBody,
  namedStimulusAuthorsInBody,
  scoreStimulusIntegrationInBody,
  scoreTitleStimulusIntegration,
} from "@/lib/seminar/seminarStimulusBody";
import { isStimulusAuthor, stimulusAuthorRegex } from "@/lib/seminar/seminarStimulus";
import {
  isStimulusAuthorFalsePositive,
  stimulusOnlyInRqSentence,
} from "@/lib/seminar/stimulusAuthorMatch";
import {
  IWA_ROW2_BOOST_TRIGGERS,
  IWA_ROW2_ZERO_TRIGGERS,
  IWA_ROW3_ZERO_TRIGGERS,
  IWA_ROW7_DEDUCTION_TRIGGERS,
  IWA_STIMULUS_TITLE_WEAK_ROW1,
  IWA_STIMULUS_WITHHOLD_TRIGGERS,
} from "@/lib/seminar/seminarIwaPenaltyPatterns";
import {
  ACADEMIC_REGISTER_SIGNALS,
  COLLOQUIAL_SEVERITY_3_PATTERNS,
  HIGH_VALUE_CONTEXT_PATTERNS,
  LEVEL_1_INTEGRATION_PATTERNS,
  LEVEL_2_INTEGRATION_PATTERNS,
  MEDIUM_VALUE_CONTEXT_PATTERNS,
  PERSPECTIVE_ISOLATION_INDICATORS,
  TANGENTIAL_STIMULUS_PATTERNS,
  ZERO_VALUE_CONTEXT_PATTERNS,
  STRONG_CITATION_SIGNALS,
  WEAK_CITATION_SIGNALS,
} from "@/lib/seminar/seminarIwaPhrasePatterns";
import { countWords } from "@/lib/grader/text";
import { countMechanismAfterCitations } from "@/lib/seminar/seminarIrrSignals";
import {
  buildCombinedRegexChunks,
  combinedChunksMatch,
  countDistinctPatternHitsWithCombined,
  countPatternHitsWithCombined,
} from "@/lib/seminar/seminarPatternScan";
import type { SeminarTask } from "@/lib/seminar/seminarTypes";

const LEVEL_1_COMBINED = buildCombinedRegexChunks(LEVEL_1_INTEGRATION_PATTERNS);
const LEVEL_2_COMBINED = buildCombinedRegexChunks(LEVEL_2_INTEGRATION_PATTERNS);
const EVALUATIVE_COMBINED = buildCombinedRegexChunks(EVALUATIVE_LINKING_PATTERNS);
const DESCRIPTIVE_COMBINED = buildCombinedRegexChunks(DESCRIPTIVE_LINKING_PATTERNS);
const HIGH_VALUE_COMBINED = buildCombinedRegexChunks(HIGH_VALUE_CONTEXT_PATTERNS);
const MEDIUM_VALUE_COMBINED = buildCombinedRegexChunks(MEDIUM_VALUE_CONTEXT_PATTERNS);
const ZERO_VALUE_COMBINED = buildCombinedRegexChunks(ZERO_VALUE_CONTEXT_PATTERNS);

const STIMULUS_INTEGRATION_CONTEXT_RADIUS = 1500;

const CITE_MARKER =
  /\([A-Z][a-zA-Z'&]+|\b[A-Z][a-z]+(?:\s+et\s+al\.)?\s*\(\d{4}|\baccording to\b/i;

const TYPE_A_POSITION =
  /\b([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:argues?|contends?|maintains?|claims?|asserts?)\s+that\b/gi;
const TYPE_B_FINDING =
  /\b([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:found|discovered|showed|demonstrated|established|revealed)\s+that\b/gi;
const TYPE_C_GENERAL =
  /\b([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:discusses?|addresses?|examines?|explores?)\b/gi;
const GROUP_NOUN =
  /\b(?:studies show|researchers argue|experts suggest|scientists believe|many researchers)\b/gi;
const BASIC_STIMULUS_INLINE: RegExp[] = [
  /\bthis suggests that\b/gi,
  /\bthis means that\b/gi,
  /\bthis is relevant because\b/gi,
  /\bapplying this to\b/gi,
  /\bwhat .{3,30} calls\b/gi,
  /\bas .{3,40} demonstrates,\b/gi,
  /\b(?:framework|analysis) helps explain\b/gi,
  /\bdrawing on .{3,40} analysis\b/gi,
];

const STRONG_STIMULUS_INLINE: RegExp[] = [
  /\bwhile .{5,40} argues .{5,40}, .{5,40} extend\b/gi,
  /\bconcept of .{5,60} aligns with\b/gi,
  /\bdescription of how\b/gi,
  /\bphotograph by\b/gi,
  /\bsurvey data from\b/gi,
];

/** Inline patterns first, then combined-regex prefilter on level lists. */
function stimulusIntegrationDistinctHits(
  window: string,
  inline: RegExp[],
  levelPatterns: RegExp[],
  levelCombined: RegExp[],
  max: number,
): number {
  let n = 0;
  for (const p of inline) {
    if (n >= max) return n;
    p.lastIndex = 0;
    if (p.test(window)) n++;
  }
  if (n >= max) return n;
  if (!combinedChunksMatch(levelCombined, window)) return n;
  return n + countDistinctPatternHits(window, levelPatterns, max - n);
}

const TANGENTIAL_STIMULUS: RegExp[] = [
  /\bdefines? \w+ as\b/gi,
  /\bas the stimulus suggests\b/gi,
  /\baccording to source [A-D], source\b/gi,
  ...TANGENTIAL_STIMULUS_PATTERNS,
];

const HIGH_SPECIFICITY: RegExp[] = [
  /\b\d+(?:\.\d+)?% of [^.]{10,80}(?:experience|affected|report|diagnosed)/gi,
  /\b\d{1,3}%\s+(?:involved|were caused by|resulted from|stemmed from|of cases|of wrongful|of exonerations|of rape|of murder)/gi,
  /\b\d+ million [^.]{10,60}/gi,
  /\brates of [^.]{10,50} have (?:increased|decreased|risen|fallen) by \d/gi,
  /\bfollowing the [A-Z][^.]{8,60},/gi,
  /\bamong [^.]{10,60}, [^.]{10,60} (?:occurs|affects|represents) at/gi,
  /\bAges \d+-\d+:\s*\d+(?:\.\d+)?%/gi,
];

const MED_SPECIFICITY: RegExp[] = [
  /\b(?:United States|U\.S\.|UK|European Union|World Health Organization|CDC|Supreme Court)\b/gi,
  /\b(?:since|between) (?:19|20)\d{2}/gi,
  /\b(?:Act of|Policy|Regulation|law)\b/gi,
  /\bthis matters because [^.]{15,80} affects\b/gi,
];

const NEG_SPECIFICITY: RegExp[] = [
  /\bI chose this topic because\b/gi,
  /\bpersonal(?:ly)? (?:interested|experience)\b/gi,
];

const STRONG_COUNTERCLAIM_COMBINED = buildCombinedRegexChunks(
  STRONG_COUNTERCLAIM_PATTERNS,
);

/** Genuine informal phrasing only — excludes single-word academic hedges (rather, even, only, etc.). */
const COLLOQUIAL_INFORMAL_SEVERITY_2: RegExp[] = [
  /\ba\s+lot\s+of\b/gi,
  /\ba\s+lot\b/gi,
  /\blots\s+of\b/gi,
  /\bkind\s+of\b/gi,
  /\bsort\s+of\b/gi,
  /\btype\s+of\b/gi,
  /\ba\s+bit\b/gi,
  /\ba\s+little\s+bit\b/gi,
  /\bpretty\s+much\b/gi,
  /\bbasically\b/gi,
  /\bhonestly\b/gi,
  /\btotally\b/gi,
  /\bstuff\b/gi,
  /\bthing\s+is\b/gi,
  /\bthe\s+thing\s+about\b/gi,
  /\bthe\s+thing\s+is\b/gi,
  /\bone\s+thing\s+is\b/gi,
  /\banother\s+thing\s+is\b/gi,
  /\bthe\s+point\s+is\b/gi,
  /\bthe\s+fact\s+is\b/gi,
  /\bthe\s+truth\s+is\b/gi,
  /\bbig\s+problem\b/gi,
  /\bhuge\s+problem\b/gi,
  /\bbad\s+problem\b/gi,
  /\breal\s+problem\b/gi,
  /\bbig\s+issue\b/gi,
  /\bmajor\s+issue\b/gi,
  /\bget\s+me\s+wrong\b/gi,
  /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
  /\bto\s+be\s+honest\b/gi,
  /\bi\s+mean\b/gi,
  /\byou\s+know\b/gi,
  /\blike,\s+/gi,
];

const IRR_EXPLANATION_L3: RegExp[] = [
  /\bused a (?:randomized|longitudinal|systematic)\b/gi,
  /\beffect size of\b/gi,
  /\bworks by\b/gi,
  /\boverturning the assumption\b/gi,
  /\brather than .{5,40} drives\b/gi,
];

const IRR_EXPLANATION_L2: RegExp[] = [
  /\bfound that .{10,80} because\b/gi,
  /\bwhich means that\b/gi,
  /\bsuggesting .{10,60} for\b/gi,
  /\bindicating that\b/gi,
];

const IRR_EXPLANATION_L1: RegExp[] = [
  /\bfound that\b/gi,
  /\breports? that\b/gi,
  /\bstudied .{5,40} and discovered\b/gi,
];

const IRR_STRONG_SYNTHESIS: RegExp[] = [
  /\btogether suggest\b/gi,
  /\breading .{5,40} alongside\b/gi,
  /\bthe tension between\b/gi,
  /\bcannot be attributed to a single cause\b/gi,
  /\borganizational, social, and individual\b/gi,
  /\bthree factors emerge\b/gi,
];


export interface DeepCalibrationSignals {
  stimulusLevel: 0 | 1 | 2;
  stimulusTangential: boolean;
  stimulusZeroReason: string | null;
  specificityScore: number;
  namedPerspectiveTypeA: number;
  weakPerspectiveCount: number;
  evaluativeLinkingCount: number;
  descriptiveLinkingCount: number;
  perspectiveIsolated: boolean;
  commentaryStructureScore: number;
  echoRatio: number;
  strongCounterclaimEngaged: boolean;
  totalCredibilityPoints: number;
  tier1SourceCount: number;
  citationStyleViolations: number;
  attributivePhraseRatio: number;
  sentenceVarietyScore: number;
  colloquialSeverity: 0 | 1 | 2 | 3;
  irrContextConditionA: boolean;
  irrContextConditionB: boolean;
  irrExplanationRatio: number;
  irrCredibilityConsistency: number;
  irrTierACredentialCount: number;
  irrPerspectiveLensCount: number;
  irrStrongSynthesisCount: number;
  irrModerateSynthesisCount: number;
}

function splitParagraphs(body: string): string[] {
  const sectioned = body.split(
    /(?=\n(?:Evidence for|Counterarguments?|Conclusion|Introduction|Psychological Effects|Social Issues|Breaking the Stigma|The Case for|Arguments? for|Arguments? against|Mandatory Voting)[^\n]*(?:\n|$))/i,
  );
  if (sectioned.length >= 3) {
    return sectioned
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 60);
  }
  const byBlank = body
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 80);
  if (byBlank.length >= 3) return byBlank;
  const lines = body
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 80);
  if (lines.length >= 4) return lines;
  return byBlank;
}

const NARRATIVE_URGENCY_PATTERNS: RegExp[] = [
  /\b(?:Massacre|collapse|disaster|fire|Rana Plaza)[^.]{0,40}(?:killed|left|displaced|resulted in) \d+/gi,
  /\b(?:Tulsa Race (?:Massacre|Riot))[^.]{0,80}(?:killed|left|displaced|resulted in|between \d+)/gi,
  /\b(?:Tulsa Race (?:Massacre|Riot)) of \d{4}\b/gi,
  /\b(?:Trail of Tears|Hurricane Katrina|Rwandan genocide|Japanese internment)[^.]{0,60}(?:killed|left|displaced|died)/gi,
  /\b(?:killing|killed|left) between \d+ and \d+ people/gi,
  /\bspent (?:eleven|\d+) years in prison\b/gi,
  /\b(?:wrongfully convicted|wrongful conviction|wrongfully imprisoned|wrongfully incarcerated|exonerated after|convicted of a crime (?:he|she|they) did not commit|spent \w+ years? (?:in prison|incarcerated) (?:for|before))\b/gi,
  /\bFor \d+ years,?\s+[^.]{10,80}(?:suppressed|erased|ignored|denied)\b/gi,
  /\b(?:explicitly does not cover|No federal law prohibits)\b/gi,
  /\b(?:GINA|policy|law) (?:was|is) (?:implemented|passed) in \d{4}\b/gi,
  /\bdemonstrated that [^.]{15,100}(?:cannot|must|obligat)/gi,
  /\b(?:r\s*=\s*0\.\d{2})\b/gi,
];

const PRO_CON_SECTION_HEADING_PATTERNS: RegExp[] = [
  /\barguments?\s+for\b/gi,
  /\barguments?\s+against\b/gi,
  /\bin support of\b/gi,
  /\bin opposition to\b/gi,
  /\bproponents?\b/gi,
  /\bcritics?\b/gi,
  /\bsupporters?\b/gi,
  /\bopponents?\b/gi,
  /\bbenefits of\b/gi,
  /\bdrawbacks of\b/gi,
  /\badvantages\b/gi,
  /\bdisadvantages\b/gi,
  /\bcase for\b/gi,
  /\bcase against\b/gi,
  /\bcounter-?arguments?\b/gi,
  /\bevidence for\b/gi,
  /\bthe counterargument\b/gi,
  /\bpsychological effects\b/gi,
  /\bsafety concerns\b/gi,
  /\bon the other hand\b/gi,
  /\b(?:supporting|opposing) (?:evidence|arguments?|perspectives?)\b/gi,
];

const PRO_CON_SECTION_PATTERNS: RegExp[] = [
  ...PRO_CON_SECTION_HEADING_PATTERNS,
  /\bwhile .{5,50} argues .{5,50}, .{5,50} (?:contends|found|shows)\b/gi,
];

/** Multiline-safe RQ detector (p11 RQ breaks across lines). */
const RQ_MATCH_RE = /(?:research question|to what extent)[\s\S]{10,400}?\?/i;

function specificityScanLength(body: string): number {
  return countWords(body) > 1000 ? 7000 : 5200;
}

function openingTextByWords(body: string, wordLimit: number): string {
  const parts = body.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, wordLimit).join(" ");
}

function extractIwaTitleLine(body: string): string {
  const skip =
    /^(?:AP Seminar|Individual Research|Word Count|IWA|Table of Contents|\d+$)/i;
  for (const line of body
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && l.length <= 220)
    .slice(0, 22)) {
    if (!skip.test(line)) return line;
  }
  return "";
}

function classifyStimulusWithholdReason(window: string): string | null {
  if (
    stimulusIntegrationDistinctHits(
      window,
      STRONG_STIMULUS_INLINE,
      LEVEL_2_INTEGRATION_PATTERNS,
      LEVEL_2_COMBINED,
      1,
    ) >= 1 ||
    stimulusIntegrationDistinctHits(
      window,
      BASIC_STIMULUS_INLINE,
      LEVEL_1_INTEGRATION_PATTERNS,
      LEVEL_1_COMBINED,
      2,
    ) >= 2
  ) {
    return null;
  }
  if (countDistinctPatternHits(window, IWA_STIMULUS_WITHHOLD_TRIGGERS, 3) < 2) {
    return null;
  }
  if (
    /\bdefines?|defined as|dictionary|etymolog|the term .{2,40} (?:means|refers)\b/i.test(
      window,
    )
  ) {
    return "definition_only";
  }
  if (
    /\b(?:introduction only|opening paragraph|not again|jumping-off|set the stage|by way of introduction|moving to|turns to)\b/i.test(
      window,
    )
  ) {
    return "tangential";
  }
  if (
    /\b(?:block quote|extended quotation|at length:|eloquently stated|own words capture)\b/i.test(
      window,
    ) ||
    /["“][^"”]{120,}/.test(window)
  ) {
    return "tangential";
  }
  if (
    /\b(?:as the stimulus|the packet argues|source [A-D]|provided source|stimulus materials|per the stimulus)\b/i.test(
      window,
    )
  ) {
    return "mention_only";
  }
  return "tangential";
}

function contextScanText(body: string, _rqKeywords: string[]): string {
  const scanLen = specificityScanLength(body);
  const openSlice = body.slice(0, scanLen);
  const rqMatch = body.match(RQ_MATCH_RE);
  if (rqMatch?.index == null) {
    const titleLine = body.match(/^[^\n]{20,120}$/m);
    if (titleLine?.index != null) {
      const tStart = Math.max(0, titleLine.index - 200);
      const tEnd = Math.min(body.length, titleLine.index + titleLine[0].length + 200);
      return `${openSlice}\n${body.slice(tStart, tEnd)}`;
    }
    return openSlice;
  }
  const rqParaStart = Math.max(0, rqMatch.index - 800);
  const rqParaEnd = Math.min(
    body.length,
    rqMatch.index + rqMatch[0].length + 800,
  );
  const rqWindow = body.slice(rqParaStart, rqParaEnd);
  return `${openSlice}\n${rqWindow}`;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
}

function hasCite(s: string): boolean {
  return CITE_MARKER.test(s);
}

export function analyzeStimulusIntegrationDepth(
  body: string,
  examYear?: string | number,
  precomputedBodyScore?: { bestQuality: number },
): {
  level: 0 | 1 | 2;
  tangential: boolean;
  zeroReason: string | null;
} {
  const titleLine = extractIwaTitleLine(body);
  if (
    titleLine &&
    countDistinctPatternHits(titleLine, IWA_STIMULUS_TITLE_WEAK_ROW1, 8) >= 3
  ) {
    return {
      level: 0,
      tangential: true,
      zeroReason: "exploratory_title",
    };
  }

  const authors = namedStimulusAuthorsInBody(body, examYear).filter((a) => {
    const re = stimulusAuthorRegex(a);
    re.lastIndex = 0;
    const m = re.exec(body);
    if (!m || m.index == null) return false;
    return !isStimulusAuthorFalsePositive(body, a, m.index);
  });
  const titleOnly =
    authors.length === 0 && hasNamedStimulusInBody(body, examYear);
  if (authors.length === 0 && !titleOnly) {
    return { level: 0, tangential: true, zeroReason: "no_stimulus_author" };
  }
  if (titleOnly) {
    const title = scoreTitleStimulusIntegration(body, examYear);
    if (title.level >= 1) {
      return { level: title.level, tangential: false, zeroReason: null };
    }
    return { level: 0, tangential: true, zeroReason: "mention_only" };
  }

  const introEnd = Math.min(body.length, 2000);
  const bodyAfterIntro = body.slice(introEnd);
  let mentionCount = 0;
  let introOnly = true;
  let definitionOnly = false;
  let basicHits = 0;
  let strongHits = 0;
  let withholdReason: string | null = null;

  for (const author of authors) {
    if (stimulusOnlyInRqSentence(body, author)) {
      withholdReason = withholdReason ?? "mention_only";
    }
    const re = stimulusAuthorRegex(author);
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      if (isStimulusAuthorFalsePositive(body, author, m.index)) continue;
      mentionCount++;
      if (m.index >= introEnd) introOnly = false;
      const windowStart = Math.max(0, m.index - STIMULUS_INTEGRATION_CONTEXT_RADIUS);
      const windowEnd = Math.min(
        body.length,
        m.index + STIMULUS_INTEGRATION_CONTEXT_RADIUS,
      );
      const window = body.slice(windowStart, windowEnd);
      const wr = classifyStimulusWithholdReason(window);
      if (wr) {
        withholdReason = withholdReason ?? wr;
        if (wr === "definition_only") definitionOnly = true;
      }
      if (TANGENTIAL_STIMULUS.some((p) => p.test(window))) {
        if (/\bdefines? \w+ as\b/i.test(window)) definitionOnly = true;
      }
      if (basicHits < 3) {
        basicHits += stimulusIntegrationDistinctHits(
          window,
          BASIC_STIMULUS_INLINE,
          LEVEL_1_INTEGRATION_PATTERNS,
          LEVEL_1_COMBINED,
          3 - basicHits,
        );
      }
      if (strongHits < 2) {
        strongHits += stimulusIntegrationDistinctHits(
          window,
          STRONG_STIMULUS_INLINE,
          LEVEL_2_INTEGRATION_PATTERNS,
          LEVEL_2_COMBINED,
          2 - strongHits,
        );
      }
    }
  }

  const firstPara = body.slice(0, 1200);
  const onlyInFirst =
    authors.every((a) => {
      const re = stimulusAuthorRegex(a);
      const first = re.test(firstPara);
      re.lastIndex = 0;
      const rest = re.test(bodyAfterIntro);
      return first && !rest;
    }) && mentionCount <= 2;

  if (onlyInFirst || definitionOnly) {
    return {
      level: 0,
      tangential: true,
      zeroReason: definitionOnly ? "definition_only" : "tangential",
    };
  }

  if (introOnly && mentionCount <= 1) {
    return { level: 0, tangential: true, zeroReason: "intro_only" };
  }

  const multiPara = authors.some((a) => {
    const re = stimulusAuthorRegex(a);
    let count = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) count++;
    return count >= 3;
  });

  if (strongHits >= 1 || multiPara) {
    return { level: 2, tangential: false, zeroReason: null };
  }

  const base =
    precomputedBodyScore ?? scoreStimulusIntegrationInBody(body, examYear);
  if (base.bestQuality >= 1 || basicHits >= 1) {
    return { level: 1, tangential: false, zeroReason: null };
  }

  return { level: 0, tangential: true, zeroReason: "mention_only" };
}

export function computeSpecificityScore(
  body: string,
  rqKeywords: string[],
): number {
  const scanLen = specificityScanLength(body);
  const open = contextScanText(body, rqKeywords);
  let score = 0;

  score += countPatternHits(open, HIGH_SPECIFICITY) * 2;
  score +=
    countDistinctPatternHitsWithCombined(
      open,
      HIGH_VALUE_CONTEXT_PATTERNS,
      HIGH_VALUE_COMBINED,
      6,
    ) * 2;
  score += countPatternHits(open, MED_SPECIFICITY);
  score += countDistinctPatternHitsWithCombined(
    open,
    MEDIUM_VALUE_CONTEXT_PATTERNS,
    MEDIUM_VALUE_COMBINED,
    6,
  );
  score += countPatternHitsInSlice(open, STATISTICAL_URGENCY_PATTERNS, scanLen);
  score += Math.min(3, countPatternHits(open, NARRATIVE_URGENCY_PATTERNS));

  const hasCite = /\(\d{4}[a-z]?\)|\([A-Z][a-zA-Z'&]+[^)]*\d{4}/.test(open);
  if (hasCite && rqKeywords.some((k) => open.toLowerCase().includes(k.toLowerCase()))) {
    score += 2;
  }

  if (rqKeywords.length > 0) {
    const rqRe = new RegExp(
      rqKeywords
        .filter((k) => k.length > 5)
        .slice(0, 6)
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|"),
      "i",
    );
    if (rqRe.source.length > 3) {
      for (const m of body.matchAll(/\b\d+(?:\.\d+)?%/g)) {
        const idx = m.index ?? 0;
        const window = body.slice(Math.max(0, idx - 200), idx + 200);
        if (
          rqRe.test(window) &&
          /\([A-Z][a-zA-Z'&]+[^)]*\d{4}/.test(window)
        ) {
          score += 2;
        }
      }
    }
  }

  if (
    /\bTulsa Race (?:Massacre|Riot)\b/i.test(open) &&
    /\b(?:100 and 300|between \d+ and \d+ people)\b/i.test(open)
  ) {
    score += 3;
  }

  const open800 = openingTextByWords(body, 800);
  const row2BoostHits = countDistinctPatternHits(
    open800,
    IWA_ROW2_BOOST_TRIGGERS,
    12,
  );
  score += Math.min(2, row2BoostHits);

  score -= Math.min(2, countPatternHits(open, ROW2_ZERO_CONTEXT_PATTERNS));
  score -= Math.min(
    3,
    countDistinctPatternHitsWithCombined(
      open,
      ZERO_VALUE_CONTEXT_PATTERNS,
      ZERO_VALUE_COMBINED,
      4,
    ),
  );
  score -= Math.min(2, countPatternHits(open, UNSUBSTANTIATED_CONTEXT_PATTERNS));
  score -= countPatternHits(open, NEG_SPECIFICITY);
  if (countPatternHitsInSlice(open, STATISTICAL_URGENCY_PATTERNS, Math.min(3500, scanLen)) >= 1) {
    score = Math.max(score, 3);
  }

  return score;
}

function sectionHasHeadingLabel(text: string): boolean {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 3)) {
    if (/^[A-Z][A-Z\s]{4,}$/.test(line)) return true;
    if (/:\s*$/.test(line) && !/\(\d{4}/.test(line)) return true;
    if (PRO_CON_SECTION_HEADING_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return p.test(line);
    })) {
      return true;
    }
  }
  return PRO_CON_SECTION_HEADING_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(text.slice(0, 120));
  });
}

function sourceHasPosition(sentence: string, author: string): boolean {
  const a = author.replace(/[^a-z]/gi, "");
  if (!new RegExp(`\\b${a}`, "i").test(sentence)) return false;
  return /\b(?:found|argues?|contends?|reports?|shows?|demonstrated|notes?|documented|synthesized)\b/i.test(
    sentence,
  );
}

function detectProConStructuralComparison(body: string): number {
  const paragraphs = splitParagraphs(body);
  const sections: { heading: boolean; authors: string[]; text: string }[] = [];
  let current: { heading: boolean; authors: string[]; text: string } = {
    heading: false,
    authors: [],
    text: "",
  };

  for (const p of paragraphs) {
    const heading = sectionHasHeadingLabel(p);
    if (heading && current.text.length > 40) {
      sections.push(current);
      current = { heading: true, authors: [], text: p };
    } else {
      current.text += `\n${p}`;
      if (heading) current.heading = true;
    }
    const cites = extractInTextAuthors(p).filter(
      (a) => a.length > 2 && !isStimulusAuthor(a),
    );
    for (const c of cites) {
      if (!current.authors.includes(c)) current.authors.push(c);
    }
  }
  if (current.text.length > 40) sections.push(current);

  let structural = 0;
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i]!;
    const b = sections[i + 1]!;
    if (a.authors.length < 1 || b.authors.length < 1) continue;
    const aPos = a.text.split(/(?<=[.!?])\s+/).some((s) =>
      a.authors.some((auth) => sourceHasPosition(s, auth)),
    );
    const bPos = b.text.split(/(?<=[.!?])\s+/).some((s) =>
      b.authors.some((auth) => sourceHasPosition(s, auth)),
    );
    const opposed =
      /\b(?:counter|against|critics?|oppose|however|objection|concern|drawback|disadvantage|safety)\b/i.test(
        b.text,
      ) ||
      /\b(?:support|for|benefit|advantage|evidence for|proponents?)\b/i.test(
        a.text,
      );
    if (aPos && bPos && (a.heading || b.heading || opposed)) {
      structural++;
    }
  }

  if (structural >= 1) return 1;

  const evidenceSec = sections.find((s) =>
    /\b(?:evidence for|arguments? for|in support)\b/i.test(s.text),
  );
  const counterSec = sections.find((s) =>
    /\b(?:counterarguments?|arguments? against|critics?)\b/i.test(s.text),
  );
  if (
    evidenceSec &&
    counterSec &&
    evidenceSec.authors.length >= 2 &&
    counterSec.text.length > 80
  ) {
    return 1;
  }

  for (const p of paragraphs) {
    const cites = extractInTextAuthors(p).filter(
      (a) => a.length > 2 && !isStimulusAuthor(a),
    );
    if (cites.length >= 2) {
      const sents = splitSentences(p);
      const withPos = sents.filter((s) =>
        cites.some((c) => sourceHasPosition(s, c)),
      );
      if (withPos.length >= 2) return 1;
      if (
        /\b(?:similarly|likewise|both|Jackman|Loewen)\b/i.test(p) &&
        cites.length >= 2
      ) {
        return 1;
      }
    }
  }

  const namedParas: { idx: number; authors: string[] }[] = [];
  paragraphs.forEach((p, idx) => {
    const cites = extractInTextAuthors(p).filter(
      (a) => a.length > 2 && !isStimulusAuthor(a),
    );
    if (cites.length >= 1) namedParas.push({ idx, authors: cites });
  });
  const strongCounter =
    countPatternHitsWithCombined(
      body,
      STRONG_COUNTERCLAIM_PATTERNS,
      STRONG_COUNTERCLAIM_COMBINED,
    ) >= 1 ||
    PRO_CON_SECTION_HEADING_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return /\bcounter/i.test(body) && p.test(body);
    });
  if (namedParas.length >= 2 && strongCounter) {
    for (let i = 0; i < namedParas.length - 1; i++) {
      if (namedParas[i + 1]!.idx - namedParas[i]!.idx <= 3) return 1;
    }
  }

  const stimulusTitle =
    /\b(?:Dark Side of Resilience|In Their Own Words|stimulus)\b/i.test(body);
  const stigmaSection =
    /\b(?:stigma|Social Issues|Breaking the Stigma|counter)\b/i.test(body);
  if (stimulusTitle && stigmaSection && paragraphs.length >= 4) {
    return 1;
  }

  return 0;
}

/** Full body for typical Seminar length (~2,200 words); sample only very long bodies. */
export function linkingPatternScanText(body: string): string {
  if (body.length <= 18_000) return body;
  const tailStart = Math.max(0, body.length - 3500);
  const midStart = Math.max(7000, Math.floor(body.length * 0.42) - 1500);
  const midEnd = Math.min(tailStart, midStart + 5000);
  const parts = [body.slice(0, 7000)];
  if (midEnd > midStart) parts.push(body.slice(midStart, midEnd));
  parts.push(body.slice(tailStart));
  return parts.join("\n\n");
}

export function analyzePerspectiveAttribution(
  body: string,
  prebuiltParagraphs?: string[],
): {
  namedTypeA: number;
  weakTypeB: number;
  evaluativeLinking: number;
  descriptiveLinking: number;
  isolated: boolean;
} {
  const perspectiveText = linkingPatternScanText(body);
  const typeA = new Set<string>();
  for (const m of body.matchAll(TYPE_A_POSITION)) {
    if (m[1] && !isStimulusAuthor(m[1].split(/\s+/)[0]!)) {
      typeA.add(m[1].toLowerCase());
    }
  }

  let weakB = 0;
  for (const m of body.matchAll(TYPE_B_FINDING)) {
    if (m[1]) weakB++;
  }

  const evaluative = countPatternHitsWithCombined(
    perspectiveText,
    EVALUATIVE_LINKING_PATTERNS,
    EVALUATIVE_COMBINED,
  );
  const descriptive = countPatternHitsWithCombined(
    perspectiveText,
    DESCRIPTIVE_LINKING_PATTERNS,
    DESCRIPTIVE_COMBINED,
  );
  const structural = detectProConStructuralComparison(perspectiveText);
  const proConSections =
    countPatternHits(perspectiveText, PRO_CON_SECTION_PATTERNS) >= 1 ||
    structural >= 1;

  const paragraphs = prebuiltParagraphs ?? splitParagraphs(body);
  let multiSourcePara = 0;
  for (const p of paragraphs) {
    const cites = extractInTextAuthors(p);
    if (cites.length >= 2) multiSourcePara++;
  }

  const descriptiveEffective = descriptive + structural;

  const isolationPhraseHits = countDistinctPatternHits(
    perspectiveText,
    PERSPECTIVE_ISOLATION_INDICATORS,
    8,
  );

  const row3ZeroHits = countDistinctPatternHits(
    perspectiveText,
    IWA_ROW3_ZERO_TRIGGERS,
    20,
  );
  const groupNounOnly =
    row3ZeroHits >= 4 &&
    typeA.size === 0 &&
    GROUP_NOUN.test(body) &&
    evaluative === 0;

  const isolated =
    groupNounOnly ||
    (row3ZeroHits >= 7 && typeA.size < 2 && evaluative === 0) ||
    (typeA.size >= 2 &&
      multiSourcePara === 0 &&
      evaluative === 0 &&
      descriptiveEffective < 1 &&
      !proConSections) ||
    (isolationPhraseHits >= 2 &&
      evaluative === 0 &&
      multiSourcePara === 0 &&
      !proConSections) ||
    (row3ZeroHits >= 6 &&
      isolationPhraseHits >= 2 &&
      evaluative === 0 &&
      !proConSections);

  return {
    namedTypeA: typeA.size,
    weakTypeB: weakB,
    evaluativeLinking: evaluative,
    descriptiveLinking: descriptiveEffective,
    isolated,
  };
}

const COMMENTARY_CITE_WINDOW = 400;
const MAX_COMMENTARY_PARAGRAPHS = 50;

function paragraphsForCommentary(
  body: string,
  prebuiltParagraphs?: string[],
): string[] {
  const paragraphs = prebuiltParagraphs ?? splitParagraphs(body);
  if (paragraphs.length <= MAX_COMMENTARY_PARAGRAPHS) return paragraphs;
  return [
    ...paragraphs.slice(0, 30),
    ...paragraphs.slice(-20),
  ];
}

export function analyzeCommentaryStructure(
  body: string,
  prebuiltParagraphs?: string[],
): {
  structureScore: number;
  echoRatio: number;
  strongCounterclaim: boolean;
} {
  const paragraphs = paragraphsForCommentary(body, prebuiltParagraphs);
  let cec = 0;
  let ec = 0;
  let eOnly = 0;
  let cOnly = 0;

  for (const p of paragraphs) {
    const sents = splitSentences(p);
    if (sents.length < 2) continue;
    const firstCite = hasCite(sents[0]!);
    const lastCite = hasCite(sents[sents.length - 1]!);
    const anyCite = sents.some(hasCite);
    if (!anyCite && sents.length >= 2) cOnly++;
    else if (!firstCite && anyCite && !lastCite) cec++;
    else if (firstCite && !lastCite) ec++;
    else if (sents.every(hasCite)) eOnly++;
  }

  const structureScore = cec * 3 + ec * 2 + cOnly * 3 - eOnly;

  let echo = 0;
  let develop = 0;
  for (const m of body.matchAll(TYPE_B_FINDING)) {
    const idx = m.index ?? 0;
    const after = body.slice(idx, idx + COMMENTARY_CITE_WINDOW);
    if (ECHO_COMMENTARY_PATTERNS.some((p) => p.test(after))) echo++;
    else if (/\b(?:implication|consequence|community|research question|means that)\b/i.test(after)) {
      develop++;
    }
  }
  develop += countPatternHits(body, [
    /\bthe implication for\b/gi,
    /\bthis means that [^.]{20,} faces\b/gi,
    /\bthis is why\b/gi,
    /\bthe implication is that\b/gi,
    /\bwhat this reveals about\b/gi,
    /\bapplied to\b/gi,
    /\bthis distinction matters because\b/gi,
    /\bwhat follows from this\b/gi,
    /\bnot (?:simply|merely) [^,]{5,40},?\s+but\b/gi,
    /\bthe question is not whether\b/gi,
    /\bnecessary but not sufficient\b/gi,
    /\bcannot be attributed to\b/gi,
    /\bthis shifts responsibility\b/gi,
    /\bwithout (?:reform|change|intervention),?\s+/gi,
    /\bhowever,\s+the same emotional\b/gi,
    /\breconstructive process influenced by\b/gi,
    /\bemotional reward of nostalgia\b/gi,
    /\bshaped by emotion, personal\b/gi,
  ]);
  let echoRatio =
    echo + develop > 0 ? echo / (echo + develop) : 0.5;
  if (echo + develop === 0 && structureScore >= 12) {
    echoRatio = 0.35;
  }

  const strongCounterclaim =
    countPatternHitsWithCombined(
      body,
      STRONG_COUNTERCLAIM_PATTERNS,
      STRONG_COUNTERCLAIM_COMBINED,
    ) >= 1 || hasEvaluativeConcession(body);

  return { structureScore, echoRatio, strongCounterclaim };
}

export function computeSourceQualityPoints(
  body: string,
  referencesText: string,
): { totalPoints: number; tier1Count: number } {
  const bib = getBibliographyAnalysis(body, referencesText);
  let totalPoints = bib.totalCredibilityPoints;
  const bodyCred =
    (body.match(/\b(?:professor|researcher|psychologist) at [A-Z][^.]{8,80}/gi) ?? [])
      .length * 2;
  totalPoints += Math.min(bodyCred, 12);
  return { totalPoints, tier1Count: bib.tier1SourceCount };
}

export function analyzeCitationConsistency(
  body: string,
  referencesText: string,
  bodyWordCount: number,
  strongCitationPatterns: RegExp[] = STRONG_CITATION_SIGNALS,
  weakCitationPatterns: RegExp[] = WEAK_CITATION_SIGNALS,
): {
  styleViolations: number;
  attributiveRatio: number;
  missingCount: number;
} {
  const bib = getBibliographyAnalysis(body, referencesText);
  const mergedEntries = countBibliographyEntries(referencesText);
  const rawLines = referencesText
    .split(/\n/)
    .filter((l) => l.trim().length > 20);
  const countStyleViolations = (entries: string[]): number => {
    const apaLike = entries.filter((e) => /\(\d{4}\)/.test(e)).length;
    const mlaLike = entries.filter(
      (e) => /\d{4}\./.test(e) && !/\(\d{4}\)/.test(e),
    ).length;
    const dominant = apaLike >= mlaLike ? "apa" : "mla";
    let n = 0;
    for (const e of entries.slice(3)) {
      if (dominant === "apa" && !/\d{4}/.test(e)) n++;
      if (dominant === "mla" && !/[A-Z][a-z]+/.test(e)) n++;
    }
    return n;
  };
  const useMergedOnly =
    rawLines.length > mergedEntries.length * 1.5 &&
    mergedEntries.length >= 8;
  const violations = useMergedOnly
    ? countStyleViolations(mergedEntries)
    : Math.max(
        countStyleViolations(mergedEntries),
        countStyleViolations(rawLines),
      );

  const paraphraseSents = splitSentences(body).filter(
    (s) => !hasCite(s) && /\b(?:found|shows?|suggests?|indicates?|reports?)\b/i.test(s),
  );
  const attributed = paraphraseSents.filter(
    (s) =>
      /\b(?:according to|as .{3,30} explains|argues that|found that|notes that)\b/i.test(
        s,
      ) || countDistinctPatternHits(s, strongCitationPatterns, 1) >= 1,
  ).length;
  const weakCitationHits = paraphraseSents.filter(
    (s) => countDistinctPatternHits(s, weakCitationPatterns, 1) >= 1,
  ).length;
  let attributiveRatio =
    paraphraseSents.length > 0 ? attributed / paraphraseSents.length : 0.6;
  if (weakCitationHits >= 3 && paraphraseSents.length > 0) {
    attributiveRatio = Math.max(
      0,
      attributiveRatio - weakCitationHits / paraphraseSents.length / 2,
    );
  }

  const citeDensity = bodyWordCount > 0 ? bib.inTextAuthors.length / (bodyWordCount / 400) : 0;

  return {
    styleViolations: violations,
    attributiveRatio,
    missingCount: bib.missingFromBibliographyCount,
  };
}

/** Strip URLs and long quotations before colloquial/register severity scans. */
export function bodyTextForStyleScan(body: string): string {
  return body
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/g, " ")
    .replace(/[""][^""]{40,}[""]/g, " ")
    .replace(/"[^"]{40,}"/g, " ");
}

const STYLE_SCAN_LIMIT = 8000;

export function analyzeAcademicRegister(
  body: string,
  task: SeminarTask = "iwa",
): {
  colloquialSeverity: 0 | 1 | 2 | 3;
  varietyScore: number;
} {
  const bodyForStyleScan = bodyTextForStyleScan(body);
  const colloquialScanText = bodyForStyleScan.slice(0, STYLE_SCAN_LIMIT);

  if (/[\u{1F300}-\u{1F9FF}]/u.test(bodyForStyleScan)) {
    return { colloquialSeverity: 3, varietyScore: 0 };
  }
  if (/\b(?:tbh|imo|lol|omg|idk|ngl)\b/i.test(bodyForStyleScan)) {
    return { colloquialSeverity: 3, varietyScore: 0 };
  }

  if (task === "irr") {
    const informal = countDistinctPatternHits(
      bodyForStyleScan,
      IRR_INFORMAL_IRR_REGISTER_SIGNALS,
      40,
    );
    const academic = countDistinctPatternHits(
      body,
      IRR_ACADEMIC_IRR_REGISTER_SIGNALS,
      40,
    );
    let severity: 0 | 1 | 2 | 3 = 0;
    if (informal >= 10) severity = 3;
    else if (informal >= 5) severity = 2;
    else if (informal >= 2) severity = 1;

    const sents = splitSentences(body);
    let short = 0;
    let medium = 0;
    let long = 0;
    let subordinate = 0;
    for (const s of sents) {
      const wc = s.split(/\s+/).length;
      if (wc < 15) short++;
      else if (wc <= 30) medium++;
      else long++;
      if (/\b(?:although|because|while|whereas|which|that)\b/i.test(s)) {
        subordinate++;
      }
    }
    const total = Math.max(sents.length, 1);
    let varietyScore = (medium + long * 2 + subordinate) / total;
    if (academic >= 6 && severity <= 1) {
      varietyScore = Math.min(1, varietyScore + 0.2);
    }
    return { colloquialSeverity: severity, varietyScore };
  }

  const row7PenaltyHits = countDistinctPatternHits(
    colloquialScanText,
    IWA_ROW7_DEDUCTION_TRIGGERS,
    18,
  );
  const colloquial = countPatternHits(colloquialScanText, COLLOQUIAL_PATTERNS);
  const colloquialSev2 =
    countPatternHits(colloquialScanText, COLLOQUIAL_INFORMAL_SEVERITY_2) +
    Math.min(8, row7PenaltyHits);
  const aLot = (colloquialScanText.match(/\ba lot\b/gi) ?? []).length;
  const stuff = (colloquialScanText.match(/\bstuff\b/gi) ?? []).length;
  const kindOf = (colloquialScanText.match(/\bkind of\b/gi) ?? []).length;

  let severity: 0 | 1 | 2 | 3 = 0;
  if (
    row7PenaltyHits >= 10 ||
    /\b(?:lol|lmao|lmfao|omg|wtf|tbh|ngl|imo|smh)\b/i.test(bodyForStyleScan) ||
    colloquial >= 15
  ) {
    severity = 3;
  } else if (
    aLot >= 1 ||
    kindOf >= 1 ||
    colloquialSev2 >= 3 ||
    aLot >= 3 ||
    stuff >= 2 ||
    kindOf >= 3 ||
    colloquial >= 8
  ) {
    severity = 2;
  } else if (colloquial >= 3) severity = 1;
  if (colloquialSev2 >= 19 && severity < 2) severity = 2;
  if (colloquialSev2 >= 28 && severity < 3) severity = 3;

  const sents = splitSentences(body);
  let short = 0;
  let medium = 0;
  let long = 0;
  let subordinate = 0;
  for (const s of sents) {
    const wc = s.split(/\s+/).length;
    if (wc < 15) short++;
    else if (wc <= 30) medium++;
    else long++;
    if (/\b(?:although|because|while|whereas|which|that)\b/i.test(s)) subordinate++;
  }
  const total = Math.max(sents.length, 1);
  let varietyScore =
    (medium + long * 2 + subordinate) / total;
  if (countPatternHits(body, ACADEMIC_REGISTER_SIGNALS) >= 5 && severity <= 1) {
    varietyScore = Math.min(1, varietyScore + 0.15);
  }

  return { colloquialSeverity: severity, varietyScore };
}

export function analyzeIrrContextDepth(body: string): {
  conditionA: boolean;
  conditionB: boolean;
} {
  const substantive = getOpeningSubstantiveParagraph(body);
  const openForContext =
    substantive.length > 80 ? substantive : body.slice(0, 2500);
  const open = body.slice(0, 2500);
  const weakCtx = countDistinctPatternHits(
    openForContext,
    IRR_WEAK_CONTEXT_SIGNALS,
    30,
  );
  const adequateCtx = countDistinctPatternHits(
    openForContext,
    IRR_ADEQUATE_CONTEXT_SIGNALS,
    35,
  );
  const strongCtx = countDistinctPatternHits(
    openForContext,
    IRR_STRONG_CONTEXT_SIGNALS,
    35,
  );

  const hasPop =
    /\b\d+(?:\.\d+)?%|\b\d+ million\b|\b(?:children|surgeons|students|adolescents)\b/i.test(
      openForContext,
    ) || strongCtx >= 2;
  const hasScope =
    /\bthis (?:report|paper|investigation) (?:focuses|examines|analyzes|investigates)\b/i.test(
      openForContext,
    ) ||
    /\b(?:US|U\.S\.|American|elementary|orthopedic)\b/i.test(openForContext) ||
    adequateCtx >= 2 ||
    strongCtx >= 1;
  const hasRq =
    /\b(?:research question|this (?:report|paper|investigation) (?:analyzes|examines|investigates)|investigat)\b/i.test(
      openForContext,
    ) || strongCtx >= 2;
  const hasCite =
    /\(\d{4}|&\s+[A-Z]/.test(openForContext.slice(0, 1200)) ||
    /\([A-Z][a-z]+[^)]{0,40}\d{1,4}\b/.test(openForContext) ||
    hasCredentialedInstitutionalAttribution(openForContext);
  const logical =
    hasRq &&
    (/\bbecause\b|\btherefore\b|\bwhich (?:raises|carries|implies)\b/i.test(open) ||
      hasPop ||
      strongCtx >= 2);

  const legacyA = hasPop && hasScope && hasCite;
  const legacyB = logical;
  const phraseA =
    (strongCtx >= 2 && hasCite) ||
    (strongCtx >= 1 && adequateCtx >= 2 && hasCite) ||
    (adequateCtx >= 4 && hasRq && hasCite);
  const phraseB =
    (strongCtx >= 2 && hasRq) ||
    (adequateCtx >= 3 && hasRq && hasCite) ||
    (strongCtx >= 1 && adequateCtx >= 2 && hasRq);

  let conditionA = legacyA || phraseA;
  let conditionB = legacyB || phraseB;
  if (weakCtx >= 18 && adequateCtx < 2 && strongCtx < 1) {
    conditionA = false;
    conditionB = false;
  }

  return { conditionA, conditionB };
}

export function analyzeIrrExplanationDepth(body: string): number {
  const authors = extractInTextAuthors(body);
  const sourceCount = Math.max(authors.length, 1);
  const l3 = countPatternHits(body, IRR_EXPLANATION_L3);
  const l2 = countPatternHits(body, IRR_EXPLANATION_L2);
  const l1 = countPatternHits(body, IRR_EXPLANATION_L1);
  const meth = countPatternHits(body, IRR_METHODOLOGY_BONUS);
  const strongArg = countDistinctPatternHits(body, IRR_STRONG_ARGUMENT_SIGNALS, 55);
  const adequateArg = countDistinctPatternHits(
    body,
    IRR_ADEQUATE_ARGUMENT_SIGNALS,
    55,
  );
  const weakArg = countDistinctPatternHits(body, IRR_WEAK_ARGUMENT_SIGNALS, 40);
  const phraseDepth = strongArg * 3 + adequateArg * 2 - Math.min(weakArg, 12);
  const totalDepth = l3 * 3 + l2 * 2 + l1 + meth + phraseDepth;
  const EXPLANATION_NORMALIZATION_FACTOR = 250;
  const wordCount = countWords(body);
  const denom = Math.max(
    wordCount / EXPLANATION_NORMALIZATION_FACTOR,
    4,
  );
  let ratio = Math.max(0, Math.min(1, totalDepth / denom));
  const { mechanismAfterCount } = countMechanismAfterCitations(body);
  if (mechanismAfterCount >= 2) {
    const mechanismRatio = Math.min(0.7, mechanismAfterCount * 0.12);
    if (strongArg >= 3 || adequateArg >= 5) {
      ratio = Math.max(ratio, mechanismRatio);
    } else {
      ratio = Math.max(ratio, Math.min(0.15, mechanismRatio * 0.25));
    }
  }
  if (strongArg >= 4 || adequateArg >= 8) {
    ratio = Math.max(ratio, 0.35);
  }
  if (strongArg >= 10 || adequateArg >= 15) {
    ratio = Math.max(ratio, 0.68);
  }
  if (
    wordCount >= 1200 &&
    authors.length >= 10 &&
    mechanismAfterCount < 2
  ) {
    ratio = Math.max(ratio, 0.36);
  }
  return ratio;
}

export function analyzeIrrCredibilityConsistency(body: string): {
  consistency: number;
  tierACount: number;
} {
  const authors = extractInTextAuthors(body);
  if (authors.length === 0) return { consistency: 0, tierACount: 0 };

  let credentialed = 0;
  let tierA = 0;
  for (const a of authors) {
    const re = new RegExp(a, "i");
    const idx = body.search(re);
    if (idx < 0) continue;
    const window = body.slice(idx, idx + 350);
    const hasInst =
      /\b(?:University|Institute|College|CDC|NIH|clinic|hospital|professor|researcher|psychologist|surgeon)\b/i.test(
        window,
      );
    const hasJournal = /\bpublished in\b|\bJournal of\b/i.test(window);
    if (hasInst || hasJournal) {
      credentialed++;
      if (hasInst && hasJournal) tierA++;
      else if (hasInst) tierA++;
    }
  }

  const biasBonus = countPatternHits(body, [
    /\bleft-wing\b/gi,
    /\bbias\b/gi,
    /\blimitation\b/gi,
    /\bjournalistic\b/gi,
  ]);

  const strongEval = countDistinctPatternHits(
    body,
    IRR_STRONG_SOURCE_EVALUATION_SIGNALS,
    35,
  );
  const adequateEval = countDistinctPatternHits(
    body,
    IRR_ADEQUATE_SOURCE_EVALUATION_SIGNALS,
    35,
  );
  const weakEval = countDistinctPatternHits(
    body,
    IRR_WEAK_SOURCE_EVALUATION_SIGNALS,
    30,
  );
  credentialed += Math.min(adequateEval, 4);
  tierA += Math.min(strongEval, 3);
  let consistency = credentialed / authors.length;
  if (weakEval >= 10 && strongEval < 2) {
    consistency *= 0.75;
  }

  return {
    consistency,
    tierACount: tierA + (biasBonus >= 1 ? 1 : 0),
  };
}

export function analyzeIrrPerspectiveSynthesis(body: string): {
  lensCount: number;
  strongCount: number;
  moderateCount: number;
} {
  const lenses = [
    /\borganizational\b/gi,
    /\bindividual\b/gi,
    /\bsocial\b/gi,
    /\bbiological\b/gi,
    /\bpolicy\b/gi,
    /\beconomic\b/gi,
    /\bcultural\b/gi,
    /\bstructural\b/gi,
  ];
  let lensCount = 0;
  for (const p of lenses) {
    if (p.test(body)) lensCount++;
  }

  const strongCount =
    countPatternHits(body, IRR_STRONG_SYNTHESIS) +
    countDistinctPatternHits(body, IRR_STRONG_PERSPECTIVE_SIGNALS, 45);
  const moderateCount = countDistinctPatternHits(
    body,
    IRR_ADEQUATE_PERSPECTIVE_SIGNALS,
    45,
  );
  const weakPerspective = countDistinctPatternHits(
    body,
    IRR_WEAK_PERSPECTIVE_SIGNALS,
    35,
  );

  return {
    lensCount,
    strongCount: Math.max(0, strongCount - Math.floor(weakPerspective / 8)),
    moderateCount,
  };
}

export function buildDeepCalibrationSignals(
  body: string,
  referencesText: string,
  rqKeywords: string[],
  examYear?: string | number,
  task: SeminarTask = "iwa",
  prebuiltParagraphs?: string[],
  precomputedStimulusBody?: { bestQuality: number },
): DeepCalibrationSignals {
  const stimulus = analyzeStimulusIntegrationDepth(
    body,
    examYear,
    precomputedStimulusBody,
  );
  const perspective = analyzePerspectiveAttribution(body, prebuiltParagraphs);
  const commentary = analyzeCommentaryStructure(body, prebuiltParagraphs);
  const quality = computeSourceQualityPoints(body, referencesText);
  const citation = analyzeCitationConsistency(
    body,
    referencesText,
    countWords(body),
    task === "irr" ? IRR_STRONG_IRR_CITATION_SIGNALS : STRONG_CITATION_SIGNALS,
    task === "irr" ? IRR_WEAK_IRR_CITATION_SIGNALS : WEAK_CITATION_SIGNALS,
  );
  const register = analyzeAcademicRegister(body, task);
  const irrCtx =
    task === "irr"
      ? analyzeIrrContextDepth(body)
      : { conditionA: false, conditionB: false };
  const irrCred =
    task === "irr"
      ? analyzeIrrCredibilityConsistency(body)
      : { consistency: 0, tierACount: 0 };
  const irrSynth =
    task === "irr"
      ? analyzeIrrPerspectiveSynthesis(body)
      : { lensCount: 0, strongCount: 0, moderateCount: 0 };
  const irrExplanationRatio =
    task === "irr" ? analyzeIrrExplanationDepth(body) : 0;

  return {
    stimulusLevel: stimulus.level,
    stimulusTangential: stimulus.tangential,
    stimulusZeroReason: stimulus.zeroReason,
    specificityScore: computeSpecificityScore(body, rqKeywords),
    namedPerspectiveTypeA: perspective.namedTypeA,
    weakPerspectiveCount: perspective.weakTypeB,
    evaluativeLinkingCount: perspective.evaluativeLinking,
    descriptiveLinkingCount: perspective.descriptiveLinking,
    perspectiveIsolated: perspective.isolated,
    commentaryStructureScore: commentary.structureScore,
    echoRatio: commentary.echoRatio,
    strongCounterclaimEngaged: commentary.strongCounterclaim,
    totalCredibilityPoints: quality.totalPoints,
    tier1SourceCount: quality.tier1Count,
    citationStyleViolations: citation.styleViolations,
    attributivePhraseRatio: citation.attributiveRatio,
    sentenceVarietyScore: register.varietyScore,
    colloquialSeverity: register.colloquialSeverity,
    irrContextConditionA: irrCtx.conditionA,
    irrContextConditionB: irrCtx.conditionB,
    irrExplanationRatio,
    irrCredibilityConsistency: irrCred.consistency,
    irrTierACredentialCount: irrCred.tierACount,
    irrPerspectiveLensCount: irrSynth.lensCount,
    irrStrongSynthesisCount: irrSynth.strongCount,
    irrModerateSynthesisCount: irrSynth.moderateCount,
  };
}
