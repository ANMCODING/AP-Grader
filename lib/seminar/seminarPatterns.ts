/**
 * Shared detection patterns for AP Seminar (parallel to AP Research evidence patterns).
 * Scoring thresholds live in iwaRows.ts / irrRows.ts — this file is detection only.
 */

import { getActivePatternScanCache } from "@/lib/seminar/patternScanCache";
import {
  countDistinctPatternHits as countDistinctPatternHitsRaw,
  countPatternHits as countPatternHitsRaw,
  countPatternHitsUpTo as countPatternHitsUpToRaw,
  countPatternHitsWithCombined as countPatternHitsWithCombinedRaw,
  countDistinctPatternHitsWithCombined as countDistinctPatternHitsWithCombinedRaw,
  buildCombinedRegex,
  buildCombinedRegexChunks,
  countCombinedMatches,
  combinedRegexMatches,
  combinedChunksMatch,
} from "@/lib/seminar/seminarPatternScan";

export {
  buildCombinedRegex,
  buildCombinedRegexChunks,
  countCombinedMatches,
  combinedRegexMatches,
  combinedChunksMatch,
  countPatternHitsWithCombinedRaw as countPatternHitsWithCombined,
  countDistinctPatternHitsWithCombinedRaw as countDistinctPatternHitsWithCombined,
};
import { VISUAL_STIMULUS_PATTERNS } from "@/lib/seminar/seminarStimulus";
import {
  EXPLORATORY_PATTERNS,
  TANGENTIAL_STIMULUS_PATTERNS,
} from "@/lib/seminar/seminarIwaPhrasePatterns";

const COLLOQUIAL_PATTERNS_BASE: RegExp[] = [
  /\ba lot\b/gi,
  /\bstuff\b/gi,
  /\bthings\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /\bbasically\b/gi,
  /\breally\b/gi,
  /\bvery\b/gi,
  /\bsuper\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\bliterally\b/gi,
  /\bobviously\b/gi,
  /\bclearly\b/gi,
  /\beveryone knows\b/gi,
  /\bin today's (?:world|society)\b/gi,
  /\bin this day and age\b/gi,
  /\bsince the beginning of time\b/gi,
  /\bthroughout history\b/gi,
  /\bat the end of the day\b/gi,
  /\bdon't\b/gi,
  /\bcan't\b/gi,
  /\bwon't\b/gi,
  /\bit's\b/gi,
  /\bthat's\b/gi,
  /\bimo\b/gi,
  /\btbh\b/gi,
  /\bidk\b/gi,
  /\bbc\b/gi,
  /\bthru\b/gi,
  /\bw\/\b/gi,
  /\bTHIS is\b/g,
  /\bYes, it's true\b/gi,
  /\beasy answer\b/gi,
  /\byou must stay true\b/gi,
];

export const COLLOQUIAL_PATTERNS: RegExp[] = COLLOQUIAL_PATTERNS_BASE;

export const VAGUE_IMPORTANCE_PATTERNS: RegExp[] = [
  /\bvery important topic\b/gi,
  /\bmatters to everyone\b/gi,
  /\baffects all of us\b/gi,
  /\bgrowing problem\b/gi,
  /\bdebated for many years\b/gi,
  /\bmost important issues of our time\b/gi,
  /\baffects many people\b/gi,
  /\bsociety faces many challenges\b/gi,
  /\bin our modern world\b/gi,
  /\bin today's society\b/gi,
  /\bas technology advances\b/gi,
  /\bin the digital age\b/gi,
  /\brelevant because\b/gi,
  /\binteresting question because\b/gi,
  /\bi chose this topic\b/gi,
  /\bi am passionate about\b/gi,
  /\bresonates with me\b/gi,
  /\bstudies (?:have )?(?:shown|proved) that\b/gi,
  /\bresearch shows that\b/gi,
  /\bexperts say\b/gi,
];

