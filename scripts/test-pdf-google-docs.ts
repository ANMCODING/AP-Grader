/**
 * Google Docs–style PDF extraction corpus test (paper24 + running headers).
 * Run: npx tsx scripts/test-pdf-google-docs.ts
 * Also invoked from regression-all-samples.ts
 */
import { readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";
import { extractPdfFromBuffer } from "../lib/server/pdfExtract";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { simulateGoogleDocsPdfPlaintext } from "../lib/server/simulateGoogleDocsPdfText";

const PAPER24_PATH = join(
  process.cwd(),
  "data/test-papers/paper24-ap-biology-retrieval.txt",
);
const STATED_WORD_COUNT = 4876;
const MIN_BODY_WORDS = 3500;
const MIN_BODY_RATIO = 0.7;
const PDF_OUT = join(process.cwd(), "tmp/paper24-google-docs-sim.pdf");

export interface GoogleDocsPdfTestResult {
  pass: boolean;
  message: string;
  runningHeadersRemoved: number;
  bodyWords: number;
  bodyToStated: number;
  totalWordsExtracted: number;
}

async function plainTextToPdf(text: string, outPath: string): Promise<void> {
  mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  await page.setContent(
    `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.45;white-space:pre-wrap;margin:1in">${escaped}</body></html>`,
    { waitUntil: "domcontentloaded" },
  );
  await page.pdf({
    path: outPath,
    format: "Letter",
    margin: {
      top: "0.75in",
      bottom: "0.75in",
      left: "0.75in",
      right: "0.75in",
    },
    printBackground: true,
  });
  await browser.close();
}

export async function runGoogleDocsPdfCorpusTest(): Promise<GoogleDocsPdfTestResult> {
  const rawPaper = readFileSync(PAPER24_PATH, "utf-8");
  const simulated = simulateGoogleDocsPdfPlaintext(rawPaper, {
    runningHeaderTemplate: (n) => `AP Biology Retrieval Practice RCT ${n}`,
    titleForCover: "AP Biology Retrieval Practice RCT",
  });

  await plainTextToPdf(simulated, PDF_OUT);
  const buffer = readFileSync(PDF_OUT);
  const extracted = await extractPdfFromBuffer(buffer);

  if (!extracted.ok) {
    return {
      pass: false,
      message: `PDF extraction failed: ${extracted.error}`,
      runningHeadersRemoved: 0,
      bodyWords: 0,
      bodyToStated: 0,
      totalWordsExtracted: 0,
    };
  }

  const { partition } = prepareGradingInput(extracted.text);
  const bodyWords = partition.bodyWordCount;
  const bodyToStated = bodyWords / STATED_WORD_COUNT;

  const headersInSource = simulated.split("\n").filter((l) =>
    /^AP Biology Retrieval Practice RCT \d+$/.test(l.trim()),
  ).length;
  const headersRemoved = extracted.cleaningStats.runningHeadersRemoved;

  const pass =
    bodyWords >= MIN_BODY_WORDS && bodyToStated >= MIN_BODY_RATIO;

  const message = pass
    ? `OK body=${bodyWords} (${(bodyToStated * 100).toFixed(1)}% of stated); running headers in source=${headersInSource}, removed=${headersRemoved}`
    : `FAIL body=${bodyWords} (${(bodyToStated * 100).toFixed(1)}% of stated), need ≥${MIN_BODY_WORDS} words and ≥${MIN_BODY_RATIO * 100}%`;

  return {
    pass,
    message,
    runningHeadersRemoved: headersRemoved,
    bodyWords,
    bodyToStated,
    totalWordsExtracted: extracted.wordCount,
  };
}

async function main() {
  const result = await runGoogleDocsPdfCorpusTest();
  console.log(result.pass ? "PASS" : "FAIL", result.message);
  console.log(
    `  Total words extracted: ${result.totalWordsExtracted.toLocaleString()}`,
  );
  console.log(
    `  Simulated running-header lines in source: ${result.runningHeadersRemoved}`,
  );
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
