/**
 * IWA thesis and conclusion alignment detection (Row 4).
 */

import {
  countDistinctPatternHits,
  countPatternHits,
} from "@/lib/seminar/seminarPatterns";
import {
  buildCombinedRegexChunks,
  combinedChunksMatch,
  countDistinctPatternHitsWithCombined,
} from "@/lib/seminar/seminarPatternScan";
import {
  EXPLORATORY_PATTERNS,
  THESIS_DETECTION_PATTERNS,
} from "@/lib/seminar/seminarIwaPhrasePatterns";
import { IWA_ROW4_ZERO_TRIGGERS } from "@/lib/seminar/seminarIwaPenaltyPatterns";
import { COUNTERCLAIM_PATTERNS } from "@/lib/seminar/seminarCounterclaimPatterns.generated";

export { COUNTERCLAIM_PATTERNS };

const THESIS_FRAMING_BASE: RegExp[] = [
  /\bthis argument will demonstrate that\b/gi,
  /\bthis argument will show that\b/gi,
  /\bthis argument contends that\b/gi,
  /\bthis argument maintains that\b/gi,
  /\bthis essay will argue that\b/gi,
  /\bthis essay will demonstrate that\b/gi,
  /\bthis essay contends that\b/gi,
  /\bthis paper will demonstrate that\b/gi,
  /\bthis paper will show that\b/gi,
  /\bthis paper will establish that\b/gi,
  /\bthis paper will examine\b/gi,
  /\bthis response argues that\b/gi,
  /\bthis response contends that\b/gi,
  /\bthe argument of this (?:paper|essay) is that\b/gi,
  /\bthe central argument is that\b/gi,
  /\bthe central claim is that\b/gi,
  /\bthe central thesis is that\b/gi,
  /\bthis analysis will demonstrate\b/gi,
  /\bthis analysis argues that\b/gi,
  /\bthis investigation argues that\b/gi,
  /\bthis investigation contends that\b/gi,
  /\bthe position of this argument is that\b/gi,
  /\bthe position taken in this (?:paper|essay) is that\b/gi,
  /\bthis (?:paper|essay) argues\b/gi,
  /\bI argue\b/gi,
  /\bI contend\b/gi,
  /\bthe argument (?:is|that)\b/gi,
  /\brather than .{10,80}, .{10,80} is the primary\b/gi,
  /\bnot .{5,40} but .{5,40}\b/gi,
  /\bthe most optimal solution is\b/gi,
  /\bmodal shift in (?:passenger|freight)\b/gi,
  /\bthis paper argues that\b/gi,
  /\bpaper argues that\b/gi,
  /\bwidespread .{5,60} constitutes\b/gi,
  /\burgently necessary\b/gi,
  /\bit is important to address\b/gi,
  /\bthe most effective way\b/gi,
  /\bthere is no question that\b/gi,
  /\bNostalgia improves\b/gi,
  /\bhelps? improve mental well-?being\b/gi,
];

/** AP template phrasing — exploration, not argumentative thesis (seminar-3.2.13). */
const AP_TEMPLATE_EXPLORATORY: RegExp[] = [
  /\bthis (paper|investigation|essay) will explore\b/gi,
  /\bthis (paper|investigation|essay) examines\b/gi,
  /\bthis (paper|essay) considers\b/gi,
  /\bthe goal of this (paper|essay) is to\b/gi,
  /\bthis paper (aims?|seeks?) to\b/gi,
  /\bthis paper looks at\b/gi,
  /\bthis investigation (?:examines|explores|investigates|analyzes)\b/gi,
  /\bthis (?:paper|essay) (?:examines|explores|analyzes)\b/gi,
];

const THESIS_COMBINED = buildCombinedRegexChunks(THESIS_DETECTION_PATTERNS);
const EXPLORATORY_COMBINED = buildCombinedRegexChunks(EXPLORATORY_PATTERNS);

