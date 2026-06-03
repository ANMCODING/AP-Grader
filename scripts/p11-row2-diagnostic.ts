/**
 * Verbose Row 2 diagnostic for p11 — read-only, no scoring changes.
 */
import fs from "node:fs";
import path from "node:path";
import { countSubstantiatedRqContext } from "@/lib/seminar/seminarBibliographyAnalysis";
import {
  ROW2_ZERO_CONTEXT_PATTERNS,
  UNSUBSTANTIATED_CONTEXT_PATTERNS,
} from "@/lib/seminar/seminarCalibrationPatterns";
import { computeSpecificityScore } from "@/lib/seminar/seminarDeepCalibration";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import {
  countPatternHits,
  countPatternHitsInSlice,
  extractResearchQuestionKeywords,
  rqContextLinkInOpening,
  STATISTICAL_URGENCY_PATTERNS,
} from "@/lib/seminar/seminarPatterns";
import { prepareSeminarText } from "@/lib/seminar/seminarTextPrep";
import { scoreIwaRow2 } from "@/lib/seminar/iwaRows";
import { countWords } from "@/lib/grader/text";

const ROOT = path.join(process.cwd(), "data/batch-iwa-papers/p11-memory-fallibility-adesanya.txt");
const raw = fs.readFileSync(ROOT, "utf8");
const cleaned = prepareSeminarText(raw);
const { bodyText } = partitionSeminarText(cleaned);

function partitionSeminarText(text: string): { bodyText: string; referencesText: string } {
  const m = text.search(
    /\n(?:References?|Works Cited|Bibliography|Sources|Works Consulted|Literature Cited)\s*(?:\n|$)/i,
  );
  if (m >= 0) {
    return { bodyText: text.slice(0, m).trim(), referencesText: text.slice(m).trim() };
  }
  return { bodyText: text.trim(), referencesText: "" };
}

const rqKeywords = extractResearchQuestionKeywords(bodyText);
const e = buildSeminarEvidence(raw);

// Mirror contextScanText from seminarDeepCalibration.ts
function contextScanText(body: string, keywords: string[]): {
  open800Chars: string;
  open800Words: number;
  rqMatch: RegExpMatchArray | null;
  rqWindow: string | null;
  combinedScan: string;
  combinedWords: number;
} {
  const scanLen = countWords(body) > 1000 ? 7000 : 5200;
  const open800 = body.slice(0, scanLen);
  const rqMatch = body.match(
    /(?:research question|to what extent)[\s\S]{10,400}?\?/i,
  );
  if (rqMatch?.index == null) {
    const titleLine = body.match(/^[^\n]{20,120}$/m);
    if (titleLine?.index != null) {
      const tStart = Math.max(0, titleLine.index - 200);
      const tEnd = Math.min(body.length, titleLine.index + titleLine[0].length + 200);
      const combined = `${open800}\n${body.slice(tStart, tEnd)}`;
      return {
        open800Chars: open800,
        open800Words: countWords(open800),
        rqMatch: null,
        rqWindow: body.slice(tStart, tEnd),
        combinedScan: combined,
        combinedWords: countWords(combined),
      };
    }
    return {
      open800Chars: open800,
      open800Words: countWords(open800),
      rqMatch: null,
      rqWindow: null,
      combinedScan: open800,
      combinedWords: countWords(open800),
    };
  }
  const rqParaStart = Math.max(0, rqMatch.index - 800);
  const rqParaEnd = Math.min(body.length, rqMatch.index + rqMatch[0].length + 800);
  const rqWindow = body.slice(rqParaStart, rqParaEnd);
  const combined = `${open800}\n${rqWindow}`;
  return {
    open800Chars: open800,
    open800Words: countWords(open800),
    rqMatch,
    rqWindow,
    combinedScan: combined,
    combinedWords: countWords(combined),
  };
}

