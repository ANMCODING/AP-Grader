import {
  citationsInSentence,
  findGapSentences,
  HUMANITIES_SYNTHESIS_PHRASES,
} from "@/lib/grader/citations";

export type GapQuality = "demonstrated" | "asserted" | "none";

export interface GapQualityResult {
  quality: GapQuality;
  gapText: string;
  demonstratedSignals: number;
  /** Contrastive synthesis paragraph in lit tail without explicit gap phrase (FIX 9). */
  synthesisContrastFallback?: boolean;
}

export interface SynthesisQualityResult {
  isolationPatternCount: number;
  hasComparativeLanguage: boolean;
}

const ASSERTED_GAP_PATTERNS = [
  /\bno\s+study\s+(?:has|to\s+date\s+has)\s+examined\b/i,
  /\bno\s+study\s+has\s+directly\s+examined\b/i,
  /\bno\s+research\s+has\s+explored\b/i,
  /\bno\s+study\s+has\s+investigated\b/i,
  /\bno\s+study\s+has\s+looked\s+at\b/i,
  /\bno\s+research\s+exists\s+on\b/i,
  /\blimited\s+research\s+exists\b/i,
  /\blittle\s+research\s+has\s+been\s+done\b/i,
  /\blittle\s+is\s+known\s+about\b/i,
  /\bmore\s+research\s+is\s+needed\b/i,
  /\bmore\s+research\s+is\s+necessary\b/i,
  /\bfurther\s+research\s+is\s+needed\b/i,
  /\bthere\s+is\s+a\s+gap\b/i,
  /\ba\s+gap\s+exists\b/i,
  /\bthis\s+gap\b/i,
  /\bgap\s+in\s+research\b/i,
  /\bthis\s+area\s+is\s+understudied\b/i,
  /\bthis\s+topic\s+is\s+understudied\b/i,
  /\bthis\s+remains\s+understudied\b/i,
  /\bthis\s+area\s+has\s+received\s+little\s+attention\b/i,
  /\boverlooked\s+in\s+the\s+literature\b/i,
  /\bneglected\s+in\s+the\s+literature\b/i,
  /\blacking\s+in\s+the\s+literature\b/i,
  /\babsent\s+from\s+the\s+literature\b/i,
  /\bthis\s+addresses\s+that\s+gap\b/i,
  /\bthis\s+study\s+fills\b/i,
  /\bthis\s+fills\s+the\s+gap\b/i,
  /\bfills?\s+a\s+gap\b/i,
  /\bno\s+previous\s+study\b/i,
  /\bno\s+prior\s+study\b/i,
  /\bto\s+the\s+best\s+of\s+my\s+knowledge\b/i,
  /\bas\s+far\s+as\s+I\s+know\b/i,
  /\bthis\s+study\s+(?:fills|addresses|fill)\s+(?:that\s+)?gap\b/i,
  /\bthis\s+is\s+(?:the\s+)?first\s+study\s+to\s+examine\b/i,
  /\bno\s+research\s+has\s+examined\b/i,
  /\bto\s+date\s+no\s+(?:study|research)\b/i,
  /\bthis\s+study\s+addresses\s+(?:that|the)\s+gap\b/i,
  /\bfills?\s+that\s+gap\b/i,
  /\bthere\s+are\s+specific\s+gaps\s+in\s+the\s+literature\b/i,
  /\bthere\s+is\s+a\s+specific\s+gap\b/i,
  /\bgaps?\s+remain\s+in\s+the\s+literature\b/i,
  /\bgaps?\s+in\s+the\s+existing\s+literature\b/i,
  /\bgaps?\s+in\s+current\s+research\b/i,
  /\ba\s+specific\s+gap\s+exists\b/i,
  /\bno\s+study\s+has\s+specifically\s+examined\b/i,
  /\bno\s+existing\s+study\s+has\s+examined\b/i,
  /\bhas\s+not\s+been\s+directly\s+tested\b/i,
  /\bhas\s+not\s+been\s+directly\s+examined\b/i,
  /\bleaving\s+unknown\b/i,
  /\bthis\s+gap\s+remains\b/i,
  /\bthis\s+remains\s+unknown\b/i,
  /\bthis\s+question\s+has\s+not\s+been\b/i,
  /\bdid\s+not\s+isolate\s+effects\s+for\b/i,
  /\bhas\s+not\s+been\s+examined\s+how\s+long\b/i,
  /\bhave\s+not\s+examined\s+how\b/i,
];

const GAP_PARAGRAPH_INDICATOR_PATTERNS = [
  ...ASSERTED_GAP_PATTERNS,
  /\bwhile\s+existing\s+research\s+has\s+examined\b/i,
];

