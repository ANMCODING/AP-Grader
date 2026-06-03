/**
 * Pattern-recognition mapping of student papers to College Board functional regions.
 * Headings guide where to look; content determines what function text serves.
 */

import { citationsInSentence, findGapSentences } from "@/lib/grader/citations";
import { detectContrastiveGapFallback } from "@/lib/grader/literatureQuality";
import { logFunctionalRegionDebug } from "@/lib/grader/functionalRegionDebug";
import {
  appendRegionExtras,
  applyContentRegionFallback,
  type FillableRegion,
} from "@/lib/grader/contentRegionFallback";
import { isMethodSubsectionHeading } from "@/lib/grader/methodSubsectionHeadings";
import { isResultsSubsectionHeading as isResultsSubsectionHeadingLine } from "@/lib/grader/resultsSubsectionHeadings";
import {
  matchesMethodFingerprint,
  splitTextAtMethodFingerprint,
} from "@/lib/grader/contentRegionFingerprints";
import { expandMonolithicBlocks } from "@/lib/grader/monolithicBlockSplit";
import { countWords } from "@/lib/grader/text";
import { sentences } from "@/lib/grader/text";

export type FunctionalRole =
  | "supplementary"
  | "introduction"
  | "researchQuestion"
  | "literatureReview"
  | "gap"
  | "method"
  | "results"
  | "discussion"
  | "limitations"
  | "implications"
  | "conclusion"
  | "unknown";

export interface DocumentBlock {
  heading: string;
  headingNormalized: string;
  body: string;
  start: number;
  end: number;
  role: FunctionalRole;
  /** Results + Discussion combo heading — body split between results and discussion regions */
  isResultsDiscussionCombo?: boolean;
}

export interface FunctionalRegions {
  blocks: DocumentBlock[];
  introduction: string;
  researchQuestionRegion: string;
  literatureReview: string;
  gap: string;
  method: string;
  results: string;
  discussion: string;
  limitations: string;
  implications: string;
  conclusion: string;
  /** Combined intro + early context for focus / gap fallback */
  introRegion: string;
  hasMethodByContent: boolean;
  hasResultsByContent: boolean;
  hasLimitationsByContent: boolean;
  hasImplicationsByContent: boolean;
  /** Regions filled by content fingerprint when headings were missing or short */
  contentInferredRoles: FillableRegion[];
}

const HEADING_MAX_CHARS = 200;
const LIT_CITATION_DENSITY_THRESHOLD = 0.6;

const TOPIC_LIT_HEADING =
  /\b(?:health|research|study|development|theory|behavior|behaviour|communication|policy|treatment|analysis|effects|impact|relationship|background|framework|literature|review|evidence|findings|outcomes|intervention|performance|learning|engagement|identity|culture|media|technology|environment|cognition|psychology|education|biology|chemistry|physics|history|sociology)\b/i;

const METADATA_HEADING_SKIP =
  /^(?:ap\s*®?\s*)?research(?:\s+academic\s+paper)?(?:\s+\d{4})?|scoring\s+(?:guidelines?|commentary)|student\s+samples?|academic\s+paper\s+sample|report\s+on\s+existing\s+knowledge|the\s+response/i;

/** Topic-keyword headings (not exact aliases) — exclude AP/scoring metadata titles. */
function isTopicLiteratureHeading(normalized: string, rawHeading: string): boolean {
  const n = normalized.trim();
  const raw = rawHeading.trim();
  if (!n && !raw) return false;
  if (isGapSectionHeading(n) || isWhatSubjectVerbLiteratureHeading(n)) return false;
  if (METADATA_HEADING_SKIP.test(n) || METADATA_HEADING_SKIP.test(raw)) return false;
  if (/^(?:ap\s*®?\s*)?research$/i.test(n)) return false;
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && /^(?:research|study)$/i.test(words[words.length - 1] ?? "")) {
    return false;
  }
  return TOPIC_LIT_HEADING.test(n) || TOPIC_LIT_HEADING.test(raw);
}

const RHETORICAL_QUESTION =
  /\b(?:why\s+does\s+it\s+matter|why\s+is\s+this\s+important|what\s+if\s+we|have\s+you\s+ever|why\s+does\s+social\s+media\s+matter|is\s+technology\s+good\s+or\s+bad)\b/i;

const INVESTIGABLE_QUESTION_PHRASE =
  /\b(?:to\s+what\s+extent|how\s+does|how\s+do|what\s+is\s+the\s+relationship\s+between|in\s+what\s+ways\s+does|does\s+.+\s+(?:affect|cause|influence|impact)|aims?\s+to\s+determine|seeks?\s+to\s+understand|designed\s+to\s+examine|conducted\s+to\s+investigate|intended\s+to\s+explore|attempts?\s+to\s+understand|endeavors?\s+to\s+examine)\b/i;

const BROAD_TOPIC_ONLY =
  /\bthis\s+paper\s+will\s+(?:explore|discuss|examine)\s+(?:the\s+)?(?:topic|field|area|issue)\b/i;

const RQ_CONTENT_PATTERNS = [
  /\bthis\s+study\s+investigates\b/i,
  /\bthis\s+study\s+examines\b/i,
  /\bthis\s+study\s+asks\b/i,
  /\bthis\s+study\s+explores\b/i,
  /\bthis\s+study\s+seeks\s+to\b/i,
  /\bthis\s+study\s+aims\s+to\b/i,
  /\bthis\s+research\s+examines\b/i,
  /\bthis\s+research\s+seeks\s+to\b/i,
  /\bthis\s+paper\s+seeks\s+to\b/i,
  /\bthis\s+paper\s+aims\s+to\b/i,
  /\bthis\s+paper\s+explores\b/i,
  /\bthe\s+purpose\s+of\s+this\s+(?:study|research|paper)\s+is\s+to\b/i,
  /\bthe\s+aim\s+of\s+this\s+study\s+is\b/i,
  /\bthe\s+goal\s+of\s+this\s+study\s+is\b/i,
  /\bthe\s+objective\s+of\s+this\s+study\s+is\b/i,
  /\bthis\s+study\s+was\s+designed\s+to\b/i,
  /\bthis\s+experiment\s+examines\b/i,
  /\bthis\s+experiment\s+investigates\b/i,
  /\bthis\s+analysis\s+examines\b/i,
  /\bthis\s+analysis\s+investigates\b/i,
  /\bthis\s+paper\s+examines\b/i,
  /\bthis\s+research\s+examines\b/i,
  /\ba\s+study\s+investigating\b/i,
  /\bthis\s+paper\s+asks\b/i,
  /\bthe\s+central\s+question\s+is\b/i,
  /\bI\s+will\s+investigate\b/i,
  /\bthe\s+research\s+question\s+is\b/i,
  /\bto\s+what\s+extent\b/i,
  /\bwhat\s+is\s+the\s+relationship\s+between\b/i,
  /\bhow\s+does\b/i,
  /\bhow\s+do\b/i,
  /\bcompare\b/i,
  /\bI\s+hypothesize\s+that\b/i,
  /\bwe\s+hypothesize\s+that\b/i,
];

const PRIOR_METHOD_CITE =
  /\b(?:Smith|Jones|et\s+al\.?|prior\s+study|previous\s+research|found\s+that).{0,40}(?:used|employed|conducted)\s+(?:a\s+)?(?:survey|experiment|study)\b/i;

const METHOD_PROCEDURAL =
  /\b(?:participants?\s+(?:were|completed)|data\s+(?:were|was)\s+collected|I\s+conducted|we\s+conducted|survey\s+was|interviewed|n\s*=\s*\d+|IRB|informed\s+consent|procedure|protocol|simulation|google\s+form|recruited|sampling|administered|transcripts?\s+(?:were|was)\s+analyzed|(?:were|was)\s+analyzed\s+using|horizonalization|thematic\s+analysis|open\s+coding|axial\s+coding|member\s+check(?:ing)?|inter-?rater|van\s+kaam|moustakas)\b/i;

const QUALITATIVE_FINDINGS =
  /\b(?:theme\s+\d|themes?\s+(?:emerged|included|identified)|representative\s+quote|participant\s+\w+\s+(?:said|described|reported)|interviews?\s+(?:revealed|showed|indicated)|(?:eight|seven|six|five|four|three|two|one)\s+of\s+(?:eight|seven|six|five|four|three|two|one)\s+participants?)\b/i;

