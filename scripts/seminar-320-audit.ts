/**
 * Preliminary audits 1–10 for seminar-3.2.0 (read-only report).
 * Run: npx tsx scripts/seminar-320-audit.ts
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { isCoverAuthorNameLine } from "@/lib/grader/textNormalize";
import { gradeIwa, gradeSeminarPaper } from "@/lib/seminar";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";
import { getBibliographyAnalysis } from "@/lib/seminar/seminarBibliographyAnalysis";
import { classifyBibliographyEntry } from "@/lib/seminar/seminarBibliographyClassifier";
import { analyzeAcademicRegister } from "@/lib/seminar/seminarDeepCalibration";
import {
  CONCLUSION_ALIGNMENT_PATTERNS,
  detectThesis,
} from "@/lib/seminar/seminarThesisDetection";
import {
  COLLOQUIAL_SEVERITY_2_PATTERNS,
} from "@/lib/seminar/seminarIwaPhrasePatterns";
import { STRONG_COUNTERCLAIM_PATTERNS } from "@/lib/seminar/seminarCounterclaimPatterns.generated";
import { buildCombinedRegexChunks } from "@/lib/seminar/seminarPatternScan";
import { BIBLIOGRAPHY_HEADING_PATTERNS } from "@/lib/seminar/seminarPatterns";

const ROOT = process.cwd();
const GOLDEN_JSON = join(ROOT, "data/seminar/golden-batch-iwa.json");
const GOLDEN_BATCH = join(ROOT, "data/batch-iwa-papers");
const REGRESSION = join(ROOT, "data/seminar-samples/iwa");
const PASTED = join(ROOT, "data/pasted-iwa");

function loadTxt(dir: string, name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

function rowScores(r: ReturnType<typeof gradeIwa>): string {
  return r.rows.map((x) => x.score).join("+");
}

function gradeSample(path: string, task: "iwa" | "irr" = "iwa") {
  const text = readFileSync(path, "utf8");
  const r =
    task === "iwa"
      ? gradeIwa(text, { isOfficialSample: true })
      : gradeSeminarPaper(text, "irr");
  const ev = buildSeminarEvidence(text);
  return { text, result: r, evidence: ev };
}

console.log("=== AUDIT 1 — Pipeline trace (summary) ===\n");
console.log(`Paste path:
  gradeIwa(raw) → prepareSeminarSubmissionMetrics(raw)
    → stripSeminarBoilerplate: prepareSeminarText → stripCoverPageLines → stripSeminarRunningHeadersAndNoise
    → partitionSeminarText → splitBodyAndReferences
  → buildSeminarEvidence(text) [re-strips via same prep internally]
  → scoreIwaRows

PDF path (client):
  extract-pdf → cleanPdfExtractedText (stripCoverPageLines ONCE at line 348)
  → POST /api/grade → gradePaper (Research cleanDocument stripCoverPageLines again for Research only)
  Seminar paste/PDF text to gradeIwa: stripCoverPageLines again in stripSeminarBoilerplate (second strip if PDF was pre-cleaned for Research path only; Seminar gradeIwa always strips once on received text)

stripSeminarRunningHeadersAndNoise: does NOT strip Title Case names or bib headings — only running heads, page nums, appendices.
joinSoftLineBreaks (seminarTextPrep): STOPS merge before Works Cited|References|Bibliography|Sources lines.
stitchSplitCitations: only joins (Author, \\n Year) inside parenthetical cites — does not modify bib entries.
`);

console.log("=== AUDIT 2 — seminarBibliographyAnalysis vs classifier ===\n");
console.log(`Analysis: entry counts, in-text linkage, commentary depth, aggregates tier1/credibility from classifyBibliographyEntry per entry.
Classifier: per-entry tier 0–3, credibility points, isScholarly, isJunk.
Analysis CALLS classifier (getBibliographyAnalysis → classifyBibliographyEntry). Legacy JOURNAL_ENTRY/DOI_ENTRY/GOV_ENTRY in analysis are supplementary heuristics for commentary, not separate tier scoring.`);

console.log("\n=== AUDIT 3 — seminarHardCaps Row 5/6 ===\n");
console.log(`row6NoBibliography: !bibliographyPresent → Row 6 = 0
row5UrlOnly + in-text<2: urlOnlyBibliography OR (beyondStimulusWellVetted<1 AND totalCredibility<4) → Row 5 = 0
allZeros: exploratory + !thesis + cites<2 OR !bibliography + !thesis + cites<12
After bib fix on Paper 1: bibliographyPresent true, urlOnly false → Row 5/6 caps do not zero.`);

const scCombined = buildCombinedRegexChunks(STRONG_COUNTERCLAIM_PATTERNS);
console.log("\n=== AUDIT 4 — STRONG_COUNTERCLAIM_COMBINED ===\n");
console.log(
  `Defined in seminarDeepCalibration.ts via buildCombinedRegexChunks(STRONG_COUNTERCLAIM_PATTERNS) — ${STRONG_COUNTERCLAIM_PATTERNS.length} patterns → ${scCombined.length} combined chunks. Used in countPatternHitsWithCombined / analyzeCommentaryStructure. Rebuilt automatically when generated array regenerates.`,
);

function reportBibTable(label: string, dir: string, files: string[]) {
  console.log(`\n=== ${label} ===\n`);
  console.log("Sample".padEnd(28), "bibPresent", "R5", "R6", "total");
  for (const f of files.sort()) {
    const { result, evidence } = gradeSample(join(dir, f));
    const r5 = result.rows.find((r) => r.id === "row5_sources")?.score ?? 0;
    const r6 = result.rows.find((r) => r.id === "row6_bibliography")?.score ?? 0;
    console.log(
      f.padEnd(28),
      String(evidence.bibliographyPresent).padEnd(10),
      String(r5).padEnd(4),
      String(r6).padEnd(4),
      String(result.total),
    );
  }
}

const goldenFiles = (
  JSON.parse(readFileSync(GOLDEN_JSON, "utf8")) as { file: string }[]
).map((g) => g.file);
const regFiles = readdirSync(REGRESSION).filter((f) => f.endsWith(".txt"));

reportBibTable("AUDIT 5 — Golden batch", GOLDEN_BATCH, goldenFiles);
reportBibTable("AUDIT 6 — Regression IWA", REGRESSION, regFiles);

console.log("\n=== AUDIT 7 — Paper 1 Row 5 simulation ===\n");
const p1 = loadTxt(PASTED, "paper1-algorithmic.txt");
const m1 = prepareSeminarSubmissionMetrics(p1);
const ev1 = buildSeminarEvidence(p1);
const bib1 = getBibliographyAnalysis(m1.bodyText, m1.referencesText);
console.log({
  bibliographyPresent: ev1.bibliographyPresent,
  totalCredibilityPoints: ev1.totalCredibilityPoints,
  scholarlyRatio: bib1.scholarlyRatio,
  tier1SourceCount: ev1.tier1SourceCount,
  beyondStimulusWellVettedCount: ev1.beyondStimulusWellVettedCount,
  row5: gradeIwa(p1).rows.find((r) => r.id === "row5_sources")?.score,
  row6: gradeIwa(p1).rows.find((r) => r.id === "row6_bibliography")?.score,
});

console.log("\n=== AUDIT 8 — Paper 1 colloquial SEV2 hits ===\n");
const body1 = m1.bodyText;
const hits: { pattern: string; match: string; context: string }[] = [];
for (const p of COLLOQUIAL_SEVERITY_2_PATTERNS) {
  const re = new RegExp(p.source, p.flags);
  let m: RegExpExecArray | null;
  const testRe = new RegExp(p.source, p.flags);
  while ((m = testRe.exec(body1)) !== null) {
    const start = Math.max(0, m.index - 40);
    const end = Math.min(body1.length, m.index + m[0].length + 40);
    hits.push({
      pattern: p.source.slice(0, 60),
      match: m[0],
      context: body1.slice(start, end).replace(/\n/g, " "),
    });
    if (hits.length > 80) break;
  }
  if (hits.length > 80) break;
}
const reg = analyzeAcademicRegister(body1, "iwa");
console.log(`colloquialSeverity: ${reg.colloquialSeverity}, distinct SEV2 pattern hits (sample): ${hits.length}`);
for (const h of hits.slice(0, 25)) {
  console.log(`  [${h.match}] /${h.pattern}/ …${h.context}…`);
}

console.log("\n=== AUDIT 9 — Paper 2 conclusion alignment ===\n");
const p2 = loadTxt(PASTED, "paper2-ubi.txt");
const m2 = prepareSeminarSubmissionMetrics(p2);
const thesis2 = detectThesis(m2.bodyText);
const conclusion = m2.bodyText.slice(-4000);
console.log(`conclusionAligned: ${thesis2.conclusionAligned}`);
const missed: string[] = [];
for (const p of CONCLUSION_ALIGNMENT_PATTERNS) {
  if (p.test(conclusion)) console.log(`  MATCH: /${p.source}/`);
}
const phrases = [
  "in answer to the research question",
  "this paper concludes that",
  "returning to the research question",
  "the evidence demonstrates that",
  "ultimately, this paper",
  "therefore, this paper argues",
];
for (const ph of phrases) {
  if (conclusion.toLowerCase().includes(ph)) missed.push(`(in text, no pattern) ${ph}`);
}
console.log("Phrases in conclusion without pattern:", missed);

console.log("\n=== AUDIT 10 — Whitelist quick check ===\n");
for (const line of ["Works Cited", "Bib", "Refs", "Nadia Carry", "Eli Pariser"]) {
  console.log(`  isCoverAuthorNameLine("${line}"): ${isCoverAuthorNameLine(line)}`);
}

console.log("\nPattern counts:", {
  BIBLIOGRAPHY_HEADING_PATTERNS: BIBLIOGRAPHY_HEADING_PATTERNS.length,
  STRONG_COUNTERCLAIM_PATTERNS: STRONG_COUNTERCLAIM_PATTERNS.length,
  CONCLUSION_ALIGNMENT_PATTERNS: CONCLUSION_ALIGNMENT_PATTERNS.length,
});
