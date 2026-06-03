import "@/lib/synthetic/disableClaude";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { GradingResultsFile, SyntheticManifest } from "@/lib/synthetic/types";

const CORPUS = join(process.cwd(), "data/synthetic-papers");
const ERR_DIR = join(process.cwd(), "data/error-patterns");

interface ErrorCategory {
  category: string;
  frequency: number;
  severity: number;
  impact: number;
  papers: string[];
  detail: string;
}

function latestGrades(): GradingResultsFile {
  const p = join(CORPUS, "grading-results-latest.json");
  if (!existsSync(p)) throw new Error("Run grade:synthetic first");
  return JSON.parse(readFileSync(p, "utf-8")) as GradingResultsFile;
}

function main(): void {
  const grades = latestGrades();
  const manifest = JSON.parse(
    readFileSync(join(CORPUS, "manifest.json"), "utf-8"),
  ) as SyntheticManifest;
  const byFile = new Map(manifest.papers.map((p) => [p.file, p]));
  const total = grades.totalGraded;
  const cats: ErrorCategory[] = [];

  const add = (category: string, file: string, bandDist: number, detail: string) => {
    let row = cats.find((c) => c.category === category);
    if (!row) {
      row = { category, frequency: 0, severity: 0, impact: 0, papers: [], detail };
      cats.push(row);
    }
    row.frequency++;
    row.severity += bandDist;
    row.papers.push(file);
  };

  for (const rec of grades.records) {
    const spec = byFile.get(rec.file);
    if (!spec) continue;
    const dist = Math.abs(rec.predictedAP - rec.expectedAP);

    if (spec.plannedNonExecution && !rec.manifestFlagsMatchedToFiredCaps["hard-non-execution"]) {
      add("Hard non-execution phrases not detected", rec.file, dist, "plannedNonExecution true but hard cap missing");
    }
    if (spec.lacksStudentData && !rec.manifestFlagsMatchedToFiredCaps["no-student-data"]) {
      add("No-student-data cap not fired", rec.file, dist, "lacksStudentData expected true");
    }
    if (!spec.lacksStudentData && rec.manifestFlagsMatchedToFiredCaps["no-student-data"]) {
      add("No-student-data false positive", rec.file, dist, "lacksStudentData expected false");
    }
    if (spec.futureTenseMethod && !rec.manifestFlagsMatchedToFiredCaps["future-tense-method"]) {
      add("Future-tense method not detected", rec.file, dist, "futureTenseMethod expected true");
    }
    if (spec.synthesizedGraphsOnly && rec.manifestFlagsMatchedToFiredCaps["no-student-data"]) {
      add("Synthesized graphs not recognized", rec.file, dist, "synthesizedGraphsOnly true but lacks cap fired");
    }
    if (dist >= 2) {
      add("Calibration / score mismatch (2+ bands)", rec.file, dist, `anchor calibration mismatch exp ${rec.expectedAP} got ${rec.predictedAP}`);
    }
    if (rec.expectedAP <= 2) {
      const focus = rec.allFiveCategoryScores["Focus and Scope"];
      if (focus && bandTierHigh(focus.band, focus.tier)) {
        add("Focus inflation on low-score papers", rec.file, dist, `Focus ${focus.label}`);
      }
    }
    if (rec.bodyToOriginalRatio < 80) {
      add("Completeness failures", rec.file, dist, `ratio ${rec.bodyToOriginalRatio}%`);
    }
    for (const cap of spec.expectedCaps) {
      if (rec.manifestFlagsMatchedToFiredCaps[cap] === false) {
        add(`Expected cap missing: ${cap}`, rec.file, dist, cap);
      }
    }
    if (!rec.withinOneBand) {
      add("Overall within-one-band failure", rec.file, dist, `expected ${rec.expectedAP} got ${rec.predictedAP}`);
    }
  }

  for (const c of cats) {
    c.frequency = c.frequency / total;
    c.severity = c.papers.length ? c.severity / c.papers.length : 0;
    c.impact = Math.round(c.frequency * c.severity * 1000) / 10;
  }
  cats.sort((a, b) => b.impact - a.impact);

  mkdirSync(ERR_DIR, { recursive: true });
  const out = join(ERR_DIR, `error-report-${Date.now()}.json`);
  writeFileSync(
    out,
    JSON.stringify({ generatedAt: new Date().toISOString(), ranked: cats, total }, null, 2),
  );

  console.log("\n=== Error patterns (by impact) ===\n");
  for (const c of cats.slice(0, 10)) {
    console.log(`${c.impact.toFixed(1)}\t${c.category} (${c.papers.length} papers)`);
  }
  console.log(`\nSaved: ${out}`);
  if (cats[0]) console.log(`#1 priority: ${cats[0].category}`);
}

function bandTierHigh(band: number, tier: string): boolean {
  return band >= 3 && (tier === "High" || tier === "Mid");
}

main();