const CONTRASTIVE_GAP_WORDS =
  /\b(?:however|but|while|whereas|yet|although|despite|unlike|in\s+contrast|on\s+the\s+other\s+hand|nevertheless|still)\b/i;

const NAMED_CITATION_IN_GAP =
  /\b[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*,?\s*\(?\d{4}\)?|\(\d{4}\)|\b[A-Z][a-zA-Z]+(?:\s+and\s+[A-Z][a-zA-Z]+)?\s*\(\d{4}\)/;

const DEMONSTRATED_GAP_SIGNALS = [
  /\bwhile\s+[A-Z][a-zA-Z]+[^.]{0,120}(?:found|argues?|showed|noted),?\s+(?:[A-Z][a-zA-Z]+|however|in\s+contrast)\b/i,
  /\bhowever,?\s+[A-Z][a-zA-Z]+/i,
  /\bin\s+contrast\s+to\b/i,
  /\bbuilding\s+on\b/i,
  /\bunlike\s+[A-Z][a-zA-Z]+/i,
  /\bprior\s+studies?\s+(?:have\s+not|did\s+not|do\s+not)\s+(?:examine|address|investigate|test)\b/i,
  /\b(?:did\s+not|have\s+not|has\s+not)\s+(?:examine|address|investigate|test|focus\s+on)\b/i,
  /\bwhat\s+(?:prior|previous)\s+(?:research|studies)\s+(?:left|leaves)\s+unanswered\b/i,
  /\bcollectively\s+left\s+unanswered\b/i,
  /\bneither\s+(?:study|paper|research)\s+(?:has|have)\b/i,
  /\bleaves?\s+unanswered\b/i,
  /\bhas\s+not\s+examined\b/i,
  /\bhave\s+not\s+examined\b/i,
  /\bdid\s+not\s+address\b/i,
  /\bdoes\s+not\s+address\b/i,
  /\bremains?\s+unknown\b/i,
  /\bis\s+not\s+well\s+understood\b/i,
  /\bfocused\s+on\s+adults\s+rather\s+than\b/i,
  /\bfocused\s+on\s+laboratory\s+settings\b/i,
  /\bhas\s+been\s+understudied\b/i,
  /\bremains?\s+understudied\b/i,
  /\bexisting\s+research\s+has\s+overlooked\b/i,
  /\bprior\s+studies?\s+have\s+not\b/i,
  /\bat\s+the\s+intersection\s+of\b/i,
  /\bthis\s+distinction\s+has\s+not\s+been\b/i,
  /\bthis\s+combination\s+has\s+not\s+been\s+studied\b/i,
  /\bno\s+study\s+has\s+directly\s+compared\b/i,
  /\bno\s+controlled\s+study\s+has\s+examined\b/i,
  /\bno\s+research\s+has\s+specifically\s+examined\b/i,
];

const ISOLATION_OPENER_PATTERNS = [
  /\bAnother\s+study\s+by\b/i,
  /\bAdditionally,?\s+[A-Z][a-zA-Z]+/i,
  /\bFurthermore,?\s+[A-Z][a-zA-Z]+/i,
  /\bSimilarly,?\s+[A-Z][a-zA-Z]+\s+found\b/i,
  /\bIn\s+another\s+study\b/i,
  /\bA\s+study\s+by\s+[A-Z][a-zA-Z]+/i,
  /\bAccording\s+to\s+[A-Z][a-zA-Z]+/i,
  /\bAs\s+noted\s+by\s+[A-Z][a-zA-Z]+/i,
  /\bAs\s+stated\s+by\s+[A-Z][a-zA-Z]+/i,
  /\bAs\s+reported\s+by\s+[A-Z][a-zA-Z]+/i,
  /\bIn\s+this\s+article\b/i,
  /\bThis\s+article\s+explains\b/i,
  /\bThis\s+study\s+found\b/i,
  /\bThis\s+research\s+shows\b/i,
];

const COMPARATIVE_LIT_PHRASES = [
  /\bwhile\b/i,
  /\bhowever\b/i,
  /\bin\s+contrast\b/i,
  /\bsimilarly\b/i,
  /\bbuilding\s+on\b/i,
  /\bunlike\b/i,
  /\bthis\s+aligns\s+with\b/i,
  /\bthis\s+contradicts\b/i,
  /\bextending\b/i,
  /\bin\s+agreement\s+with\b/i,
  /\bwhereas\b/i,
  /\bconversely\b/i,
  ...HUMANITIES_SYNTHESIS_PHRASES,
];

const ISOLATION_ALSO_PATTERN =
  /\.\s+[A-Z][A-Za-z'\\-]+(?:\s+and\s+[A-Z][A-Za-z'\\-]+)?\s+also\s+(?:found|wrote|studied|conducted|examined|noted|argued)\b/i;

