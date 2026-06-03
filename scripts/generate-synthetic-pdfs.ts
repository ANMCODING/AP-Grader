// @ts-nocheck
import { readFileSync, mkdirSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const CORPUS = join(process.cwd(), "data/synthetic-papers");
const PDF_DIR = join(CORPUS, "pdfs");

async function main(): Promise<void> {
  let PDFDocument: typeof import("pdf-lib").PDFDocument;
  let StandardFonts: typeof import("pdf-lib").StandardFonts;
  let rgb: typeof import("pdf-lib").rgb;
  try {
    const lib = await import("pdf-lib");
    PDFDocument = lib.PDFDocument;
    StandardFonts = lib.StandardFonts;
    rgb = lib.rgb;
  } catch {
    console.error("Run: npm install pdf-lib");
    process.exit(1);
  }

  mkdirSync(PDF_DIR, { recursive: true });
  const files = readdirSync(CORPUS).filter((f) => f.endsWith(".txt"));
  for (const file of files) {
    const raw = readFileSync(join(CORPUS, file), "utf-8");
    const title = raw.split("\n")[0]?.slice(0, 60) ?? "AP Research Paper";
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pageSize: [number, number] = [612, 792];
    const margin = 72;
    const lineH = 14;
    let page = doc.addPage(pageSize);
    let y = pageSize[1] - margin;

    const drawLine = (text: string, isHeading = false) => {
      if (y < margin + lineH) {
        page = doc.addPage(pageSize);
        y = pageSize[1] - margin;
        if (doc.getPageCount() > 1) {
          page.drawText(`${title} — ${doc.getPageCount()}`, {
            x: margin,
            y: pageSize[1] - 40,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
        }
      }
      const f = isHeading ? bold : font;
      const size = isHeading ? 14 : 12;
      page.drawText(text.slice(0, 90), { x: margin, y, size, font: f });
      y -= lineH + (isHeading ? 4 : 0);
    };

    drawLine(title, true);
    drawLine("AP Research", true);
    drawLine("April 2025");
    const wc = raw.match(/Word Count: approximately ([\d,]+)/i);
    if (wc) drawLine(`Word Count: ${wc[1]}`);
    page = doc.addPage(pageSize);
    y = pageSize[1] - margin;

    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) {
        y -= 6;
        continue;
      }
      const heading = /^(Introduction|Literature Review|Method|Results|Findings|Limitations|Implications|Conclusion|References)$/i.test(t);
      drawLine(t, heading);
    }

    const pdfBytes = await doc.save();
    writeFileSync(join(PDF_DIR, file.replace(".txt", ".pdf")), pdfBytes);
  }
  console.log(`Wrote ${files.length} PDFs to ${PDF_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
