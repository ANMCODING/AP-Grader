/**
 * Component timing profile for p05 (and optional p11).
 * Run: npx tsx scripts/profile-p05-components.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { partitionSeminarText, stripSeminarBoilerplate } from "@/lib/seminar/seminarBodyPrep";
import {
  analyzeBibliographySources,
  countAnalysisDepth,
  countBibliographyEntries,
  extractInTextAuthors,
  getBibliographyAnalysis,
  clearBibliographyAnalysisCache,
} from "@/lib/seminar/seminarBibliographyAnalysis";
import { classifyBibliographyEntry } from "@/lib/seminar/seminarBibliographyClassifier";
import {
  analyzeAcademicRegister,
  analyzeCommentaryStructure,
  bodyTextForStyleScan,
  computeSpecificityScore,
} from "@/lib/seminar/seminarDeepCalibration";
import { extractResearchQuestionKeywords } from "@/lib/seminar/seminarPatterns";
import { buildBodyTextIndex } from "@/lib/seminar/seminarBodyIndex";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

function ms(start: number): string {
  return `${(performance.now() - start).toFixed(1)}ms`;
}

function loadPaper(name: string): { body: string; refs: string } {
  const raw = readFileSync(
    join(process.cwd(), "data/batch-iwa-papers", name),
    "utf8",
  );
  const { bodyText, referencesText } = partitionSeminarText(
    stripSeminarBoilerplate(raw).text,
  );
  return { body: bodyText, refs: referencesText };
}

function profileBib(body: string, refs: string): void {
  console.log("\n=== getBibliographyAnalysis (p05) ===\n");
  clearBibliographyAnalysisCache();

  let t = performance.now();
  const cacheHit = getBibliographyAnalysis(body, refs);
  console.log(`first call (miss): ${ms(t)} entries=${cacheHit.totalEntries}`);

  t = performance.now();
  getBibliographyAnalysis(body, refs);
  console.log(`second call (cache hit): ${ms(t)}`);

  const entries = countBibliographyEntries(refs);
  console.log(`entry count: ${entries.length}`);

  t = performance.now();
  for (const e of entries) classifyBibliographyEntry(e);
  console.log(`classifyBibliographyEntry all (${entries.length}): ${ms(t)}`);

  if (entries.length > 0) {
    const per = performance.now();
    classifyBibliographyEntry(entries[0]!);
    console.log(`classifyBibliographyEntry single: ${ms(per)}`);
  }

  t = performance.now();
  extractInTextAuthors(body);
  console.log(`extractInTextAuthors: ${ms(t)}`);

  t = performance.now();
  countAnalysisDepth(body);
  console.log(`countAnalysisDepth: ${ms(t)}`);

  t = performance.now();
  analyzeBibliographySources(body, refs);
  console.log(`analyzeBibliographySources (uncached): ${ms(t)}`);
}

function profileRegister(body: string): void {
  console.log("\n=== analyzeAcademicRegister (p05) ===\n");
  let t = performance.now();
  const stripped = bodyTextForStyleScan(body);
  console.log(`bodyTextForStyleScan: ${ms(t)} len=${stripped.length}`);

  t = performance.now();
  analyzeAcademicRegister(body, "iwa");
  console.log(`analyzeAcademicRegister total: ${ms(t)}`);
}

function profileCommentary(body: string, paragraphs: string[]): void {
  console.log("\n=== analyzeCommentaryStructure ===\n");
  let t = performance.now();
  analyzeCommentaryStructure(body);
  console.log(`without index paragraphs: ${ms(t)}`);

  t = performance.now();
  analyzeCommentaryStructure(body, paragraphs);
  console.log(`with index paragraphs (${paragraphs.length}): ${ms(t)}`);
}

function profileSpecificity(body: string): void {
  console.log("\n=== computeSpecificityScore ===\n");
  const rq = extractResearchQuestionKeywords(body);
  const t = performance.now();
  computeSpecificityScore(body, rq);
  console.log(`computeSpecificityScore: ${ms(t)}`);
}

function main(): void {
  const paper = process.argv[2] ?? "p05-ubi-norberg.txt";
  const { body, refs } = loadPaper(paper);
  const index = buildBodyTextIndex(body, 7000);

  console.log(`Paper: ${paper}  bodyWords≈${index.wordCount}  bodyChars=${body.length}`);

  let t = performance.now();
  gradeIwa(readFileSync(join(process.cwd(), "data/batch-iwa-papers", paper), "utf8"));
  console.log(`\nfull gradeIwa: ${ms(t)}`);

  profileBib(body, refs);
  profileRegister(body);
  profileCommentary(body, index.paragraphs);
  profileSpecificity(body);
}

main();
