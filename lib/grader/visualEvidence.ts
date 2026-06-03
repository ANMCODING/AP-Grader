import { sentences } from "@/lib/grader/text";

const ANALYTICAL_WORDS =
  /\b(?:shows?|demonstrates?|reveals?|indicates?|suggests?|found|displays?|illustrates?|compares?|confirms?)\b/i;

const CORRELATION_PATTERNS = [
  /positively correlated/i,
  /negatively correlated/i,
  /correlation coefficient/i,
  /\br\s*=\s*[-+]?\d/i,
  /\br equals/i,
  /Pearson/i,
  /statistically significant/i,
  /p\s*value/i,
  /p\s*</i,
  /p\s*>/i,
  /chi-?square/i,
  /ANOVA/i,
  /t-test/i,
  /regression/i,
  /effect size/i,
  /confidence interval/i,
];

export interface VisualEvidenceResult {
  weightedScore: number;
  figureRefsAnalyzed: number;
  tableRefsAnalyzed: number;
  appendixRefs: number;
  chartRefs: number;
  inTextDiscussionCount: number;
  correlationSignalCount: number;
  alignmentSignal: boolean;
  decorativeOnlyCount: number;
  incompleteLabelingNote: string | null;
}

function uniqueMatches(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern) ?? [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

function findVisualMentions(text: string): { type: string; index: number; raw: string }[] {
  const patterns: { type: string; re: RegExp }[] = [
    { type: "figure", re: /\b(?:Figure|Fig\.?)\s+(\d{1,2})\b/gi },
    { type: "table", re: /\bTable\s+(\d{1,2})\b/gi },
    { type: "appendix", re: /\bAppendix\s+[A-Z]\b/gi },
    { type: "chart", re: /\b(?:Chart|Graph)\s+(\d{1,2})\b/gi },
  ];

  const found: { type: string; index: number; raw: string }[] = [];
  for (const { type, re } of patterns) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(text)) !== null) {
      found.push({ type, index: m.index, raw: m[0] });
    }
  }
  return found;
}

/** True if analytical prose appears within 150 words after the mention. */
function hasNearbyAnalysis(text: string, index: number): boolean {
  const after = text.slice(index, index + 900);
  const windowSentences = sentences(after).slice(0, 4);
  return windowSentences.some((s) => ANALYTICAL_WORDS.test(s));
}

function hasInTextDataDiscussion(text: string): number {
  const mentions = findVisualMentions(text);
  let count = 0;

  for (const m of mentions) {
    const start = Math.max(0, m.index - 80);
    const chunk = text.slice(start, m.index + 200);
    const sents = sentences(chunk);
    for (const s of sents) {
      const refsVisual = /\b(?:Figure|Fig\.?|Table|Chart|Graph)\s+\d/i.test(s);
      if (refsVisual && ANALYTICAL_WORDS.test(s)) {
        count++;
        break;
      }
    }
    const next = text.slice(m.index, m.index + 250);
    if (ANALYTICAL_WORDS.test(next)) count++;
  }

  return count;
}

function detectIncompleteLabeling(text: string): string | null {
  const figNums = uniqueMatches(text, /\b(?:Figure|Fig\.?)\s+(\d{1,2})\b/gi)
    .map((m) => parseInt(m.replace(/\D/g, ""), 10))
    .filter((n) => n >= 1 && n <= 20)
    .sort((a, b) => a - b);
  const tabNums = uniqueMatches(text, /\bTable\s+(\d{1,2})\b/gi)
    .map((m) => parseInt(m.replace(/\D/g, ""), 10))
    .filter((n) => n >= 1 && n <= 20)
    .sort((a, b) => a - b);

  const gaps: string[] = [];
  if (figNums.length >= 2 && hasGap(figNums)) gaps.push("figure numbering");
  if (tabNums.length >= 2 && hasGap(tabNums)) gaps.push("table numbering");

  if (gaps.length === 0) return null;
  return `Possible incomplete data presentation (${gaps.join(" and ")} may skip numbers).`;
}

function hasGap(nums: number[]): boolean {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] - nums[i - 1] > 1) return true;
  }
  return false;
}

function checkVisualRqAlignment(
  text: string,
  researchQuestionText: string,
): boolean {
  if (!researchQuestionText.trim()) return false;
  const rqTokens = researchQuestionText
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);
  if (rqTokens.length === 0) return false;

  const mentions = findVisualMentions(text);
  for (const m of mentions) {
    const window = text
      .slice(Math.max(0, m.index - 100), m.index + 100)
      .toLowerCase();
    if (rqTokens.some((t) => window.includes(t))) return true;
  }
  return false;
}