const RESULTS_CONTENT =
  /\b(?:\d+(?:\.\d+)?\s*%|figure\s+\d|table\s+\d|p\s*[<=>]|t-?test|F\s*\(|participants?\s+reported|respondents?|results\s+showed|our\s+data|my\s+data|day\s+\d+|r\s*=\s*[\d.]+)\b/i;

const LIMITATION_CONTENT =
  /\b(?:one\s+limitation|limited\s+by|cannot\s+be\s+generalized|small\s+sample|self-?reported|cross-?sectional|future\s+research\s+should|limitation\s+of\s+this|delimitation|threats?\s+to\s+validity)\b/i;

const IMPLICATION_CONTENT =
  /\b(?:these\s+findings\s+suggest|implications\s+for|educators\s+should|policymakers\s+should|practitioners\s+can|parents\s+and\s+teachers|this\s+study\s+contributes|practical\s+applications?)\b/i;

const LIT_TO_METHOD_SPLIT =
  /\b(?:for\s+this\s+study|in\s+this\s+study|the\s+present\s+study|this\s+research|I\s+collected|I\s+conducted|participants?\s+were\s+recruited|data\s+(?:were|was)\s+gathered|I\s+administered|the\s+procedure\s+involved|materials\s+included|methodology|research\s+design)\b/i;

/** §E — headings that are never scored */
const SKIP_HEADING =
  /^(?:abstract|dedication|epigraph|acknowledgm?ents?|table\s+of\s+contents|glossary|definitions?|list\s+of\s+figures|list\s+of\s+tables|assumptions?|executive\s+summary|preface|author\s+note|irb\s+approval|appendix(?:\s+[a-z])?|supplementary\s+materials?|operational\s+definitions?)$/i;

/** Overview only skipped when it is the first substantive block (handled in classifyBlock). */
const SKIP_OVERVIEW_START = /^overview$/i;

const INTRO_HEADING =
  /^(?:introduction|introductory\s+remarks|background(?:\s+information|(?:\s+of\s+the\s+study)?)?|context|overview|setting\s+the\s+scene|background\s+of\s+the\s+study|study\s+background|why\s+this\s+matters|why\s+this\s+research\s+matters|motivation|rationale(?:\s+for\s+the\s+study)?|problem\s+statement|statement\s+of\s+the\s+problem|the\s+problem|research\s+problem|purpose\s+statement|significance(?:\s+of\s+the\s+study)?)$/i;

/** Introduction + RQ region headings (§E2–E6, F4) */
const INTRO_OR_RQ_HEADING =
  /^(?:problem\s+statement|significance\s+of\s+the\s+study|purpose\s+of\s+the\s+study|study\s+purpose|purpose\s+statement|research\s+objectives?|null\s+hypothesis|aims?|aim\s+of\s+the\s+study|research\s+question|questions?|question|rq\d*|guiding\s+question|study\s+question|purpose|aim|goal|objective|hypothesis|h\d+)$/i;

const RQ_EXPLICIT_HEADING =
  /^(?:rq\d*|h\d+|null\s+hypothesis|hypothesis|research\s+objectives?|problem\s+statement|purpose\s+of\s+the\s+study|study\s+purpose|purpose\s+statement|aims?|aim\s+of\s+the\s+study|research\s+question|questions?|question)$/i;

/** "What scientists have learned", "what research shows", etc. (prefix match for long titles). */
const WHAT_EXPLICIT_LIT_HEADING =
  /^what\s+(?:scientists?\s+(?:have\s+)?(?:learned|found|know)|we\s+(?:have\s+)?(?:learned|found|know)|research\s+has\s+found|studies\s+show|the\s+science\s+says|the\s+research\s+shows)\b/i;

const WHAT_SUBJECT_VERB_LIT =
  /\b(?:shows?|says?|tells?|reveals?|demonstrates?|has\s+(?:found|learned|established)|have\s+(?:found|learned))\b/i;

const LIT_HEADING =
  /^(?:literature(?:\s+review)?|review\s+of\s+(?:the\s+)?literature|related\s+literature|related\s+work|review\s+of\s+related\s+literature|relevant\s+literature|relevant\s+research|relevant\s+studies|body\s+of\s+knowledge|gap\s+in\s+the\s+body\s+of\s+knowledge|theoretical\s+framework|conceptual\s+framework|conceptual\s+background|literature\s+background|literature\s+and\s+theory|theory\s+and\s+literature|prior\s+research|prior\s+studies|prior\s+work|existing\s+research|existing\s+literature|current\s+research|current\s+literature|scholarly\s+background|scholarly\s+context|scholarly\s+grounding|research\s+background|research\s+context|research\s+overview|research\s+foundation|foundational\s+research|foundation\s+of\s+research|background\s+on\b|background\s+and\s+existing\s+research|background\s+and\s+literature|background\s+research|what\s+the\s+research\s+says|what\s+we\s+know\s+about|what\s+research\s+shows|what\s+studies\s+show|what\s+we\s+know|overview\s+of\s+the\s+literature|overview\s+of\s+existing\s+research|overview\s+of\s+research|historical\s+background|historical\s+context|historical\s+overview|state\s+of\s+the\s+literature|state\s+of\s+the\s+field|state\s+of\s+research|field\s+of\s+research|field\s+overview|domain\s+overview|academic\s+context|topic\s+background|subject\s+background|the\s+field|topic\s+overview|area\s+of\s+research|research\s+on\b|studies\s+on\b|evidence\s+on\b|literature\s+on\b|related\s+research|related\s+studies|previous\s+research|previous\s+studies|sources|chapter\s+two|chapter\s+2|background\s+and\s+context|what\s+we\s+know\s+so\s+far|research\s+summary|scholarly\s+conversation|theoretical\s+background|evidence\s+review|background\s+of\s+the\s+study|review\s+of\s+prior\s+research|what\s+has\s+been\s+studied|existing\s+knowledge|the\s+research\s+landscape|prior\s+literature|the\s+literature|what\s+researchers\s+have\s+found|synthesis\s+of\s+research)$/i;

const GAP_HEADING =
  /^(?:gaps?|research\s+gap|gap\s+in\s+(?:the\s+)?(?:literature|research|body\s+of\s+knowledge)|gap\s+in\s+the\s+body\s+of\s+knowledge|body\s+of\s+knowledge\s+gap|identified\s+gap|knowledge\s+gap|gap\s+statement|gap\s+analysis|the\s+problem|the\s+gap|what\s+is\s+missing|what\s+has\s+been\s+overlooked|what\s+remains\s+unknown|the\s+missing\s+piece|unanswered\s+questions|what\s+we\s+still\s+don'?t\s+know|why\s+this\s+study\s+is\s+needed|the\s+need\s+for\s+this\s+study|rationale\s+for\s+this\s+study|motivation\s+for\s+this\s+study|justification|the\s+issue|the\s+research\s+problem|what\s+this\s+study\s+addresses|what\s+the\s+research\s+has\s+not\s+examined|what\s+research\s+has\s+not\s+examined|what\s+has\s+not\s+been\s+examined|what\s+has\s+not\s+been\s+studied|what\s+we\s+do\s+not\s+know|what\s+is\s+missing\s+from\s+the\s+literature|what\s+is\s+missing\s+from\s+research|what\s+the\s+literature\s+has\s+not\s+addressed|what\s+has\s+been\s+overlooked|where\s+research\s+falls\s+short|where\s+the\s+evidence\s+falls\s+short|where\s+the\s+literature\s+falls\s+short|where\s+gaps?\s+remain|remaining\s+gaps?|gaps?\s+that\s+remain|what\s+studies\s+have\s+missed|what\s+researchers\s+have\s+missed|the\s+missing\s+piece|missing\s+from\s+the\s+literature|how\s+this\s+study\s+is\s+different|how\s+this\s+study\s+differs|how\s+this\s+research\s+is\s+different|what\s+makes\s+this\s+study\s+different|what\s+this\s+study\s+adds|what\s+this\s+study\s+contributes)$/i;

/** Headings that map to gap (prefix match for long titles). */
const GAP_HEADING_PREFIX =
  /^(?:what\s+the\s+research\s+has\s+not\s+examined|what\s+research\s+has\s+not\s+examined|what\s+has\s+not\s+been\s+examined|what\s+has\s+not\s+been\s+studied|what\s+remains\s+unknown|what\s+we\s+do\s+not\s+know|what\s+is\s+missing\s+from\s+the\s+literature|what\s+is\s+missing\s+from\s+research|what\s+the\s+literature\s+has\s+not\s+addressed|what\s+has\s+been\s+overlooked|where\s+research\s+falls\s+short|where\s+the\s+evidence\s+falls\s+short|where\s+the\s+literature\s+falls\s+short|where\s+gaps?\s+remain|remaining\s+gaps?|gaps?\s+that\s+remain|what\s+studies\s+have\s+missed|what\s+researchers\s+have\s+missed|the\s+missing\s+piece|missing\s+from\s+the\s+literature|how\s+this\s+study\s+is\s+different|how\s+this\s+study\s+differs|how\s+this\s+research\s+is\s+different|what\s+makes\s+this\s+study\s+different|why\s+this\s+study\s+is\s+needed|what\s+this\s+study\s+adds|what\s+this\s+study\s+contributes)\b/i;

export function isWhatSubjectVerbLiteratureHeading(normalized: string): boolean {
  const n = normalized.trim();
  if (!/^what\b/i.test(n)) return false;
  if (GAP_HEADING_PREFIX.test(n)) return false;
  if (WHAT_EXPLICIT_LIT_HEADING.test(n)) return true;
  const prefix = n.split(/\s+/).slice(0, 14).join(" ");
  return WHAT_SUBJECT_VERB_LIT.test(prefix);
}

export function isGapSectionHeading(normalized: string): boolean {
  const n = normalized.trim();
  if (!n) return false;
  return GAP_HEADING.test(n) || GAP_HEADING_PREFIX.test(n);
}

const METHOD_HEADING =
  /^(?:methods?|methodology|study\s+methodology|research\s+methodology|research\s+design|study\s+design|data\s+collection|instrumentation|instruments?|participants?|materials?|procedure|procedures|protocol|research\s+approach|study\s+approach|research\s+process|quasi-?experimental\s+design|experimental\s+design|survey\s+design|interview\s+protocol|sampling(?:\s+strategy)?|ethical\s+considerations|ethics|validity\s+and\s+reliability|reliability\s+and\s+validity|design\s+and\s+methods|research\s+plan|how\s+i\s+(?:collected|conducted|did(?:\s+it)?|this)|what\s+i\s+did|my\s+approach|my\s+method|my\s+methodology|my\s+research\s+process|my\s+research\s+approach|how\s+the\s+study\s+was\s+conducted|study\s+procedures|data\s+and\s+methods|methods\s+and\s+materials|materials\s+and\s+methods|procedure\s+and\s+materials|research\s+methods|research\s+design\s+and\s+methods|how\s+i\s+conducted\s+the\s+study|the\s+approach|research\s+strategy|how\s+data\s+was\s+collected|data\s+collection\s+process|analytical\s+approach|analytic\s+approach)$/i;

const RESULTS_HEADING =
  /^(?:results?|results?\s*\(\s*data\s*\)|findings?|data\s+section(?:\s+and|\s*&)\s+analysis|data\s+section\s+and\s+analysis|data\s+and\s+analysis|findings?\s+and\s+data|analysis\s+and\s+results|data\s+analysis\s+and\s+results|quantitative\s+results|research\s+findings\s+and\s+analysis|data\s+analysis|findings?\s+and\s+analysis|results?\s+and\s+findings|survey\s+results|experimental\s+results|simulation\s+results|what\s+i\s+found|my\s+findings|my\s+results|key\s+findings|main\s+findings|overall\s+findings|research\s+findings|chapter\s+four|chapter\s+4|data|analysis|data\s+and\s+results|what\s+the\s+data\s+showed|what\s+the\s+data\s+shows|outcomes|what\s+happened|study\s+results|findings\s+from\s+the\s+study|results\s+of\s+the\s+study|analysis\s+of\s+results|interview\s+findings|what\s+participants\s+said|participant\s+responses|data\s+analysis\s+results)$/i;

const RESULTS_DISCUSSION_HEADING =
  /^results?\s+and\s+discussion$/i;

const DISCUSSION_HEADING =
  /^(?:discussion(?:\s+and\s+analysis|\s+of\s+results|\s+of\s+findings)?|interpretations?|interpretation\s+of\s+results|interpretation\s+of\s+findings|discussion\s+and\s+analysis|analysis\s+and\s+discussion|overall\s+discussion|summary\s+of\s+findings|summary\s+of\s+results|synthesis\s+of\s+findings|synthesis\s+of\s+results|comparison\s+with\s+prior\s+research|comparison\s+with\s+existing\s+literature|comparison\s+with\s+previous\s+(?:research|studies)|theoretical\s+contributions?|theoretical\s+implications?|integration\s+of\s+findings|integration\s+of\s+quantitative\s+and\s+qualitative\s+findings|addressing\s+the\s+research\s+question|connection\s+to\s+research\s+question|overall\s+findings|overall\s+results|final\s+analysis|final\s+discussion|discussion\s+of\s+effect\s+size|analysis\s+discussion|overall\s+conclusion\s+of\s+analysis)$/i;

const LIMITATIONS_HEADING =
  /^(?:limitations?(?:\s+of\s+(?:the\s+)?(?:study|research))?|study\s+limitations|research\s+limitations|constraints|delimitations?|threats?\s+to\s+validity|scope\s+and\s+limitations|what\s+this\s+study\s+could\s+not\s+do|study\s+constraints|research\s+constraints|what\s+i\s+could\s+not\s+do|boundaries\s+of\s+this\s+study|constraints\s+and\s+limitations|what\s+the\s+study\s+lacks|areas\s+for\s+improvement|shortcomings|weaknesses\s+of\s+the\s+study|things\s+i\s+could\s+not\s+control|what\s+was\s+not\s+measured|what\s+was\s+not\s+examined)$/i;

const LIMITATIONS_HEADING_KEYWORD =
  /\b(?:could\s+not|cannot|limitation|constraint|shortcoming|weakness|boundar(?:y|ies))\b/i;

const IMPLICATIONS_HEADING =
  /^(?:implications?|practical\s+implications|educational\s+implications|policy\s+implications|recommendations?(?:\s+for\s+future\s+research)?|applications?|practical\s+applications|stakeholder\s+implications|future\s+directions?|so\s+what\??|relevance|significance\s+of\s+findings|why\s+this\s+matters|moving\s+forward|next\s+steps|what\s+this\s+means(?:\s+for)?|real\s+world\s+applications|what\s+should\s+happen\s+next|who\s+should\s+care|what\s+we\s+should\s+do|broader\s+impact|takeaways\s+for\s+practice|lessons\s+learned|what\s+this\s+tells\s+us|applications\s+of\s+findings)$/i;

/** Plain "significance" (not "significance of the study") → implications */
const IMPLICATIONS_SIGNIFICANCE_HEADING = /^significance$/i;

const INFORMAL_IMPLICATIONS_HEADING = /^what\s+this\s+means\b/i;

const CONCLUSION_HEADING =
  /^(?:conclusion|conclusions|conclusion\s+and\s+future\s+directions|conclusions\s+and\s+future\s+research|conclusion\s+and\s+future\s+work|summary\s+and\s+conclusions|concluding\s+remarks|summary(?:\s+and\s+conclusion)?|summary\s+of\s+findings|final\s+thoughts|connection\s+to\s+research\s+question|closing|takeaways|discussion\s+and\s+conclusion|results?\s+and\s+conclusion|chapter\s+five|chapter\s+5|synthesis|putting\s+it\s+all\s+together|final\s+analysis|wrapping\s+up|closing\s+thoughts|big\s+picture|summary\s+and\s+reflection|overall\s+takeaway|what\s+i\s+learned|to\s+summarize|in\s+summary|final\s+summary|bringing\s+it\s+together|what\s+this\s+all\s+means|the\s+bottom\s+line|overall\s+assessment|final\s+reflection)$/i;

const FIRST_PERSON_INTRO_HEADING = /^my\s+study$/i;
const FIRST_PERSON_LIT_HEADING = /^my\s+research$/i;

/** Reflection is skipped, not conclusion (§E25) */
const SKIP_REFLECTION = /^reflection$/i;

const CHAPTER_INTRO = /^chapter\s+(?:one|1|i)$/i;
const CHAPTER_LIT = /^chapter\s+(?:two|2|ii)$/i;
const CHAPTER_METHOD = /^chapter\s+(?:three|3|iii)$/i;
const CHAPTER_RESULTS = /^chapter\s+(?:four|4|iv)$/i;
const CHAPTER_CONCLUSION = /^chapter\s+(?:five|5|v)$/i;

/** Significance of the Study → introduction, not implications (§E7) */
const SIGNIFICANCE_OF_STUDY = /^significance\s+of\s+the\s+study$/i;

const MAJOR_HEADING =
  /^(?:introduction|literature|review|background|method|results?|findings?|discussion|conclusion|limitations?|implications?|gap|question|abstract|data|analysis|references|works?\s+cited|appendix|chapter|rq|hypothesis|procedure|participants|materials|significance|recommendations?|summary|synthesis|protocol|ethics|delimitations?|instrumentation|sampling|reflection)$/i;

/**
 * Strip numbering / chapter prefixes and normalize ALL CAPS → Title Case (§E22–E24).
 */
const CHAPTER_WORD_TO_NUM: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

const HEADING_PARTICLES = new Set([
  "and",
  "or",
  "of",
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "from",
  "but",
  "nor",
  "yet",
  "so",
  "as",
  "into",
  "onto",
  "upon",
  "within",
  "without",
  "between",
  "among",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "over",
  "under",
  "along",
  "across",
  "behind",
  "beyond",
  "near",
  "off",
  "out",
  "past",
  "since",
  "than",
  "though",
  "until",
  "versus",
  "via",
  "don't",
]);

/** Strip subtitle after colon for alias matching (FIX 1). */
export function stripColonFromHeading(line: string): string {
  const t = line.trim();
  const idx = t.indexOf(":");
  if (idx <= 0 || idx >= t.length - 1) return t;
  return t.slice(0, idx).trim();
}

export function normalizeHeadingForMatch(raw: string): string {
  let h = stripColonFromHeading(raw.trim());
  if (h.length > HEADING_MAX_CHARS) h = h.slice(0, HEADING_MAX_CHARS);

  const chapterWord = h.match(
    /^chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)$/i,
  );
  if (chapterWord) {
    const key = chapterWord[1].toLowerCase();
    return `Chapter ${CHAPTER_WORD_TO_NUM[key] ?? key}`;
  }

  const chapterRoman = h.match(/^chapter\s+([IVXLCDM]+)$/i);
  if (chapterRoman) {
    const map: Record<string, string> = {
      I: "1",
      II: "2",
      III: "3",
      IV: "4",
      V: "5",
    };
    const n = map[chapterRoman[1].toUpperCase()];
    if (n) return `Chapter ${n}`;
  }

  h = h.replace(/^(?:\d+|[IVXLCDM]+)\s*[.):\-–—]\s*/i, "");
  h = h.replace(/^RQ\d+\s*:?\s*/i, "");
  h = h.replace(/^H\d+\s*:?\s*/i, "");

  if (/^[A-Z][A-Z0-9\s\-–—:]{2,}$/.test(h) && !/[a-z]/.test(h)) {
    h = h.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }

  return h.trim();
}