const HIGH_SPECIFICITY = [
  { name: "pct_of_population", re: /\b\d+(?:\.\d+)?% of [^.]{10,80}(?:experience|affected|report|diagnosed)/gi },
  { name: "million_scale", re: /\b\d+ million [^.]{10,60}/gi },
  { name: "rates_change", re: /\brates of [^.]{10,50} have (?:increased|decreased|risen|fallen) by \d/gi },
  { name: "following_event", re: /\bfollowing the [A-Z][^.]{8,60},/gi },
  { name: "among_clause", re: /\bamong [^.]{10,60}, [^.]{10,60} (?:occurs|affects|represents) at/gi },
  { name: "age_band_pct", re: /\bAges \d+-\d+:\s*\d+(?:\.\d+)?%/gi },
];

const MED_SPECIFICITY = [
  { name: "institution_geo", re: /\b(?:United States|U\.S\.|UK|European Union|World Health Organization|CDC|Supreme Court)\b/gi },
  { name: "year_range", re: /\b(?:since|between) (?:19|20)\d{2}/gi },
  { name: "policy_act", re: /\b(?:Act of|Policy|Regulation|law)\b/gi },
  { name: "matters_because", re: /\bthis matters because [^.]{15,80} affects\b/gi },
];

const NARRATIVE_URGENCY = [
  { name: "massacre_casualty", re: /\b(?:Massacre|collapse|disaster|fire|Rana Plaza)[^.]{0,40}(?:killed|left|displaced|resulted in) \d+/gi },
  { name: "tulsa_massacre", re: /\b(?:Tulsa Race (?:Massacre|Riot))[^.]{0,80}(?:killed|left|displaced|resulted in|between \d+)/gi },
  { name: "historical_atrocity", re: /\b(?:Trail of Tears|Hurricane Katrina|Rwandan genocide|Japanese internment)[^.]{0,60}(?:killed|left|displaced|died)/gi },
  { name: "between_N_M_people", re: /\b(?:killing|killed|left) between \d+ and \d+ people/gi },
  { name: "spent_years_prison", re: /\bspent (?:eleven|\d+) years in prison\b/gi },
  { name: "years_suppressed", re: /\bFor \d+ years,?\s+[^.]{10,80}(?:suppressed|erased|ignored|denied)\b/gi },
  { name: "ronald_cotton_named", re: /\bRonald Cotton\b/gi },
  { name: "cotton_convicted_narrative", re: /\bRonald Cotton was convicted\b/gi },
];

function testPatterns(
  label: string,
  text: string,
  patterns: { name: string; re: RegExp }[],
): { name: string; hits: number; samples: string[] }[] {
  return patterns.map(({ name, re }) => {
    re.lastIndex = 0;
    const samples: string[] = [];
    let hits = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits++;
      if (samples.length < 2) samples.push(m[0].slice(0, 80));
    }
    return { name, hits, samples };
  });
}

const scan = contextScanText(bodyText, rqKeywords);
const open = scan.combinedScan;
const substantiatedOpen = bodyText.slice(0, 2500);

console.log("\n=== p11 Row 2 diagnostic (memory-fallibility-adesanya) ===\n");

console.log("--- Engine totals ---");
console.log({
  specificityScore: e.specificityScore,
  scoreIwaRow2: scoreIwaRow2(e),
  row2Threshold: 4,
  substantiatedRqContextCount: e.substantiatedRqContextCount,
  rqContextLinked: e.rqContextLinked,
  statisticalUrgencyCount_first2500: e.statisticalUrgencyCount,
});

console.log("\n--- Research question keywords (first 12) ---");
console.log(rqKeywords);

console.log("\n--- Scan window (actual code paths) ---");
console.log({
  note: "computeSpecificityScore uses contextScanText → slice(0,5200) chars + RQ window (±800 chars around RQ match), NOT a separate 800-word-only pass",
  first5200_chars: scan.open800Chars.length,
  first5200_words: scan.open800Words,
  rqMatched: !!scan.rqMatch,
  rqSnippet: scan.rqMatch?.[0]?.slice(0, 120) ?? null,
  rqWindow_chars: scan.rqWindow?.length ?? 0,
  rqWindow_words: scan.rqWindow ? countWords(scan.rqWindow) : 0,
  combinedScan_chars: scan.combinedWords,
  combinedScan_words: scan.combinedWords,
  substantiatedRqContext_uses_first2500_only: substantiatedOpen.length,
  substantiatedRqContext_words: countWords(substantiatedOpen),
});