export const INTEGRATION_COMMENTARY_PATTERNS: RegExp[] = [
  /\bthis demonstrates that\b/gi,
  /\bthis shows that\b/gi,
  /\bthis reveals that\b/gi,
  /\bthis illustrates that\b/gi,
  /\bthis supports the claim\b/gi,
  /\bthis matters because\b/gi,
  /\bthis is significant because\b/gi,
  /\bthe implication of this is\b/gi,
  /\bwhat this means is\b/gi,
  /\bbuilding on this\b/gi,
  /\bin light of this\b/gi,
  /\bconsequently,\b/gi,
  /\bgiven this,\b/gi,
  /\bthis therefore suggests\b/gi,
  /\bthis directly applies to\b/gi,
];

const TANGENTIAL_SOURCE_BASE: RegExp[] = [
  /\bdefines? \w+ as\b/gi,
  /\bdiscusses? \w+\.\s*$/gim,
  /\bwrote about\b/gi,
  /\bthere are many perspectives\b/gi,
  /\bstudies have found that\b/gi,
  /\bresearch shows that\b/gi,
  /\bexperts say that\b/gi,
  /\bit is well known that\b/gi,
  /\bmany people think\b/gi,
];

export const TANGENTIAL_SOURCE_PATTERNS: RegExp[] = [
  ...TANGENTIAL_SOURCE_BASE,
  ...TANGENTIAL_STIMULUS_PATTERNS,
];

export const STATISTICAL_URGENCY_PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?%\s+of\b/gi,
  /\b\d+\s+million\b/gi,
  /\b\d+\s+billion\b/gi,
  /\bone in \d+\b/gi,
  /\bnearly \d+ percent\b/gi,
  /\bmore than \d+ percent\b/gi,
  /\b\d+% increase\b/gi,
  /\b\d+ times more likely\b/gi,
  /\bkilling between \d+ and \d+ people\b/gi,
  /\bleft between \d+ and \d+ people\b/gi,
];

export const COMPARISON_PATTERNS: RegExp[] = [
  /\bwhile .{5,60} argue/gi,
  /\bin contrast to\b/gi,
  /\bunlike .{5,40},/gi,
  /\bwhereas\b/gi,
  /\bon the other hand\b/gi,
  /\bboth .{5,40} and .{5,40} agree\b/gi,
  /\bhowever, .{5,40} (?:argues|contends|suggests|challenges)\b/gi,
  /\bsimilarly, .{5,40} extends\b/gi,
  /\bbuilding on .{5,40},/gi,
  // seminar-3.2.11 — organized/comparison signals
  /\bin contrast.{0,30}(?:to|with)\b/gi,
  /\bby contrast\b/gi,
  /\bunlike.{0,40}(?:this|the)\b/gi,
  /\bthis paper (?:departs from|agrees with|accepts|rejects|extends|challenges)\b/gi,
  /\bthis paper (?:sides with|aligns with|diverges from)\b/gi,
  /\bthe (?:stronger|weaker|more defensible|less convincing) (?:argument|position|claim)\b/gi,
  /\bthe (?:better|worse|more|less) (?:supported|persuasive|convincing|accurate) (?:view|position)\b/gi,
  /\bthis paper (?:first|second|third|then|next|finally) (?:argues?|shows?|demonstrates?|establishes?)\b/gi,
  /\bthe (?:first|second|third|final) (?:claim|argument|point|consideration)\b/gi,
];

export const EVALUATIVE_PERSPECTIVE_PATTERNS: RegExp[] = [
  /\btension between\b/gi,
  /\btaken together,?\s+these perspectives suggest\b/gi,
  /\bwhile .{5,60} establishes\b/gi,
  /\bcomplicates this by showing\b/gi,
  /\blimitation of\b/gi,
  /\bwhat this tension reveals\b/gi,
  /\bsynthesizing these perspectives\b/gi,
  /\bneither .{5,40} nor .{5,40} fully accounts\b/gi,
  /\breading .{5,40} and .{5,40} together\b/gi,
  /\bthis disagreement points to\b/gi,
  /\bdespite their disagreement\b/gi,
  /\bconceding that\b/gi,
  /\banticipating the counterargument\b/gi,
  /\bthis objection\b/gi,
];

export const PERSONAL_ANECDOTE_PATTERNS: RegExp[] = [
  /\bi chose this (?:topic|because)\b/gi,
  /\bi am passionate about\b/gi,
  /\bresonates with me\b/gi,
  /\bfor me personally\b/gi,
  /\bmy own experience\b/gi,
];