function countCitationShapes(text: string): number {
  const parenthetical = (text.match(/\([A-Z][a-zA-Z]+[^)]*\d{4}\)/g) ?? []).length;
  const narrative = (text.match(/[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*\(\d{4}\)/g) ?? [])
    .length;
  const numbered = (text.match(/\[\d+\]/g) ?? []).length;
  const quotedTitleYear = (
    text.match(/\(["'][^"']{4,120}["'],?\s*\d{4}(?:-\d{4})?\)/g) ?? []
  ).length;
  return parenthetical + narrative + numbered + quotedTitleYear;
}

function splitIntroAtWordCount(
  intro: string,
  openingWords: number,
): { intro: string; rest: string } {
  const words = intro.trim().split(/\s+/).filter(Boolean);
  if (words.length <= openingWords) {
    return { intro: intro.trim(), rest: "" };
  }
  return {
    intro: words.slice(0, openingWords).join(" "),
    rest: words.slice(openingWords).join(" "),
  };
}

function introHasLiteratureSignals(intro: string): boolean {
  return (
    countCitationShapes(intro) >= 2 ||
    citationSentenceRatio(intro) > 0.03 ||
    scoreLitContent(intro) >= 1.5 ||
    /\b(?:lack\s+of\s+research|noticeable\s+lack|prior\s+(?:work|research|studies)|studies?\s+(?:have|has|show)|research\s+has)\b/i.test(
      intro,
    )
  );
}

/** Introduction mapped from a section heading (not content-only fallback). */
function introAssignedByHeading(blocks: DocumentBlock[]): boolean {
  return blocks.some((b) => {
    if (b.role !== "introduction" || !b.heading.trim()) return false;
    const n = normalizeHeadingForMatch(b.heading);
    return INTRO_HEADING.test(n) || INTRO_OR_RQ_HEADING.test(n);
  });
}

function applyOversizedIntroLiteratureSplit(
  intro: string,
  literatureReview: string,
  paperBody: string,
  blocks: DocumentBlock[],
): { intro: string; literatureReview: string } {
  if (introAssignedByHeading(blocks)) {
    return { intro, literatureReview };
  }
  const bodyWords = countWords(paperBody);
  const introWords = countWords(intro);
  const litWords = countWords(literatureReview);
  const shouldSplit =
    introWords >= 400 &&
    introHasLiteratureSignals(intro) &&
    (introWords / Math.max(bodyWords, 1) > 0.6 ||
      introWords > 2000 ||
      (litWords < 200 && introWords >= 400));
  if (!shouldSplit) {
    return { intro, literatureReview };
  }
  const { intro: opening, rest } = splitIntroAtWordCount(intro, 400);
  if (!rest.trim()) {
    return { intro, literatureReview };
  }
  let litChunk = "";
  const methodSplit = splitTextAtMethodFingerprint(rest);
  if (methodSplit && countWords(methodSplit.literature) >= 150) {
    litChunk = methodSplit.literature;
  } else {
    const methodAnchor = rest.search(
      /\b(?:for\s+this\s+study|in\s+this\s+study|I\s+recruited|participants\s+were|this\s+study\s+will\s+be\s+using|mixed\s+methods\s+case\s+study)\b/i,
    );
    if (methodAnchor > 150) {
      litChunk = rest.slice(0, methodAnchor).trim();
    } else if (introHasLiteratureSignals(rest) && countWords(rest) <= 3500) {
      litChunk = rest;
    }
  }
  const lit = [literatureReview, litChunk].filter(Boolean).join("\n\n").trim();
  return { intro: opening, literatureReview: lit };
}

function isAuthorMetadataHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  const normalized = normalizeHeadingForMatch(line);
  if (
    INTRO_HEADING.test(normalized) ||
    LIT_HEADING.test(normalized) ||
    isWhatSubjectVerbLiteratureHeading(normalized) ||
    isGapSectionHeading(normalized) ||
    METHOD_HEADING.test(normalized) ||
    RESULTS_HEADING.test(normalized) ||
    DISCUSSION_HEADING.test(normalized) ||
    LIMITATIONS_HEADING.test(normalized) ||
    IMPLICATIONS_HEADING.test(normalized) ||
    CONCLUSION_HEADING.test(normalized) ||
    INTRO_OR_RQ_HEADING.test(normalized)
  ) {
    return false;
  }
  if (/^(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+[A-Z]/i.test(t)) return true;
  if (
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(t) &&
    !/\d/.test(t) &&
    !/\?/.test(t)
  ) {
    return true;
  }
  return false;
}

function looksLikeLimitationsHeading(normalized: string, raw = ""): boolean {
  const n = normalized.trim();
  const r = raw.trim();
  if (!n && !r) return false;
  if (isAuthorMetadataHeading(r) || isAuthorMetadataHeading(n)) return false;
  if (LIMITATIONS_HEADING.test(n)) return true;
  return LIMITATIONS_HEADING_KEYWORD.test(n) || LIMITATIONS_HEADING_KEYWORD.test(r);
}

function matchesKnownHeadingAlias(line: string): boolean {
  const normalized = normalizeHeadingForMatch(line);
  return (
    INTRO_HEADING.test(normalized) ||
    LIT_HEADING.test(normalized) ||
    isWhatSubjectVerbLiteratureHeading(normalized) ||
    isGapSectionHeading(normalized) ||
    GAP_HEADING.test(normalized) ||
    METHOD_HEADING.test(normalized) ||
    RESULTS_HEADING.test(normalized) ||
    RESULTS_DISCUSSION_HEADING.test(normalized) ||
    DISCUSSION_HEADING.test(normalized) ||
    LIMITATIONS_HEADING.test(normalized) ||
    IMPLICATIONS_HEADING.test(normalized) ||
    INFORMAL_IMPLICATIONS_HEADING.test(normalized) ||
    CONCLUSION_HEADING.test(normalized) ||
    looksLikeLimitationsHeading(normalized, line)
  );
}

function isTitleCaseStudentHeading(line: string): boolean {
  const t = stripColonFromHeading(line.trim());
  if (t.length === 0 || t.length > HEADING_MAX_CHARS) return false;
  const words = t.split(/\s+/);
  if (words.length === 1) {
    if (!matchesKnownHeadingAlias(line)) return false;
    if (t.length > 40) return false;
    return true;
  }
  if (words.length > 10) return false;
  for (const word of words) {
    if (word.length > 28) return false;
    if (word === "I") continue;
    if (HEADING_PARTICLES.has(word.toLowerCase())) continue;
    if (/^[A-Z]/.test(word) || /^\d/.test(word)) continue;
    if (/^[A-Z]{2,}$/.test(word)) continue;
    return false;
  }
  return true;
}

function isQuestionAsHeading(line: string): boolean {
  const t = stripColonFromHeading(line.trim());
  if (t.length < 8 || t.length > 120) return false;
  if (/^research\s+question\s*:/i.test(t) && t.length > 100) return false;
  if (/^so\s+what\??$/i.test(t)) return false;
  if (RHETORICAL_QUESTION.test(t) && !INVESTIGABLE_QUESTION_PHRASE.test(t)) return false;
  if (t.endsWith("?") && t.split(/\s+/).length <= 22) return true;
  if (INVESTIGABLE_QUESTION_PHRASE.test(t) && t.split(/\s+/).length <= 18) return true;
  return false;
}

function hasNumericalResultsInBody(body: string): boolean {
  return RESULTS_CONTENT.test(body);
}

function hasQualitativeFindingsInBody(body: string): boolean {
  return QUALITATIVE_FINDINGS.test(body);
}

function hasProceduralCollectionOnly(body: string): boolean {
  return (
    METHOD_PROCEDURAL.test(body) &&
    !hasNumericalResultsInBody(body) &&
    !hasQualitativeFindingsInBody(body)
  );
}

function resolveDataOrAnalysisRole(
  normalized: string,
  body: string,
  defaultRole: FunctionalRole,
): FunctionalRole {
  const lower = normalized.toLowerCase();
  if (lower === "data analysis" || lower === "data" || lower === "analysis") {
    if (hasProceduralCollectionOnly(body)) return "method";
    if (hasNumericalResultsInBody(body) || hasQualitativeFindingsInBody(body)) {
      return "results";
    }
  }
  if (lower === "data" && hasNumericalResultsInBody(body)) return "results";
  return defaultRole;
}

function roleFromChapterHeading(normalized: string): FunctionalRole | null {
  const n = normalized.trim();
  if (CHAPTER_INTRO.test(n)) return "introduction";
  if (CHAPTER_LIT.test(n)) return "literatureReview";
  if (CHAPTER_METHOD.test(n)) return "method";
  if (CHAPTER_RESULTS.test(n)) return "results";
  if (CHAPTER_CONCLUSION.test(n)) return "conclusion";
  return null;
}

function roleFromHeadingAlias(
  normalized: string,
  rawHeading: string,
  blockIndex: number,
  blockStart: number,
  paperBodyLength: number,
): { role: FunctionalRole; isResultsDiscussionCombo?: boolean } | null {
  const n = normalized.trim();
  const raw = rawHeading.trim();
  if (!n) return null;

  if (SKIP_REFLECTION.test(n)) return { role: "supplementary" };
  if (SKIP_HEADING.test(n)) return { role: "supplementary" };
  if (METADATA_HEADING_SKIP.test(n) || METADATA_HEADING_SKIP.test(raw)) {
    return { role: "supplementary" };
  }
  if (isAuthorMetadataHeading(raw) || isAuthorMetadataHeading(n)) {
    return { role: "supplementary" };
  }
  if (
    SKIP_OVERVIEW_START.test(n) &&
    (blockIndex === 0 || blockStart < paperBodyLength * 0.06)
  ) {
    return { role: "supplementary" };
  }

  const chapterRole = roleFromChapterHeading(n);
  if (chapterRole) return { role: chapterRole };

  if (looksLikeLimitationsHeading(n, raw)) {
    return { role: "limitations" };
  }

  if (isQuestionAsHeading(raw) || isQuestionAsHeading(n)) {
    return { role: "researchQuestion" };
  }

  if (FIRST_PERSON_INTRO_HEADING.test(n)) return { role: "introduction" };
  if (FIRST_PERSON_LIT_HEADING.test(n)) return { role: "literatureReview" };

  if (RESULTS_DISCUSSION_HEADING.test(n)) {
    return { role: "results", isResultsDiscussionCombo: true };
  }

  if (SIGNIFICANCE_OF_STUDY.test(n)) return { role: "introduction" };
  if (INTRO_HEADING.test(n)) return { role: "introduction" };
  if (RQ_EXPLICIT_HEADING.test(n)) return { role: "researchQuestion" };
  if (INTRO_OR_RQ_HEADING.test(n)) {
    return {
      role: /^(?:background|context)$/i.test(n) ? "introduction" : "researchQuestion",
    };
  }

  if (isGapSectionHeading(n)) return { role: "gap" };
  if (LIT_HEADING.test(n) || isWhatSubjectVerbLiteratureHeading(n)) {
    return { role: "literatureReview" };
  }

  if (METHOD_HEADING.test(n)) return { role: "method" };
  if (RESULTS_HEADING.test(n)) {
    return { role: "results" };
  }

  if (DISCUSSION_HEADING.test(n)) return { role: "discussion" };
  if (LIMITATIONS_HEADING.test(n)) return { role: "limitations" };
  if (IMPLICATIONS_HEADING.test(n) || IMPLICATIONS_SIGNIFICANCE_HEADING.test(n)) {
    return { role: "implications" };
  }
  if (INFORMAL_IMPLICATIONS_HEADING.test(n)) return { role: "implications" };
  if (CONCLUSION_HEADING.test(n)) return { role: "conclusion" };

  return null;
}

const TOP_LEVEL_EXIT_ROLES: FunctionalRole[] = [
  "introduction",
  "literatureReview",
  "gap",
  "results",
  "discussion",
  "conclusion",
  "limitations",
  "implications",
];

function resolveMajorSectionFromHeading(
  line: string,
  blockIndex: number,
  paperBodyLength: number,
): FunctionalRole | null {
  const normalized = normalizeHeadingForMatch(line);
  const alias = roleFromHeadingAlias(
    normalized,
    line,
    blockIndex,
    0,
    paperBodyLength,
  );
  if (!alias || alias.role === "supplementary") return null;
  return alias.role;
}

function looksLikeTableDataRow(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 120) return false;
  if (/^.{0,2}$/.test(t)) return true;
  if (/^\d+\.?\d*\s*%?\s*$/.test(t)) return true;
  if (/^\d+[\s%]+\d+/.test(t)) return true;
  if (/^[A-Za-z\s]+\(\s*%\s*\)/.test(t)) return true;
  if (/^\d+\s+[A-Z][a-z]+/.test(t)) return true;
  if (/^[A-Z][a-z]+\s+\d+[\.,]\d+/.test(t)) return true;
  const nums = (t.match(/\b\d+(?:\.\d+)?\b/g) ?? []).length;
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 2 || nums < 2) return false;
  return nums / words >= 0.35;
}

function looksLikeFigureOrTableCaption(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^(?:Figure|Fig\.?|Table|Chart|Graph|Diagram|Appendix\s+[A-Z])\s+\d+/i.test(t)) {
    return true;
  }
  if (/^(?:Figure|Fig\.?|Table|Chart|Graph)\s+[A-Z]/i.test(t)) return true;
  if (/^(?:Image|Photo|Photograph|Illustration)\s+\d+/i.test(t)) return true;
  if (/^Note\.\s/i.test(t)) return true;
  if (/^Source:\s/i.test(t)) return true;
  return false;
}

/** College Board rubric band descriptors embedded in sample PDFs — not section headings. */
function looksLikeCollegeBoardRubricHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 12 || t.length > 120) return false;
  if (/^Score\s+of\s+\d/i.test(t)) return true;
  if (/^Report\s+on\s+Existing\s+Knowledge/i.test(t)) return true;
  if (/Simplistic\s+Use\s+of\s+a\s+Research/i.test(t)) return true;
  if (/Scoring\s+Guidelines/i.test(t)) return true;
  if (/^Academic\s+Paper$/i.test(t)) return true;
  return (
    /\bargument\b/i.test(t) &&
    /\b(?:understanding|articulate|ineffectual|supported|conveying|new\s+understanding)\b/i.test(t)
  );
}

function looksLikeSurveyOrFormLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 120) return false;
  if (/^Grade\d+(?:\s+Grade\d+)+/i.test(t)) return true;
  if (/^(?:Yes|No)\t/i.test(t)) return true;
  if (/^[A-Z]\d(?:\s+[A-Z]\d){2,}$/.test(t)) return true;
  if (/^Please\s+complete\s+the\s+short/i.test(t)) return true;
  if (/^I\s*am\s*in\s*a/i.test(t.replace(/([a-z])([A-Z])/g, "$1 $2"))) return true;
  return false;
}

function looksLikeResultsDataLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 120) return false;
  if (/^\d+\.?\d*\s*%?\s*$/.test(t)) return true;
  if (/^[A-Za-z]{1,24}\s+\d+(?:\.\d+)?\s*%?$/.test(t)) return true;
  if (/^\d+[\s%]+\d+/.test(t)) return true;
  return looksLikeTableDataRow(t);
}

const REGION_SUBSECTION_COLON_MAX = 80;

const RESULTS_DISCUSSION_SUBSECTION =
  /^(?:comparison|synthesis|interpretation|addressing|limitations?\s+of|implications|overall\s+conclusion)/i;

function isCollegeBoardPacketRunningHeader(line: string): boolean {
  const t = line.trim();
  return (
    /^Research\s+Sample\s+[A-J]\s+\d+\s+of\s+\d+/i.test(t) ||
    /^AP®?\s*Research\s+\d{4}/i.test(t) ||
    (/^[A-Z][A-Z\s\-–—:]{8,}$/.test(t) && /\d+\s+of\s+\d+/.test(t))
  );
}

/** PDF extraction artifacts (running heads, bibliography line breaks) — not section headings. */
function isPdfBibliographyOrRunningHeaderFragment(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 120) return false;
  if (isCollegeBoardPacketRunningHeader(t)) return true;
  if (/^AP\s*Research\s*$/i.test(t)) return true;
  if (/^Running\s+head:/i.test(t)) return true;
  if (/^\d{1,4}$/.test(t)) return true;
  if (/^[A-Z][a-zA-Z\s,'-]{3,60}\s+\d{1,4}\s*$/.test(t)) return true;
  if (/^[A-Z\s]{5,40}\s+\d{1,4}$/.test(t)) return true;
  if (t.length < 50 && /\)\s*\.?\s*$/.test(t) && /\d/.test(t) && !/\?/.test(t)) {
    return true;
  }
  return false;
}

function isHeadingLine(line: string, activeMajorSection: FunctionalRole | null): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > HEADING_MAX_CHARS) return false;

  if (isCollegeBoardPacketRunningHeader(t)) return false;
  if (isPdfBibliographyOrRunningHeaderFragment(t)) return false;

  if (/^word\s+count\s*:/i.test(t)) return false;
  if (looksLikeTableDataRow(t)) return false;
  if (looksLikeFigureOrTableCaption(t)) return false;
  if (looksLikeCollegeBoardRubricHeading(t)) return false;
  if (looksLikeSurveyOrFormLine(t)) return false;

  if (activeMajorSection === "method") {
    if (isMethodSubsectionHeading(t)) return false;
    if (/^\d+\.\s+/.test(t)) return false;
  }

  if (
    (activeMajorSection === "results" || activeMajorSection === "discussion") &&
    isResultsSubsectionHeadingLine(t)
  ) {
    return false;
  }

  const normalized = normalizeHeadingForMatch(t);

  if (
    activeMajorSection &&
    ["method", "literatureReview", "results", "discussion"].includes(activeMajorSection)
  ) {
    const colonMax =
      activeMajorSection === "method" ? 60 : REGION_SUBSECTION_COLON_MAX;
    if (t.length <= colonMax && /:\s*$/.test(t)) return false;
  }

  if (activeMajorSection === "literatureReview") {
    if (/^(?:introduction|conclusion|synthesis)\s*:?$/i.test(normalized)) return false;
    if (isGapSectionHeading(normalized)) return true;
    if (isWhatSubjectVerbLiteratureHeading(normalized)) return true;
    if (isTopicLiteratureHeading(normalized, t)) return false;
    if (isTitleCaseStudentHeading(t) && !matchesKnownHeadingAlias(t)) return false;
  }

  if (
    (activeMajorSection === "results" || activeMajorSection === "discussion") &&
    RESULTS_DISCUSSION_SUBSECTION.test(normalized)
  ) {
    return false;
  }

  if (
    (activeMajorSection === "results" || activeMajorSection === "discussion") &&
    looksLikeResultsDataLine(t)
  ) {
    return false;
  }

  if (
    activeMajorSection === "results" &&
    t.length < 120 &&
    /\b(?:table|figure|study|auc|model|across\s+selected|comparison|validation)\b/i.test(t)
  ) {
    return false;
  }

  if (SKIP_HEADING.test(normalized) || SKIP_REFLECTION.test(normalized)) return true;
  if (MAJOR_HEADING.test(normalized)) return true;
  if (INTRO_OR_RQ_HEADING.test(normalized)) return true;
  if (LIT_HEADING.test(normalized)) return true;
  if (isWhatSubjectVerbLiteratureHeading(normalized)) return true;
  if (isGapSectionHeading(normalized)) return true;
  if (GAP_HEADING.test(normalized)) return true;
  if (METHOD_HEADING.test(normalized)) return true;
  if (RESULTS_HEADING.test(normalized)) return true;
  if (RESULTS_DISCUSSION_HEADING.test(normalized)) return true;
  if (DISCUSSION_HEADING.test(normalized)) return true;
  if (INFORMAL_IMPLICATIONS_HEADING.test(normalized)) return true;
  if (LIMITATIONS_HEADING.test(normalized)) return true;
  if (IMPLICATIONS_HEADING.test(normalized)) return true;
  if (CONCLUSION_HEADING.test(normalized)) return true;
  if (roleFromChapterHeading(normalized)) return true;
  if (looksLikeLimitationsHeading(normalized, t)) return true;
  if (isQuestionAsHeading(t)) return true;
  if (/^[A-Z][A-Z\s\-–—:]{2,}$/.test(t) && t.length < 80) return true;
  if (/^\d+\.\s+[A-Za-z]/.test(t)) return true;
  if (isTitleCaseStudentHeading(t)) return true;
  return false;
}

function segmentIntoBlocks(paperBody: string): DocumentBlock[] {
  const lines = paperBody.split("\n");
  const blocks: DocumentBlock[] = [];
  let currentHeading = "";
  let bodyLines: string[] = [];
  let blockStart = 0;
  let pos = 0;
  let activeMajorSection: FunctionalRole | null = null;

  const flush = (endPos: number) => {
    const body = bodyLines.join("\n").trim();
    if (body.length > 0 || currentHeading.length > 0) {
      blocks.push({
        heading: currentHeading,
        headingNormalized: normalizeHeadingForMatch(currentHeading),
        body,
        start: blockStart,
        end: endPos,
        role: "unknown",
      });
    }
    bodyLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isHeadingLine(trimmed, activeMajorSection)) {
      flush(pos);
      const major = resolveMajorSectionFromHeading(
        trimmed,
        blocks.length,
        paperBody.length,
      );
      if (
        major === "method" ||
        major === "literatureReview" ||
        major === "results" ||
        major === "discussion"
      ) {
        activeMajorSection = major;
      } else if (major && TOP_LEVEL_EXIT_ROLES.includes(major)) {
        activeMajorSection = major;
      }
      currentHeading = trimmed;
      blockStart = pos;
      pos += line.length + 1;
      continue;
    }

    bodyLines.push(line);
    pos += line.length + 1;
  }
  flush(pos);
  return blocks.filter((b) => b.body.trim().length > 20 || b.heading.length > 0);
}

function countBlockWords(block: DocumentBlock): number {
  return `${block.heading}\n${block.body}`.split(/\s+/).filter(Boolean).length;
}

const NUMBERED_METHOD_HEADING =
  /^\d+\.\s*(?:Methodology|Methods?|Method)\b/i;
const ROMAN_METHOD_HEADING = /^[IVXLC]+\.\s*(?:Methodology|Methods?|Method)\b/i;
const NUMBERED_MAJOR_HEADING = /^\d+\.\s+[A-Za-z]/;

const METHOD_FOLD_CONTENT_SIGNAL =
  /\b(?:participants?|instrument|survey|procedure|collected|administered|statistical|analysis|IRB|consent|recruited|measured)\b/i;

function isMethodHeadingLine(heading: string): boolean {
  const n = normalizeHeadingForMatch(heading);
  return (
    METHOD_HEADING.test(n) ||
    NUMBERED_METHOD_HEADING.test(heading.trim()) ||
    ROMAN_METHOD_HEADING.test(heading.trim())
  );
}

function methodRegionWordCount(blocks: DocumentBlock[]): number {
  return blocks
    .filter((b) => b.role === "method")
    .reduce((sum, b) => sum + countBlockWords(b), 0);
}

function nextSectionAfterMethod(
  blocks: DocumentBlock[],
  methodStartIdx: number,
  paperBodyLength: number,
): number {
  const methodHeading = blocks[methodStartIdx].heading.trim();
  const numberedMethod =
    NUMBERED_METHOD_HEADING.test(methodHeading) ||
    ROMAN_METHOD_HEADING.test(methodHeading);
  const methodSectionLevel = numberedMethod
    ? parseInt(methodHeading.match(/^(\d+)\./)?.[1] ?? "99", 10)
    : -1;

  let nextTopStart = paperBodyLength;
  for (let i = methodStartIdx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    const rawHeading = b.heading.trim();

    if (numberedMethod && /^\d+\.\d+/.test(rawHeading)) {
      continue;
    }

    if (numberedMethod && rawHeading) {
      const topNum = rawHeading.match(/^(\d+)\./);
      if (
        topNum &&
        NUMBERED_MAJOR_HEADING.test(rawHeading) &&
        !/^\d+\.\d+/.test(rawHeading) &&
        parseInt(topNum[1], 10) > methodSectionLevel
      ) {
        nextTopStart = b.start;
        break;
      }
    }

    if (!numberedMethod) {
      if (TOP_LEVEL_EXIT_ROLES.includes(b.role) && b.role !== "method") {
        nextTopStart = b.start;
        break;
      }
      const n = normalizeHeadingForMatch(b.heading);
      if (
        b.heading &&
        (RESULTS_HEADING.test(n) ||
          DISCUSSION_HEADING.test(n) ||
          CONCLUSION_HEADING.test(n) ||
          LIT_HEADING.test(n) ||
          INTRO_HEADING.test(n))
      ) {
        nextTopStart = b.start;
        break;
      }
    }
  }
  return nextTopStart;
}

