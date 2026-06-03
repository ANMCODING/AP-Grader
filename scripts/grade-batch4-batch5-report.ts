/**
 * Full engine grade + target-band analysis for batch 4 & 5.
 * Run: npx tsx scripts/grade-batch4-batch5-report.ts
 */
import fs from "node:fs";
import path from "node:path";
import { gradeSeminarPaper, SEMINAR_GRADER_VERSION } from "@/lib/seminar";

type TargetPaper = {
  file: string;
  task: "iwa" | "irr";
  label: string;
  totalBand: [number, number];
  claimedWords?: number;
  topic?: string;
};

type GradeRow = {
  id: string;
  name: string;
  score: number;
  maxScore: number;
};

function inBand(
  total: number,
  band: [number, number],
  tol: number,
): boolean {
  return total >= band[0] - tol && total <= band[1] + tol;
}

function iwaRowNotes(
  rows: GradeRow[],
  e: ReturnType<typeof gradeSeminarPaper>["evidence"],
): string[] {
  const r = Object.fromEntries(rows.map((x) => [x.id, x.score]));
  const notes: string[] = [];
  notes.push(
    `Thesis=${e.thesisPresent ? "yes" : "no"} opening=${e.thesisInOpening ? "yes" : "no"} concl=${e.conclusionAligned ? "yes" : "no"} expl=${e.exploratoryMode ? "yes" : "no"} bothSides=${e.bothSidesMode}@${e.bothSidesModeLocation ?? "n/a"}`,
  );
  notes.push(
    `R2 sig=${e.significanceFramingPresent} rqLink=${e.rqContextLinked} spec=${e.specificityScore} statUrg=${e.statisticalUrgencyCount} | R3 named=${e.namedPerspectiveCount} evalLink=${e.evaluativeLinkingCount}`,
  );
  notes.push(
    `R4 depth=${e.commentaryDepthRatio.toFixed(2)} struct=${e.commentaryStructureScore} | R5 cites=${e.inTextCitationCount} cred=${e.totalCredibilityPoints} | R6 link=${e.bibliographyLinkedRatio.toFixed(2)} miss=${e.missingFromBibliographyCount}`,
  );
  if (r.row4_argument === 0 && e.thesisPresent)
    notes.push("R4=0 despite thesis — organized/conclusion/exploratory gate.");
  if (r.row2_context === 0 && (e.significanceFramingPresent || (e.statisticalUrgencyCount >= 1 && e.rqContextLinked)))
    notes.push("R2=0 but context signals on — check IWA R2 paths.");
  if (e.exploratoryMode && !e.thesisPresent)
    notes.push("Exploratory/no thesis — expect R4=0; R2/R6/R7 may still score.");
  return notes;
}

function explainBandFit(
  total: number,
  band: [number, number],
  rows: number[],
  task: "iwa" | "irr",
): string[] {
  const [lo, hi] = band;
  const reasons: string[] = [];
  if (total < lo) {
    reasons.push(`Below band by ${lo - total} (target ${lo}-${hi}).`);
    if (task === "iwa") {
      const [r1, r2, r3, r4, r5, r6, r7] = rows;
      if (r4 === 0) reasons.push("R4=0 removes up to 12 pts — usual driver for low IWA.");
      if (r2 === 0) reasons.push("R2=0 removes up to 5 pts.");
      if (r3 <= 3 && r4 === 0) reasons.push("Weak R3+R4 cluster caps total.");
    } else {
      const [r1, r2, r3, r4, r5, r6] = rows;
      if (r2 <= 2) reasons.push("R2 low — methodology/explanation ratio.");
      if (r1 <= 2) reasons.push("R1 low — context/RQ specificity.");
    }
  } else if (total > hi) {
    reasons.push(`Above band by ${total - hi} (target ${lo}-${hi}).`);
    if (task === "iwa" && rows[3] >= 8)
      reasons.push("Strong R4 (+8/12) inflates total.");
    if (task === "iwa" && rows[2] >= 9)
      reasons.push("Strong R3 (+9/12) inflates total.");
  } else {
    reasons.push(`Within target band ${lo}-${hi}.`);
  }
  return reasons;
}