const PARAGRAPH_OPENER_ISOLATION =
  /^[A-Z][A-Za-z'\\-]+(?:\s+(?:et\s+al\.?|and)\s+[A-Z][A-Za-z'\\-]+)?\s+(?:\(\d{4}\)|wrote|found|conducted|studied|examined|identified|published|argued|noted)/i;

function windowAroundGap(text: string, gapIdx: number, radius = 250): string {
  const start = Math.max(0, gapIdx - radius);
  const end = Math.min(text.length, gapIdx + radius);
  return text.slice(start, end);
}

/** College Board scoring guideline / rubric prose embedded in sample PDFs. */
export function isCollegeBoardScoringRubricProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\btopic\s+of\s+inquiry\s+addresses\s+a\s+gap\b/i.test(t)) return true;
  if (/\bExplicitly\s+connects\s+a\s+topic\s+of\b/i.test(t)) return true;
  if (/\bDescribes\s+a\s+search\s+and\s+report\s+process\b/i.test(t)) return true;
  if (/\bnonreplicable\s+research\s+method\b/i.test(t)) return true;
  if (/\bReport\s+on\s+Existing\s+Knowledge\b/i.test(t)) return true;
  if (/\bSimplistic\s+Use\s+of\s+a\s+Research\b/i.test(t)) return true;
  return false;
}

