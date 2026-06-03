/**
 * Create a text PDF from paper24, extract via API, and optionally grade.
 * Run: npm run dev, then node scripts/test-pdf-upload.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAPER24 = readFileSync(
  join(process.cwd(), "data/test-papers/paper24-ap-biology-retrieval.txt"),
  "utf-8",
);
const PDF_PATH = join(process.cwd(), "tmp/paper24-test.pdf");

async function createPdfFromText(text) {
  mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  await page.setContent(
    `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;font-size:11pt;line-height:1.4;white-space:pre-wrap;margin:1in">${escaped}</body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  await page.pdf({
    path: PDF_PATH,
    format: "Letter",
    margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
    printBackground: true,
  });
  await browser.close();
  console.log(`Created PDF: ${PDF_PATH}`);
}

async function extractViaApi() {
  const pdfBytes = readFileSync(PDF_PATH);
  const form = new FormData();
  form.append(
    "file",
    new Blob([pdfBytes], { type: "application/pdf" }),
    "paper24-test.pdf",
  );

  const res = await fetch(`${BASE}/api/extract-pdf`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `extract-pdf failed: ${res.status}`);
  }
  return data;
}

async function gradeText(text) {
  const res = await fetch(`${BASE}/api/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "grade failed");
  return data;
}

async function main() {
  await createPdfFromText(PAPER24);

  const extracted = await extractViaApi();
  console.log("\n--- PDF extraction (pdf-parse v2) ---");
  console.log(`Extracted words: ${extracted.wordCount}`);
  console.log(`Two-column flag: ${extracted.possibleTwoColumn}`);
  console.log(`Pass (≥3500 words): ${extracted.wordCount >= 3500}`);

  const report = await gradeText(extracted.text);
  const overall = report.overallLabel ?? "unknown";
  const bodyWords = report.wordCount ?? 0;
  console.log("\n--- Grade report ---");
  console.log(`Overall: ${overall}`);
  console.log(`Body words (report): ${bodyWords}`);
  console.log(`Incomplete warning: ${Boolean(report.incompleteSubmissionWarning)}`);

  const withinOneBand =
    overall === "Mid 5" ||
    overall === "Low 5" ||
    overall === "High 5" ||
    overall === "Low 4" ||
    overall === "High 4";
  console.log(`Within one band of Mid 5: ${withinOneBand}`);

  process.exit(extracted.wordCount >= 3500 && withinOneBand ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
