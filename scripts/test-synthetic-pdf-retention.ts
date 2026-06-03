// @ts-nocheck
import "@/lib/synthetic/disableClaude";
import { readFileSync, existsSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import { extractPdfFromBuffer } from "@/lib/server/pdfExtract";

const CORPUS = join(process.cwd(), "data/synthetic-papers");
const PDF_DIR = join(CORPUS, "pdfs");
const OUT = join(CORPUS, "pdf-retention-results.json");

async function main(): Promise<void> {
  if (!existsSync(PDF_DIR)) {
    console.error("Run: npx tsx scripts/generate-synthetic-pdfs.ts");
    process.exit(1);
  }

  const pdfs = readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"));
  const rows: {
    file: string;
    pasteBodyWords: number;
    pdfBodyWords: number;
    retentionPct: number;
  }[] = [];

  for (const pdf of pdfs) {
    const txt = pdf.replace(".pdf", ".txt");
    const textPath = join(CORPUS, txt);
    if (!existsSync(textPath)) continue;
    const raw = readFileSync(textPath, "utf-8");
    const paste = prepareGradingInput(raw);
    const buffer = readFileSync(join(PDF_DIR, pdf));
    const extracted = await extractPdfFromBuffer(buffer);
    const pdfBody = prepareGradingInput(extracted.text).partition.bodyWordCount;
    const pasteBody = paste.partition.bodyWordCount;
    const retentionPct = pasteBody > 0 ? Math.round((pdfBody / pasteBody) * 1000) / 10 : 0;
    rows.push({ file: txt, pasteBodyWords: pasteBody, pdfBodyWords: pdfBody, retentionPct });
  }

  const avg =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.retentionPct, 0) / rows.length) * 10) / 10
      : 0;
  const below = rows.filter((r) => r.retentionPct < 80);

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        averageRetentionPct: avg,
        below80Count: below.length,
        below80: below.map((r) => r.file),
        rows,
      },
      null,
      2,
    ),
  );

  console.log(`Average retention: ${avg}%`);
  console.log(`Below 80%: ${below.length}`);
  if (below.length) {
    for (const b of below.slice(0, 10)) console.log(`  ${b.file} ${b.retentionPct}%`);
  }
  console.log(`Saved ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