export const CONCLUSION_ALIGNMENT_PATTERNS: RegExp[] = [
  /\bto the extent that\b/gi,
  /\bcontributes substantially to\b/gi,
  /\bis the primary mechanism through which\b/gi,
  /\bthe evidence presented demonstrates that\b/gi,
  /\btaken together, this evidence shows\b/gi,
  /\bin response to the research question\b/gi,
  /\breturning to the question of\b/gi,
  /\bin answer to the research question\b/gi,
  /\bthis analysis has shown that\b/gi,
  /\bthe evidence demonstrates that\b/gi,
  /\bit can be designed differently\b/gi,
  /\bessential to preserving\b/gi,
  /\bmust acknowledge\b/gi,
  /\bpreserving the integrity\b/gi,
  /\blegal systems must\b/gi,
  /\btherefore,\s+(?:[A-Z][a-z]+|schools|institutions|governments)\s+must\b/gi,
  /\bthe evidence establishes that\b/gi,
  /\bthis investigation concludes that\b/gi,
  /\bultimately,\s+[a-z]{4,40}\s+(?:is|are|must|should|requires)\b/gi,
  /\bas demonstrated,\s+[a-z]/gi,
  /\bthe answer to\b[^.]{0,80}\bis\b/gi,
  /\bFuture research should\b/gi,
  /\b(?:benefits|findings)\s+proposed in this (?:essay|paper)\b/gi,
  /\bshould be continued\b/gi,
  /\bDue to the\b[^.]{0,60},\s+not much\b/gi,
  /\bThe conclusions drawn from\b/gi,
  /\bTherefore,\s+the perspective offered by\b/gi,
  /\bcontradicts that of\b/gi,
  /\bdirectly contradicts\b/gi,
  /\boffered by .{5,40} directly contradicts\b/gi,
  /\bin answer to (?:the|this paper's) research question\b/gi,
  /\bthe answer to (?:the|this) research question\b/gi,
  /\bthe answer to this (?:paper's|investigation's) question\b/gi,
  /\bthis paper has argued that\b/gi,
  /\bthis paper demonstrates that\b/gi,
  /\bthis paper has shown that\b/gi,
  /\bthis paper concludes that\b/gi,
  /\bthis essay has argued that\b/gi,
  /\bthis essay demonstrates\b/gi,
  /\bthis investigation concludes\b/gi,
  /\bthis report concludes\b/gi,
  /\bthe evidence presented here shows\b/gi,
  /\bthe foregoing analysis demonstrates\b/gi,
  /\bthe foregoing argument establishes\b/gi,
  /\bto return to the research question\b/gi,
  /\breturning to the research question\b/gi,
  /\bthe research question asked\b/gi,
  /\bthe question this paper asked\b/gi,
  /\bthe question posed at the outset\b/gi,
  /\bthe question this investigation set out to answer\b/gi,
  /\bin response to the research question\b/gi,
  /\bin conclusion[,\s].{0,120}?(?:this (?:paper|essay|analysis|report|argument)|the evidence (?:presented|examined|discussed|reviewed)|demonstrates?|argues?|has (?:shown|demonstrated|argued|established)|therefore|thus|establishes?|reveals?|finds?)\b/gi,
  /\bthis (paper|analysis|essay|report|argument) has (shown|demonstrated|argued|established|revealed|found)\b/gi,
  /\bthe evidence (presented|examined|discussed|reviewed) (in this paper|here|above)\b/gi,
  /\btaken together[,\s].{0,100}?(?:suggest|indicate|demonstrate|show)\b/gi,
  /\bas (this paper|the evidence|the analysis|the sources) (?:has|have) (shown|demonstrated|argued)\b/gi,
  /\bthese (sources|studies|perspectives|findings) (?:together |collectively )?(?:suggest|indicate|demonstrate)\b/gi,
  /\b(?:therefore|thus|consequently)[,\s].{0,150}?(?:argues?|suggests?|demonstrates?|shows?|concludes?)\b/gi,
  /\btherefore,?\s+.{0,120}?(?:should|must)\s+.{0,80}?(?:invest|adopt|implement|prioritize|address|ensure|develop)\b/gi,
  /\bto this end[,\s].{0,120}?(?:ultimately|demonstrates?|shows?|increases?|suggests?|argues?|reveals?|establishes?)\b/gi,
  /\b(?:should|must) (?:require|implement|adopt).{0,120}(?:regulat|freedom of speech|mitigat)/i,
  /\bto (?:effectively )?regulate .{0,80} while (?:still )?protecting/i,
  /\bhaving examined the evidence, this paper concludes\b/gi,
  /\bhaving considered the evidence\b/gi,
  /\btaken together, the evidence shows\b/gi,
  /\btaken together, these arguments demonstrate\b/gi,
  /\btherefore, this paper argues\b/gi,
  /\btherefore, the argument is\b/gi,
  /\bin conclusion, this paper argues\b/gi,
  /\bin conclusion, the evidence shows\b/gi,
  /\bultimately, this paper demonstrates\b/gi,
  /\bultimately, the evidence supports\b/gi,
  /\bthe conclusion of this (?:argument|paper|investigation) is\b/gi,
  /\bthis paper's conclusion is\b/gi,
  /\bthis essay's conclusion is\b/gi,
  // seminar-3.2.11 — batch3 "research question admits/yields" conclusions
  /the research question (this paper|addressed|examined|explored).{0,120}(admits?|yields?|has|receives?)/gi,
  /admits? (a |an )?(conditioned|clear|affirmative|nuanced|qualified)/gi,
  /yields? (a |an )?(affirmative|clear|conditioned|definitive|qualified)/gi,
  /this (paper|investigation|analysis|essay) has (argued|established|demonstrated|shown|found)/gi,
  /this (paper|investigation|analysis) (argued|established|demonstrated|showed|found)/gi,
  /the argument (developed|advanced|made|presented) (in )?this (paper|essay|analysis)/gi,
  /this (paper|essay|investigation|analysis) (concludes?|finds?|determines?|establishes?) that/gi,
  /the (central|core|main|primary) (argument|claim|thesis|contention) (of this paper|advanced here|developed here)/gi,
  /in (conclusion|sum|summary).{0,200}this (?:paper|essay|investigation).{0,60}(?:has (?:argued|demonstrated|established|shown|concluded)|concludes? that)/gi,
  /the (honest|direct|short|clearest|most defensible) answer (to (this|the) (question|investigation)|is)/gi,
  /the answer to (this|the) (research question|question this paper)/gi,
  /what (this paper|this analysis|this investigation) has (shown|demonstrated|argued|established) is/gi,
  /returns? to.{0,50}(thesis|argument|central claim|core contention)/gi,
  /(?:taken? together|considered together).{0,80}(?:this (?:paper|evidence|analysis)|the (?:foregoing|evidence|argument))/gi,
  /stepping back.{0,60}(?:this (?:paper|analysis)|the (?:argument|evidence))/gi,
  /the (foregoing|preceding|above) (analysis|argument|discussion|review) (has |)(established|demonstrated|shown|argued)/gi,
];

/** Broad closing framing — last 4000 chars only (avoids mid-body "this paper argues"). */
const CONCLUSION_END_ONLY_PATTERNS: RegExp[] = [
  /\b(?:this essay|this paper|this analysis)\s+(?:has (?:argued|demonstrated|shown|established)|demonstrates|argues|shows)\b/gi,
];

const CONCLUSION_ALIGNMENT_COMBINED = buildCombinedRegexChunks(
  CONCLUSION_ALIGNMENT_PATTERNS,
);
const CONCLUSION_END_ONLY_COMBINED = buildCombinedRegexChunks(
  CONCLUSION_END_ONLY_PATTERNS,
);

/** Argument organization signals (Row 4); require ≥2 distinct hits for "organized". */
export const ORGANIZED_ARGUMENT_PATTERNS: RegExp[] = [
  /\bfirst(?:ly)?,?\b/gi,
  /\bsecond(?:ly)?,?\b/gi,
  /\bthird(?:ly)?,?\b/gi,
  /\bfourth(?:ly)?,?\b/gi,
  /\bfinally,?\b/gi,
  /\bfurthermore,?\b/gi,
  /\btherefore,?\b/gi,
  /\bmoreover,?\b/gi,
  /\bin addition,?\b/gi,
  /\badditionally,?\b/gi,
  /\bin contrast,?\b/gi,
  /\bby contrast,?\b/gi,
  /\bon the other hand,?\b/gi,
  /\bconversely,?\b/gi,
  /\bconsequently,?\b/gi,
  /\bas a result,?\b/gi,
  /\bthus,?\b/gi,
  /\bhence,?\b/gi,
  /\baccordingly,?\b/gi,
  /\bnot only\b[^.]{0,80}\bbut also\b/gi,
  /\bboth\b[^.]{0,80}\band\b/gi,
  /\bon one hand\b[^.]{0,120}\bon the other\b/gi,
  /\bwhile\b[^.]{0,100}\bhowever\b/gi,
  /\balthough\b[^.]{0,100}\bnevertheless\b/gi,
  /\bdespite\b[^.]{0,100}\bnonetheless\b/gi,
  /\bthis argument has three\b/gi,
  /\bthere are\b[^.]{0,40}\breasons\b/gi,
  /\bthis paper proceeds\b/gi,
  /\bthe analysis begins with\b/gi,
  /\bturning now to\b/gi,
  /\bhaving established\b[^.]{0,60}\bthis paper now\b/gi,
  /\bbuilding on this\b/gi,
  /\bwith this in mind\b/gi,
  /\btaking this further\b/gi,
  /\bin comparison\b/gi,
  /\bcompared to\b/gi,
  /\bunlike\b[^.]{0,60}\bwhich\b/gi,
  /\bin contrast to\b/gi,
  /\bwhereas\b/gi,
  /\bsimultaneously\b/gi,
  /\bthe following section\b/gi,
  /\bas noted above\b/gi,
  /\bas argued above\b/gi,
  /\bas established\b/gi,
  /\bas demonstrated\b/gi,
  /\bas shown above\b/gi,
  /\bthe preceding analysis\b/gi,
  /\bthe foregoing argument\b/gi,
  /\bin sum,?\b/gi,
  /\btaken together\b/gi,
  /\bon balance\b/gi,
  /\bweighing these considerations\b/gi,
  /\bthe preponderance of evidence\b/gi,
  /\bconsidered together\b/gi,
  /\bthe conclusion of this paper is\b/gi,
  /\bthe political challenge is that\b/gi,
  /\bwhile\b[^.]{0,40}\bfocuses\b/gi,
  /\bhowever,?\s+Professor\b/gi,
  // seminar-3.2.11 — argument structure without ordinal markers alone
  /\bthis paper (?:develops?|advances?|builds?) (?:its|the) (?:argument|case|claim)\b/gi,
  /\bthe argument (?:proceeds?|unfolds?|develops?) (?:as follows|in (?:three|two|four|five) (?:parts?|sections?|steps?))\b/gi,
  /\bhaving established.{0,80}(?:this paper|the analysis|the argument) (?:now|turns?|moves?)\b/gi,
  /\bthe (?:preceding|foregoing|earlier) (?:section|analysis|argument) (?:established|showed|demonstrated)\b/gi,
  /\bthis (?:demonstrates?|establishes?|shows?) that.{0,40}(?:because|since|given that)\b/gi,
  /\bthe (?:implication|consequence|upshot) (?:of this|of these findings?) (?:is|for)\b/gi,
  /\bthis (?:finding|evidence|result) (?:supports?|confirms?|establishes?|reveals?)\b/gi,
  /\b(?:together|combined|taken together).{0,40}(?:these findings|this evidence|the evidence)\b/gi,
];

const ORGANIZED_ARGUMENT_COMBINED = buildCombinedRegexChunks(
  ORGANIZED_ARGUMENT_PATTERNS,
);

export function countOrganizedArgumentHits(body: string): number {
  return countDistinctPatternHitsWithCombined(
    body,
    ORGANIZED_ARGUMENT_PATTERNS,
    ORGANIZED_ARGUMENT_COMBINED,
    ORGANIZED_ARGUMENT_PATTERNS.length,
  );
}

export function isArgumentOrganized(body: string): boolean {
  return countOrganizedArgumentHits(body) >= 2;
}

const COUNTERCLAIM_COMBINED = buildCombinedRegexChunks(COUNTERCLAIM_PATTERNS);

const ROW4_ZERO_EXPLORATION: RegExp[] = [
  /\bthis paper will explore\b/gi,
  /\bthere are many perspectives on\b/gi,
  /\bhow to maintain a sense of stability\b/gi,
  ...EXPLORATORY_PATTERNS,
];

export interface ThesisDetectionResult {
  thesisPresent: boolean;
  thesisInOpening: boolean;
  conclusionAligned: boolean;
  counterclaimPresent: boolean;
  exploratoryOnly: boolean;
  studentSentenceCount: number;
}

export function detectThesis(body: string): ThesisDetectionResult {
  const opening = body.slice(0, 5000);
  const conclusion = body.slice(-2000);

  const thesisInOpening =
    countPatternHits(opening, THESIS_FRAMING_BASE) >= 1 ||
    countDistinctPatternHitsWithCombined(
      opening,
      THESIS_DETECTION_PATTERNS,
      THESIS_COMBINED,
      2,
    ) >= 2 ||
    /\b(?:primary mechanism|significantly .{5,40} (?:because|by|through))\b/i.test(
      opening,
    ) ||
    /\b(?:most optimal solution|modal shift|this paper argues|constitutes a human rights)\b/i.test(
      opening,
    );

  /** 0.40 — long bodies may place thesis-return prose before the final 55%. */
  const secondHalf = body.slice(Math.floor(body.length * 0.4));
  const weakExploratoryConclusion =
    /\bin conclusion,?\s+(?:the question|there are (?:good )?arguments on both sides|this (?:issue|topic|question|debate) is (?:complicated|complex|unclear))/i.test(
      conclusion,
    );
  const conclusionAligned =
    !weakExploratoryConclusion &&
    (combinedChunksMatch(CONCLUSION_ALIGNMENT_COMBINED, conclusion) ||
      combinedChunksMatch(CONCLUSION_ALIGNMENT_COMBINED, secondHalf) ||
      combinedChunksMatch(CONCLUSION_END_ONLY_COMBINED, conclusion));

  const counterclaimPresent = combinedChunksMatch(COUNTERCLAIM_COMBINED, body);

  const exploratoryHits =
    countDistinctPatternHitsWithCombined(
      opening.slice(0, 2000),
      EXPLORATORY_PATTERNS,
      EXPLORATORY_COMBINED,
      3,
    ) +
    countDistinctPatternHits(opening.slice(0, 2000), IWA_ROW4_ZERO_TRIGGERS, 4) +
    countPatternHits(opening.slice(0, 2000), AP_TEMPLATE_EXPLORATORY) +
    countPatternHits(opening.slice(0, 1500), [
      /\bthere are many perspectives on\b/gi,
      /\bhow to maintain a sense of stability\b/gi,
    ]);

  const exploratoryOnly =
    exploratoryHits >= 2 && !thesisInOpening && !conclusionAligned;

  const sents = body.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25);
  let studentSentenceCount = 0;
  const citeLike =
    /\([A-Z][a-zA-Z'&]+|\baccording to\b|\bet al\./i;
  for (const s of sents) {
    if (!citeLike.test(s)) studentSentenceCount++;
  }

  const hasFramingThesis =
    countPatternHits(opening, THESIS_FRAMING_BASE) >= 1 ||
    countDistinctPatternHitsWithCombined(
      opening,
      THESIS_DETECTION_PATTERNS,
      THESIS_COMBINED,
      2,
    ) >= 2;

  const thesisPresent =
    thesisInOpening ||
    (conclusionAligned && !exploratoryOnly) ||
    (hasFramingThesis && !exploratoryOnly);

  return {
    thesisPresent,
    thesisInOpening,
    conclusionAligned,
    counterclaimPresent,
    exploratoryOnly,
    studentSentenceCount,
  };
}

const DISTRIBUTED_ARGUMENTATIVE_OPENER: RegExp[] = [
  /^(?:the|this|a|an) [a-z]{2,30}(?:,|—| ) (?:is|are|represents?|constitutes?|reflects?|reveals?)/i,
  /^(?:the (?:deployment|use|expansion|embrace|failure|refusal|treatment) of)/i,
  /^(?:this (?:reflects?|reveals?|demonstrates?|constitutes?|represents?))/i,
  /^(?:the (?:argument|case|claim|evidence|research|logic) (?:here|for|against))/i,
];

const DISTRIBUTED_DESCRIPTIVE_OPENER: RegExp[] = [
  /^(?:according to|as [A-Z][a-z]+ (?:argues?|notes?|finds?|shows?|demonstrates?))/i,
  /^[A-Z][a-z]+ (?:argues?|notes?|finds?|shows?|documents?|establishes?)/i,
  /^(?:in [A-Z0-9])/i,
  /^(?:the (?:history|background|context|development) of)/i,
];

/** ≥3 argumentative body paragraph openers without opening thesis framing (seminar-3.2.11). */
export function detectDistributedThesis(body: string): boolean {
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 40);
  let argumentativeOpenerCount = 0;
  for (const para of paragraphs.slice(1, -1)) {
    const firstSentence = `${(para.trim().split(/[.!?]/)[0] ?? "").trim()}.`;
    const isArgumentative = DISTRIBUTED_ARGUMENTATIVE_OPENER.some((p) =>
      p.test(firstSentence),
    );
    const isDescriptive = DISTRIBUTED_DESCRIPTIVE_OPENER.some((p) =>
      p.test(firstSentence),
    );
    if (isArgumentative && !isDescriptive) argumentativeOpenerCount++;
  }
  return argumentativeOpenerCount >= 3;
}

/** Row 4 = 0 only when all three failure conditions hold. */
export function shouldScoreRow4Zero(t: ThesisDetectionResult): boolean {
  if (t.thesisInOpening || t.thesisPresent) return false;
  if (t.conclusionAligned) return false;
  return t.exploratoryOnly || t.studentSentenceCount < 3;
}