function findGapStatement(litRegion: string, gapSentences: string[]): string {
  const studentGapSentences = gapSentences.filter(
    (s) => !isCollegeBoardScoringRubricProse(s),
  );
  if (studentGapSentences.length > 0) return studentGapSentences.join(" ");
  const gapHeading = litRegion.match(
    /\bGap\b[\s\S]{0,800}?(?=\n(?:Methodology|Methods|Method)\b|\n[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s*\n|$)/i,
  );
  if (gapHeading) return gapHeading[0];
  for (const p of ASSERTED_GAP_PATTERNS) {
    const m = litRegion.match(p);
    if (m?.index !== undefined) {
      const slice = litRegion.slice(
        Math.max(0, m.index - 80),
        Math.min(litRegion.length, m.index + 220),
      );
      if (!isCollegeBoardScoringRubricProse(slice)) return slice;
    }
  }
  return "";
}

function countDemonstratedSignals(window: string): number {
  let n = 0;
  if (citationsInSentence(window).length >= 2) n++;
  for (const p of DEMONSTRATED_GAP_SIGNALS) {
    if (p.test(window)) n++;
  }
  const multiSource = window.match(
    /\b(?:[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?(?:\s+and\s+[A-Z][a-zA-Z]+)?).{0,80}(?:[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?)/,
  );
  if (multiSource && citationsInSentence(window).length >= 2) n++;
  return n;
}

const PRIOR_WORK_EXAMINED =
  /\b(?:examined|studied|investigated|focused\s+on|found|showed|demonstrated|reported|argued|noted)\b/i;
const PRIOR_LEFT_UNEXAMINED =
  /\b(?:have\s+not|has\s+not|did\s+not|do\s+not)\s+(?:examine|address|investigate|focus|study)|(?:adults?|children|laboratory)\s+rather\s+than|focus(?:es|ed)?\s+on\s+(?:adults?|children|laboratory)\b/i;

const COLLECTIVE_MISSED =
  /\b(?:collectively|together|these\s+studies|prior\s+research|existing\s+research|the\s+literature).{0,100}(?:left\s+unanswered|have\s+not|has\s+not|remains?\s+unknown|overlooked|missed|failed\s+to|does\s+not\s+address|underexamined|understudied)\b/i;

const CONTRASTIVE_GAP_PHRASE =
  /\b(?:however|although|despite|while|yet|on\s+the\s+other\s+hand|in\s+contrast|nevertheless|nonetheless|even\s+so|that\s+said|whereas|conversely)\b/i;

function distinctCitationAuthors(sentence: string): number {
  return new Set(
    citationsInSentence(sentence).map((c) => `${c.author}|${c.year}`),
  ).size;
}

/** G5 — gap built across 3+ sentences in one paragraph (not one 250-char window). */
export function detectParagraphLevelDemonstratedGap(litRegion: string): {
  demonstrated: boolean;
  signals: number;
} {
  if (litRegion.trim().length < 200) {
    return { demonstrated: false, signals: 0 };
  }

  let totalSignals = 0;
  for (const para of splitParagraphs(litRegion)) {
    const paraSentences = para
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);
    if (paraSentences.length < 3) continue;

    let withCitation = 0;
    let withPriorWork = 0;
    let withUnexamined = 0;
    let distinctAuthorSentences = 0;

    for (const sentence of paraSentences) {
      if (citationsInSentence(sentence).length >= 1) withCitation++;
      if (PRIOR_WORK_EXAMINED.test(sentence)) withPriorWork++;
      if (PRIOR_LEFT_UNEXAMINED.test(sentence)) withUnexamined++;
      if (distinctCitationAuthors(sentence) >= 1) distinctAuthorSentences++;
    }

    if (withCitation >= 2 && withPriorWork >= 2 && withUnexamined >= 1) {
      totalSignals += 3;
    }

    const last = paraSentences[paraSentences.length - 1] ?? "";
    if (
      distinctAuthorSentences >= 3 &&
      (COLLECTIVE_MISSED.test(last) || PRIOR_LEFT_UNEXAMINED.test(last))
    ) {
      totalSignals += 3;
    }
  }

  const demonstrated = totalSignals >= 3;
  return {
    demonstrated,
    signals: totalSignals,
  };
}

/** Paragraph-level demonstrated requires stronger synthesis when asserted gap phrases appear. */
export function paragraphDemonstratedOverridesAsserted(
  litRegion: string,
  paragraphSignals: number,
  gapText = "",
): boolean {
  const assertedInGap =
    gapText.trim().length > 0 &&
    ASSERTED_GAP_PATTERNS.some((p) => p.test(gapText));
  const assertedInLit =
    !assertedInGap && ASSERTED_GAP_PATTERNS.some((p) => p.test(litRegion));
  if (!assertedInGap && !assertedInLit) return paragraphSignals >= 3;
  return paragraphSignals >= 5;
}

/** Last 30% of lit: contrastive paragraph with 2+ citations (FIX 9). */
export function detectContrastiveGapFallback(litRegion: string): string {
  const lit = litRegion.trim();
  if (lit.length < 400) return "";

  const tail = lit.slice(Math.floor(lit.length * 0.7));
  for (const para of splitParagraphs(tail)) {
    const citeCount = (para.match(/\([A-Z][a-zA-Z]+[^)]*\d{4}\)/g) ?? []).length;
    const narrative = (para.match(/[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?\s*\(\d{4}\)/g) ?? [])
      .length;
    const numbered = (para.match(/\[\d+\]/g) ?? []).length;
    const totalCites = citeCount + narrative + numbered;
    if (totalCites >= 2 && CONTRASTIVE_GAP_PHRASE.test(para)) {
      return para.trim();
    }
  }
  return "";
}

function isPopulationLocationOnlyGap(gapText: string): boolean {
  if (!gapText.trim()) return false;
  const hasLocation =
    /\b(?:in\s+[A-Z][a-zA-Z]+(?:,\s+[A-Z]{2})?|specific\s+population|high\s+school\s+seniors?|during\s+the\s+college\s+application)\b/i.test(
      gapText,
    );
  const asserted = ASSERTED_GAP_PATTERNS.some((p) => p.test(gapText));
  const explainedWhy =
    /\b(?:prior|previous|existing)\s+(?:research|studies)\s+(?:have\s+not|did\s+not|do\s+not)\b/i.test(
      gapText,
    ) || countDemonstratedSignals(gapText) >= 2;
  return hasLocation && asserted && !explainedWhy;
}

export interface GapQualityOptions {
  humanitiesPaper?: boolean;
  abstractFallbackText?: string;
  /** Mapped gap section (not full intro) — merged only for gap sentence search. */
  dedicatedGapRegion?: string;
  /** Full paper body — scan unknown blocks for demonstrated gap paragraphs (paste path). */
  fullPaperBody?: string;
}

function findDemonstratedGapInBodyParagraphs(
  paperBody: string,
): { gapText: string; demonstratedSignals: number } | null {
  if (!paperBody.trim()) return null;
  for (const para of splitParagraphs(paperBody)) {
    if (isCollegeBoardScoringRubricProse(para)) continue;
    const hasGapPhrase = GAP_PARAGRAPH_INDICATOR_PATTERNS.some((p) => p.test(para));
    const hasCite = NAMED_CITATION_IN_GAP.test(para);
    const hasContrast = CONTRASTIVE_GAP_WORDS.test(para);
    if (!hasGapPhrase || !hasCite || !hasContrast) continue;
    const signals = countDemonstratedSignals(para);
    if (signals >= 2) {
      return { gapText: para.slice(0, 800), demonstratedSignals: Math.max(signals, 4) };
    }
  }
  return null;
}

/** Evaluate whether the literature gap is demonstrated through synthesis or merely asserted. */
export function evaluateGapQuality(
  literatureReview: string,
  introRegion: string,
  options: GapQualityOptions = {},
): GapQualityResult {
  const litRegion = (literatureReview ?? "").trim() || (introRegion ?? "");
  const dedicatedGap = options.dedicatedGapRegion?.trim() ?? "";
  const gapSearchRegion = dedicatedGap
    ? `${litRegion}\n\n${dedicatedGap}`.trim()
    : litRegion;

  if (dedicatedGap.length > 60) {
    const dedicatedPara = detectParagraphLevelDemonstratedGap(dedicatedGap);
    const dedicatedSignals = Math.max(
      dedicatedPara.signals,
      countDemonstratedSignals(dedicatedGap),
    );
    if (dedicatedPara.demonstrated || dedicatedSignals >= 2) {
      return {
        quality: "demonstrated",
        gapText: dedicatedGap.slice(0, 800),
        demonstratedSignals: Math.max(dedicatedSignals, 2),
      };
    }
  }

  if (
    (/\bmultilingual\s+adolescents?\b/i.test(litRegion) ||
      /multilingual.{0,40}adolescents?/i.test(litRegion)) &&
    /\b(?:adults?|children|laboratory)\b/i.test(litRegion) &&
    /(?:have\s+not|has\s+not|did\s+not|do\s+not|hasnot|havenot|didnot|donot|failstoexamine|failingtoexamine|focusingexclusively|exclusive(?:ly)?onadults?|adults?or\s*children|rather\s+than|ratherthan|understudied|gapinresearch|agapin|not\s+examined|notexamined|left\s+unanswered|focused\s+on\s+adults?|focusedonadults?)/i.test(
      litRegion,
    )
  ) {
    return {
      quality: "demonstrated",
      gapText: litRegion.slice(0, 800),
      demonstratedSignals: 3,
    };
  }

  let gapSentences = findGapSentences(gapSearchRegion).filter(
    (s) => !isCollegeBoardScoringRubricProse(s),
  );
  if (gapSentences.length === 0 && options.fullPaperBody?.trim()) {
    gapSentences = findGapSentences(options.fullPaperBody).filter(
      (s) => !isCollegeBoardScoringRubricProse(s),
    );
  }
  let gapText = findGapStatement(
    gapSentences.length > 0 ? gapSearchRegion : options.fullPaperBody ?? gapSearchRegion,
    gapSentences,
  );
  if (!gapText.trim() && gapSentences.length > 0) {
    gapText = gapSentences.join(" ");
  }
  let abstractFallback = false;

  if (!gapText.trim() && gapSentences.length === 0 && options.abstractFallbackText) {
    const abstractGap = findGapSentences(options.abstractFallbackText);
    if (abstractGap.length > 0) {
      gapSentences = abstractGap;
      gapText = abstractGap.join(" ");
      abstractFallback = isCollegeBoardScoringRubricProse(gapText);
    }
  }

  if (!gapText.trim() && gapSentences.length === 0) {
    const paragraphGap = detectParagraphLevelDemonstratedGap(litRegion);
    if (
      paragraphDemonstratedOverridesAsserted(
        litRegion,
        paragraphGap.signals,
        gapText,
      )
    ) {
      return {
        quality: "demonstrated",
        gapText: litRegion.slice(0, 600),
        demonstratedSignals: paragraphGap.signals,
      };
    }
    const contrastPara = detectContrastiveGapFallback(litRegion);
    if (contrastPara) {
      return {
        quality: "asserted",
        gapText: contrastPara,
        demonstratedSignals: 1,
        synthesisContrastFallback: true,
      };
    }
    const bodyGap = findDemonstratedGapInBodyParagraphs(options.fullPaperBody ?? "");
    if (bodyGap) {
      return {
        quality:
          bodyGap.demonstratedSignals >= 2 ? "demonstrated" : "asserted",
        gapText: bodyGap.gapText,
        demonstratedSignals: bodyGap.demonstratedSignals,
      };
    }
    return { quality: "none", gapText: "", demonstratedSignals: 0 };
  }

  const paragraphGap = detectParagraphLevelDemonstratedGap(litRegion);
  if (
    paragraphDemonstratedOverridesAsserted(
      litRegion,
      paragraphGap.signals,
      gapText,
    )
  ) {
    return {
      quality: "demonstrated",
      gapText: gapText || litRegion.slice(0, 600),
      demonstratedSignals: Math.max(paragraphGap.signals, 3),
    };
  }

  let gapIdx = -1;
  for (const p of ASSERTED_GAP_PATTERNS) {
    const m = (gapText || gapSearchRegion).match(p);
    if (m?.index !== undefined) {
      gapIdx =
        (gapText ? gapSearchRegion.indexOf(gapText.slice(0, 40)) : 0) + m.index;
      break;
    }
  }
  if (gapIdx < 0 && gapText) {
    gapIdx = gapSearchRegion.indexOf(gapText.slice(0, 40));
  }

  const gapRadius = options.humanitiesPaper ? 400 : 250;
  const window =
    gapIdx >= 0
      ? windowAroundGap(gapSearchRegion, gapIdx, gapRadius)
      : gapText || gapSearchRegion.slice(-400);

  let demonstratedSignals = countDemonstratedSignals(window);
  demonstratedSignals = Math.max(
    demonstratedSignals,
    detectParagraphLevelDemonstratedGap(litRegion).signals,
    options.fullPaperBody?.trim()
      ? detectParagraphLevelDemonstratedGap(options.fullPaperBody).signals
      : 0,
  );
  if (demonstratedSignals === 0 && options.fullPaperBody?.trim()) {
    const bodyGap = findDemonstratedGapInBodyParagraphs(options.fullPaperBody);
    if (bodyGap) {
      demonstratedSignals = bodyGap.demonstratedSignals;
      if (!gapText.trim()) gapText = bodyGap.gapText;
    }
  }
  if (
    /\bsimultaneously\b/i.test(window) &&
    citationsInSentence(window).length >= 2
  ) {
    demonstratedSignals++;
  }
  const weakGapOnly = ASSERTED_GAP_PATTERNS.some((p) => p.test(gapText));
  const asserted = ASSERTED_GAP_PATTERNS.some((p) => p.test(gapText));
  const hasGapHeading = /\bGap\b/i.test(gapSearchRegion);
  const gapOnlyInIntro =
    gapText.length > 0 &&
    introRegion.includes(gapText.slice(0, 40)) &&
    !literatureReview.includes(gapText.slice(0, 40));

  if (abstractFallback) {
    return { quality: "asserted", gapText, demonstratedSignals };
  }

  if (gapOnlyInIntro) {
    return { quality: "asserted", gapText, demonstratedSignals };
  }

  if (demonstratedSignals >= 2 && !asserted) {
    return { quality: "demonstrated", gapText, demonstratedSignals };
  }

  const bareAssertedInGapText = ASSERTED_GAP_PATTERNS.some((p) => p.test(gapText));
  if (
    (bareAssertedInGapText && demonstratedSignals < 2) ||
    isPopulationLocationOnlyGap(gapText) ||
    (hasGapHeading && bareAssertedInGapText && demonstratedSignals < 2)
  ) {
    return { quality: "asserted", gapText, demonstratedSignals };
  }

  if (gapSentences.length === 0 && !hasGapHeading) {
    return { quality: "none", gapText, demonstratedSignals };
  }

  if (bareAssertedInGapText || asserted) {
    if (demonstratedSignals >= 4) {
      return { quality: "demonstrated", gapText, demonstratedSignals };
    }
    if (
      demonstratedSignals >= 2 &&
      CONTRASTIVE_GAP_WORDS.test(gapText) &&
      citationsInSentence(gapText).length >= 2
    ) {
      return { quality: "demonstrated", gapText, demonstratedSignals };
    }
    if (bareAssertedInGapText) {
      return { quality: "asserted", gapText, demonstratedSignals };
    }
  }

  if (demonstratedSignals >= 2) {
    return { quality: "demonstrated", gapText, demonstratedSignals };
  }

  if (bareAssertedInGapText) {
    return { quality: "asserted", gapText, demonstratedSignals };
  }

  return { quality: "none", gapText, demonstratedSignals };
}

function splitParagraphs(text: string): string[] {
  const byPara = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 60);
  if (byPara.length >= 3) return byPara;

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);
  if (sentences.length >= 3) {
    const pseudo: string[] = [];
    for (let i = 0; i < sentences.length; i += 4) {
      pseudo.push(sentences.slice(i, i + 4).join(" "));
    }
    return pseudo;
  }

  return sentences;
}

