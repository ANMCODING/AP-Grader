import { join } from "path";
import { pathToFileURL } from "url";
import { PDFParse, PasswordException } from "pdf-parse";
import { countWords } from "@/lib/grader/text";
import {
  cleanPdfExtractedText,
  detectPossibleTwoColumnLayout,
  estimateBodyToStatedRatio,
} from "@/lib/server/cleanPdfText";
import type {
  PdfCleaningStats,
  PdfExtractionDiagnostics,
  PdfSubmissionMeta,
} from "@/lib/server/pdfCleanTypes";

let pdfWorkerReady = false;

function ensurePdfWorker(): void {
  if (pdfWorkerReady) return;
  const workerPath = join(
    process.cwd(),
    "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  );
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  pdfWorkerReady = true;
}

export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_WORDS_PER_PAGE_IMAGE_THRESHOLD = 200;

export const PDF_ERRORS = {
  TOO_LARGE:
    "PDF file is too large. Please upload a file under 10MB.",
  EMPTY_OR_IMAGE:
    "This PDF appears to contain only images or scanned content. The engine can only read text-based PDFs. Please copy and paste your paper text directly or upload a .docx file instead.",
  PASSWORD:
    "This PDF is password protected. Please remove the password protection and try again.",
  INVALID:
    "Could not read this PDF. Try copying and pasting your paper text directly or uploading a .docx file instead.",
} as const;

export type PdfExtractSuccess = {
  ok: true;
  text: string;
  wordCount: number;
  joinSoftLineBreaksWordCount: number;
  possibleTwoColumn: boolean;
  numPages: number;
  likelyEmbeddedImages: boolean;
  extractionQuality: "high" | "low";
  submissionMeta: PdfSubmissionMeta;
  cleaningStats: PdfCleaningStats;
};

export type PdfExtractFailure = {
  ok: false;
  error: string;
  status: number;
};

export type PdfExtractResult = PdfExtractSuccess | PdfExtractFailure;

function isPasswordError(err: unknown): boolean {
  if (err instanceof PasswordException) return true;
  const msg =
    err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes("password");
}

function detectLikelyEmbeddedImages(
  text: string,
  numPages: number,
  totalWords: number,
): boolean {
  if (numPages <= 0) return false;
  const wordsPerPage = totalWords / numPages;
  const claimsResults =
    /\bresults?\b/i.test(text) ||
    /\bfindings?\b/i.test(text) ||
    /\btable\s+\d/i.test(text) ||
    /\bfigure\s+\d/i.test(text);
  return claimsResults && wordsPerPage < PDF_WORDS_PER_PAGE_IMAGE_THRESHOLD;
}

function logPdfDiagnostics(diagnostics: PdfExtractionDiagnostics): void {
  console.log("[pdf-extract]", JSON.stringify(diagnostics));
}

export function buildPdfExtractionDiagnostics(
  cleanedText: string,
  numPages: number,
  stats: {
    runningHeadersRemoved: number;
    pageNumberLinesRemoved: number;
  },
  possibleTwoColumn: boolean,
  likelyEmbeddedImages: boolean,
): PdfExtractionDiagnostics {
  const totalWordsExtracted = countWords(cleanedText);
  const wordsPerPage = numPages > 0 ? totalWordsExtracted / numPages : 0;
  const { stated, ratio } = estimateBodyToStatedRatio(cleanedText);

  const extractionQuality: "high" | "low" =
    (ratio !== null && ratio >= 0.7 && !possibleTwoColumn) ||
    (ratio === null && !possibleTwoColumn && wordsPerPage >= 150)
      ? "high"
      : "low";

  return {
    totalWordsExtracted,
    numPages,
    wordsPerPage: Math.round(wordsPerPage * 10) / 10,
    runningHeadersRemoved: stats.runningHeadersRemoved,
    pageNumberLinesRemoved: stats.pageNumberLinesRemoved,
    twoColumnDetected: possibleTwoColumn,
    likelyEmbeddedImages,
    statedWordCount: stated,
    bodyToStatedRatio: ratio !== null ? Math.round(ratio * 1000) / 1000 : null,
    extractionQuality,
  };
}

export async function extractPdfFromBuffer(
  buffer: Buffer,
): Promise<PdfExtractResult> {
  if (buffer.byteLength > PDF_MAX_BYTES) {
    return { ok: false, error: PDF_ERRORS.TOO_LARGE, status: 413 };
  }

  ensurePdfWorker();
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText({
      pageJoiner: "\n\n",
      lineThreshold: 8,
    });
    const raw = result.text ?? "";
    const numPages = result.total > 0 ? result.total : 1;

    if (!raw.trim() || countWords(raw) < 20) {
      return {
        ok: false,
        error: PDF_ERRORS.EMPTY_OR_IMAGE,
        status: 422,
      };
    }

    const {
      text,
      possibleTwoColumn,
      stats,
      joinSoftLineBreaksWordCount,
    } = cleanPdfExtractedText(raw);

    if (!text.trim() || countWords(text) < 20) {
      return {
        ok: false,
        error: PDF_ERRORS.EMPTY_OR_IMAGE,
        status: 422,
      };
    }

    const wordCount = countWords(text);
    const likelyEmbeddedImages = detectLikelyEmbeddedImages(
      text,
      numPages,
      wordCount,
    );

    const diagnostics = buildPdfExtractionDiagnostics(
      text,
      numPages,
      stats,
      possibleTwoColumn,
      likelyEmbeddedImages,
    );
    logPdfDiagnostics(diagnostics);

    const submissionMeta: PdfSubmissionMeta = {
      numPages,
      likelyEmbeddedImages,
      extractionQuality: diagnostics.extractionQuality,
      wordsExtracted: wordCount,
    };

    return {
      ok: true,
      text,
      wordCount,
      joinSoftLineBreaksWordCount,
      possibleTwoColumn,
      numPages,
      likelyEmbeddedImages,
      extractionQuality: diagnostics.extractionQuality,
      submissionMeta,
      cleaningStats: stats,
    };
  } catch (err) {
    if (isPasswordError(err)) {
      return { ok: false, error: PDF_ERRORS.PASSWORD, status: 422 };
    }
    console.error("[pdfExtract]", err);
    return { ok: false, error: PDF_ERRORS.INVALID, status: 422 };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export { detectPossibleTwoColumnLayout };