const cottonIdx = bodyText.indexOf("Ronald Cotton");
const innocence74 = bodyText.match(/74%/);
const innocence64 = bodyText.match(/64%/);
const innocence58 = bodyText.match(/58%/);
const innocence69 = bodyText.match(/69%/);

console.log("\n--- Key content positions in full body ---");
console.log({
  ronaldCotton_charIndex: cottonIdx,
  ronaldCotton_in_first5200: cottonIdx >= 0 && cottonIdx < 5200,
  ronaldCotton_in_substantiated2500: cottonIdx >= 0 && cottonIdx < 2500,
  spentElevenYears_in_body: /\bspent eleven years in prison\b/i.test(bodyText),
  spentElevenYears_in_combinedScan: /\bspent eleven years in prison\b/i.test(open),
  innocenceProject_74pct_charIndex: innocence74?.index ?? null,
  innocenceProject_64pct: innocence64?.index ?? null,
  innocenceProject_58pct: innocence58?.index ?? null,
  innocenceProject_69pct_found: innocence69?.index ?? null,
  note_69pct: "Paper has 74%/64%/58% in Figure caption, not 69%",
});

console.log("\n--- HIGH_SPECIFICITY (×2 each hit, in combined scan) ---");
const high = testPatterns("high", open, HIGH_SPECIFICITY);
for (const h of high) {
  console.log(`  ${h.hits > 0 ? "✓" : "✗"} ${h.name}: ${h.hits}${h.samples.length ? ` → "${h.samples[0]}"` : ""}`);
}
const highPts = high.reduce((s, h) => s + h.hits * 2, 0);

console.log("\n--- MED_SPECIFICITY (+1 each hit) ---");
const med = testPatterns("med", open, MED_SPECIFICITY);
for (const m of med) {
  console.log(`  ${m.hits > 0 ? "✓" : "✗"} ${m.name}: ${m.hits}${m.samples.length ? ` → "${m.samples[0]}"` : ""}`);
}
const medPts = med.reduce((s, m) => s + m.hits, 0);

console.log("\n--- STATISTICAL_URGENCY (in first 5200 of combined scan) ---");
const statHits = countPatternHitsInSlice(open, STATISTICAL_URGENCY_PATTERNS, 5200);
const statDetail = testPatterns(
  "stat",
  open.slice(0, 5200),
  STATISTICAL_URGENCY_PATTERNS.map((re, i) => ({
    name: `urgency_${i}`,
    re: new RegExp(re.source, re.flags),
  })),
);
for (const s of statDetail.filter((x) => x.hits > 0)) {
  console.log(`  ✓ ${s.name}: ${s.hits} → "${s.samples[0]}"`);
}
if (statDetail.every((x) => x.hits === 0)) {
  console.log("  ✗ (no STATISTICAL_URGENCY patterns in scan window)");
}

console.log("\n--- NARRATIVE_URGENCY (capped +3 total) ---");
const narr = testPatterns("narr", open, NARRATIVE_URGENCY);
for (const n of narr) {
  console.log(`  ${n.hits > 0 ? "✓" : "✗"} ${n.name}: ${n.hits}${n.samples.length ? ` → "${n.samples[0]}"` : ""}`);
}
const narrPts = Math.min(3, narr.reduce((s, n) => s + n.hits, 0));