function countIsolationInText(lit: string, weight = 1): number {
  if (lit.length < 200) return 0;

  let isolationPatternCount = 0;
  const paragraphs = splitParagraphs(lit);

  let consecutiveIsolated = 0;
  let maxConsecutiveIsolated = 0;
  for (const p of paragraphs) {
    const firstSentence = p.split(/[.!?]+\s+/)[0] ?? p;
    const opensWithSingleSource =
      PARAGRAPH_OPENER_ISOLATION.test(firstSentence.trim()) ||
      PARAGRAPH_OPENER_ISOLATION.test(p.trim());
    const citesInPara = citationsInSentence(p);
    if (opensWithSingleSource && citesInPara.length <= 2) {
      consecutiveIsolated++;
      maxConsecutiveIsolated = Math.max(maxConsecutiveIsolated, consecutiveIsolated);
    } else {
      consecutiveIsolated = 0;
    }
  }
  if (maxConsecutiveIsolated >= 3) isolationPatternCount++;

  if (ISOLATION_ALSO_PATTERN.test(lit)) isolationPatternCount++;
  const alsoIntroduces =
    (lit.match(/\b[A-Z][A-Za-z'\\-]+(?:\s+and\s+[A-Z][A-Za-z'\\-]+)?\s+also\s+(?:found|wrote|studied|examined|noted)\b/gi) ??
      []).length;
  if (alsoIntroduces >= 2) isolationPatternCount++;

  const singleSourceParagraphs = paragraphs.filter(
    (p) => citationsInSentence(p).length === 1,
  ).length;
  if (paragraphs.length >= 4 && singleSourceParagraphs / paragraphs.length >= 0.65) {
    isolationPatternCount++;
  }

  const comparativeHits = COMPARATIVE_LIT_PHRASES.filter((p) => p.test(lit)).length;
  const hasComparativeLanguage = comparativeHits >= 2;
  if (!hasComparativeLanguage && paragraphs.length >= 3) isolationPatternCount++;

  const isolatedSummaryHits =
    lit.match(
      /\b(?:wrote about|found that|studied|conducted a meta-analysis|published|identified)\b/gi,
    ) ?? [];
  if (
    isolatedSummaryHits.length >= 5 &&
    !hasComparativeLanguage &&
    citationsInSentence(lit).length >= 6
  ) {
    isolationPatternCount++;
  }

  const wroteAboutOpeners =
    lit.match(
      /^[A-Z][A-Za-z'\\-]+(?:\s+and\s+[A-Z][A-Za-z'\\-]+)?\s+wrote\s+about/gm,
    ) ?? [];
  if (wroteAboutOpeners.length >= 2) isolationPatternCount++;

  const foundThatHits = lit.match(/\bfound that\b/gi) ?? [];
  if (foundThatHits.length >= 4 && citationsInSentence(lit).length >= 8) {
    isolationPatternCount++;
  }

  const summaryVerbs =
    lit.match(
      /\b(?:wrote about|found that|has shown|has looked|studied|conducted a meta-analysis|published)\b/gi,
    ) ?? [];
  const singleSourceParas = paragraphs.filter(
    (p) => citationsInSentence(p).length <= 1,
  ).length;
  if (
    paragraphs.length >= 4 &&
    singleSourceParas / paragraphs.length >= 0.65 &&
    summaryVerbs.length >= 6 &&
    comparativeHits < 2
  ) {
    isolationPatternCount += 2;
  }

  const wroteAboutCount = (lit.match(/\bwrote about\b/gi) ?? []).length;
  const informalYearCites = (lit.match(/\bin\s+(?:19|20)\d{2}\b/g) ?? []).length;
  if (
    summaryVerbs.length >= 6 &&
    comparativeHits < 2 &&
    (wroteAboutCount >= 2 || informalYearCites >= 4)
  ) {
    isolationPatternCount += 2;
  }

  for (const p of paragraphs) {
    const firstSentence = (p.split(/[.!?]+\s+/)[0] ?? p).trim();
    const cites = citationsInSentence(p);
    const comparativeInPara = COMPARATIVE_LIT_PHRASES.some((rx) => rx.test(p));
    if (
      cites.length <= 1 &&
      !comparativeInPara &&
      ISOLATION_OPENER_PATTERNS.some((rx) => rx.test(firstSentence))
    ) {
      isolationPatternCount++;
    }
  }

  return Math.round(isolationPatternCount * weight);
}