function irrRowNotes(
  rows: GradeRow[],
  e: ReturnType<typeof gradeSeminarPaper>["evidence"],
): string[] {
  const notes: string[] = [];
  notes.push(
    `rqLow=${e.irrRqSpecificityLow} rqLink=${e.rqContextLinked} meth=${e.irrMethodologySignalCount} explRatio=${e.irrExplanationRatio.toFixed(2)}`,
  );
  notes.push(
    `R1 ctx=${e.seminarContextScore} | R2 | R3 cred | R4 synth=${e.irrPerspectiveLensCount} | R5 cites=${e.inTextCitationCount} link=${e.bibliographyLinkedRatio.toFixed(2)}`,
  );
  if (e.irrRqSpecificityLow) notes.push("Weak/vague RQ pattern — caps R1.");
  if (e.irrMethodologySignalCount < 2)
    notes.push("Low methodology category count — may cap R2.");
  return notes;
}

function main(): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`BATCH 4 & 5 ENGINE REPORT — ${SEMINAR_GRADER_VERSION}`);
  console.log(`Mode: skipWordCountGates=true (calibration)`);
  console.log(`${"=".repeat(72)}\n`);

  for (const batch of [4, 5] as const) {
    const targets = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), `data/seminar/batch${batch}-targets.json`),
        "utf8",
      ),
    ) as { tolerance: number; papers: TargetPaper[] };
    const root = path.join(process.cwd(), `data/seminar/batch${batch}-calibration`);
    let pass = 0;

    console.log(`\n### BATCH ${batch} (tolerance ±${targets.tolerance})\n`);

    for (const p of targets.papers) {
      const text = fs.readFileSync(path.join(root, p.file), "utf8");
      const g = gradeSeminarPaper(text, p.task, {
        skipWordCountGates: true,
      });
      const rows = g.rows.map((r) => r.score);
      const rowStr = rows.join("+");
      const ok = inBand(g.total, p.totalBand, targets.tolerance);
      if (ok) pass++;

      const [lo, hi] = p.totalBand;
      const mid = Math.round((lo + hi) / 2);
      const diff = g.total - mid;
      const delta =
        diff === 0
          ? "on mid-band"
          : diff > 0
            ? `+${diff} vs mid (${mid})`
            : `${diff} vs mid (${mid})`;

      const rowLabels =
        p.task === "iwa"
          ? ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]
          : ["R1", "R2", "R3", "R4", "R5", "R6"];
      const rowDetail = g.rows
        .map((r, i) => `${rowLabels[i]}:${r.score}`)
        .join(" ");

      const notes =
        p.task === "iwa"
          ? iwaRowNotes(g.rows, g.evidence)
          : irrRowNotes(g.rows, g.evidence);

      const fitExplain = explainBandFit(g.total, p.totalBand, rows, p.task);

      const wcNote =
        g.bodyWordCount < 1800 && p.task === "iwa"
          ? [`Body ${g.bodyWordCount}w (below 1800 prod min; gates skipped).`]
          : [];

      console.log(`${ok ? "PASS" : "FAIL"} | ${p.label}`);
      console.log(`  File: ${p.file}`);
      const maxT = g.maxTotal;
      console.log(`  Target: ${lo}-${hi} → Engine: ${g.total}/${maxT} [${rowStr}]`);
      console.log(`  Body words (engine): ${g.bodyWordCount} (header claimed: ${p.claimedWords ?? "?"})`);
      console.log(`  Band fit: ${delta}`);
      for (const x of fitExplain) console.log(`  → ${x}`);
      console.log(`  Rows: ${rowDetail}`);
      for (const n of [...notes, ...wcNote]) console.log(`  · ${n}`);
      console.log("");
    }

    console.log(`Batch ${batch} summary: ${pass}/${targets.papers.length} within band\n`);
  }
}

main();
