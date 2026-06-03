/**
 * Build EXTENDED_CALIBRATION_PAPERS from official College Board sample packets.
 * Run: npx tsx scripts/build-calibration-anchors.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { buildStudentProfile } from "../lib/grader/calibration";
import { collectEvidence } from "../lib/grader/evidence";
import { makeBand } from "../lib/grader/format";
import {
  listOfficialSampleFiles,
  loadOfficialSamplePaper,
  OFFICIAL_SAMPLE_SCORES,
} from "../lib/grader/sampleCorpus";
import { scoreAllCategories, scoreOverall } from "../lib/grader/scoring";

const samplesDir = join(process.cwd(), "data/samples");

function defaultCategoryAnchors(score: 1 | 2 | 3 | 4 | 5) {
  const map: Record<number, ReturnType<typeof makeBand>[]> = {
    1: [makeBand(1, "Low"), makeBand(1, "Low"), makeBand(1, "Low"), makeBand(1, "Low"), makeBand(2, "Low")],
    2: [makeBand(2, "Low"), makeBand(2, "Mid"), makeBand(2, "Low"), makeBand(2, "Low"), makeBand(3, "Low")],
    3: [makeBand(3, "Mid"), makeBand(3, "Mid"), makeBand(3, "Mid"), makeBand(3, "Mid"), makeBand(3, "Mid")],
    4: [makeBand(4, "Mid"), makeBand(4, "Mid"), makeBand(4, "High"), makeBand(4, "Mid"), makeBand(4, "Mid")],
    5: [makeBand(5, "High"), makeBand(5, "High"), makeBand(5, "High"), makeBand(5, "Mid"), makeBand(5, "Mid")],
  };
  return map[score];
}

const lines: string[] = [
  `import { makeBand } from "@/lib/grader/format";`,
  `import type { CalibrationPaper } from "@/lib/grader/calibrationPapers";`,
  ``,
  `export const EXTENDED_CALIBRATION_PAPERS: CalibrationPaper[] = [`,
];

const HAND_TUNED = new Set([
  "2025-sample-a",
  "2025-sample-d",
  "2025-sample-e",
  "2025-sample-h",
  "2025-sample-i",
]);

for (const filePath of listOfficialSampleFiles(samplesDir)) {
  const id = filePath.split(/[/\\]/).pop()!.replace(".txt", "");
  if (HAND_TUNED.has(id)) continue;

  const { text, fileName, officialScore } = loadOfficialSamplePaper(filePath);
  const { evidence, categories } = scoreAllCategories(text);
  const profile = buildStudentProfile(evidence);
  const overall = scoreOverall(categories);
  const letter = id.match(/sample-([a-j])$/)?.[1]?.toUpperCase() ?? "?";
  const year = id.startsWith("ap23") ? "2023" : id.startsWith("ap24") ? "2024" : "2025";

  lines.push(`  {`);
  lines.push(`    id: "${id}",`);
  lines.push(`    sampleLabel: "${year} Sample ${letter}",`);
  lines.push(`    officialApScore: ${officialScore},`);
  lines.push(`    title: "${fileName}",`);
  lines.push(`    discipline: "Official sample",`);
  lines.push(`    features: {`);
  lines.push(`      executedMethod: ${profile.executedMethod},`);
  lines.push(`      hasStudentData: ${profile.hasStudentData},`);
  lines.push(`      litSynthesis: ${profile.litSynthesis},`);
  lines.push(`      litIsolation: ${profile.litIsolation},`);
  lines.push(`      methodDefended: ${profile.methodDefended},`);
  lines.push(`      sophisticatedLimitations: ${profile.sophisticatedLimitations},`);
  lines.push(`      practicalLimitationsOnly: ${profile.practicalLimitationsOnly},`);
  lines.push(`      strongImplications: ${profile.strongImplications},`);
  lines.push(`      statisticalAnalysis: ${profile.statisticalAnalysis},`);
  lines.push(`      gapExplicit: ${profile.gapExplicit},`);
  lines.push(`      methodNotExecuted: ${profile.methodNotExecuted},`);
  lines.push(`    },`);
  lines.push(`    categoryAnchors: [`);
  for (const c of categories.length ? categories : defaultCategoryAnchors(officialScore)) {
    lines.push(`      makeBand(${c.band}, "${c.tier}"),`);
  }
  lines.push(`    ],`);
  lines.push(`  },`);
}

lines.push(`];`);

const outPath = join(process.cwd(), "lib/grader/calibrationAnchorsExtended.ts");
writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`Wrote ${outPath} (${lines.length} lines)`);