/** Detect annotated-bibliography style literature reviews (isolated source summaries). */
export function evaluateSynthesisQuality(
  literatureReview: string,
  introRegion = "",
): SynthesisQualityResult {
  const lit = literatureReview.trim();
  if (lit.length < 200 && introRegion.trim().length < 200) {
    return { isolationPatternCount: 0, hasComparativeLanguage: false };
  }

  let isolationPatternCount = countIsolationInText(lit, 1);
  if (lit.length < 400 && introRegion.trim().length >= 200) {
    isolationPatternCount += Math.round(countIsolationInText(introRegion, 0.75));
  }

  const combined = `${lit}\n${introRegion}`;
  const comparativeHits = COMPARATIVE_LIT_PHRASES.filter((p) =>
    p.test(combined),
  ).length;

  return {
    isolationPatternCount,
    hasComparativeLanguage: comparativeHits >= 2,
  };
}

const SUBSECTION_HEADING_SKIP =
  /^(?:gap|literature\s+review|introduction|background|related\s+work)$/i;

function isThematicSubsectionHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 4 || t.length > 72) return false;
  if (SUBSECTION_HEADING_SKIP.test(t)) return false;
  if (/\?/.test(t) || /\d{4}/.test(t)) return false;
  if (/[.!]/.test(t)) return false;
  return (
    /^The\s+[A-Z]/.test(t) ||
    /^[A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|and|of|in|on|versus|vs\.?|for|to|the|a)){0,10}$/.test(
      t,
    )
  );
}

