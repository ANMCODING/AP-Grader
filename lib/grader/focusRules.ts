import {
  extractResearchQuestionCandidates,
  identifyFunctionalRegions,
} from "@/lib/grader/functionalRegions";
import { extractSection, sentences } from "@/lib/grader/text";

const EXPLORATORY_PATTERNS = [
  /\bthis\s+paper\s+explores\b/i,
  /\bthis\s+paper\s+discusses\b/i,
  /\bthis\s+paper\s+reviews\b/i,
  /\bthis\s+(?:study|research)\s+examines\s+broadly\b/i,
  /\bthis\s+paper\s+examines\s+the\s+(?:topic|field|area)\b/i,
];

/** Explicit literature-review framing (not empirical investigation). */
export const LITERATURE_REVIEW_INTRO_PHRASES = [
  /\bthis\s+paper\s+reviews\b/i,
  /\bthis\s+paper\s+aims\s+to\s+review\b/i,
  /\bthis\s+paper\s+provides\s+a\s+review\b/i,
  /\bthis\s+review\s+examines\b/i,
  /\bthis\s+paper\s+synthesizes\b/i,
  /\bthis\s+paper\s+surveys\b/i,
  /\bthis\s+paper\s+summarizes\b/i,
  /\bthis\s+paper\s+explores\s+the\s+current\s+understanding\b/i,
  /\ba\s+comprehensive\s+review\s+of\b/i,
  /\ba\s+narrative\s+review\s+of\b/i,
  /\ba\s+systematic\s+review\s+of\b/i,
];

export function detectExplicitLiteratureReviewIntro(introRegion: string): boolean {
  const window = introRegion.slice(0, 3000);
  return LITERATURE_REVIEW_INTRO_PHRASES.some((p) => p.test(window));
}

/** True when the paper states an investigable empirical question or goal (not review-only). */
export function hasInvestigableResearchQuestion(
  introRegion: string,
  researchQuestionText: string,
): boolean {
  const rq = researchQuestionText.trim();
  if (rq && /\?/.test(rq)) return true;

  const window = `${rq}\n${introRegion}`.slice(0, 3000);
  if (
    /\b(?:to\s+what\s+extent|whether)\b/i.test(window) &&
    /\?/.test(window)
  ) {
    return true;
  }

  const investigablePatterns = [
    /\bwhat\s+is\s+the\s+relationship\s+between\b/i,
    /\bhow\s+does\s+\S+(?:\s+\S+){0,8}\s+(?:affect|relate|influence|impact|predict|correlate)\b/i,
    /\bthis\s+(?:study|research)\s+investigates?\s+the\s+following\s+question\b/i,
    /\bthis\s+(?:study|research)\s+(?:aims|seeks)\s+to\s+(?:determine|test|examine\s+whether|investigate\s+whether)\b/i,
    /\bthe\s+purpose\s+of\s+this\s+(?:study|research)\s+is\s+to\s+(?:determine|test|examine|investigate)\b/i,
    /\b(?:this\s+(?:study|research|paper)|a\s+study)\s+(?:examines|investigates|investigating)\s+how\b/i,
    /\bby\s+analyzing\s+how\b/i,
  ];
  if (investigablePatterns.some((p) => p.test(window))) {
    if (detectExplicitLiteratureReviewIntro(window)) {
      return /\?/.test(window);
    }
    return true;
  }

  return false;
}

const RQ_SENTENCE_PATTERNS = [
  /\?/,
  /this study examines whether/i,
  /this research investigates whether/i,
  /the purpose of this (?:study|research|paper) is to/i,
  /this study aims to determine/i,
  /this study examines/i,
  /this research investigates/i,
  /this paper asks/i,
  /research question/i,
  /project goal/i,
  /guiding this study is/i,
  /the following question/i,
  /to what extent\b/i,
  /what is the relationship between/i,
];

const HYPOTHESIS_PATTERN =
  /\bI\s+hypothesize\s+that\b|\bwe\s+hypothesize\s+that\b|\bthe\s+hypothesis\s+(?:is|was)\s+that\b/i;

const ACTION_RESEARCH_PATTERN = /\bhow\s+can\b/i;

const BROAD_TOPIC_PATTERNS = [
  /\beffects of social media\b/i,
  /\bimpact of technology\b/i,
  /\bmental health and teenagers\b/i,
  /\bclimate change and\b/i,
  /\beffects of exercise on\b/i,
  /\brelationship between stress and\b/i,
  /\bimpact of poverty on\b/i,
  /\beducational outcomes and\b/i,
  /\beffects of video games\b/i,
  /\brole of nutrition in\b/i,
  /\binfluence of parenting on\b/i,
  /\b(?:mental health|climate change|social media|technology|education|poverty|racism)\b/i,
];

const BROAD_TOPICS = new RegExp(
  BROAD_TOPIC_PATTERNS.map((p) => p.source).join("|"),
  "i",
);

