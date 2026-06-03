/**
 * IRR methodology signal categories (seminar-3.2.13).
 * Each category counts at most once regardless of repeated pattern hits.
 */

import { countPatternHits } from "@/lib/seminar/seminarPatterns";
import { IRR_METHODOLOGY_PATTERNS } from "@/lib/seminar/seminarPatterns";

export type MethodologyCategory =
  | "lottery_rct"
  | "quasi_experimental"
  | "biological_mechanism"
  | "longitudinal_cohort"
  | "statistical_output"
  | "matched_comparison"
  | "systematic_review"
  | "study_limitation"
  | "survey_design"
  | "sleep_mechanism"
  | "scientific_mechanism";

export const IRR_METHODOLOGY_CATEGORIES: {
  category: MethodologyCategory;
  patterns: RegExp[];
}[] = [
  {
    category: "lottery_rct",
    patterns: [
      /lottery.based (study|design|evidence|approach)/i,
      /lottery (winners?|losers?)/i,
      /random(ly)? (assigned?|selected?|allocated?)/i,
      /randomized (controlled|trial|experiment)/i,
      /oversubscribed.{0,30}(school|program)/i,
      /random assignment (?:occurs?|when|through)/i,
    ],
  },
  {
    category: "quasi_experimental",
    patterns: [
      /quasi.experimental/i,
      /contiguous (counties?|districts?)/i,
      /difference.in.differences/i,
      /regression discontinuity/i,
      /instrumental variable/i,
      /synthetic control/i,
      /interrupted time series/i,
      /event study/i,
      /natural experiment/i,
    ],
  },
  {
    category: "biological_mechanism",
    patterns: [
      /hypothalamic.pituitary.adrenal/i,
      /HPA axis/i,
      /pro.inflammatory (genes?|marker)/i,
      /cortisol awakening response/i,
      /biological embedding/i,
      /direct (physiological|biological) pathway/i,
      /indirect (behavioral|psychological) pathway/i,
      /sympathetic nervous system/i,
      /endocrine disruption mechanism/i,
    ],
  },
  {
    category: "longitudinal_cohort",
    patterns: [
      /longitudinal (study|survey|analysis|cohort)/i,
      /prospective cohort/i,
      /follow.up period/i,
      /nationally representative (survey|sample)/i,
      /panel data/i,
    ],
  },
  {
    category: "statistical_output",
    patterns: [
      /hazard ratio/i,
      /odds ratio/i,
      /confidence interval/i,
      /effect size/i,
      /cohen'?s? d/i,
      /statistically significant/i,
      /p.value/i,
      /risk ratio/i,
      /standardized mean difference/i,
    ],
  },
  {
    category: "matched_comparison",
    patterns: [
      /virtual control record/i,
      /matched (student|participant|comparison) group/i,
      /propensity score matching/i,
      /administrative data/i,
    ],
  },
  {
    category: "systematic_review",
    patterns: [
      /systematic review/i,
      /meta.analysis/i,
      /synthesis of research/i,
      /cochrane/i,
    ],
  },
  {
    category: "study_limitation",
    patterns: [
      /cannot establish causation/i,
      /generalizab/i,
      /sample was limited to/i,
      /this design (cannot|does not)/i,
      /external validity/i,
    ],
  },
  {
    category: "survey_design",
    patterns: [
      /\bN\s*=\s*\d+/i,
      /\bconducted a (?:study|survey|analysis)\b/i,
      /\bin a (?:qualitative|quantitative|longitudinal) study\b/i,
      /\bbased on \d+ studies\b/i,
    ],
  },
  {
    category: "sleep_mechanism",
    patterns: [
      /\bcircadian phase delay\b/i,
      /\bslow.wave (?:sleep|stage)/i,
      /\bpolysomnographic\b/i,
      /\bsleep debt\b/i,
      /\bdeclarative memory\b/i,
    ],
  },
  {
    category: "scientific_mechanism",
    patterns: [
      /\bmechanistic pathway\b/i,
      /\bbiological plausibility\b/i,
      /\bdose.response relationship\b/i,
      /\bin vitro (?:systems|model|evidence)\b/i,
      /\becotoxicological evidence\b/i,
      /\bmonopsonistic? (?:labor market|model)\b/i,
      /\befficiency wage (?:model|theory)\b/i,
    ],
  },
];