export const STIMULUS_DEFINITION_ONLY_PATTERNS: RegExp[] = [
  /\bdefines? \w+ as\b/gi,
  /\baccording to the dictionary\b/gi,
  /\bmeans? that\b/gi,
];

export const RESEARCH_QUESTION_LINE =
  /(?:^|\n)\s*(?:research question|to what extent)[^?\n]{10,140}\?\s*(?:\n|$)/i;

export const IRR_METHODOLOGY_PATTERNS: RegExp[] = [
  /\bsurveyed\b/gi,
  /\bsystematic review\b/gi,
  /\bconducted a (?:study|survey|analysis)\b/gi,
  /\bexamined\b/gi,
  /\banalyzed\b/gi,
  /\bbased on \d+ studies\b/gi,
  /\bin a (?:qualitative|quantitative|longitudinal) study\b/gi,
  /\bN\s*=\s*\d+/gi,
];

export const IRR_BIAS_EVALUATION_PATTERNS: RegExp[] = [
  /\bleft-?wing\b/gi,
  /\bright-?wing\b/gi,
  /\bmay be biased\b/gi,
  /\blimitation of this source\b/gi,
  /\blarger sample\b/gi,
  /\bmore rigorous\b/gi,
];

export const IRR_ORGANIZATIONAL_PREVIEW =
  /\bthis (?:report|investigation|paper) (?:examines|explores|analyzes|investigates)\b/gi;

/** IWA v2.5.6 penalty / withhold patterns. Regenerate: npm run seminar:build-phrases */
export {
  IWA_ROW2_BOOST_TRIGGERS,
  IWA_ROW2_ZERO_TRIGGERS,
  IWA_ROW3_ZERO_TRIGGERS,
  IWA_ROW4_CAP8_TRIGGERS,
  IWA_ROW4_ZERO_TRIGGERS,
  IWA_ROW5_DEDUCTION_TRIGGERS,
  IWA_ROW6_DEDUCTION_TRIGGERS,
  IWA_ROW7_DEDUCTION_TRIGGERS,
  IWA_STIMULUS_TITLE_WEAK_ROW1,
  IWA_STIMULUS_WITHHOLD_TRIGGERS,
} from "@/lib/seminar/seminarIwaPenaltyPatterns";

/** IRR v2.5.5 phrase expansion (report genre). Regenerate: npm run seminar:build-phrases */
export {
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
} from "@/lib/seminar/seminarIrrPhrasePatterns";

export const JOURNALISTIC_SOURCE_PATTERNS: RegExp[] = [
  /\bNational Geographic\b/gi,
  /\bGreater Good\b/gi,
  /\bAmerican Psychological Association website\b/gi,
  /\bAPA website\b/gi,
];

export const GROUP_NOUN_PERSPECTIVE = /\b(?:scientists|researchers|experts|studies|many people|some argue|others contend|critics|supporters)\b/gi;

export const NAMED_POSITION_PATTERNS: RegExp[] = [
  /\b[A-Z][a-z]+ argues that\b/g,
  /\b[A-Z][a-z]+ contends that\b/g,
  /\baccording to [A-Z][a-z]+,/gi,
  /\b[A-Z][a-z]+ \(\d{4}\)[^.]{10,80}\./g,
  /\b[A-Z][a-z]+(?:\s+et al\.)? \(\d{4}\)/g,
];

export const STUDENT_COMMENTARY_PATTERNS: RegExp[] = [
  ...INTEGRATION_COMMENTARY_PATTERNS,
  /\btherefore,\b/gi,
  /\bthus,\b/gi,
  /\bultimately,\b/gi,
  /\bmy argument is\b/gi,
  /\bthis paper argues\b/gi,
  /\bthe central claim\b/gi,
  /\bin conclusion,\b/gi,
  /\bwhat is at stake\b/gi,
];

const NO_ARGUMENT_BASE: RegExp[] = [
  /\bthere are many perspectives on\b/gi,
  /\bthis paper will explore\b/gi,
  /\bthree ways, for example\b/gi,
  /\bhere are three ways\b/gi,
  /\bhow to maintain a sense of stability\b/gi,
  /\bexplores? the topic\b/gi,
];

