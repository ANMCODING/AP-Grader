/**
 * seminar-3.2.4 / 3.2.5 / 3.2.6 — Batch calibration signals (IWA/IRR discrimination).
 * seminar-3.2.14 — IRR analytical attribution / evaluative perspective paths.
 */
import { countPatternHits, countDistinctPatternHits } from "@/lib/seminar/seminarPatterns";
import {
  extractDistinctInTextAuthorSurnames,
  extractInTextCitations,
} from "@/lib/seminar/seminarInTextCitations";
import { extractInTextCitationRefs } from "@/lib/seminar/seminarBibliographyLinking";
import {
  IRR_ALL_METHODOLOGY_SIGNALS,
  IRR_CAL324_METHODOLOGY_SCAN,
} from "@/lib/seminar/seminarMethodology";

export { IRR_ALL_METHODOLOGY_SIGNALS, IRR_CAL324_METHODOLOGY_SCAN };

const HEDGED_THESIS = [
  /\bmay be warranted\b/gi,
  /\bmight be warranted\b/gi,
  /\bprobably warranted\b/gi,
  /\bseems? (?:clear|likely) that\b/gi,
  /\bthe answer (?:seems?|appears?) to depend\b/gi,
  /\bdoes not yet have a clear answer\b/gi,
  /\bquestion remains (?:open|unresolved|contested)\b/gi,
  /\breasonable people can (?:reach|come to) different conclusions\b/gi,
  /\bboth sides (?:raise|have) legitimate\b/gi,
  /\bweigh the different concerns\b/gi,
  // Hedged thesis without commitment (seminar-3.2.10)
  /\bwhile (?:both sides|there (?:is|are)).{0,40}(?:some )?evidence/i,
  /\bthe (?:evidence|research|literature|picture).{0,80}(?:suggests?|indicates?|points? toward|is consistent with).{0,80}(?:that|some|a)/i,
  /\bany (?:strong|firm|definitive|clear).{0,40}conclusions?.{0,40}need to be held with (?:some|appropriate) caution/i,
  /\bany (?:strong|firm|definitive|clear).{0,30}conclusions?.{0,80}(?:must be held|should be (?:viewed|treated)|need to be) with (?:some|appropriate) caution/i,
  /\bdoes not (?:easily|cleanly|straightforwardly) support (?:either|any single)/i,
];

const BOTH_SIDES_CONCLUSION = [
  /\bboth (?:sides|perspectives) (?:raise|have) legitimate\b/gi,
  /\bdifferent people (?:may|can|might) reach different conclusions\b/gi,
  /\bthe (?:debate|question) (?:involves|entails) genuine complexity\b/gi,
  /\breasonable people can (?:and do )?disagree\b/gi,
  /\bthe question remains (?:open|unresolved)\b/gi,
  /\bnot something that more research alone is likely to resolve\b/gi,
  /\bboth proponents and critics raise legitimate\b/gi,
];

const COMMITTED_POSITION = [
  /\bthis (?:paper|essay|investigation|report) argues that\b/gi,
  /\bthis (?:paper|essay) (?:contends|maintains|demonstrates) that\b/gi,
  /\bthe (?:central|core) (?:argument|claim) (?:of this|is that)\b/gi,
  /\bI argue that\b/gi,
  /\bthe evidence (?:establishes|demonstrates|shows) that\b/gi,
  /\bthe answer (?:to the research question )?is\b/gi,
  /\badmits a clear\b/gi,
  /\bclear and empirically grounded answer\b/gi,
];

const DESCRIPTIVE_OPENER = [
  /^(?:Social media|Video games|Universal basic income|Fast fashion|Microplastic|In recent years|For a long time|There (?:has|have) been)\b/i,
  /^(?:Many |Most |Several )?(?:people|experts|researchers|policymakers)\b/i,
  /^(?:This (?:topic|issue|question) )\b/i,
  /^(?:X is one of the most)\b/i,
  /^Video games are one of the most\b/i,
];

const ARGUMENTATIVE_OPENER = [
  /^(?:The (?:implementation|deployment|environmental|structural|mathematical))\b/i,
  /^(?:This (?:paper|investigation) argues)\b/i,
  /^(?:The (?:empirical|most substantive))\b/i,
  /^(?:A serious counterargument)\b/i,
  /^(?:The (?:policy|institutional))\b/i,
  /^(?:Even accepting|Even granting)\b/i,
  /^(?:The disagreement between)\b/i,
];

const WEAK_IRR_RQ = [
  /\bshould there be\b/gi,
  /\bwhat benefits\b/gi,
  /\bwhat are the benefits\b/gi,
  /\bwhat positive effects\b/gi,
  /\bwhat advantages\b/gi,
  /\bwhat effects? .{0,40}\bmight have\b/gi,
  /\bwhat (?:are|the) (?:potential )?benefits (?:of|that)\b/gi,
  /\bwhat benefits.{0,30}might\b/gi,
  /\bwhat (?:positive|potential|possible) (?:effects|outcomes|impacts)\b/gi,
  /\bwhat advantages.{0,40}(?:might|could|may)\b/gi,
  /\bhow .{0,20} (?:could|might|may) benefit\b/gi,
  /\bwhether .{0,30} (?:has|have) benefits\b/gi,
  /\binvestigat(?:e|ing|ion).{0,30}(?:potential|possible) benefits\b/gi,
  /\bexamin(?:e|ing|ation) of (?:potential|possible)\b/gi,
  // Knowledge-survey RQ constructions (seminar-3.2.10)
  /\bwhat (?:the )?research (?:shows?|tells? us|reveals?|says?|finds?) about\b/gi,
  /\bwhat (?:we|researchers?) (?:know|understand|have found|have learned) about\b/gi,
  /\bwhat (?:has been|is) (?:found|known|understood|established) about\b/gi,
  /\bwhat (?:the )?(?:available |current )?evidence (?:shows?|suggests?|reveals?|indicates?) about\b/gi,
  /\bwhat (?:the )?effects? of .{5,40} (?:are|might be|could be|may be)\b/gi,
  /\bhow .{5,40} (?:affects?|impacts?|influences?) .{5,40} (?:in general|overall|broadly)\b/gi,
  /\bwhether .{5,40} (?:has|have) (?:any |some )?(?:benefits?|effects?|impact|influence)\b/gi,
  /\bwhat (?:are|were) the (?:benefits?|effects?|outcomes?|results?) of\b/gi,
  /\bwhat .{5,80} does to\b/gi,
  /\bwhether .{5,80} (?:is|are) associated with\b/gi,
];

