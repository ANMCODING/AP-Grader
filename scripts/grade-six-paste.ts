import fs from "node:fs";
import path from "node:path";
import { gradeSeminarPaper, SEMINAR_GRADER_VERSION } from "@/lib/seminar";

const bundlePath =
  process.argv[2] ??
  path.join(process.cwd(), "data/seminar/_paste-grade/all-paste.txt");

const raw = fs.readFileSync(bundlePath, "utf8");
const blocks = raw
  .split(/={10,}/)
  .map((b) => b.trim())
  .filter((b) => b.length > 200);

type Spec = { task: "iwa" | "irr"; target: string; label: string };

function parseHeader(block: string): Spec | null {
  const m = block.match(
    /^\[?(IWA|IRR)\]?\s*\[TARGET:\s*([^\]]+)\]/im,
  );
  if (!m) return null;
  const topic = block.match(/\[[^\]]+\]\s*\[(\d+)\s+WORDS\]\s*\[([^\]]+)\]/i);
  return {
    task: m[1]!.toLowerCase() as "iwa" | "irr",
    target: m[2]!.trim(),
    label: topic?.[2] ?? "unknown",
  };
}

console.log(`\n${SEMINAR_GRADER_VERSION} — production engine (no skipWordCountGates)\n`);

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i]!;
  const spec = parseHeader(block);
  if (!spec) {
    console.log(`Block ${i + 1}: could not parse header, skipping`);
    continue;
  }
  const bodyStart = block.search(/\n[A-Z][^\n]{10,}/);
  const text = bodyStart > 0 ? block.slice(bodyStart).trim() : block;
  const r = gradeSeminarPaper(text, spec.task);
  const rows = r.rows.map((x) => x.score);
  const max = spec.task === "iwa" ? 48 : 30;
  const inBand = checkBand(spec.target, r.total);

  console.log(`── ${spec.label} (${spec.task.toUpperCase()}) ──`);
  console.log(`Target band: ${spec.target}  →  Engine total: ${r.total}/${max}  ${inBand ? "✓ in target band" : "✗ outside target band"}`);
  console.log(`Rows: ${rows.join("+")}`);
  for (const row of r.rows) {
    console.log(`  R${row.id.replace(/\D/g, "") || "?"} ${row.name}: ${row.score}/${row.maxScore}`);
  }
  if (r.wordCountWarning) console.log(`  WC warning: ${r.wordCountWarning}`);
  if (r.wordCountGate) {
    console.log(
      `  WC gate: band=${r.wordCountGate.band} organic=[${r.wordCountGate.organicScores?.join("+")}] deduction=${r.wordCountGate.totalWordCountDeduction ?? 0}`,
    );
  }
  console.log();
}

function checkBand(target: string, total: number): boolean {
  const m = target.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return false;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  return total >= lo && total <= hi;
}
