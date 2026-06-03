/**
 * Calibration phrase libraries from official CB commentary (2023–2025 samples).
 * v2.5.4: appended IWA phrase expansion (200 phrases per category).
 */

import {
  DESCRIPTIVE_LINKING_PATTERNS as DESCRIPTIVE_LINKING_EXPANSION,
  DEVELOPING_COMMENTARY_PATTERNS as DEVELOPING_COMMENTARY_EXPANSION,
  ECHO_PATTERNS as ECHO_PATTERNS_EXPANSION,
  EVALUATIVE_LINKING_PATTERNS as EVALUATIVE_LINKING_EXPANSION,
  ZERO_VALUE_CONTEXT_PATTERNS as ZERO_VALUE_CONTEXT_EXPANSION,
} from "@/lib/seminar/seminarIwaPhrasePatterns";
import { IWA_ROW2_ZERO_TRIGGERS } from "@/lib/seminar/seminarIwaPenaltyPatterns";

const DESCRIPTIVE_LINKING_BASE: RegExp[] = [
  /\brelates to\b/gi,
  /\bis similar to\b/gi,
  /\balso discusses\b/gi,
  /\balso found that\b/gi,
  /\bsimilarly\b/gi,
  /\blikewise\b/gi,
  /\bconsistent with\b/gi,
  /\bin contrast\b/gi,
  /\bon the other hand\b/gi,
  /\bwhile [A-Z][a-z]+ shows, [A-Z][a-z]+ demonstrates\b/gi,
  /\bboth [A-Z][a-z]+ and [A-Z][a-z]+\b/gi,
  /\bunlike [A-Z][a-z]+, [A-Z][a-z]+\b/gi,
  /\bin addition to [A-Z][a-z]+, [A-Z][a-z]+\b/gi,
  /\bsupporting this\b/gi,
  /\bcontradicting this\b/gi,
  /\bdirectly contradicts\b/gi,
  /\badds to this\b/gi,
  /\bextends this\b/gi,
  /\bchallenges this\b/gi,
  /\bcorroborates\b/gi,
  /\bsimilarly discusses\b/gi,
  /\bconnects to the source\b/gi,
  /\bwhich details\b/gi,
  /\bboth talk about\b/gi,
  /\bagrees with\b/gi,
  /\bthis relates to\b/gi,
  /\bthis connects to\b/gi,
  /\bas .{3,40} also says\b/gi,
  /\bas .{3,40} also mentions\b/gi,
  /\b.{3,40} similarly finds\b/gi,
  /\bthis is consistent with\b/gi,
  /\bthis supports .{3,40}\b/gi,
  /\bboth discuss the same\b/gi,
];

export const DESCRIPTIVE_LINKING_PATTERNS: RegExp[] = [
  ...DESCRIPTIVE_LINKING_BASE,
  ...DESCRIPTIVE_LINKING_EXPANSION,
];

const EVALUATIVE_LINKING_BASE: RegExp[] = [
  /\bthe tension between\b/gi,
  /\bwhile .{5,60} argues .{5,60}, this overlooks\b/gi,
  /\blimitation is addressed by\b/gi,
  /\bconsidering the objection\b/gi,
  /\beven accounting for\b/gi,
  /\bthis complicates .{5,40}'s claim because\b/gi,
  /\bdisagree on .{5,40} because\b/gi,
  /\bneither .{5,40} nor .{5,40} fully accounts\b/gi,
  /\bthe implication of this disagreement\b/gi,
  /\bplacing .{5,40} and .{5,40} in dialogue\b/gi,
  /\bdespite their agreement\b/gi,
  /\bwhat this tension reveals\b/gi,
  /\btaken together,?\s+these perspectives suggest\b/gi,
  /\bwhat neither .{5,40} nor .{5,40}\b/gi,
  /\bdirectly contradicts (?:that of )?[A-Z][a-z]+/gi,
  /\bthe perspective offered by [A-Z][a-z]+ directly contradicts\b/gi,
  /\bthis notion is again directly contradicted by\b/gi,
  /\bact in conjunction with one another's perspective\b/gi,
  /\bcoordinates with that offered by\b/gi,
  /\boverlooking how deeply\b/gi,
  // seminar-3.2.11
  /\bfails? to (?:account for|address|engage with|resolve|explain|acknowledge)\b/gi,
  /\bdoes not (?:account for|address|engage with|resolve|explain|survive scrutiny)\b/gi,
  /\bcannot (?:account for|address|explain|establish|resolve)\b/gi,
  /\bproves? (?:less|more) than (?:it claims?|it implies?|X would have us believe)\b/gi,
  /\bthe argument proves? too much\b/gi,
  /\bthis (?:objection|criticism|concern|argument) proves? (?:less|little|nothing)\b/gi,
  /\btalking past (?:each other|one another)\b/gi,
  /\bthese (?:perspectives?|positions?|arguments?) (?:are|talk) past (?:each other|one another)\b/gi,
  /\b(?:productive|revealing|fundamental|genuine) tension between\b/gi,
  /\bthe tension (?:between|that emerges|this reveals)\b/gi,
  /\bdoes not (?:establish|demonstrate|prove|show|settle) (?:that|whether|the)\b/gi,
  /\bthe (?:real|deeper|underlying|actual|fundamental) (?:disagreement|dispute|conflict|tension) (?:is|between|concerns?)\b/gi,
  /\bwhat (?:really|actually|fundamentally) divides? (?:X and Y|these (?:positions?|perspectives?))\b/gi,
  /\beven taking (?:X|this|that|the) .{0,40}(?:at face value|on its own terms|as stated)\b/gi,
  /\baccepting (?:X|this|that) (?:at face value|on its own terms|as correct)\b/gi,
  /\bthe (?:deeper|more fundamental|harder|more important) question (?:is|raised by|that)\b/gi,
  /\b(?:more|most) (?:persuasive|convincing|defensible|compelling|credible) (?:argument|position|view|account)\b/gi,
  /\b(?:less|least) (?:persuasive|convincing|defensible|compelling) (?:argument|position|view)\b/gi,
  /\bthe (?:stronger|weaker|better|worse) (?:argument|position|case|claim)\b/gi,
  /\bthis paper (?:sides? with|agrees? with|accepts?|endorses?).{0,80}(?:on|but not|except)\b/gi,
  /\bthe issue is not (?:merely|only|just) X but (?:also|fundamentally|primarily) Y\b/gi,
  /\b(?:fail to|fails to) rebut\b/gi,
  /\bthis rebuts\b/gi,
  /\b(?:their|these) conclusions,?\s+therefore,?\s+fail to rebut\b/gi,
  /\bcounterarguments? (?:are|is) true\b/gi,
  /\bagrees? with the conclusions found by\b/gi,
];