function blockHasMethodFoldSignals(block: DocumentBlock): boolean {
  const text = `${block.heading}\n${block.body}`;
  if (scoreMethodContent(text) >= 2) return true;
  const hits = (text.match(METHOD_FOLD_CONTENT_SIGNAL) ?? []).length;
  return hits >= 2;
}

/** Fold unknown blocks between method heading and next top-level section into method. */
function foldUnknownBlocksIntoMethod(blocks: DocumentBlock[], paperBodyLength: number): void {
  if (methodRegionWordCount(blocks) >= 100) return;

  const methodStartIdx = blocks.findIndex((b) => b.heading && isMethodHeadingLine(b.heading));
  if (methodStartIdx < 0) return;

  const methodStart = blocks[methodStartIdx].start;
  const nextTopStart = nextSectionAfterMethod(blocks, methodStartIdx, paperBodyLength);
  const numberedMethod = NUMBERED_METHOD_HEADING.test(
    blocks[methodStartIdx].heading.trim(),
  );

  for (const b of blocks) {
    if (b.start < methodStart || b.start >= nextTopStart) continue;
    if (numberedMethod) {
      const n = normalizeHeadingForMatch(b.heading);
      if (b.heading && LIT_HEADING.test(n)) continue;
      if (b.role === "literatureReview") continue;
      b.role = "method";
      continue;
    }
    if (b.role !== "unknown") continue;
    b.role = "method";
  }
}

/** Fold method subsections (Hypothesis, Sampling, etc.) between method and results headings. */
function foldMethodBlocksUntilResults(
  blocks: DocumentBlock[],
  paperBodyLength: number,
): void {
  if (methodRegionWordCount(blocks) >= 400) return;

  const methodStartIdx = blocks.findIndex((b) => b.heading && isMethodHeadingLine(b.heading));
  if (methodStartIdx < 0) return;

  const resultsIdx = blocks.findIndex(
    (b, i) =>
      i > methodStartIdx &&
      b.heading &&
      /^results?\b/i.test(normalizeHeadingForMatch(b.heading)),
  );
  const methodEnd = resultsIdx >= 0 ? blocks[resultsIdx].start : paperBodyLength;

  for (const b of blocks) {
    if (b.start < blocks[methodStartIdx].start || b.start >= methodEnd) continue;
    if (b.role === "method") continue;
    if (
      (b.role === "researchQuestion" ||
        b.role === "unknown" ||
        b.role === "literatureReview") &&
      (isMethodSubsectionHeading(b.heading) ||
        blockHasMethodFoldSignals(b) ||
        scoreMethodContent(`${b.heading}\n${b.body}`) >= 2.5)
    ) {
      b.role = "method";
    }
  }
}

/** Fold unknown blocks after a short method region when figure captions fragmented method. */
function foldFragmentedMethodAfterCaptions(
  blocks: DocumentBlock[],
  paperBodyLength: number,
): void {
  if (methodRegionWordCount(blocks) >= 600) return;

  const methodStartIdx = blocks.findIndex((b) => b.heading && isMethodHeadingLine(b.heading));
  if (methodStartIdx < 0) return;

  const methodStart = blocks[methodStartIdx].start;
  const nextTopStart = nextSectionAfterMethod(blocks, methodStartIdx, paperBodyLength);
  const captionFoldEnd = methodStart + 2000;

  for (const b of blocks) {
    if (b.start < methodStart || b.start >= Math.min(nextTopStart, captionFoldEnd)) continue;
    if (b.role !== "unknown") continue;
    if (blockHasMethodFoldSignals(b)) {
      b.role = "method";
    }
  }
}

/**
 * When method heading maps to near-zero words, fold following blocks (any role) into method
 * until the next major/numbered section — fixes CB PDFs where "3. Methodology" is a stub heading.
 */
function expandShortMethodRegion(
  blocks: DocumentBlock[],
  paperBody: string,
  paperBodyLength: number,
): void {
  if (methodRegionWordCount(blocks) >= 100) return;

  const methodStartIdx = blocks.findIndex((b) => b.heading && isMethodHeadingLine(b.heading));
  if (methodStartIdx < 0) return;

  const methodStart = blocks[methodStartIdx].start;
  const nextTopStart = nextSectionAfterMethod(blocks, methodStartIdx, paperBodyLength);
  const window = paperBody.slice(methodStart, Math.min(paperBody.length, methodStart + 3000));
  const windowHasMethodSignals =
    (window.match(METHOD_FOLD_CONTENT_SIGNAL) ?? []).length >= 2 ||
    matchesMethodFingerprint(window) ||
    scoreMethodContent(window) >= 2;

  const numberedMethod = NUMBERED_METHOD_HEADING.test(
    blocks[methodStartIdx].heading.trim(),
  );

  for (const b of blocks) {
    if (b.start < methodStart || b.start >= nextTopStart) continue;
    if (b.role === "method") continue;

    if (numberedMethod) {
      const n = normalizeHeadingForMatch(b.heading);
      if (b.heading && LIT_HEADING.test(n)) continue;
      if (b.role === "literatureReview") continue;
      b.role = "method";
      continue;
    }

    if (windowHasMethodSignals && blockHasMethodFoldSignals(b)) {
      b.role = "method";
    }
  }
}

function citationSentenceRatio(text: string): number {
  const sents = sentences(text);
  if (sents.length === 0) return 0;
  const cited = sents.filter((s) => citationsInSentence(s).length > 0).length;
  return cited / sents.length;
}

function scoreMethodContent(text: string): number {
  if (PRIOR_METHOD_CITE.test(text)) return 0;
  let score = 0;
  if (METHOD_PROCEDURAL.test(text)) score += 3;
  if (/\b(?:will|would)\s+(?:collect|conduct|survey|analyze)\b/i.test(text)) score += 1;
  if (/\bstep\s+\d|first,|second,|then,|finally,/i.test(text)) score += 1;
  return score;
}

function scoreResultsContent(text: string): number {
  let score = 0;
  if (RESULTS_CONTENT.test(text)) score += 3;
  if (QUALITATIVE_FINDINGS.test(text)) score += 3;
  if (/\bgraph\s+\d|chart\s+\d|as\s+shown\s+in\b/i.test(text)) score += 2;
  return score;
}

function scoreLitContent(text: string): number {
  let score = citationSentenceRatio(text) * 5;
  if (/\b(?:prior|previous|existing|literature|research\s+has|studies\s+have)\b/i.test(text))
    score += 1;
  if (/\(\w+,\s*\d{4}\)/.test(text)) score += 1;
  return score;
}

function classifyBlock(
  block: DocumentBlock,
  blockIndex: number,
  paperBodyLength: number,
  methodBlockStart: number,
): FunctionalRole {
  const normalized = block.headingNormalized || normalizeHeadingForMatch(block.heading);
  const text = `${block.heading}\n${block.body}`;

  const alias = roleFromHeadingAlias(
    normalized,
    block.heading,
    blockIndex,
    block.start,
    paperBodyLength,
  );
  if (alias) {
    if (alias.isResultsDiscussionCombo) {
      block.isResultsDiscussionCombo = true;
    }
    let role = alias.role;
    if (
      role === "results" &&
      /^(?:data(?:\s+analysis)?|analysis)$/i.test(normalized.trim())
    ) {
      role = resolveDataOrAnalysisRole(normalized, block.body, role);
    }
    if (role !== "supplementary") return role;
    return "supplementary";
  }

  if (looksLikeLimitationsHeading(normalized, block.heading)) {
    return "limitations";
  }

  if (
    LIMITATION_CONTENT.test(text) &&
    LIMITATION_CONTENT.test(block.body) &&
    countWords(block.body) <= 400
  ) {
    return "limitations";
  }
  if (IMPLICATION_CONTENT.test(text)) return "implications";

  const beforeMethod =
    methodBlockStart < 0 ||
    (block.start < methodBlockStart && block.start < paperBodyLength * 0.6);

  if (beforeMethod) {
    const topicHeading = isTopicLiteratureHeading(normalized, block.heading);
    if (topicHeading && scoreMethodContent(block.body) < 2) {
      return "literatureReview";
    }
    if (
      countCitationShapes(block.body) >= 1 &&
      scoreLitContent(block.body) >= 1.5 &&
      scoreMethodContent(block.body) < 2 &&
      scoreResultsContent(block.body) < 2
    ) {
      return "literatureReview";
    }
  }

  if (countCitationShapes(block.body) >= 3 && scoreLitContent(block.body) >= 3) {
    const method = scoreMethodContent(block.body);
    const results = scoreResultsContent(block.body);
    if (method < 3 && results < 3) return "literatureReview";
  }

  const lit = scoreLitContent(block.body);
  const method = scoreMethodContent(block.body);
  const results = scoreResultsContent(block.body);

  if (
    countWords(block.body) > Math.max(500, Math.floor(paperBodyLength * 0.4)) &&
    !alias
  ) {
    return "unknown";
  }

  if (results >= 3 && results >= method && results >= lit) return "results";
  if (method >= 3 && method >= lit) return "method";
  if (lit >= LIT_CITATION_DENSITY_THRESHOLD * 5 && lit > method) return "literatureReview";
  if (findGapSentences(block.body).length >= 1 && isGapSectionHeading(normalized)) {
    return "gap";
  }

  return "unknown";
}

const DISCUSSION_TRANSITION_SIGNAL =
  /\b(?:compared\s+to\s+(?:prior|previous)|consistent\s+with|inconsistent\s+with|this\s+suggests|this\s+indicates|this\s+finding\s+supports|contrary\s+to\s+expectations|the\s+literature|these\s+findings\s+(?:suggest|indicate)|one\s+explanation|in\s+contrast\s+to\s+(?:prior|previous|the))\b/i;

function sentenceHasResultsSignal(sentence: string): boolean {
  return RESULTS_CONTENT.test(sentence) || QUALITATIVE_FINDINGS.test(sentence);
}

function sentenceHasDiscussionSignal(sentence: string): boolean {
  return DISCUSSION_TRANSITION_SIGNAL.test(sentence) && !sentenceHasResultsSignal(sentence);
}

function splitResultsDiscussionBody(body: string): { results: string; discussion: string } {
  const sents = sentences(body);
  if (sents.length < 2) return { results: body, discussion: "" };

  const hasResults = sents.some(sentenceHasResultsSignal);
  const hasDiscussion = sents.some(
    (s) => DISCUSSION_TRANSITION_SIGNAL.test(s) || sentenceHasDiscussionSignal(s),
  );
  if (!hasResults || !hasDiscussion) return { results: body, discussion: "" };

  let splitIdx = -1;
  for (let i = 0; i < sents.length; i++) {
    if (sentenceHasDiscussionSignal(sents[i])) {
      splitIdx = i;
      break;
    }
  }
  if (splitIdx <= 0) return { results: body, discussion: "" };

  return {
    results: sents.slice(0, splitIdx).join(" "),
    discussion: sents.slice(splitIdx).join(" "),
  };
}