export function analyzeVisualEvidence(
  fullText: string,
  researchQuestionText: string,
): VisualEvidenceResult {
  let figureRefsAnalyzed = 0;
  let tableRefsAnalyzed = 0;
  let decorativeOnlyCount = 0;

  const mentions = findVisualMentions(fullText);
  const seenFigure = new Set<string>();
  const seenTable = new Set<string>();

  for (const m of mentions) {
    if (m.type === "figure") {
      const key = m.raw.toLowerCase();
      if (seenFigure.has(key)) continue;
      seenFigure.add(key);
      if (hasNearbyAnalysis(fullText, m.index)) figureRefsAnalyzed++;
      else decorativeOnlyCount++;
    }
    if (m.type === "table") {
      const key = m.raw.toLowerCase();
      if (seenTable.has(key)) continue;
      seenTable.add(key);
      if (hasNearbyAnalysis(fullText, m.index)) tableRefsAnalyzed++;
      else decorativeOnlyCount++;
    }
  }

  const appendixRefs = uniqueMatches(
    fullText,
    /\bAppendix\s+[A-Z]\b|\bsee appendix\b|\brefer to appendix\b/gi,
  ).length;
  const chartRefs = uniqueMatches(
    fullText,
    /\b(?:Chart|Graph)\s+\d{1,2}\b/gi,
  ).length;

  const inTextDiscussionCount = hasInTextDataDiscussion(fullText);

  const correlationSignalCount = sentences(fullText).filter((s) =>
    CORRELATION_PATTERNS.some((p) => p.test(s)),
  ).length;

  const alignmentSignal = checkVisualRqAlignment(
    fullText,
    researchQuestionText,
  );

  let weightedScore = 0;
  weightedScore += figureRefsAnalyzed;
  weightedScore += tableRefsAnalyzed;
  weightedScore += appendixRefs;
  weightedScore += chartRefs;
  weightedScore += inTextDiscussionCount * 2;
  weightedScore += correlationSignalCount * 1.5;
  if (alignmentSignal) weightedScore += 3;

  return {
    weightedScore,
    figureRefsAnalyzed,
    tableRefsAnalyzed,
    appendixRefs,
    chartRefs,
    inTextDiscussionCount,
    correlationSignalCount,
    alignmentSignal,
    decorativeOnlyCount,
    incompleteLabelingNote: detectIncompleteLabeling(fullText),
  };
}

export function applyVisualBonuses(
  method: { band: number; tier: string },
  argument: { band: number; tier: string },
  visual: VisualEvidenceResult,
  methodElements: number,
  resultsSignals: number,
  creditsUnseenVisuals = false,
  strongUnseenVisuals = false,
): { methodBand: 1 | 2 | 3 | 4 | 5; argumentBand: 1 | 2 | 3 | 4 | 5 } {
  let mBand = method.band as 1 | 2 | 3 | 4 | 5;
  let aBand = argument.band as 1 | 2 | 3 | 4 | 5;
  let w = visual.weightedScore;
  if (creditsUnseenVisuals) {
    if (strongUnseenVisuals) w = Math.max(w, 5);
    else w = Math.max(w, 2);
  }

  const strongCore = methodElements >= 5 && resultsSignals >= 4;
  const strongStats = resultsSignals >= 8;
  const maxBand = strongCore || strongStats ? 5 : 4;

  const bump = (current: number, delta: number): number =>
    Math.max(current, Math.min(maxBand, current + delta));

  if (w === 0) {
    return { methodBand: mBand, argumentBand: aBand };
  }

  if (w <= 2) {
    if (mBand < 3) mBand = bump(mBand, 1) as 1 | 2 | 3 | 4 | 5;
  } else if (w <= 5) {
    if (mBand < 4) mBand = bump(mBand, 1) as 1 | 2 | 3 | 4 | 5;
    if (aBand < 4) aBand = bump(aBand, 1) as 1 | 2 | 3 | 4 | 5;
  } else if (w <= 9) {
    mBand = bump(mBand, 1) as 1 | 2 | 3 | 4 | 5;
    aBand = bump(aBand, 1) as 1 | 2 | 3 | 4 | 5;
  } else if (
    w >= 10 &&
    visual.inTextDiscussionCount >= 2 &&
    visual.correlationSignalCount >= 1
  ) {
    mBand = bump(mBand, 2) as 1 | 2 | 3 | 4 | 5;
    aBand = bump(aBand, 2) as 1 | 2 | 3 | 4 | 5;
  }

  return { methodBand: mBand, argumentBand: aBand };
}