export const EVALUATIVE_LINKING_PATTERNS: RegExp[] = [
  ...EVALUATIVE_LINKING_BASE,
  ...EVALUATIVE_LINKING_EXPANSION,
];

const ECHO_COMMENTARY_BASE: RegExp[] = [
  /\bthis shows that\b/gi,
  /\bthis proves that\b/gi,
  /\bthis demonstrates that\b/gi,
  /\bthis confirms that\b/gi,
  /\bcan boost moods\b/gi,
  /\bcan help some feel\b/gi,
  /\bthis illustrates how\b/gi,
  // seminar-3.2.11
  /\bthis (?:proves?|confirms?|verifies?|validates?) that\b/gi,
  /\bthis is (?:evidence|proof|support) (?:that|for|of)\b/gi,
  /\b(?:as shown|as demonstrated|as proven|as indicated) (?:above|by X|by this)\b/gi,
  /\bthis (?:clearly|obviously|evidently) shows?\b/gi,
  /\bit is (?:clear|obvious|evident) that\b/gi,
  /\bthis (?:supports?|backs? up|corroborates?) (?:my|this paper's|the) (?:argument|claim|thesis)\b/gi,
];

export const ECHO_COMMENTARY_PATTERNS: RegExp[] = [
  ...ECHO_COMMENTARY_BASE,
  ...ECHO_PATTERNS_EXPANSION,
];

const DEVELOPING_COMMENTARY_BASE: RegExp[] = [
  /\bthis matters because\b/gi,
  /\bthis is significant because\b/gi,
  /\bwhat this reveals about\b/gi,
  /\bthis creates a problem for\b/gi,
  /\bthe implication for\b/gi,
  /\bthe implication is that\b/gi,
  /\bthis explains why\b/gi,
  /\bthis is why\b/gi,
  /\bthis changes our understanding\b/gi,
  /\bapplied to\b/gi,
  /\bwhat this means for\b/gi,
  /\bthis distinction matters because\b/gi,
  /\bthe difference between .{5,50} is not merely\b/gi,
  /\bthis shifts responsibility\b/gi,
  /\bwithout (?:reform|change|intervention),?\s+/gi,
  /\bthis is not simply\b/gi,
  /\bwhat follows from this\b/gi,
  /\bthis is not a trade-off\b/gi,
  /\bthe question is not whether\b/gi,
  /\bnecessary but not sufficient\b/gi,
  /\bthis demonstrates that [^.]{20,80}(?:cannot|must|obligat|require)/gi,
  /\bhowever,\s+the same emotional\b/gi,
  /\breconstructive process influenced by\b/gi,
  /\bemotional reward of nostalgia\b/gi,
  /\bshaped by emotion, personal\b/gi,
  // seminar-3.2.11
  /\bthe (?:implication|significance|consequence|upshot|takeaway) (?:of this|here|for) (?:is|policy)\b/gi,
  /\bthis (?:is|has) (?:significant|important|consequential|meaningful) because\b/gi,
  /\bwhat (?:this means|follows from this|this reveals|this establishes) (?:is|for)\b/gi,
  /\bthis (?:matters|is relevant|is consequential) (?:because|for|to)\b/gi,
  /\bthe (?:policy|practical|broader|real) (?:implication|consequence|significance) (?:is|of)\b/gi,
  /\bthis is not merely.{0,80}(?:but|it is also|it represents)\b/gi,
  /\bthe (?:reason|mechanism|explanation|logic) (?:is|here is|for this is)\b/gi,
  /\bthis (?:works?|operates?|functions?) because\b/gi,
  /\bif (?:this is true|this holds?|we accept this).{0,60}(?:then|it follows|the consequence)\b/gi,
  /\bthis (?:reveals?|exposes?|uncovers?|illuminates?).{0,60}(?:deeper|fundamental|structural|systemic)\b/gi,
  /\bwhat X (?:cannot|fails? to|does not) (?:explain|account for|address)\b/gi,
  /\bthe (?:limitation|weakness|gap) (?:in|of) (?:this|X's|the) (?:argument|framework|approach) (?:is|reveals)\b/gi,
  /\bthis (?:connects?|links?|ties?) (?:back to|to) (?:the (?:central|core|main)|this paper's) (?:argument|claim|thesis)\b/gi,
  /\bthis shows that\b/gi,
  /\bthis is because\b/gi,
  /\bthe reason for this is\b/gi,
];

export const DEVELOPING_COMMENTARY_PATTERNS: RegExp[] = [
  ...DEVELOPING_COMMENTARY_BASE,
  ...DEVELOPING_COMMENTARY_EXPANSION,
];

export const IRR_MECHANISM_PATTERNS: RegExp[] = [
  /\bthis is because\b/gi,
  /\bwhich means that\b/gi,
  /\bthis leads to\b/gi,
  /\bthe reason for this is\b/gi,
  /\bthis occurs because\b/gi,
  /\bas a result of\b/gi,
  /\bgreater odds of\b/gi,
  /\bthis mechanism explains\b/gi,
  /\bthis produces\b/gi,
  /\bcorrelated with\b/gi,
  /\btherefore,?\s+.+(?:because|since)\b/gi,
];

export const IRR_SUMMARY_ONLY_PATTERNS: RegExp[] = [
  /\b[A-Z][a-z]+ found that [^.]+\.\s*(?![^.]*because)/gi,
  /\baccording to [A-Z][a-z]+,?\s+[^.]+\.\s*$/gim,
  /\breports that [^.]+\.\s*$/gim,
];

export const IRR_MULTI_SOURCE_SYNTHESIS_PATTERNS: RegExp[] = [
  /\btogether, these (?:studies|sources|perspectives)\b/gi,
  /\btaken together,?\s+[A-Z]/gi,
  /\bwhat .{5,40} and .{5,40} collectively demonstrate\b/gi,
  /\bthe combined weight of these perspectives\b/gi,
  /\breading .{5,40} alongside .{5,40}\b/gi,
  /\bthis synthesis of\b/gi,
  /\bwhile .{5,40} found that .{5,80}, .{5,40} discovered\b/gi,
  /\bpros and cons\b/gi,
  /\bmay address some challenges but not others\b/gi,
];

export const IRR_GENERAL_CONNECTION_PATTERNS: RegExp[] = [
  /\bboth agree that\b/gi,
  /\bsimilarly,?\s+[A-Z][a-z]+\s+also found\b/gi,
  /\bconsistent with\b/gi,
  /\bmultiple researchers have noted\b/gi,
  /\band .{5,40} both discuss\b/gi,
];

export const IRR_BIAS_ACKNOWLEDGMENT_PATTERNS: RegExp[] = [
  /\bleft-?wing newspaper\b/gi,
  /\bright-?leaning publication\b/gi,
  /\bconservative think tank\b/gi,
  /\bthough this source may be biased\b/gi,
  /\bwhile .{3,40} is not peer-?reviewed\b/gi,
  /\bjournalistic rather than academic\b/gi,
  /\bpopular rather than academic source\b/gi,
  /\bstated interest in\b/gi,
  /\bcommissioned by\b/gi,
  /\bsmall sample size\b/gi,
  /\bresearch is dated\b/gi,
  /\blimitations of this study\b/gi,
  /\bsingle case study\b/gi,
  /\bdespite the journalistic nature\b/gi,
  /\ba left-?wing\b/gi,
];

const ROW2_ZERO_CONTEXT_BASE: RegExp[] = [
  /\bis defined as\b/gi,
  /\b(?:dictionary|cambridge|merriam|oxford) (?:defines|definition)\b/gi,
  /\baffects millions of people\b/gi,
  /\baffects millions worldwide\b/gi,
  /\bthis is an important topic because\b/gi,
  /\bmany researchers have studied\b/gi,
  /\bhas been taken into consideration as time goes by\b/gi,
  /\bunderstanding .{5,40} is important because it\b/gi,
  /\bit has been shown that\b/gi,
];

export const ROW2_ZERO_CONTEXT_PATTERNS: RegExp[] = [
  ...ROW2_ZERO_CONTEXT_BASE,
  ...ZERO_VALUE_CONTEXT_EXPANSION,
  ...IWA_ROW2_ZERO_TRIGGERS,
];

export const UNSUBSTANTIATED_CONTEXT_PATTERNS: RegExp[] = [
  /\bstudies (?:have )?(?:shown|proved) that\b/gi,
  /\bresearch (?:has )?proved that\b/gi,
  /\bstudies show that\b/gi,
  /\bexperts (?:have )?said\b/gi,
];