function applyResultsDiscussionSentenceSplits(blocks: DocumentBlock[]): string[] {
  const extraDiscussion: string[] = [];
  for (const block of blocks) {
    if (block.isResultsDiscussionCombo) continue;
    const body = block.body;
    const hasResults = sentenceHasResultsSignal(body);
    const hasDiscussion = sentences(body).some(
      (s) => DISCUSSION_TRANSITION_SIGNAL.test(s) && !sentenceHasResultsSignal(s),
    );
    if (!hasResults || !hasDiscussion) continue;
    if (block.role !== "results" && block.role !== "discussion") continue;
    const split = splitResultsDiscussionBody(block.body);
    if (split.discussion.trim().length < 40) continue;
    block.body = split.results.trim() || block.body;
    extraDiscussion.push(split.discussion);
  }
  return extraDiscussion;
}

function splitLitMethodBody(body: string): { lit: string; method: string } {
  const m = body.match(LIT_TO_METHOD_SPLIT);
  if (!m || m.index === undefined || m.index < 200) {
    return { lit: body, method: "" };
  }
  return {
    lit: body.slice(0, m.index).trim(),
    method: body.slice(m.index).trim(),
  };
}

function mergeBlocks(blocks: DocumentBlock[], role: FunctionalRole): string {
  return blocks
    .filter((b) => b.role === role)
    .map((b) => (b.heading ? `${b.heading}\n${b.body}` : b.body))
    .join("\n\n")
    .trim();
}

function mergeResultsDiscussionCombo(blocks: DocumentBlock[]): {
  results: string;
  discussion: string;
} {
  const chunks: string[] = [];
  const disc: string[] = [];
  for (const b of blocks) {
    if (!b.isResultsDiscussionCombo) continue;
    const split = splitResultsDiscussionBody(b.body);
    if (split.results) chunks.push(split.results);
    if (split.discussion) disc.push(split.discussion);
    else chunks.push(b.body);
  }
  return { results: chunks.join("\n\n"), discussion: disc.join("\n\n") };
}

function extractEmbeddedLimitations(text: string): string {
  const chunks: string[] = [];
  for (const s of sentences(text)) {
    if (LIMITATION_CONTENT.test(s)) chunks.push(s);
  }
  return chunks.join(" ");
}

function extractEmbeddedImplications(text: string): string {
  const chunks: string[] = [];
  for (const s of sentences(text)) {
    if (IMPLICATION_CONTENT.test(s)) chunks.push(s);
  }
  return chunks.join(" ");
}

