/**
 * Signal-level probe across seminar calibration and official samples (read-only).
 * Usage:
 *   npx tsx scripts/seminar-diagnostic-probe.ts --output table
 *   npx tsx scripts/seminar-diagnostic-probe.ts --json > docs/seminar-probe-latest.json
 */
import fs from "node:fs";
import path from "node:path";
import { gradeIwa, gradeIrr } from "@/lib/seminar";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { isArgumentOrganized } from "@/lib/seminar/seminarThesisDetection";

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".txt")) acc.push(p);
  }
  return acc;
}

function buildTaskMap(): Map<string, "iwa" | "irr"> {
  const taskMap = new Map<string, "iwa" | "irr">();
  const targetFiles = [
    "data/seminar/batch1-targets.json",
    "data/seminar/batch2-targets.json",
    "data/seminar/batch3-targets.json",
    "data/seminar/golden-batch-iwa.json",
    "data/seminar/golden-batch-irr.json",
  ];
  for (const targetFile of targetFiles) {
    const full = path.join(process.cwd(), targetFile);
    if (!fs.existsSync(full)) continue;
    const raw = JSON.parse(fs.readFileSync(full, "utf8")) as
      | { papers?: { file?: string; path?: string; task?: string }[] }
      | { file?: string; path?: string; task?: string }[];
    const papers = Array.isArray(raw) ? raw : (raw.papers ?? []);
    for (const paper of papers) {
      const filename = path.basename(paper.file ?? paper.path ?? "");
      if (!filename) continue;
      const task: "iwa" | "irr" =
        paper.task === "irr" || paper.task === "iwa"
          ? paper.task
          : filename.startsWith("irr")
            ? "irr"
            : "iwa";
      taskMap.set(filename, task);
    }
  }
  return taskMap;
}

const TASK_MAP = buildTaskMap();

function resolveTask(filePath: string): "iwa" | "irr" {
  const filename = path.basename(filePath);
  if (/cb\d+_irr_/i.test(filename) || filename.startsWith("irr")) return "irr";
  if (/cb\d+_iwa_/i.test(filename) || filename.startsWith("iwa")) return "iwa";
  return TASK_MAP.get(filename) ?? "iwa";
}

function probeIwa(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const r = gradeIwa(text, {
    skipWordCountGates: true,
    isOfficialSample: file.includes("seminar-samples"),
  });
  const e = r.evidence;
  const organized =
    e.comparisonSignalCount >= 1 || isArgumentOrganized(e.bodyText);
  return {
    paper: path.basename(file),
    task: "iwa" as const,
    total: r.total,
    r4: r.rows.find((x) => x.id === "row4_argument")?.score ?? 0,
    r3: r.rows.find((x) => x.id === "row3_perspective")?.score ?? 0,
    depth: +e.commentaryDepthRatio.toFixed(3),
    struct: e.commentaryStructureScore,
    concl: e.conclusionAligned,
    org: organized,
    evalLink: e.evaluativeLinkingCount,
    named: e.namedPerspectiveCount,
    strongCC: e.strongCounterclaimEngaged,
    cred: e.totalCredibilityPoints,
    bibLink: +e.bibliographyLinkedRatio.toFixed(3),
  };
}

function probeIrr(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const r = gradeIrr(text, { skipWordCountGates: true });
  const e = r.evidence;
  return {
    paper: path.basename(file),
    task: "irr" as const,
    total: r.total,
    r1: r.rows.find((x) => x.id === "row1_context")?.score ?? 0,
    r2: r.rows.find((x) => x.id === "row2_argument")?.score ?? 0,
    rqLow: e.irrRqSpecificityLow,
    methCount: e.irrMethodologySignalCount,
    depth: null,
    struct: null,
    concl: null,
    org: null,
    evalLink: null,
    named: null,
    strongCC: null,
  };
}

function collectFiles(): string[] {
  const cli = process.argv.filter(
    (a) => !a.startsWith("-") && a.endsWith(".txt"),
  );
  if (cli.length > 0) {
    return cli.map((f) => path.resolve(process.cwd(), f));
  }
  const dirs = [
    "data/seminar-samples/iwa",
    "data/seminar-samples/irr",
    "data/seminar/batch1-calibration",
    "data/seminar/batch2-calibration",
    "data/seminar/batch3-calibration",
    "data/batch-iwa-papers",
  ];
  const files = new Set<string>();
  for (const d of dirs) {
    for (const f of walk(path.join(process.cwd(), d))) files.add(f);
  }
  return [...files].sort();
}

function main(): void {
  const jsonOut = process.argv.includes("--json");
  const files = collectFiles();
  const rows = files.map((f) => {
    const task = resolveTask(f);
    return task === "irr" ? probeIrr(f) : probeIwa(f);
  });

  if (jsonOut) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log("\n=== IWA signal probe ===\n");
  console.log(
    "Paper".padEnd(36) +
      "Tot".padEnd(5) +
      "R4".padEnd(4) +
      "depth".padEnd(7) +
      "struct".padEnd(7) +
      "concl".padEnd(7) +
      "org".padEnd(6) +
      "R3".padEnd(4) +
      "eval".padEnd(5) +
      "named".padEnd(6) +
      "cred".padEnd(5) +
      "bib",
  );
  for (const x of rows.filter((r) => r.task === "iwa")) {
    console.log(
      `${x.paper.padEnd(36)}${String(x.total).padEnd(5)}${String(x.r4).padEnd(4)}${String(x.depth).padEnd(7)}${String(x.struct).padEnd(7)}${String(x.concl).padEnd(7)}${String(x.org).padEnd(6)}${String(x.r3).padEnd(4)}${String(x.evalLink).padEnd(5)}${String(x.named).padEnd(6)}${String(x.cred).padEnd(5)}${x.bibLink}`,
    );
  }

  console.log("\n=== IRR signal probe ===\n");
  console.log(
    "Paper".padEnd(36) +
      "Tot".padEnd(5) +
      "R1".padEnd(4) +
      "R2".padEnd(4) +
      "rqLow".padEnd(7) +
      "meth",
  );
  for (const x of rows.filter((r) => r.task === "irr")) {
    console.log(
      `${x.paper.padEnd(36)}${String(x.total).padEnd(5)}${String(x.r1).padEnd(4)}${String(x.r2).padEnd(4)}${String(x.rqLow).padEnd(7)}${x.methCount}`,
    );
  }
}

main();