const hasCite = /\(\d{4}[a-z]?\)|\([A-Z][a-zA-Z'&]+[^)]*\d{4}/.test(open);
const rqInOpen = rqKeywords.filter((k) => open.toLowerCase().includes(k.toLowerCase()));
const citeRqBonus = hasCite && rqInOpen.length > 0 ? 2 : 0;

console.log("\n--- RQ + citation bonus (+2) ---");
console.log({
  hasCitationInScan: hasCite,
  rqKeywordsPresentInScan: rqInOpen.slice(0, 8),
  citeRqBonus,
});

function rqReFromKeywords(kw: string[]): RegExp | null {
  const parts = kw
    .filter((k) => k.length > 5)
    .slice(0, 6)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (parts.length === 0) return null;
  return new RegExp(parts.join("|"), "i");
}

let rqPctBonus = 0;
const rqRe = rqReFromKeywords(rqKeywords);
if (rqRe) {
  for (const m of bodyText.matchAll(/\b\d+(?:\.\d+)?%/g)) {
    const idx = m.index ?? 0;
    const window = bodyText.slice(Math.max(0, idx - 200), idx + 200);
    if (rqRe.test(window) && /\([A-Z][a-zA-Z'&]+[^)]*\d{4}/.test(window)) {
      rqPctBonus += 2;
      console.log(`  ✓ rqAdjacentPct: "${m[0]}" at char ${idx} (+2)`);
    }
  }
}
if (rqPctBonus === 0) {
  console.log("  ✗ rqAdjacentPct: no % within 200 chars of RQ keyword WITH parenthetical cite");
  for (const m of bodyText.matchAll(/\b\d+(?:\.\d+)?%/g)) {
    const idx = m.index ?? 0;
    const window = bodyText.slice(Math.max(0, idx - 200), idx + 200);
    console.log(
      `    found ${m[0]} @${idx} — rqKw=${rqRe?.test(window) ?? false} cite=${/\([A-Z][a-zA-Z'&]+[^)]*\d{4}/.test(window)}`,
    );
  }
}

console.log("\n--- Penalties ---");
const row2Zero = countPatternHits(open, ROW2_ZERO_CONTEXT_PATTERNS);
const unsub = countPatternHits(open, UNSUBSTANTIATED_CONTEXT_PATTERNS);
console.log({
  ROW2_ZERO_CONTEXT: row2Zero,
  UNSUBSTANTIATED_CONTEXT: unsub,
  penalties: `-${Math.min(2, row2Zero)} -${Math.min(2, unsub)}`,
});

const floor3 = countPatternHitsInSlice(open, STATISTICAL_URGENCY_PATTERNS, 3500) >= 1;

console.log("\n--- Score reconstruction ---");
const manual =
  highPts +
  medPts +
  statHits +
  narrPts +
  citeRqBonus +
  rqPctBonus -
  Math.min(2, row2Zero) -
  Math.min(2, unsub);
const final = floor3 ? Math.max(manual, 3) : manual;
console.log({
  highPts,
  medPts,
  statHits,
  narrPts_capped: narrPts,
  citeRqBonus,
  rqPctBonus,
  manualBeforeFloor: manual,
  statFloor_applied: floor3,
  reconstructed: final,
  engine_computeSpecificityScore: computeSpecificityScore(bodyText, rqKeywords),
  engine_evidence_specificityScore: e.specificityScore,
});

console.log("\n--- substantiatedRqContextCount (first 2500 chars ONLY) ---");
console.log({
  count: countSubstantiatedRqContext(bodyText, rqKeywords),
  rqContextLinkInOpening: rqContextLinkInOpening(bodyText, rqKeywords),
  note: "Row 2 passes if specificity≥4 AND (substantiated≥1 OR rqContextLinked)",
});

console.log("\n--- Innocence Project % stats in Figure block ---");
const figStart = bodyText.indexOf("Figure 1");
if (figStart >= 0) {
  const fig = bodyText.slice(figStart, figStart + 800);
  console.log({
    in_combinedScan: figStart < open.length,
    in_substantiated2500: figStart < 2500,
    excerpt: fig.slice(0, 280).replace(/\s+/g, " "),
  });
}

console.log("");
