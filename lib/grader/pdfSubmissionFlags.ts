import type { PdfSubmissionMeta } from "@/lib/server/pdfCleanTypes";
import type { DocumentPartition } from "@/lib/grader/gradingPipeline";

export const PDF_EMBEDDED_IMAGE_TABLE_FLAG =
  "Your paper appears to contain results tables or figures as images. The engine cannot read image content. To get a more accurate score on Argument and Evidence consider describing your key numerical findings in your prose discussion. For example instead of only showing results in a table also write a sentence like the intervention group scored significantly higher (M = 31.4, SD = 4.2) than the control group (M = 24.7, SD = 5.1).";

export const PDF_LOW_EXTRACTION_QUALITY_WARNING =
  "PDF extraction quality appears low for this submission. For a more accurate score try downloading your paper as a Microsoft Word file (.docx) from Google Docs (File then Download then Microsoft Word) and uploading the .docx file instead. Word files typically extract more reliably than PDFs.";

const PDF_LOW_BODY_RATIO_THRESHOLD = 0.6;

export function buildPdfSubmissionFlags(
  partition: DocumentPartition,
  pdfMeta?: PdfSubmissionMeta | null,
): string[] {
  const flags: string[] = [];
  if (!pdfMeta) return flags;

  if (pdfMeta.likelyEmbeddedImages) {
    flags.push(PDF_EMBEDDED_IMAGE_TABLE_FLAG);
  }

  return flags;
}

export function buildPdfQualityWarning(
  partition: DocumentPartition,
  pdfMeta?: PdfSubmissionMeta | null,
): string | null {
  if (!pdfMeta) return null;

  if (
    partition.statedWordCount !== null &&
    partition.statedWordCount > 0 &&
    partition.bodyWordCount / partition.statedWordCount <
      PDF_LOW_BODY_RATIO_THRESHOLD
  ) {
    return PDF_LOW_EXTRACTION_QUALITY_WARNING;
  }

  if (pdfMeta.extractionQuality === "low") {
    return PDF_LOW_EXTRACTION_QUALITY_WARNING;
  }

  return null;
}