const GENERIC_CONTEXT = [
  /\bone of the most (?:important|popular|significant)\b/gi,
  /\bhas become (?:increasingly )?common\b/gi,
  /\bmany experts and researchers\b/gi,
  /\baffects millions of people\b/gi,
  /\bgrowing concern about\b/gi,
  /\breceived a lot of attention\b/gi,
  /\bcomplex and controversial topic\b/gi,
  /\bpeople have different opinions\b/gi,
  /\baffects everyone\b/gi,
  /\bmore important than ever\b/gi,
  /\bstill much we don't know\b/gi,
];

const IRR_RQ_TO_WHAT_EXTENT = /\bto what extent\b/gi;

const IRR_RQ_HIGH_SPECIFICITY_OVERRIDE = [
  /to what extent does? (?:chronic|acute|repeated|cumulative|long.term) .{5,80} (?:impair|affect|alter|disrupt|reduce|increase)/i,
  /to what extent does? .{5,60} (?:through|via|by means of) .{5,60} (?:affect|impair|alter|disrupt)/i,
  /to what extent (?:does?|can|will) .{5,80} among (?:high school|adolescent|adult|elderly|pregnant|low.income)/i,
  /to what extent does chronic .{5,60} (?:impair|affect|disrupt|harm) .{5,60} (?:among|in|for) (?:high school|adolescent|college|adult)/i,
  /to what extent (?:does|have|has) .{5,60} (?:impair|affect|alter|reduce|increase) .{5,60} (?:performance|function|health|outcome)/i,
  /to what extent do .{5,80} (?:reduce|affect|impact|change|lower) .{5,80} among/i,
];


export function normalizeForRqDetection(text: string): string {
  return text.replace(/([a-z,;])\n([a-z])/g, "$1 $2");
}

const CONCESSIVE_REBUTTAL_LINKING = [
  /even accepting \w+.{0,60}(?:however|but|yet|nevertheless|this defense|does not engage|fails to address)/i,
  /even granting \w+.{0,60}(?:however|but|yet|nevertheless|does not|cannot|still)/i,
  /even granting \w+.{0,80}(?:however|but|yet|nevertheless|does not|cannot|still)/i,
  /even granting this.{0,100}(?:however|but|yet|does not survive|does not engage)/i,
  /even if (?:we|one) grant.{0,80}(?:still|remains|persists)/i,
  /granting the strongest version.{0,80}(?:still follows|conclusion remains|problem persists)/i,
  /this argument has (?:genuine|real|some) merit.{0,60}(?:but|however|yet|does not)/i,
  /while this argument has (?:merit|force|support).{0,60}(?:does not engage|fails to address|cannot account)/i,
  /even if (?:we|one) accept.{0,60}(?:the (?:problem|conclusion|issue) (?:remains|persists|still))/i,
  // Cross-perspective evaluative linking (seminar-3.2.10)
  /even granting.{0,120}however.{0,80}(?:does not|cannot|fails to|does not resolve|still)/i,
  /\bthis argument does not (?:resolve|engage|address|survive scrutiny of)/i,
  /even if we (?:accept|grant|concede).{0,80}(?:still|remains|does not|the problem)/i,
  /while (?:this|the) (?:objection|argument|concern|point) (?:has merit|deserves engagement|is (?:real|serious|genuine)).{0,80}(?:however|but|it does not|it fails)/i,
  /the (?:most|most substantive|most analytically serious) (?:challenge|objection|argument|counterargument).{0,80}(?:however|does not survive|cannot account)/i,
];

/** Institutional / statistical significance — sufficient without opening thesis. */
const SIGNIFICANCE_STRONG_SIGNALS = [
  /\d[\d,]+ (?:deaths?|fatalities|casualties|lives|patients|cases)/i,
  /(?:million|billion|thousand).{0,30}(?:deaths?|affected|impacted|infected|displaced)/i,
  /\$([\d,.]+) (?:billion|million|trillion)/i,
  /(\d+) percent.{0,40}(?:gdp|workforce|population|households|adults|children|students)/i,
  /(\d+) percent of (?:american|u\.s\.|global|world).{0,30}(?:adults|students|workers|voters|children)/i,
  /\bapproximately (\d+) million/i,
  /\ban estimated (\d+[\d,.]*) (?:people|individuals|workers|patients|citizens)/i,
  /(?:constitutes?|represents?) (?:an? )?(?:institutional|systemic|public health|democratic|political) (?:failure|crisis|problem|challenge|indictment)/i,
  /(?:has been|is) (?:designated|declared|identified) (?:a|an) (?:public health|national|global) (?:crisis|emergency|priority)/i,
  /(?:by \d{4}|within.{0,20}years?|over the (?:next|coming).{0,20}(?:years?|decades?))/i,
  /(\d+) percent of eligible voters/i,
  /(\d+) percent of (?:eligible )?voters/i,
  /\bHe Jiankui\b/i,
  /\bgermline (?:editing|modification)/i,
  /\bheritable (?:genetic )?(?:disease|modification)/i,
  /\bethical tension\b/i,
  /\bthis paper argues\b/i,
  /\bNational Academies\b/i,
  /\bnearly (\d+) in (\d+)/i,
  /\b(\d+) in (\d+) (?:active-duty|students?|adults?|people|members)/i,
  /\b(?:COVID|pandemic|post-pandemic).{0,60}(?:mental|well-being|isolation|anxiety)/i,
  /\bactive-duty members/i,
];