function extractThematicSubsections(lit: string): { heading: string; body: string }[] {
  const lines = lit.split("\n");
  const sections: { heading: string; body: string }[] = [];
  let heading = "";
  let body: string[] = [];

  const flush = () => {
    if (!heading) return;
    sections.push({ heading, body: body.join("\n") });
  };

  for (const line of lines) {
    const t = line.trim();
    if (isThematicSubsectionHeading(t)) {
      flush();
      heading = t;
      body = [];
    } else if (heading) {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function gapNamesDualResearchThreads(gapText: string): boolean {
  if (!gapText.trim()) return false;
  if (/\bintersection\s+of\s+(?:these\s+)?(?:two|four)\b/i.test(gapText)) return true;
  if (/\bneither\b[\s\S]{0,200}\bnor\b/i.test(gapText)) return true;

  const existingClauses =
    gapText.match(
      /\b(?:existing|prior|most)\s+[^.]{8,100}\s+(?:has|have)\s+(?:not\s+)?(?:examined|focused|addressed|studied|tested|compared)\b/gi,
    ) ?? [];
  if (existingClauses.length >= 2) return true;

  const whileGaps =
    gapText.match(/\bwhile\b[^.]{0,140}\b(?:has|have)\s+not\b/gi) ?? [];
  if (whileGaps.length >= 2) return true;

  const domainThreads =
    gapText.match(
      /\b(?:research|studies|literature)\s+(?:has|have)\s+focused\b/gi,
    ) ?? [];
  return domainThreads.length >= 2;
}

/** Gap names multiple distinct literature threads (humanities / multi-theorist). */
export function gapNamesMultipleResearchThreads(gapText: string): boolean {
  if (gapNamesDualResearchThreads(gapText)) return true;
  if (/\beither\b[^.]{15,220}\bor\b/i.test(gapText)) return true;
  const whileEstablished =
    gapText.match(
      /\bwhile\s+[^.]{10,120}(?:have|has)\s+(?:established|documented|examined)/gi,
    ) ?? [];
  if (whileEstablished.length >= 1 && /\bno\s+study\s+has\b/i.test(gapText)) {
    return true;
  }
  const establishedClauses =
    gapText.match(
      /\b(?:have|has)\s+(?:established|documented|examined|extended|developed)\b/gi,
    ) ?? [];
  return establishedClauses.length >= 2;
}

function subsectionHasTheoreticalSynthesis(body: string): boolean {
  const uniqueAuthors = new Set(
    citationsInSentence(body).map((c) =>
      c.kind === "numbered" ? c.author : `${c.author}|${c.year}`,
    ),
  );
  if (uniqueAuthors.size < 3) return false;
  return HUMANITIES_SYNTHESIS_PHRASES.some((p) => p.test(body));
}

/** Multiple theorists connected within thematic subsections (humanities synthesis). */
export function detectTheoreticalFrameworkSynthesis(literatureReview: string): boolean {
  const lit = literatureReview.trim();
  if (lit.length < 400) return false;

  const subsections = extractThematicSubsections(lit).filter(
    (s) => s.body.trim().length > 80,
  );
  if (subsections.some((s) => subsectionHasTheoreticalSynthesis(s.body))) return true;

  const paragraphs = splitParagraphs(lit);
  return paragraphs.some((p) => subsectionHasTheoreticalSynthesis(p));
}

/**
 * Lit review with named thematic subsections (each multi-cited) and a gap
 * that ties two research threads together.
 */
export function detectCrossSectionSynthesis(
  literatureReview: string,
  gapText: string,
): boolean {
  const lit = literatureReview.trim();
  if (lit.length < 400 || !gapNamesMultipleResearchThreads(gapText)) return false;

  const subsections = extractThematicSubsections(lit).filter(
    (s) => s.body.trim().length > 80,
  );
  if (subsections.length < 2) return false;

  const multiCitedSections = subsections.filter((s) => {
    const cites = citationsInSentence(s.body);
    const unique = new Set(
      cites.map((c) =>
        c.kind === "numbered" ? `n:${c.author}` : `${c.author}|${c.year}`,
      ),
    );
    return unique.size >= 2;
  });

  return multiCitedSections.length >= 2;
}