export function detectExploratoryFraming(introRegion: string): boolean {
  const window = introRegion.slice(0, Math.floor(introRegion.length * 0.25) || introRegion.length);
  return EXPLORATORY_PATTERNS.some((p) => p.test(window));
}

const QUESTION_SECTION_PATTERNS = [
  /^question\b/i,
  /^research\s+question\b/i,
  /^questions?\b/i,
];

export function extractQuestionSection(paperBody: string): string {
  return extractSection(paperBody, QUESTION_SECTION_PATTERNS);
}

export function extractAllResearchQuestions(bodyFirst30Percent: string): string[] {
  const found: string[] = [];

  for (const s of sentences(bodyFirst30Percent)) {
    if (RQ_SENTENCE_PATTERNS.some((p) => p.test(s))) found.push(s);
  }

  const objectiveMatch = bodyFirst30Percent.match(
    /(?:the purpose of this (?:study|research|paper) is to|this (?:study|research) (?:aims to|examines whether|investigates whether))[\s\S]{0,200}[.?!]/i,
  );
  if (objectiveMatch) found.push(objectiveMatch[0].replace(/\s+/g, " ").trim());

  const investigatesColon = bodyFirst30Percent.match(
    /investigates?\s+the\s+following\s+question\s*:\s*[^?]+\?/i,
  );
  if (investigatesColon) found.push(investigatesColon[0].replace(/\s+/g, " ").trim());

  return [...new Set(found)];
}

/** Scan functional RQ region, intro patterns, and conclusion fallback. */
export function extractResearchQuestionsFromPaper(paperBody: string): string[] {
  const regions = identifyFunctionalRegions(paperBody);
  return extractResearchQuestionCandidates(regions, paperBody);
}

/** Intro region skipping leading Definitions block (FIX 3). */
export function computeIntroWindow(paperBody: string): string {
  let start = 0;
  const head = paperBody.slice(0, 800).trim();
  if (/^definitions\b/i.test(head.split("\n")[0]?.trim() ?? "")) {
    const afterDefs = paperBody.search(
      /\n(?:ABSTRACT|Abstract|LITERATURE\s+REVIEW|Literature\s+Review|INTRODUCTION|Introduction|OVERVIEW|Overview)\b/i,
    );
    if (afterDefs > 0) start = afterDefs;
  }
  const windowLen = Math.max(500, Math.floor(paperBody.length * 0.25));
  return paperBody.slice(start, start + windowLen);
}

/** Pick the narrowest, most specific RQ when multiple are present. */
export function selectBestResearchQuestion(candidates: string[]): string[] {
  if (candidates.length === 0) return [];
  const nonBroad = candidates.filter(
    (q) => !(BROAD_TOPICS.test(q) && q.length < 120),
  );
  const pool = nonBroad.length > 0 ? nonBroad : candidates;
  const ranked = [...pool].sort((a, b) => {
    const aBroad = BROAD_TOPICS.test(a) && a.length < 120 ? 1 : 0;
    const bBroad = BROAD_TOPICS.test(b) && b.length < 120 ? 1 : 0;
    if (aBroad !== bBroad) return aBroad - bBroad;
    const aSpec =
      (/\bto what extent\b/i.test(a) ? 1 : 0) +
      (/\b(?:between|among|how does|relationship)\b/i.test(a) ? 1 : 0);
    const bSpec =
      (/\bto what extent\b/i.test(b) ? 1 : 0) +
      (/\b(?:between|among|how does|relationship)\b/i.test(b) ? 1 : 0);
    if (aSpec !== bSpec) return bSpec - aSpec;
    return a.length - b.length;
  });
  return [ranked[0]];
}

export function detectHypothesisOnly(bodyFirst30Percent: string, hasRq: boolean): boolean {
  if (hasRq) return false;
  return HYPOTHESIS_PATTERN.test(bodyFirst30Percent);
}

export function isBroadQuestion(rq: string): boolean {
  return BROAD_TOPICS.test(rq) && rq.length < 120;
}

export function isActionResearchFraming(rq: string): boolean {
  return ACTION_RESEARCH_PATTERN.test(rq);
}

/** Named population per GRADING_SPEC §F8–F9 (not generic "high school students" alone). */
function hasNamedPopulation(window: string): boolean {
  if (
    /\b(?:high school students?|teenagers?|adolescents?|college students?|participants?)\b/i.test(
      window,
    ) &&
    !/\b(?:aged?\s+\d{1,2}\s*(?:to|-|–)\s*\d{1,2}|juniors? and seniors?|15\s*[-–]\s*18|suburban|rural|urban|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+(?:Ohio|California|Texas|Florida|New York))\b/i.test(
      window,
    )
  ) {
    return false;
  }
  if (/\b[A-Z][a-z]+\s+[a-z]{3,}\b/.test(window)) return true;
  if (
    /\b(?:University of|School District|in\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+[A-Z]{2})\b/.test(
      window,
    )
  ) {
    return true;
  }
  if (/\b(?:aged?\s+\d{1,2}\s*(?:to|-|–)\s*\d{1,2}|\d{1,2}\s*[-–]\s*\d{1,2}\s*year)/i.test(window)) {
    return true;
  }
  if (
    /\b(?:Lactuca|Instagram|TikTok|polyethylene|passive social media|Harlequin|thrombolysis)\b/i.test(
      window,
    )
  ) {
    return true;
  }
  return false;
}