/** Topic-context signals — require committed opening thesis to count. */
const SIGNIFICANCE_TOPIC_SIGNALS = [
  /\b(?:rates? of|levels? of).{0,40}(?:depression|anxiety|mental health).{0,40}(?:increasing|rising|growing)/i,
  /\bmental (?:health|illness).{0,50}(?:prevalent|issue|problem|condition|crisis|common)/i,
  /\b(?:depression|anxiety).{0,40}(?:increasing|rising|growing|rapidly)/i,
  /\bthis paper (?:addresses|examines|investigates)\b/i,
  /\bnostalgia (?:can|could|may|helps?|improves?)/i,
];

/** IWA Row 2 — significance framing in opening (not IRR-style RQ linkage). */
const SIGNIFICANCE_SIGNALS = [
  ...SIGNIFICANCE_STRONG_SIGNALS,
  ...SIGNIFICANCE_TOPIC_SIGNALS,
];

function hasSignificanceSignal(text: string): boolean {
  return SIGNIFICANCE_SIGNALS.some((p) => p.test(text));
}

function hasStrongSignificanceSignal(text: string): boolean {
  return SIGNIFICANCE_STRONG_SIGNALS.some((p) => p.test(text));
}

/** Opening is mostly ancient/historical narrative without contemporary stakes (cb2021_iwa_b). */
export function isPrimarilyHistoricalOpening(body: string): boolean {
  const open = normalizeForRqDetection(body.slice(0, 2800));
  let historical = 0;
  for (const p of [
    /\bRomans?\b/gi,
    /\bIncas?\b/gi,
    /\bgladiator/gi,
    /\bancient\b/gi,
    /\bcivilization\b/gi,
    /\bcentury\b/gi,
    /\bempire\b/gi,
  ]) {
    historical += (open.match(p) ?? []).length;
  }
  let contemporary = 0;
  for (const p of [
    /\btoday\b/gi,
    /\bcurrently\b/gi,
    /\bin recent years\b/gi,
    /\bmodern\b/gi,
    /\b\d{4}\b/g,
  ]) {
    contemporary += (open.match(p) ?? []).length;
  }
  const hasCitedFactInOpening =
    /\([A-Z][a-zA-Z'&]+[^)]*\d{4}/.test(open) ||
    /\d[\d,]*\s*(?:%|percent|million|billion)/i.test(open);
  return historical >= 4 && contemporary === 0 && !hasCitedFactInOpening;
}

/** IWA openings that narrate ancient history without contemporary stakes (cb2021_iwa_b). */
export function isIwaHistoricalSignificanceOpening(body: string): boolean {
  const open = normalizeForRqDetection(body.slice(0, 2200));
  const historicalEra =
    (open.match(
      /\b(?:romans?|incas?|gladiator|ancient|civilization|empire|century)\b/gi,
    ) ?? []
    ).length;
  const citedStatInOpening = /\d[\d,]*\s*(?:%|percent|million|billion)/i.test(
    open.slice(0, 2000),
  );
  return historicalEra >= 6 && !citedStatInOpening;
}

/** Cited fact, urgency+problem, or contemporary statistic in the opening (IWA R2 gate). */
export function hasContemporaryOpeningSignificanceEvidence(
  openingSection: string,
): boolean {
  if (hasStrongSignificanceSignal(openingSection)) return true;
  if (
    /\d[\d,]*\s*(?:%|percent|million|billion)/i.test(openingSection.slice(0, 1600))
  ) {
    return true;
  }
  return (
    /\b(?:today|currently|in recent years|now,? more than ever)\b/i.test(
      openingSection,
    ) &&
    /\b(?:face[sd]?|suffer|crisis|threat|problem|challenge|affecting|discriminat)\b/i.test(
      openingSection,
    )
  );
}

export function detectSignificanceFraming(
  body: string,
  opts: {
    thesisPresent: boolean;
    thesisInOpening: boolean;
    argumentativeTopicSentenceCount: number;
    exploratoryOpening?: boolean;
  },
): boolean {
  const openingSection = normalizeForRqDetection(body.slice(0, 5000));
  const firstParagraphs = normalizeForRqDetection(
    body.split(/\n\n+/).slice(0, 3).join("\n\n"),
  );
  if (
    isPrimarilyHistoricalOpening(body) &&
    !hasContemporaryOpeningSignificanceEvidence(openingSection) &&
    !hasContemporaryOpeningSignificanceEvidence(firstParagraphs)
  ) {
    return false;
  }
  const hasStrong =
    hasStrongSignificanceSignal(openingSection) ||
    hasStrongSignificanceSignal(firstParagraphs);
  const hasTopicOnly =
    !hasStrong &&
    (SIGNIFICANCE_TOPIC_SIGNALS.some((p) => p.test(openingSection)) ||
      SIGNIFICANCE_TOPIC_SIGNALS.some((p) => p.test(firstParagraphs)));
  const hasSignal =
    hasStrong ||
    (hasTopicOnly &&
      (hasContemporaryOpeningSignificanceEvidence(openingSection) ||
        hasContemporaryOpeningSignificanceEvidence(firstParagraphs))) ||
    hasSignificanceSignal(openingSection);
  const firstPara =
    openingSection.split(/\n\n+/).find((p) => p.trim().length > 40)?.trim() ?? "";
  const firstSent = firstPara.split(/(?<=[.!?])\s+/)[0] ?? "";
  const hasArgumentativeOpener =
    opts.argumentativeTopicSentenceCount >= 1 ||
    ARGUMENTATIVE_OPENER.some((re) => re.test(firstSent)) ||
    /\bthis paper argues\b/i.test(openingSection);
  const exploreBothSides =
    opts.exploratoryOpening ??
    (/\bthis paper will explore\b/i.test(openingSection) ||
      /\bboth sides of\b/i.test(openingSection));
  if (exploreBothSides && !opts.thesisInOpening) {
    return hasStrong && (opts.thesisPresent || hasArgumentativeOpener);
  }
  if (hasTopicOnly && !opts.thesisInOpening) {
    return false;
  }
  return hasSignal && (opts.thesisPresent || hasArgumentativeOpener);
}

/** Positive IRR R1 specificity bonus (0–4); applied only when irrRqSpecificityLow is false. */
export function computeRqSpecificityBonus(
  rqText: string,
  openingText: string,
): number {
  let bonus = 0;
  const populationPatterns = [
    /\b(?:among|in|for|affecting) (?:adults?|children|students?|workers?|patients?|residents?|voters?)/i,
    /\b(?:high school|college|elementary|urban|rural|low.income|elderly|older adults?)/i,
    /\b(?:in the united states|in america|in [A-Z][a-z]+|globally|internationally)/i,
  ];
  const mechanismPatterns = [
    /(?:through|via|by means of|through the mechanism of|by disrupting|through (?:direct|indirect))/i,
    /(?:biologically|neurologically|psychologically|economically|politically|structurally)/i,
    /(?:through what (?:mechanism|pathway|process|means))/i,
  ];
  const outcomePatterns = [
    /(?:impair|affect|alter|disrupt|increase|decrease|reduce|improve|worsen).{5,50}(?:function|performance|health|outcomes?|achievement|mortality|wellbeing)/i,
    /(?:academic performance|mental health|physical health|economic outcomes?|employment|mortality)/i,
  ];
  if (populationPatterns.some((p) => p.test(rqText))) bonus += 1;
  if (mechanismPatterns.some((p) => p.test(rqText))) bonus += 1;
  if (outcomePatterns.some((p) => p.test(rqText))) bonus += 1;
  const openingScan = getOpeningSubstantiveParagraph(openingText);
  if (
    /\([A-Z][a-z]+[^)]{0,40}\d{4}[a-z]?\)/.test(openingScan) ||
    hasCredentialedInstitutionalAttribution(openingScan)
  ) {
    bonus += 1;
  }
  return bonus;
}

/** Plain attributive source engagement (IRR R2 analytical path; seminar-3.2.14). */
const IRR_ATTRIBUTIVE_CITATION = [
  /\baccording to (?:Dr\.\s+)?[A-Z][\w'.-]+/gi,
  /\bas (?:stated|described|noted) by (?:Dr\.\s+)?[A-Z][\w'.-]+/gi,
  /\b(?:Dr\.\s+)?[A-Z][\w'.-]+(?:\s+et\s+al\.)?\s+(?:argues?|suggests?|finds?|concludes?|notes?|explains?|demonstrates?|shows?|maintains?|contends?|reports?|states?|references?)\s+(?:that\s+)?/gi,
  /\b(?:Dr\.\s+)?[A-Z][\w'.-]+(?:\s+and\s+[A-Z][\w'.-]+)?\s+(?:argue|suggest|find|conclude|note|explain|demonstrate|show|reference)\s+that\b/gi,
  /\b(?:Dr\.\s+)?[A-Z][\w'.-]+\s+references?\s+the\b/gi,
];

const IRR_CROSS_SOURCE_COMPARISON = [
  /\bwhile [A-Z][\w'.-]+.{0,120}?[A-Z][\w'.-]+ (?:argues?|suggests?|finds?|notes?|contends?|maintains?)\b/gi,
  /\b(?:however|although|in contrast|on the other hand),?.{0,200}?(?:argues?|suggests?|finds?|notes?|contends?)\b/gi,
  /\bunlike [A-Z][\w'.-]+.{0,100}?[A-Z][\w'.-]+/gi,
  /\b[A-Z][\w'.-]+.{0,80}?\bbut [A-Z][\w'.-]+ (?:argues?|suggests?|raises?|finds?|notes?)\b/gi,
  /\b[A-Z][\w'.-]+ supports?.{0,80}?\bbut [A-Z][\w'.-]+/gi,
];

/** Evaluative perspective commentary (IRR R4 path; seminar-3.2.14). */
const IRR_PERSPECTIVE_EVALUATION = [
  /\bthis (?:suggests?|implies?|means?|indicates?)\b/gi,
  /\bthis (?:perspective|view|argument|approach) (?:is|suggests?|implies?|overlooks?|fails?|ignores?|does not|fails to)\b/gi,
  /\b(?:however|although|while).{0,120}?(?:this|these) (?:suggest|imply|overlook|fail)\b/gi,
  /\bthe (?:limitation|weakness|strength|implication|significance) of (?:this|the|[A-Z][a-z]+)/gi,
  /\b[A-Z][\w'.-]+(?:'s)? (?:perspective|argument|view|finding) (?:overlooks?|ignores?|fails to account|does not account)\b/gi,
  /\bwhile .{5,80}? (?:this|the evidence|[A-Z][a-z]+) (?:suggests?|argues?|shows?|demonstrates?)/gi,
  /\balthough .{5,80}? (?:perspective|argument|view|finding)/gi,
  /\b(?:however|nonetheless)[,\s].{0,100}?(?:suggest|demonstrate|show|indicate|argue)/gi,
  /\bthis suggests? that .{0,100}?(?:is|are|should|must|requires?)/gi,
  /\bwhile .{5,120}?,?\s+it is (?:crucial|important|warranted|necessary) to\b/gi,
  /\ban objection may be raised\b/gi,
  /\bhowever,?\s+such a (?:shortcoming|limitation) can be\b/gi,
  /\bfrom (?:her|his|their) perspective\b/gi,
  /\bdespite these (?:promising|changes|findings|concerns)\b/gi,
  /\binterestingly,? however\b/gi,
  /\byet,?\s+(?:she|he|they|the evidence|the research)\b/gi,
];

const IRR_DISTINCT_PERSPECTIVE_ATTRIBUTIVE = [
  /\b([A-Z][a-z]{2,})(?:\s+et\s+al\.)?\s+(?:argues?|suggests?|finds?|concludes?|notes?|explains?|demonstrates?|shows?|maintains?|contends?|reports?|states?|references?)\b/gi,
  /\baccording to (?:Dr\.\s+)?([A-Z][a-z]{2,})/gi,
  /\baccording to ([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)/gi,
  /\bas (?:noted|stated|described) by (?:Dr\.\s+)?([A-Z][a-z]{2,})/gi,
  /\bas ([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)\s+(?:argues?|finds?|notes?|explains?|concludes?)/gi,
  /\b(?:Dr\.\s+)?([A-Z][a-z]{2,})\s+references?\s+the\b/gi,
  /\b([A-Z][a-z]{2,})(?:\s+et\s+al\.)?\s*\(\d{4}[a-z]?\)/g,
  /\(([A-Z][a-z]{2,}),\s*\d{4}[a-z]?\)/g,
];

const IRR_PERSPECTIVE_NAME_STOP = new Set([
  "the",
  "this",
  "that",
  "these",
  "those",
  "however",
  "although",
  "while",
  "when",
  "where",
  "what",
  "which",
  "visit",
  "college",
  "board",
  "american",
  "seminar",
  "april",
  "word",
  "count",
]);

const IRR_EVALUATIVE_SYNTHESIS = [
  /\bthe policy implication depends on\b/gi,
  /\bthis convergence suggests\b/gi,
  /\bboth perspectives agree on\b/gi,
  /\bthe tension between\b/gi,
  /\bdisagreement reflects different assumptions\b/gi,
  /\bultimately a question about\b/gi,
  /\bprecautionary (?:scientific )?position\b/gi,
  /\btogether provide (?:a|an) mechanistic account\b/gi,
  /\bperspective disagreement between\b/gi,
  /\bdistinguishes direct physiological pathways\b/gi,
];

const EVALUATIVE_CONCESSION = [
  /\beven accepting\b/gi,
  /\beven granting\b/gi,
  /\bgranting the strongest version\b/gi,
  /\bwhile this (?:objection|argument|challenge) (?:has|is) (?:merit|genuine|serious)\b/gi,
  /\bthis argument has genuine (?:methodological )?support, but\b/gi,
];

const ANONYMOUS_RESEARCH = [
  /\bresearchers (?:have )?found that\b/gi,
  /\bstudies (?:have )?show that\b/gi,
  /\bresearch has found that\b/gi,
  /\bscientists have found that\b/gi,
  /\baccording to research\b/gi,
  /\bsome researchers\b/gi,
  /\bexperts argue\b/gi,
];

const FIGURE_CAPTION_LINE =
  /^\s*(?:Figure|Fig\.)\s*\d+[\s.:–-].{0,180}\(\s*[A-Z][a-zA-Z'&]+/i;

export function truncateAfterFirstBibliography(text: string): string {
  const re =
    /(?:^|\n{2,})\s*(?:works?\s+cited|references?|bibliography)\s*\n/gim;
  const hits: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lineStart = text.lastIndexOf("\n", Math.max(0, m.index)) + 1;
    const lineEnd = text.indexOf("\n", m.index);
    const line = text
      .slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
      .trim();
    if (
      /^(?:works?\s+cited|references?|bibliography)\s*[:.]?\s*$/i.test(line)
    ) {
      hits.push(m.index);
    }
  }
  if (hits.length < 2) return text;
  return text.slice(0, hits[1]).trim();
}

export function stripFigureCaptionLines(body: string): string {
  return body
    .split("\n")
    .filter((line) => !FIGURE_CAPTION_LINE.test(line.trim()))
    .join("\n");
}

export function countBodyCitations(
  body: string,
  bibliographyPresent = true,
): number {
  return extractInTextCitations(body, bibliographyPresent, {
    includeAttributiveCap: false,
  }).totalCount;
}

const ARGUMENTATIVE_VERBS_NEAR_HEDGE =
  /\b(suggests?|indicates?|points? toward|warrants?|may be|seems? to|appears? to|this (?:paper|analysis|investigation) (?:argues?|finds?|concludes?))\b/i;

const COMMON_RQ_STOPWORDS = new Set([
  "extent",
  "research",
  "question",
  "whether",
  "which",
  "their",
  "there",
  "about",
  "would",
  "could",
  "should",
  "through",
  "between",
  "among",
  "during",
  "within",
  "across",
  "against",
  "because",
  "however",
  "therefore",
  "although",
  "students",
  "people",
  "effects",
  "impact",
  "impacts",
]);

const BOTH_SIDES_PATTERNS: RegExp[] = [
  ...BOTH_SIDES_CONCLUSION,
  /\bboth sides of this (?:debate|issue|conversation)\b/i,
  /\bboth (?:sides|perspectives)\b/i,
  /\blegitimate concerns\b/i,
];

export type BothSidesModeLocation =
  | "opening"
  | "conclusion"
  | "body"
  | "throughout"
  | null;

export interface BothSidesModeResult {
  bothSidesMode: boolean;
  location: BothSidesModeLocation;
}

export function detectHedgedThesis(body: string): boolean {
  const scan = body.slice(0, 8000);
  for (const pattern of HEDGED_THESIS) {
    const match = pattern.exec(scan);
    if (!match) continue;
    const window = scan.slice(
      Math.max(0, match.index - 250),
      Math.min(scan.length, match.index + match[0].length + 250),
    );
    if (ARGUMENTATIVE_VERBS_NEAR_HEDGE.test(window)) return true;
  }
  return false;
}

export function detectBothSidesModeLocation(body: string): BothSidesModeResult {
  const opening = body.slice(0, 1500);
  const conclusion = body.slice(-1500);
  const bodyMiddle =
    body.length > 3000 ? body.slice(1500, -1500) : "";

  const firesInOpening = BOTH_SIDES_PATTERNS.some((p) => p.test(opening));
  const firesInConclusion = BOTH_SIDES_PATTERNS.some((p) => p.test(conclusion));
  const firesInBody =
    bodyMiddle.length > 0 && BOTH_SIDES_PATTERNS.some((p) => p.test(bodyMiddle));

  const bothSidesMode =
    firesInOpening || firesInConclusion || firesInBody;
  const location: BothSidesModeLocation = !bothSidesMode
    ? null
    : firesInOpening && firesInConclusion
      ? "throughout"
      : firesInOpening
        ? "opening"
        : firesInConclusion
          ? "conclusion"
          : "body";

  return { bothSidesMode, location };
}

const OPENING_CITATION_IN_TEXT =
  /\([A-Z][a-zA-Z'&]+[^)]{0,55}(?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?)(?:\s*[,;]\s*[^)]{0,40}(?:(?:19|20)\d{2}[a-z]?|n\.?\s*d\.?))?[^)]*\)/i;

/** Skip running headers / admin lines; return intro through first cite or ~450 words (seminar-3.2.19). */
export function getOpeningSubstantiveParagraph(body: string): string {
  const lines = body.split("\n");
  const substantiveLines: string[] = [];
  let wordCount = 0;
  const minWords = 150;
  const maxWords = 600;

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;

    if (
      stripped === stripped.toUpperCase() &&
      stripped.length > 10 &&
      /[A-Z]{4}/.test(stripped)
    ) {
      continue;
    }
    if (
      /^(?:Word Count|Visit the|www\.|AP Seminar|March|January|February|©|Running head)/i.test(
        stripped,
      ) ||
      /collegeboard\.org/i.test(stripped)
    ) {
      continue;
    }
    if (stripped.length < 4) continue;

    substantiveLines.push(stripped);
    wordCount += stripped.split(/\s+/).filter(Boolean).length;
    const text = substantiveLines.join(" ");
    const hasCite = OPENING_CITATION_IN_TEXT.test(text);
    if (wordCount >= minWords && hasCite) break;
    if (wordCount >= maxWords) break;
  }

  return substantiveLines.join(" ");
}

const CREDENTIALED_ATTRIBUTION_PATTERN =
  /[Aa]ccording to\s+(?:[A-Z][a-z]+(?:'s|’s)?\s+)?(?:\w+\s+){0,4}(?:[A-Z][a-z]+),?\s+(?:a |an |the )?(?:researcher|professor|doctor|historian|director|chair|expert|author|scientist|analyst|specialist|fellow|founder|chief)\s+(?:at|of|from|with)\s+[A-Z]/;

const NAMED_ROLE_PATTERN =
  /[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+,?\s+(?:a |an |the )?(?:professor|researcher|doctor|director|chair|historian|expert|scientist|chief)\s+(?:at|of|from)\s+[A-Z]/;

const ORG_TITLE_ATTRIBUTION_PATTERN =
  /[Aa]ccording to\s+[A-Z][A-Za-z0-9'’\s&-]+(?:'s|’s)\s+(?:(?:Chief|Senior|Lead|Deputy)\s+)?(?:Historian|Scientist|Director|Officer|Researcher|Expert|Historian)\b/i;

/** Named expert(s), not bare “According to the University of …”. */
const ACCORDING_TO_NAMED_OF_INSTITUTION =
  /[Aa]ccording to\s+(?!(?:the|a|an)\s)(?:[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*){1,6}(?:of|from)\s+(?:the\s+)?[A-Z][a-z]/;

/** Credentialed expert named with institutional role (seminar-3.2.19). */
export function hasCredentialedInstitutionalAttribution(text: string): boolean {
  return (
    CREDENTIALED_ATTRIBUTION_PATTERN.test(text) ||
    NAMED_ROLE_PATTERN.test(text) ||
    ORG_TITLE_ATTRIBUTION_PATTERN.test(text) ||
    ACCORDING_TO_NAMED_OF_INSTITUTION.test(text)
  );
}

/** Topic-agnostic RQ context link in opening (seminar-3.2.13; 3.2.19 substantive scan). */
export function detectRqContextLinkInOpening(
  openingSection: string,
  rqText: string,
): boolean {
  const scan =
    openingSection.length > 80
      ? openingSection
      : getOpeningSubstantiveParagraph(openingSection).length > 80
        ? getOpeningSubstantiveParagraph(openingSection)
        : openingSection.slice(0, 2500);

  const hasParentheticalCitation =
    OPENING_CITATION_IN_TEXT.test(scan) ||
    /\([A-Z][a-z]+(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-z]+)?\s+\d{1,4}\b/.test(
      scan,
    );

  const rqKeyTerms = rqText
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 5 &&
        !COMMON_RQ_STOPWORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")),
    )
    .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 5);

  const openLower = scan.toLowerCase();
  const hasRqTermInOpening = rqKeyTerms.some((term) => openLower.includes(term));

  if (hasCredentialedInstitutionalAttribution(scan)) {
    return hasRqTermInOpening;
  }
  return hasParentheticalCitation && hasRqTermInOpening;
}

export function countIrrAttributiveCitations(body: string): number {
  return countPatternHits(body, IRR_ATTRIBUTIVE_CITATION);
}

function surnameFromAttributedName(capture: string): string {
  const parts = capture
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w));
  if (parts.length === 0) return capture.trim().toLowerCase();
  return parts[parts.length - 1]!.replace(/[^a-z]/gi, "").toLowerCase();
}

/** Unique author surnames in attributive constructions (seminar-3.2.15). */
export function countIrrDistinctAttributedSources(
  body: string,
  opts: {
    bibliographyPresent?: boolean;
    isMlaCitationFormat?: boolean;
  } = {},
): number {
  const names = new Set<string>();
  const patterns = [
    ...IRR_ATTRIBUTIVE_CITATION,
    /\b([A-Z][a-z]{2,})(?:\s+et\s+al\.)?\s*\(\d{4}[a-z]?\)/g,
    /\(([A-Z][a-z]{2,}),?\s*(?:et\s+al\.)?,?\s*\d{4}[a-z]?\)/g,
  ];
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const raw = (m[1] ?? "").trim();
      const name = raw.includes(" ")
        ? surnameFromAttributedName(raw)
        : raw.toLowerCase();
      if (name.length >= 3 && !IRR_PERSPECTIVE_NAME_STOP.has(name)) {
        names.add(name);
      }
    }
  }
  if (opts.isMlaCitationFormat) {
    for (const ref of extractInTextCitationRefs(body, {
      allowMlaNameOnly: opts.bibliographyPresent,
    })) {
      if (ref.key.length >= 3 && !IRR_PERSPECTIVE_NAME_STOP.has(ref.key)) {
        names.add(ref.key);
      }
    }
  }
  return names.size;
}

export function hasIrrCrossSourceComparison(body: string): boolean {
  return IRR_CROSS_SOURCE_COMPARISON.some((p) => p.test(body));
}

export function countIrrPerspectiveEvaluations(body: string): number {
  return countDistinctPatternHits(body, IRR_PERSPECTIVE_EVALUATION, 12);
}

export function countIrrDistinctDiscussedPerspectives(
  body: string,
  opts: {
    bibliographyPresent?: boolean;
    isMlaCitationFormat?: boolean;
  } = {},
): number {
  const names = new Set<string>();
  for (const pattern of IRR_DISTINCT_PERSPECTIVE_ATTRIBUTIVE) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const raw = (m[1] ?? "").trim();
      const name =
        raw.includes(" ") ? surnameFromAttributedName(raw) : raw.toLowerCase();
      if (name.length >= 3 && !IRR_PERSPECTIVE_NAME_STOP.has(name)) {
        names.add(name);
      }
    }
  }
  if (opts.isMlaCitationFormat) {
    for (const key of extractDistinctInTextAuthorSurnames(body, {
      bibliographyPresent: opts.bibliographyPresent,
    })) {
      if (key.length >= 3 && !IRR_PERSPECTIVE_NAME_STOP.has(key)) {
        names.add(key);
      }
    }
  }
  return names.size;
}

function inferIrrPaperTitle(body: string): string {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 12 &&
        !/^visit the college board/i.test(l) &&
        !/^running head:/i.test(l) &&
        !/^word count:/i.test(l) &&
        !/^ap seminar/i.test(l) &&
        !/^\d{1,4}$/.test(l) &&
        !/^introduction$/i.test(l),
    );
  return lines[0] ?? "";
}

function extractIrrRqText(rqScanBody: string): string {
  const patterns = [
    /(?:research question|to what extent)[\s\S]{10,400}?[.?](?:\s|$)/i,
    /\bthis (?:investigation|paper|report) asks?:?\s*[\s\S]{10,400}?[.?](?:\s|$)/i,
    /\bthis forms the question:?\s*[\s\S]{10,220}\?/i,
    /\bshould there be[\s\S]{10,220}\?/i,
  ];
  for (const pattern of patterns) {
    const match = rqScanBody.match(pattern);
    if (match?.[0]) return match[0];
  }
  return rqScanBody.slice(0, 600);
}

function hasExplicitIrrRqFormula(rqText: string, opening: string): boolean {
  const scan = normalizeForRqDetection(`${opening}\n${rqText}`.slice(0, 2500));
  if (WEAK_IRR_RQ.some((p) => p.test(rqText))) return false;
  return (
    IRR_RQ_TO_WHAT_EXTENT.test(scan) ||
    /\b(?:our |the )?research question\b/i.test(scan) ||
    /\bthis (?:investigation|paper|report) asks?:/i.test(scan) ||
    /\bthis (?:investigation|paper|report) (?:examines|explores|investigates|seeks to (?:answer|determine))\b/i.test(
      scan,
    )
  );
}

/** Academic-level engagement for irrRqSpecificityLow override (seminar-3.2.17). */
export function hasEvidentTopicalFocus(
  _title: string,
  body: string,
  citationCount: number,
): boolean {
  const hasCredentialedResearcher =
    /[A-Z][a-z]+,?\s+(?:a |an |the )?\w+\s+(?:at|of|from)\s+[A-Z]/.test(body) ||
    /[A-Z][a-z]+,?\s+(?:professor|researcher|doctor|author|director|chair|expert|specialist|founder)/i.test(
      body,
    );
  const hasEnoughCitations = citationCount >= 3;
  const hasEtAlPeerSignal = /\b[A-Z][a-z]+ et al\./i.test(body);
  return (
    hasCredentialedResearcher || hasEnoughCitations || hasEtAlPeerSignal
  );
}

export function detectCalibration324Signals(
  body: string,
  opts: {
    thesisPresent: boolean;
    conclusionText: string;
    inTextCitationCount?: number;
    bibliographyPresent?: boolean;
    isMlaCitationFormat?: boolean;
  },
): {
  hedgedThesisDetected: boolean;
  bothSidesMode: boolean;
  bothSidesModeLocation: BothSidesModeLocation;
  hasCommittedPosition: boolean;
  descriptiveParagraphOpenerCount: number;
  argumentativeTopicSentenceCount: number;
  irrRqSpecificityLow: boolean;
  contextSpecificityPenalty: number;
  irrMethodologyExtraCount: number;
  irrEvaluativeSynthesisCount: number;
  irrAttributiveCitationCount: number;
  irrDistinctAttributedSourceCount: number;
  irrCrossSourceComparison: boolean;
  irrPerspectiveEvaluationCount: number;
  irrDistinctDiscussedPerspectiveCount: number;
} {
  const open = normalizeForRqDetection(body.slice(0, 3500));
  const concl = opts.conclusionText.slice(-3500);
  const rqScanBody = normalizeForRqDetection(body.slice(0, 8000));

  const hedgedThesisDetected = detectHedgedThesis(body);
  const bothSides = detectBothSidesModeLocation(body);
  const bothSidesMode = bothSides.bothSidesMode;
  const bodyCounterargumentCommitted =
    bothSides.location === "body" &&
    /\bthis (?:paper|essay) (?:argues?|contends?|maintains?|demonstrates?)\b/i.test(
      body,
    );
  const hasCommittedPosition =
    opts.thesisPresent &&
    !hedgedThesisDetected &&
    (!bothSidesMode || bodyCounterargumentCommitted);

  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 40);
  let descriptiveParagraphOpenerCount = 0;
  let argumentativeTopicSentenceCount = 0;
  for (const p of paragraphs.slice(0, 25)) {
    const first = p.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
    if (DESCRIPTIVE_OPENER.some((re) => re.test(first))) {
      descriptiveParagraphOpenerCount++;
    }
    if (ARGUMENTATIVE_OPENER.some((re) => re.test(first))) {
      argumentativeTopicSentenceCount++;
    }
  }

  const rqText = extractIrrRqText(rqScanBody);
  const paperTitle = inferIrrPaperTitle(body);
  const weakRq =
    WEAK_IRR_RQ.some((p) => p.test(rqText)) ||
    WEAK_IRR_RQ.some((p) => p.test(rqScanBody.slice(0, 4000)));
  const explicitRq = hasExplicitIrrRqFormula(rqText, open);
  const citationCount =
    opts.inTextCitationCount ??
    countBodyCitations(body, opts.bibliographyPresent ?? true);
  const topicalFocus = hasEvidentTopicalFocus(paperTitle, body, citationCount);
  let irrRqSpecificityLow =
    weakRq || (!explicitRq && !topicalFocus);
  const extentRqScan = `${rqText}\n${rqScanBody.slice(0, 4000)}`;
  if (
    IRR_RQ_TO_WHAT_EXTENT.test(extentRqScan) &&
    IRR_RQ_HIGH_SPECIFICITY_OVERRIDE.some((p) => p.test(extentRqScan))
  ) {
    irrRqSpecificityLow = false;
  }

  let contextSpecificityPenalty = 0;
  for (const p of GENERIC_CONTEXT) {
    if (p.test(open)) contextSpecificityPenalty += 1;
  }

  let irrMethodologyExtraCount = 0;
  for (const p of IRR_CAL324_METHODOLOGY_SCAN) {
    if (p.test(body)) irrMethodologyExtraCount++;
  }

  let irrEvaluativeSynthesisCount = 0;
  for (const p of IRR_EVALUATIVE_SYNTHESIS) {
    if (p.test(body)) irrEvaluativeSynthesisCount++;
  }

  return {
    hedgedThesisDetected,
    bothSidesMode,
    bothSidesModeLocation: bothSides.location,
    hasCommittedPosition,
    descriptiveParagraphOpenerCount,
    argumentativeTopicSentenceCount,
    irrRqSpecificityLow,
    contextSpecificityPenalty,
    irrMethodologyExtraCount,
    irrEvaluativeSynthesisCount,
    irrAttributiveCitationCount: countIrrAttributiveCitations(body),
    irrDistinctAttributedSourceCount: countIrrDistinctAttributedSources(body, {
      bibliographyPresent: opts.bibliographyPresent,
      isMlaCitationFormat: opts.isMlaCitationFormat,
    }),
    irrCrossSourceComparison: hasIrrCrossSourceComparison(body),
    irrPerspectiveEvaluationCount: countIrrPerspectiveEvaluations(body),
    irrDistinctDiscussedPerspectiveCount: countIrrDistinctDiscussedPerspectives(
      body,
      {
        bibliographyPresent: opts.bibliographyPresent,
        isMlaCitationFormat: opts.isMlaCitationFormat,
      },
    ),
  };
}

export function hasEvaluativeConcession(body: string): boolean {
  return EVALUATIVE_CONCESSION.some((p) => p.test(body));
}

/** Concessive-rebuttal constructions count as evaluative linking (seminar-3.2.5). */
export function countConcessiveRebuttalLinking(body: string): number {
  let n = 0;
  for (const p of CONCESSIVE_REBUTTAL_LINKING) {
    if (p.test(body)) n++;
  }
  return Math.min(n, 3);
}

export function bodyWithoutAnonymousResearchHits(body: string): string {
  let out = body;
  for (const p of ANONYMOUS_RESEARCH) {
    out = out.replace(p, " ");
  }
  return out;
}