function extractResultsByContent(assigned: DocumentBlock[]): string {
  return assigned
    .filter((b) => {
      if (scoreResultsContent(b.body) < 2) return false;
      if (b.role === "unknown") {
        return citationSentenceRatio(b.body) < LIT_CITATION_DENSITY_THRESHOLD;
      }
      if (b.role === "supplementary") {
        const label = `${b.heading}\n${b.body}`;
        return /\b(?:survey\s*results?|table\s+\d|figure\s+\d|mean\s*\(|std\.?|n\s*=\s*\d)\b/i.test(
          label,
        );
      }
      return false;
    })
    .map((b) => b.body)
    .join("\n\n");
}

function extractResultsPhrasesFromDiscussion(discussion: string): string {
  if (!discussion.trim()) return "";
  return sentences(discussion)
    .filter((s) => scoreResultsContent(s) >= 2 && !PRIOR_METHOD_CITE.test(s))
    .join(" ");
}

function extractMethodFallback(paperBody: string, existingMethod: string): string {
  if (existingMethod.trim().length > 80) return existingMethod;
  const early = paperBody.slice(0, Math.floor(paperBody.length * 0.4));
  const m = early.match(
    /[\s\S]{0,200}(?:participants?\s+(?:were|completed)|data\s+(?:were|was)\s+collected|I\s+conducted|simulation|google\s+form)[\s\S]{0,3500}/i,
  );
  return m ? m[0].trim() : existingMethod;
}

function extractConclusionFallback(
  paperBody: string,
  blocks: DocumentBlock[],
): string {
  const merged = mergeBlocks(blocks, "conclusion");
  if (merged.trim().length > 80) return merged;

  const tail = paperBody.slice(Math.floor(paperBody.length * 0.55));
  const beforeRefs = tail.split(
    /\n(?:References|Works?\s+Cited|Work\s+Cited|Bibliography)\b/i,
  )[0];
  const lastBlocks = blocks.filter((b) => b.start >= paperBody.length * 0.5);
  const lastMajor = lastBlocks
    .filter(
      (b) =>
        !["supplementary", "results", "method", "literatureReview"].includes(
          b.role,
        ),
    )
    .pop();
  if (lastMajor && lastMajor.body.trim().length > 100) {
    return lastMajor.body;
  }
  return beforeRefs.slice(-Math.min(3000, beforeRefs.length)).trim();
}

function needsContentDominantRemap(blocks: DocumentBlock[]): boolean {
  const total = blocks.reduce((s, b) => s + countWords(b.body), 0);
  if (total < 200) return false;
  const misclassified = blocks
    .filter(
      (b) =>
        b.role !== "supplementary" &&
        ["introduction", "unknown", "limitations"].includes(b.role),
    )
    .reduce((s, b) => s + countWords(b.body), 0);
  if (misclassified / total > 0.8) return true;

  const methodWords = blocks
    .filter((b) => b.role === "method")
    .reduce((s, b) => s + countWords(b.body), 0);
  const litWords = blocks
    .filter((b) => b.role === "literatureReview")
    .reduce((s, b) => s + countWords(b.body), 0);
  const resultsWords = blocks
    .filter((b) => b.role === "results")
    .reduce((s, b) => s + countWords(b.body), 0);
  return methodWords / total > 0.8 && litWords < 100 && resultsWords < 100;
}

/** Heading detection failed — reset roles and split by content fingerprints. */
function applyContentDominantRemap(
  blocks: DocumentBlock[],
  paperBodyLength: number,
): void {
  const fullText = blocks
    .filter((b) => b.role !== "supplementary")
    .map((b) => (b.heading.trim() ? `${b.heading.trim()}\n${b.body}` : b.body))
    .join("\n\n")
    .trim();
  blocks.length = 0;
  if (!fullText) return;
  blocks.push({
    heading: "",
    headingNormalized: "",
    body: fullText,
    start: 0,
    end: fullText.length,
    role: "unknown",
  });
  const expanded = expandMonolithicBlocks(blocks, paperBodyLength);
  blocks.length = 0;
  blocks.push(...expanded);
}

function firstWordsOfText(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function buildLongIntroLiterature(
  blocks: DocumentBlock[],
  paperBody: string,
): { intro: string; extraLit: string } {
  const introBlocks = blocks.filter((b) => b.role === "introduction");
  const headingIntro = introAssignedByHeading(blocks);
  let intro = mergeBlocks(introBlocks, "introduction");
  let extraLit = "";

  if (!intro) {
    intro = firstWordsOfText(paperBody, 800);
  }

  const bodyWords = countWords(paperBody);
  const introWords = countWords(intro);
  if (
    !headingIntro &&
    intro &&
    bodyWords >= 200 &&
    introWords / bodyWords > 0.6 &&
    introHasLiteratureSignals(intro)
  ) {
    const split = splitIntroAtWordCount(intro, 400);
    if (split.rest.trim()) {
      extraLit = split.rest;
      intro = split.intro;
    }
  }

  if (intro && citationSentenceRatio(intro) > 0.45) {
    const split = splitLitMethodBody(intro);
    if (split.method.length > 80) {
      extraLit = split.lit;
      intro = split.lit.slice(0, Math.min(split.lit.length, 400));
    } else {
      extraLit = intro;
      const opening = sentences(intro).slice(0, 2).join(" ");
      intro = opening.length > 40 ? opening : intro.slice(0, 400);
    }
  }

  return { intro, extraLit };
}

/** Extract investigable RQ candidates from mapped regions (not titles / rhetoric). */
export function extractResearchQuestionCandidates(
  regions: FunctionalRegions,
  paperBody: string,
): string[] {
  const found: string[] = [];
  const introWords = countWords(regions.introduction);
  const earlyBodyWhenIntroThin =
    introWords < 100 ? firstWordsOfText(paperBody, 1500) : "";
  const earlyBody1500 = firstWordsOfText(paperBody, 1500);
  const scanRegions = [
    regions.researchQuestionRegion,
    regions.introduction,
    earlyBodyWhenIntroThin,
    earlyBody1500,
    paperBody.slice(0, Math.floor(paperBody.length * 0.25)),
  ];

  for (const region of scanRegions) {
    if (!region.trim()) continue;
    for (const s of sentences(region)) {
      const investigable =
        INVESTIGABLE_QUESTION_PHRASE.test(s) ||
        (/\?/.test(s) && RQ_CONTENT_PATTERNS.some((p) => p.test(s)));
      if (RHETORICAL_QUESTION.test(s) && !INVESTIGABLE_QUESTION_PHRASE.test(s)) {
        continue;
      }
      if (BROAD_TOPIC_ONLY.test(s)) continue;
      if (investigable || RQ_CONTENT_PATTERNS.some((p) => p.test(s))) {
        if (s.length > 25) found.push(s.trim());
      }
    }
  }

  const labeled = paperBody.match(/Research\s+Question\s*:?\s*([\s\S]{0,450}?\?)/i);
  if (labeled) found.push(labeled[1].replace(/\s+/g, " ").trim());

  for (const s of sentences(earlyBody1500)) {
    if (RHETORICAL_QUESTION.test(s) && !INVESTIGABLE_QUESTION_PHRASE.test(s)) {
      continue;
    }
    if (
      /\b(?:how\s+does|to\s+what\s+extent|in\s+what\s+ways)\b/i.test(s) &&
      /\?/.test(s) &&
      s.length > 25
    ) {
      found.push(s.trim());
    }
  }

  const implicitRqMatch =
    earlyBody1500.match(
      /(?:this\s+(?:study|research|paper)|a\s+study|this\s+analysis)\s+(?:examines|investigates|investigating)\s+(?:how|whether|the\s+extent)[\s\S]{25,450}?[.]/i,
    ) ??
    earlyBody1500.match(
      /(?:this\s+(?:study|research|paper)|a\s+study)\s+(?:examines|investigates|investigating)\s+[\s\S]{25,450}?[.]/i,
    );
  if (implicitRqMatch) {
    const implicit = implicitRqMatch[0].replace(/\s+/g, " ").trim();
    if (implicit.length > 40 && !BROAD_TOPIC_ONLY.test(implicit)) {
      found.push(implicit);
    }
  }

  const tail = `${regions.conclusion}\n${regions.discussion}`;
  for (const s of sentences(tail)) {
    if (
      s.length > 30 &&
      (RQ_CONTENT_PATTERNS.some((p) => p.test(s)) ||
        (/\?/.test(s) && INVESTIGABLE_QUESTION_PHRASE.test(s)))
    ) {
      found.push(s.trim());
    }
  }

  return [...new Set(found.filter((q) => q.length > 15))];
}

/**
 * Map paper body to College Board functional regions using headings + content patterns.
 */
export function identifyFunctionalRegions(paperBody: string): FunctionalRegions {
  const rawBlocks = segmentIntoBlocks(paperBody);

  const provisionalMethodStart =
    rawBlocks.find(
      (b) =>
        b.heading &&
        /^(?:methods?|methodology|study\s+methodology|research\s+methodology|data\s+collection)/i.test(
          normalizeHeadingForMatch(b.heading),
        ),
    )?.start ?? -1;

  rawBlocks.forEach((block, index) => {
    block.role = classifyBlock(block, index, paperBody.length, provisionalMethodStart);
    if (block.role === "literatureReview" || block.role === "unknown") {
      const litScore = scoreLitContent(block.body);
      const methodScore = scoreMethodContent(block.body);
      if (litScore >= LIT_CITATION_DENSITY_THRESHOLD * 5 && methodScore >= 2) {
        const split = splitLitMethodBody(block.body);
        if (split.method.length > 80) {
          block.body = split.lit;
          block.role = "literatureReview";
        }
      }
    }
  });

  for (const block of rawBlocks) {
    if (block.role !== "unknown") continue;
    const lit = scoreLitContent(block.body);
    const method = scoreMethodContent(block.body);
    const results = scoreResultsContent(block.body);
    if (
      citationSentenceRatio(block.body) >= LIT_CITATION_DENSITY_THRESHOLD &&
      lit >= method &&
      lit >= results
    ) {
      block.role = "literatureReview";
    } else if (method >= 2.5 && method > lit) {
      const largeUnheaded =
        countWords(block.body) > Math.max(500, Math.floor(paperBody.length * 0.4)) &&
        !roleFromHeadingAlias(
          block.headingNormalized || normalizeHeadingForMatch(block.heading),
          block.heading,
          0,
          block.start,
          paperBody.length,
        );
      if (!largeUnheaded) block.role = "method";
    }
    else if (results >= 2) block.role = "results";
    else if (LIMITATION_CONTENT.test(block.body)) block.role = "limitations";
    else if (IMPLICATION_CONTENT.test(block.body)) block.role = "implications";
  }

  foldUnknownBlocksIntoMethod(rawBlocks, paperBody.length);
  expandShortMethodRegion(rawBlocks, paperBody, paperBody.length);
  foldFragmentedMethodAfterCaptions(rawBlocks, paperBody.length);
  foldMethodBlocksUntilResults(rawBlocks, paperBody.length);

  const contentDominantRemap = needsContentDominantRemap(rawBlocks);
  if (contentDominantRemap) {
    applyContentDominantRemap(rawBlocks, paperBody.length);
  }

  const firstMethodStart =
    rawBlocks.find((b) => b.role === "method")?.start ?? paperBody.length;
  const PRE_METHOD_LIT_SIGNAL =
    /\b(?:studies?\s+(?:are|have|show)|research\s+(?:has|shows)|found\s+that|reported\s+that|according\s+to|prior\s+work|existing\s+research|in\s+an\s+article|key\s+point\s+that\s+will\s+be\s+brought\s+up)\b/i;
  for (const block of rawBlocks) {
    if (block.role !== "unknown" || block.start >= firstMethodStart) continue;
    if (countWords(block.body) < 80) continue;
    if (contentDominantRemap) {
      block.role = "literatureReview";
      continue;
    }
    const lit = scoreLitContent(block.body);
    const method = scoreMethodContent(block.body);
    const cited = countCitationShapes(block.body) >= 1;
    const narrativeLit = PRE_METHOD_LIT_SIGNAL.test(block.body);
    if (
      (cited || narrativeLit) &&
      (lit >= 1.5 || narrativeLit) &&
      lit >= method - 1
    ) {
      block.role = "literatureReview";
    }
  }

  const { intro: introBuilt, extraLit } = buildLongIntroLiterature(rawBlocks, paperBody);
  let intro = introBuilt;
  if (countWords(intro) < 50) {
    intro = firstWordsOfText(paperBody, 800);
  }

  let literatureReview = mergeBlocks(rawBlocks, "literatureReview");
  const headingIntro = introAssignedByHeading(rawBlocks);
  let introLitSplit = extraLit;
  if (
    !headingIntro &&
    countWords(literatureReview) < 200 &&
    countWords(intro) >= 400 &&
    introHasLiteratureSignals(intro)
  ) {
    const split = splitIntroAtWordCount(intro, 400);
    if (split.rest.trim()) {
      const methodSplit = splitTextAtMethodFingerprint(split.rest);
      introLitSplit =
        methodSplit && countWords(methodSplit.literature) >= 150
          ? methodSplit.literature
          : split.rest;
      intro = split.intro;
    }
  }
  let embeddedLitFromIntro = introLitSplit;
  if (embeddedLitFromIntro) {
    literatureReview = `${literatureReview}\n\n${embeddedLitFromIntro}`.trim();
  }
  if (!literatureReview.trim()) {
    const thematic = rawBlocks.filter((b) => {
      if (b.role !== "unknown") return false;
      const beforeMethod =
        provisionalMethodStart < 0 ||
        (b.start < provisionalMethodStart && b.start < paperBody.length * 0.6);
      if (!beforeMethod) return false;
      const heading = normalizeHeadingForMatch(b.heading);
      if (isTopicLiteratureHeading(heading, b.heading)) return true;
      return (
        countCitationShapes(b.body) >= 1 &&
        scoreLitContent(b.body) >= 1.5 &&
        scoreMethodContent(b.body) < 2
      );
    });
    literatureReview = mergeBlocks(thematic, "unknown");
  }

  const headingWordCounts = contentDominantRemap
    ? {
        method: 0,
        results: 0,
        literatureReview: 0,
        discussion: 0,
        conclusion: 0,
      }
    : {
        method: countWords(mergeBlocks(rawBlocks, "method")),
        results: countWords(mergeBlocks(rawBlocks, "results")),
        literatureReview: countWords(literatureReview),
        discussion: countWords(mergeBlocks(rawBlocks, "discussion")),
        conclusion: countWords(extractConclusionFallback(paperBody, rawBlocks)),
      };
  const { contentInferredRoles, extraByRole } = applyContentRegionFallback(
    rawBlocks,
    paperBody.length,
    headingWordCounts,
  );

  literatureReview = appendRegionExtras(
    mergeBlocks(rawBlocks, "literatureReview"),
    extraByRole.literatureReview,
  );
  if (embeddedLitFromIntro) {
    literatureReview = `${literatureReview}\n\n${embeddedLitFromIntro}`.trim();
  }
  if (!literatureReview.trim() && extraLit) {
    literatureReview = extraLit;
  }

  let method = appendRegionExtras(mergeBlocks(rawBlocks, "method"), extraByRole.method);
  method = extractMethodFallback(paperBody, method);

  const sentenceSplitDiscussion = applyResultsDiscussionSentenceSplits(rawBlocks);

  const combo = mergeResultsDiscussionCombo(rawBlocks);
  let results = appendRegionExtras(mergeBlocks(rawBlocks, "results"), extraByRole.results);
  if (combo.results) results = `${results}\n\n${combo.results}`.trim();
  const contentResults = extractResultsByContent(rawBlocks);
  if (contentResults) results = `${results}\n\n${contentResults}`.trim();

  let discussion = appendRegionExtras(
    mergeBlocks(rawBlocks, "discussion"),
    extraByRole.discussion,
  );
  if (sentenceSplitDiscussion.length > 0) {
    discussion = `${discussion}\n\n${sentenceSplitDiscussion.join("\n\n")}`.trim();
  }
  if (combo.discussion) discussion = `${discussion}\n\n${combo.discussion}`.trim();
  const resultsFromDiscussion = extractResultsPhrasesFromDiscussion(discussion);
  if (resultsFromDiscussion) {
    results = `${results}\n\n${resultsFromDiscussion}`.trim();
  }

  let limitations = mergeBlocks(rawBlocks, "limitations");
  const limInDisc = extractEmbeddedLimitations(discussion);
  const limInConc = extractEmbeddedLimitations(
    mergeBlocks(rawBlocks, "conclusion"),
  );
  limitations = [limitations, limInDisc, limInConc].filter(Boolean).join("\n\n");

  let implications = mergeBlocks(rawBlocks, "implications");
  const implEmbed = extractEmbeddedImplications(
    `${mergeBlocks(rawBlocks, "conclusion")}\n${discussion}`,
  );
  implications = [implications, implEmbed].filter(Boolean).join("\n\n");

  let conclusion = appendRegionExtras(
    extractConclusionFallback(paperBody, rawBlocks),
    extraByRole.conclusion,
  );
  if (!conclusion.trim()) {
    conclusion = appendRegionExtras(mergeBlocks(rawBlocks, "conclusion"), extraByRole.conclusion);
  }

  const gap =
    mergeBlocks(rawBlocks, "gap") ||
    findGapSentences(`${literatureReview}\n${intro}`).join(" ") ||
    detectContrastiveGapFallback(literatureReview);

  const researchQuestionRegion = mergeBlocks(rawBlocks, "researchQuestion");

  ({ intro, literatureReview } = applyOversizedIntroLiteratureSplit(
    intro,
    literatureReview,
    paperBody,
    rawBlocks,
  ));

  const introRegion = [intro, researchQuestionRegion].filter(Boolean).join("\n\n");

  const regions: FunctionalRegions = {
    blocks: rawBlocks,
    introduction: intro,
    researchQuestionRegion,
    literatureReview,
    gap,
    method,
    results,
    discussion,
    limitations,
    implications,
    conclusion,
    introRegion,
    hasMethodByContent: method.trim().length > 50 || scoreMethodContent(paperBody) >= 2,
    hasResultsByContent:
      results.trim().length > 50 ||
      scoreResultsContent(`${results}\n${discussion}`) >= 2,
    hasLimitationsByContent: limitations.trim().length > 40,
    hasImplicationsByContent: implications.trim().length > 40,
    contentInferredRoles,
  };

  logFunctionalRegionDebug(regions);
  return regions;
}