function isBiologyPaper(window: string): boolean {
  return /\b(?:species|organism|plant|animal|cell|germination|sativa|lactuca|mice|rats|bacteria)\b/i.test(
    window,
  );
}

function scorePopulationSpecificity(window: string): number {
  if (isBiologyPaper(window) && !/\b[A-Z][a-z]+\s+[a-z]{3,}\b/.test(window)) {
    return 0;
  }
  if (
    /\b(?:High School|Innovation High|Roosevelt High|Lincoln High|School District|first-generation|ACEs|students with ADHD|Black adolescent|urban elementary|rural Missouri|pediatric ICU)\b/i.test(
      window,
    )
  ) {
    return 1;
  }
  if (
    /\b(?:aged?\s+\d{1,2}\s*(?:to|-|–)\s*\d{1,2}|eighth-?grade|ninth and tenth grade|first-year|University of)\b/i.test(
      window,
    )
  ) {
    return 1;
  }
  if (hasNamedPopulation(window)) return 1;
  if (
    /\b(?:high school students?|teenagers?|adolescents?|college students?|elementary students?)\b/i.test(
      window,
    )
  ) {
    return 0.5;
  }
  return 0;
}

function scoreOutcomeSpecificity(window: string): number {
  if (
    /\b(?:GAD-7|Beck Depression|BDI|PANAS|AES|MAP scores?|SAT|state achievement|disciplinary referrals|cortisol|heart rate variability)\b/i.test(
      window,
    )
  ) {
    return 1;
  }
  if (
    /\b(?:academic performance|mental health|wellbeing|well-?being|grades?|test scores?)\b/i.test(
      window,
    )
  ) {
    return 0.5;
  }
  if (
    /\b(?:outcome|retention|performance|score|GPA|growth|recovery|learning|achievement|effect|correlation|rate|accuracy)\b/i.test(
      window,
    )
  ) {
    return 0.5;
  }
  return 0;
}

function scoreContextSpecificity(window: string): number {
  if (
    /\b(?:Roosevelt High|Innovation High|Lincoln High|School District|urban elementary|rural Missouri|pediatric ICU|named school)\b/i.test(
      window,
    )
  ) {
    return 1;
  }
  if (
    /\b(?:during|over\s+\d+|for\s+\d+\s+(?:weeks?|months?|days?)|competitive season|school year|\d{4})\b/i.test(
      window,
    ) ||
    /\b(?:six-?week|four-?week|one semester|academic year)\b/i.test(window)
  ) {
    return 0.5;
  }
  if (/\b(?:while studying|in school|in the classroom|in the United States)\b/i.test(window)) {
    return 0.5;
  }
  return 0;
}

function scoreInterventionSpecificity(window: string): number {
  if (
    /\b(?:intervention|treatment|condition|variable|practice|exposure|dose|concentration|versus|vs\.?|compared to|manipulation)\b/i.test(
      window,
    ) ||
    /\b\d+(?:\.\d+)?\s*(?:%|mg|ml|mm|cm|hours?|minutes?|days?|weeks?)\b/i.test(window)
  ) {
    return 1;
  }
  return 0;
}

/** Weighted specificity 0–4 (population, intervention, outcome, context). */
export function computeFocusSpecificityScore(
  introRegion: string,
  researchQuestionText: string,
): number {
  const window = `${researchQuestionText}\n${introRegion}`.slice(0, 2200);
  const score =
    scorePopulationSpecificity(window) +
    scoreInterventionSpecificity(window) +
    scoreOutcomeSpecificity(window) +
    scoreContextSpecificity(window);
  return Math.min(4, Math.round(score * 10) / 10);
}

export function detectHighlySpecificFocus(
  introRegion: string,
  researchQuestionText = "",
): boolean {
  const window = introRegion.slice(0, 2200);
  if (
    detectExplicitLiteratureReviewIntro(window) &&
    !hasInvestigableResearchQuestion(introRegion, researchQuestionText)
  ) {
    return false;
  }

  const hasPopulation = scorePopulationSpecificity(window) >= 1;
  const hasIntervention = scoreInterventionSpecificity(window) >= 1;
  const hasOutcome = scoreOutcomeSpecificity(window) >= 1;
  const hasContext = scoreContextSpecificity(window) >= 1;

  const hasQuestionOrGoal = hasInvestigableResearchQuestion(
    introRegion,
    researchQuestionText,
  );

  return (
    hasPopulation &&
    hasIntervention &&
    hasOutcome &&
    hasContext &&
    hasQuestionOrGoal
  );
}
