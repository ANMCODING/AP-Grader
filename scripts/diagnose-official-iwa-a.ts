/**
 * Verbose row + signal diagnostic for official high-anchor IWA samples.
 * Run: npx tsx scripts/diagnose-official-iwa-a.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";

const SAMPLES = [
  { file: "ap23-iwa-sample-a.txt", year: 2023 },
  { file: "ap24-iwa-sample-a.txt", year: 2024 },
  { file: "ap25-iwa-sample-a.txt", year: 2025 },
];

const ROOT = path.join(process.cwd(), "data/seminar-samples/iwa");

function main(): void {
  for (const { file, year } of SAMPLES) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    const result = gradeIwa(text, { examYear: year, isOfficialSample: true });
    const e = buildSeminarEvidence(text, { examYear: year, isOfficialSample: true });
    const rows = result.rows.map((r) => r.score);
    console.log(`\n========== ${file} (official total 48) ==========`);
    console.log(
      `row1=${rows[0]} row2=${rows[1]} row3=${rows[2]} row4=${rows[3]} row5=${rows[4]} row6=${rows[5]} row7=${rows[6]} ENGINE_TOTAL=${result.total}`,
    );
    console.log("Key signals:");
    console.log(`  thesisPresent: ${e.thesisPresent}`);
    console.log(`  conclusionAligned: ${e.conclusionAligned}`);
    console.log(`  counterclaimPresent: ${e.counterclaimPresent}`);
    console.log(`  namedPerspectiveCount: ${e.namedPerspectiveCount}`);
    console.log(`  evaluativeLinkingCount: ${e.evaluativeLinkingCount}`);
    console.log(`  descriptiveLinkingCount: ${e.descriptiveLinkingCount}`);
    console.log(`  perspectiveIsolated: ${e.perspectiveIsolated}`);
    console.log(`  echoRatio: ${e.commentaryDepthRatio?.toFixed(3) ?? e.commentaryDepthRatio}`);
    console.log(`  commentaryStructureScore: ${e.commentaryStructureScore}`);
    console.log(`  strongCounterclaimEngaged: ${e.strongCounterclaimEngaged}`);
    console.log(`  specificityScore: ${e.specificityScore}`);
    console.log(`  row1DiagnosticIntegrationLevel: ${e.row1DiagnosticIntegrationLevel}`);
    console.log(`  row1Tangential: ${e.row1Tangential}`);
    console.log(`  totalCredibilityPoints: ${e.totalCredibilityPoints}`);
    console.log(`  tier1SourceCount: ${e.tier1SourceCount}`);
    console.log(`  scholarlyRatio: ${e.scholarlyRatio?.toFixed(3)}`);
    console.log(`  bibliographyPresent: ${e.bibliographyPresent}`);
    console.log(`  colloquialSeverity: ${e.colloquialSeverity}`);
    console.log(`  missingFromBibliographyCount: ${e.missingFromBibliographyCount}`);
  }
}

main();