export const NO_ARGUMENT_PATTERNS: RegExp[] = [
  ...NO_ARGUMENT_BASE,
  ...EXPLORATORY_PATTERNS,
];

export const WEAK_SOURCE_PATTERNS: RegExp[] = [
  /\bhttps?:\/\/[^\s)]+(?:\.com|\.org)[^\s)]*\s*$/gim,
  /\bwikipedia\b/gi,
  /\bmedium\.com\b/gi,
  /\b(?:Jun|Jul|Feb|Mar|Apr|May|Jan|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4},/g,
];

export { BIBLIOGRAPHY_HEADING_PATTERNS } from "@/lib/seminar/seminarBibliographyHeadingPatterns.generated";

const LARGE_ARRAY_SLICE = 8000;

function textForLargePatternScan(text: string, patterns: RegExp[]): string {
  if (patterns.length <= 50 || text.length <= LARGE_ARRAY_SLICE) return text;
  return text.slice(0, LARGE_ARRAY_SLICE);
}

export function countPatternHits(text: string, patterns: RegExp[]): number {
  const scan = textForLargePatternScan(text, patterns);
  const cache = getActivePatternScanCache();
  if (cache) return cache.hits(scan, patterns);
  return countPatternHitsRaw(scan, patterns);
}

/** At most one hit per pattern; optional cap on how many patterns may match (reduces false positives from broad expansion regex). */
export function countDistinctPatternHits(
  text: string,
  patterns: RegExp[],
  maxPatterns = patterns.length,
): number {
  const scan = textForLargePatternScan(text, patterns);
  const cache = getActivePatternScanCache();
  if (cache) return cache.distinct(scan, patterns, maxPatterns);
  return countDistinctPatternHitsRaw(scan, patterns, maxPatterns);
}

export function countPatternHitsInSlice(
  text: string,
  patterns: RegExp[],
  maxChars: number,
): number {
  return countPatternHits(text.slice(0, maxChars), patterns);
}

export function countPatternHitsUpTo(
  text: string,
  patterns: RegExp[],
  maxHits: number,
): number {
  const scan = textForLargePatternScan(text, patterns);
  return countPatternHitsUpToRaw(scan, patterns, maxHits);
}