/** Flat union of category patterns + legacy IRR_METHODOLOGY_PATTERNS (Fix 8). */
export const IRR_ALL_METHODOLOGY_SIGNALS: RegExp[] = [
  ...IRR_METHODOLOGY_CATEGORIES.flatMap((c) => c.patterns),
  ...IRR_METHODOLOGY_PATTERNS,
];

export function countMethodologyCategories(text: string): number {
  return IRR_METHODOLOGY_CATEGORIES.filter((cat) =>
    cat.patterns.some((p) => p.test(text)),
  ).length;
}

/** Raw hit count (diagnostics only). */
export function countMethodologyPatternHits(text: string): number {
  return countPatternHits(text, IRR_ALL_METHODOLOGY_SIGNALS);
}

/** Legacy cal324 methodology scan (seminar-3.2.24 consolidation). */
const IRR_METHODOLOGY_EXTRA = [
  /\bnatural experiment\b/gi,
  /\breanalysis of administrative\b/gi,
  /\bForget's reanalysis\b/gi,
  /\bKangas et al\./gi,
  /\bKangas and colleagues acknowledge\b/gi,
  /\bsample was limited\b/gi,
  /\bthis design substantially reduces confounding\b/gi,
  /\b560 euros\b/gi,
  /\bimpossibility theorem\b/gi,
  /\bpolysomnographic\b/gi,
  /\btwo distinct mechanisms\b/gi,
  /\bmediating position\b/gi,
  /\boccupies a mediating\b/gi,
];

const IRR_SCIENTIFIC_MECHANISM = [
  /\btwo distinct mechanisms\b/gi,
  /\bbiological plausibility\b/gi,
  /\bmechanistic pathway\b/gi,
  /\bmechanism (?:by which|through which|via which)\b/gi,
  /\bchemical leaching\b/gi,
  /\bphysical interaction with\b/gi,
  /\bnanoplastic particles? (?:smaller than|below|under)\b/gi,
  /\bendocrine disruption mechanism\b/gi,
  /\bcan cross (?:biological|the blood.brain|the placental) barrier\b/gi,
  /\becotoxicological evidence\b/gi,
  /\bsystematic review of the (?:emerging|existing|available) literature\b/gi,
  /\bdose.response relationship\b/gi,
  /\bin vitro (?:systems|model|evidence)\b/gi,
  /\bat environmentally relevant concentrations\b/gi,
  /\bbiomarkers? of exposure\b/gi,
  /\bdirect (?:physiological|biological|neural|hormonal) pathway/i,
  /\bindirect (?:behavioral|psychological|social) pathway/i,
  /\bbiological embedding of/i,
  /\bhypothalamic.pituitary.adrenal/i,
  /\bsympathetic nervous system/i,
  /(?:pro.inflammatory|antiviral|cortisol) (?:genes?|response|marker|level)/i,
  /(?:inflammatory|oxidative|neuroendocrine) (?:marker|response|pathway|process)/i,
  /(?:mortality|morbidity) hazard ratio/i,
  /(?:controlling|adjusting|accounting) for (?:demographic|baseline|confound)/i,
  /\bfollow.up period of/i,
  /(?:six|two|three|four|five|ten).year follow.up/i,
  /\bvirtual control record/i,
  /\bmatched (?:student|participant|control) (?:comparison|group)/i,
  /\blottery.based (?:study|studies|design|evidence|approach)/i,
  /(?:lottery winners?|lottery losers?)/i,
  /\brandom assignment (?:occurs?|when|through)/i,
  /\boversubscribed.{0,30}(?:school|program|lottery)/i,
  /\bquasi.experimental (?:design|evidence|approach|study)/i,
  /\bcontiguous (?:counties?|districts?|regions?)/i,
  /(?:instrumental variable|regression discontinuity|difference.in.differences)/i,
  /(?:intent.to.treat|local average treatment effect)/i,
  /\badministrative (?:data|records?)/i,
  /\bnationally representative (?:survey|sample|dataset)/i,
  /\blongitudinal (?:survey|study|analysis|data|cohort)/i,
  /\bmonopsonistic? (?:labor market|model|competition)/i,
  /(?:price floor|wage floor|minimum wage) (?:theory|model|prediction)/i,
  /(?:elasticity of (?:labor|employment|demand))/i,
  /(?:employment effect|labor supply|labor demand)/i,
  /\befficiency wage (?:model|theory|hypothesis)/i,
  /(?:hours worked|hours of work) rather than (?:employment|jobs?)/i,
];