export function extractAuthorCitations(body: string): string[] {
  const authors: string[] = [];
  const re =
    /\b([A-Z][a-z]+(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?)\s*\(\d{4}[a-z]?\)/g;
  for (const m of body.matchAll(re)) {
    authors.push(m[1]!.replace(/\s+et\s+al\./, "").trim());
  }
  for (const m of body.matchAll(/\(([A-Z][a-zA-Z]+)(?:\s+et\s+al\.)?,\s*\d{4}/g)) {
    authors.push(m[1]!);
  }
  for (const m of body.matchAll(/\(([A-Z][a-zA-Z]+)\)/g)) {
    if (!/^(p|pp|n|ibid|see)$/i.test(m[1]!)) authors.push(m[1]!);
  }
  for (const m of body.matchAll(/\bAccording to ([A-Z][a-z]+)/g)) {
    authors.push(m[1]!);
  }
  for (const m of body.matchAll(/\b([A-Z][a-z]+) (?:writes|argues|notes|explains|found)\b/g)) {
    authors.push(m[1]!);
  }
  return authors;
}

export function commentaryAfterCitation(body: string, author: string): number {
  const idx = body.search(
    new RegExp(
      `${author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.]{0,120}\\.`,
      "i",
    ),
  );
  if (idx < 0) return 0;
  const after = body.slice(idx, idx + 400);
  return countPatternHits(after, INTEGRATION_COMMENTARY_PATTERNS);
}

export function extractResearchQuestionKeywords(body: string): string[] {
  const rqAnywhere = body.match(
    /(?:research question|to what extent)[\s\S]{10,400}?\?/i,
  );
  const chunk = rqAnywhere?.[0] ?? body.slice(0, 1200);
  const qm = chunk.match(
    /(?:research question|to what extent|does |how )[\s\S]{10,120}?\?/i,
  );
  const titleLine =
    body.match(
      /^(?:Running head:)?\s*[^\n]{15,100}(?:\n|$)/im,
    )?.[0] ?? "";
  const q = qm?.[0] ?? `${titleLine} ${chunk.slice(0, 200)}`;
  const words = q
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !/^(what|which|their|there|about|would|could|should|extent)$/.test(w));
  return [...new Set(words)].slice(0, 12);
}

export function rqContextLinkInOpening(body: string, rqKeywords: string[]): boolean {
  const rqMatch = body.match(
    /(?:research question|to what extent)[\s\S]{10,400}?\?/i,
  );
  const rqWindow = rqMatch?.index != null
    ? body.slice(
        Math.max(0, rqMatch.index - 400),
        rqMatch.index + rqMatch[0].length + 400,
      )
    : body.slice(0, 2500);
  const open = `${body.slice(0, 2500)} ${rqWindow}`.toLowerCase();
  if (rqKeywords.length === 0) return true;
  const hasStat = STATISTICAL_URGENCY_PATTERNS.some((p) => p.test(open));
  const hasNamed =
    /\b(?:Innocence Project|wrongful conviction|orthopedic|burnout|courtroom|jury|nostalgia|well-?being|mental health|greenhouse|transportation|climate change|emissions|modal shift|high-?speed rail|digital memory|identity|collective memory|reconciliation|Tulsa)\b/i.test(
      open,
    );
  if (!hasStat && !hasNamed) return false;
  return rqKeywords.some((kw) => open.includes(kw));
}

export function countNamedPerspectives(body: string): number {
  const names = new Set<string>();
  for (const p of NAMED_POSITION_PATTERNS) {
    for (const m of body.matchAll(p)) {
      const raw = m[0];
      const name = raw.match(/^([A-Z][a-z]+)/)?.[1];
      if (name && !/^(The|This|These|However|While|According)$/.test(name)) {
        names.add(name);
      }
    }
  }
  for (const a of extractAuthorCitations(body)) {
    if (a.length > 2) names.add(a.split(/\s+/)[0]!);
  }
  return names.size;
}

export function countPerspectivesWithPosition(body: string): number {
  let n = 0;
  const seen = new Set<string>();
  const posRe =
    /\b([A-Z][a-z]+)(?:\s+et\s+al\.)?\s+(?:argues|contends|maintains|claims|asserts|concludes) that/gi;
  for (const m of body.matchAll(posRe)) {
    const name = m[1]!;
    if (!seen.has(name)) {
      seen.add(name);
      n++;
    }
  }
  return Math.max(n, countNamedPerspectives(body) > 1 ? Math.min(countNamedPerspectives(body), seen.size + 2) : seen.size);
}

export function estimateQuoteProportion(body: string): number {
  const quoted = (body.match(/"[^"]{30,}"/g) ?? []).join(" ").split(/\s+/).length;
  const total = body.split(/\s+/).filter(Boolean).length;
  return total > 0 ? quoted / total : 0;
}

export function computeCredibilityScore(body: string, refs: string): number {
  const combined = body + "\n" + refs;
  let score = 0;
  const doiCount = (refs.match(/doi\.org|doi:/gi) ?? []).length;
  score += Math.min(doiCount * 2, 8);
  score += (refs.match(/\bJournal of\b/gi) ?? []).length * 2;
  if (/\b(?:University Press|Proceedings of|Review of)\b/i.test(combined)) {
    score += 3;
  }
  if (/\b(?:CDC|NIH|WHO|FBI|Department of|American College)\b/i.test(combined)) {
    score += 3;
  }
  score += countPatternHits(combined, [
    /\bprofessor\b/gi,
    /\bPh\.?D\b/gi,
    /\bpeer-?reviewed\b/gi,
    /\bM\.D\.\b/gi,
    /\bInstitute of\b/gi,
  ]);
  const authorEntries = refs
    .split(/\n/)
    .filter((l) => /^[A-Z][a-z]+,\s+[A-Z]/.test(l.trim())).length;
  if (authorEntries >= 8) score += 6;
  else if (authorEntries >= 4) score += 3;

  if (urlOnlyBibliography(refs)) score = Math.min(score, 2);
  return Math.max(0, score);
}

export function commentaryWithinWordsAfter(
  body: string,
  startIdx: number,
  wordWindow = 100,
): number {
  const slice = body.slice(startIdx, startIdx + wordWindow * 6);
  return countPatternHits(slice, INTEGRATION_COMMENTARY_PATTERNS);
}

export function detectBestStimulusIntegration(
  body: string,
  stimulusAuthors: string[],
): {
  integrated: boolean;
  definitionOnly: boolean;
  introductionOnly: boolean;
  qualityScore: number;
} {
  let bestQuality = 0;
  let definitionOnly = false;
  let introOnly = true;
  const introEnd = Math.min(body.length, 2000);
  const bodyAfterIntro = body.slice(introEnd);

  const authors = stimulusAuthors.length > 0 ? stimulusAuthors : extractAuthorCitations(body).slice(0, 15);

  for (const author of authors) {
    const re = new RegExp(author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const idx = m.index;
      const window = body.slice(idx, idx + 600);
      if (STIMULUS_DEFINITION_ONLY_PATTERNS.some((p) => p.test(window)) &&
          commentaryWithinWordsAfter(body, idx) < 2) {
        definitionOnly = true;
      }
      const commentary = commentaryWithinWordsAfter(body, idx, 100);
      const inIntro = idx < introEnd;
      if (!inIntro) introOnly = false;
      const quality = commentary + (inIntro ? 0 : 2);
      bestQuality = Math.max(bestQuality, quality);
    }
  }

  for (const p of [...VISUAL_STIMULUS_PATTERNS]) {
    const m = body.match(p);
    if (m?.index != null) {
      const commentary = commentaryWithinWordsAfter(body, m.index, 100);
      bestQuality = Math.max(bestQuality, commentary + 2);
      introOnly = false;
    }
  }

  return {
    integrated: bestQuality >= 2,
    definitionOnly: definitionOnly && bestQuality < 2,
    introductionOnly: introOnly && bestQuality >= 1,
    qualityScore: bestQuality,
  };
}

export function countBeyondStimulusWellVetted(
  body: string,
  refs: string,
  stimulusAuthors: string[],
): number {
  const combined = body + "\n" + refs;
  let count = 0;
  const doi = (refs.match(/doi\.org|doi:/gi) ?? []).length;
  count += Math.min(doi, 4);
  if (/\bJournal of\b/i.test(combined)) count += 2;
  if (/\b(?:University Press|Proceedings of)\b/i.test(combined)) count += 1;
  if (/\b(?:CDC|NIH|\.gov)\b/i.test(combined)) count += 1;

  const cited = extractAuthorCitations(body);
  const nonStimulus = cited.filter(
    (a) => !stimulusAuthors.some((s) => a.toLowerCase().startsWith(s.toLowerCase())),
  );
  count += Math.min(new Set(nonStimulus.map((a) => a.split(/\s+/)[0])).size, 4);
  return count;
}

/** Expand references block into logical entries (handles joined URL lines). */
export function expandBibliographyLines(refs: string): string[] {
  const raw = refs.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 3);
  const out: string[] = [];
  for (const line of raw) {
    if (/(?:^|\s)https?:\/\//i.test(line)) {
      const chunks = line.split(/(?=\s*https?:\/\/)/i).map((c) => c.trim()).filter(Boolean);
      for (const c of chunks) {
        if (/^https?:\/\//i.test(c) || /https?:\/\//i.test(c)) out.push(c);
        else if (!/^(?:Sources|References|Works Cited|Bibliography)\s*$/i.test(c)) {
          out.push(c);
        }
      }
    } else {
      out.push(line);
    }
  }
  return out;
}

export function urlOnlyBibliography(refs: string): boolean {
  const lines = expandBibliographyLines(refs).filter((l) => l.trim().length > 15);
  if (lines.length < 2) return false;
  const urlOnlyLines = lines.filter(
    (l) => /https?:\/\//i.test(l.trim()) && !/[A-Z][a-z]+,\s+[A-Z]/.test(l),
  );
  const authorLines = lines.filter(
    (l) =>
      /^[A-Z][a-zA-Z]+,/.test(l.trim()) ||
      /\([0-9]{4}/.test(l) ||
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(
        l,
      ),
  );
  return urlOnlyLines.length >= 4 && authorLines.length < 2;
}