export const IRR_STATISTICS_PATTERNS: RegExp[] = [
  /hazard ratio (?:of [\d.]+|[<>≤≥] [\d.]+|was [\d.]+)/i,
  /odds ratio (?:of [\d.]+|[<>≤≥] [\d.]+)/i,
  /risk ratio (?:of [\d.]+)/i,
  /cohen'?s? d (?:of |= |≈ )[\d.]+/i,
  /effect size (?:of |was |= )[\d.]+/i,
  /standardized mean difference/i,
  /number needed to treat/i,
  /(?:relative|absolute) risk (?:reduction|increase)/i,
  /statistically significant (?:at|p[<≤] ?0\.0[0-9]+)/i,
  /p[- ]?value (?:of|was|[<≤>≥]) ?0\.[0-9]+/i,
  /confidence interval.{0,40}[\[\(]\d/i,
  /\d+% confidence interval/i,
  /(?:standard error|standard deviation) (?:of|was|= )[\d.]+/i,
  /grade (?:a|b|c|d|i|ii|iii) evidence/i,
  /level (?:1|2|3|4|i|ii|iii) evidence/i,
  /cochrane (?:review|collaboration|meta-analysis)/i,
  /systematic review (?:and meta-analysis|of randomized)/i,
  /quality.adjusted life.?year/i,
  /minimal clinically important difference/i,
  /interrupted time series/i,
  /synthetic control (?:method|approach)/i,
  /regression (?:discontinuity|kink) (?:design|approach)/i,
  /staggered (?:adoption|rollout|difference-in-differences)/i,
  /event study (?:design|methodology)/i,
  /twin (?:study|design|comparison)/i,
  /sibling (?:fixed effects|comparison|design)/i,
  /panel (?:data|dataset) (?:of|from|covering)/i,
  /linked (?:administrative|survey) data/i,
];

export const IRR_SLEEP_MECHANISM: RegExp[] = [
  /\bcircadian phase delay\b/gi,
  /\bslow.wave (?:sleep|stage)/gi,
  /\brem sleep (?:stage|consolidation)/gi,
  /\bhippocampal.to.cortical\b/gi,
  /\bmemory consolidation\b/gi,
  /\bsleep debt\b/gi,
  /\bpolysomnographic (?:study|research|evidence)/gi,
  /\bsleep (?:curtailment|deprivation) (?:impair|affect|reduce|disrupt)/gi,
  /\bdeclarative memory\b/gi,
];

/** Flat scan list for cal324 `irrMethodologyExtraCount` (preserves per-pattern counting). */
export const IRR_CAL324_METHODOLOGY_SCAN: RegExp[] = [
  ...IRR_METHODOLOGY_EXTRA,
  ...IRR_SCIENTIFIC_MECHANISM,
  ...IRR_SLEEP_MECHANISM,
  ...IRR_STATISTICS_PATTERNS,
];

/** Deep-calibration explanation depth bonus (seminar-3.2.24). */
export const IRR_METHODOLOGY_BONUS: RegExp[] = [
  /\brandomized (?:controlled|waitlist)/gi,
  /\bsystematic review of \d+/gi,
  /\blongitudinal study\b/gi,
  /\beffect size of (?:d|r|OR)=/gi,
  /\b\d+ participants\b/gi,
];
