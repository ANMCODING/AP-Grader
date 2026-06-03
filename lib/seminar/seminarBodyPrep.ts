/**
 * AP Seminar body text preparation — cover/running-head stripping before word count
 * and detection. Uses read-only helpers from Research textNormalize; does not
 * modify lib/grader behavior.
 */

import { countWords } from "@/lib/grader/text";
import { stripCoverPageLines } from "@/lib/grader/textNormalize";
import { joinBrokenBibliographyUrls } from "@/lib/seminar/seminarBibliographyLinking";
import { splitBodyAndReferences } from "@/lib/seminar/seminarBibliographyPartition";
import { prepareSeminarText } from "@/lib/seminar/seminarTextPrep";
import { truncateAfterFirstBibliography } from "@/lib/seminar/seminarCalibration324";

/** Line-level bibliography heading test (expanded seminar-3.2.0). */
export const REF_HEADING =
  /^(?:references?|works\s+cited|work\s+cited|bibliography|sources?|works\s+consulted|literature\s+cited|annotated\s+bibliography|citations?|works\s+referenced|list\s+of\s+references?|reference\s+list|source\s+list|cited\s+works?|cited\s+sources?|works\s+used|sources\s+consulted|further\s+reading|endnotes?|footnotes?)\s*[:.]?\s*$/im;

function detectStatedWordCount(text: string): number | null {
  const m = text.match(/word count[:\s]*(\d{3,4})/i);
  return m?.[1] ? parseInt(m[1], 10) : null;
}

export function partitionSeminarText(text: string): {
  bodyText: string;
  referencesText: string;
} {
  const { bodyText, referencesText } = splitBodyAndReferences(text);
  return {
    bodyText,
    referencesText: joinBrokenBibliographyUrls(referencesText),
  };
}

export interface SeminarBodyStripResult {
  text: string;
  linesStripped: number;
  wordsStripped: number;
}

/** Running heads, page headers/footers, appendices — Seminar-specific (not AP Research). */
export function stripSeminarRunningHeadersAndNoise(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  let inAppendix = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^(?:appendix|peer\s+review|revision\s+history|grading\s+rubric)\b/i.test(
        trimmed,
      )
    ) {
      inAppendix = true;
    }
    if (inAppendix) continue;

    if (!trimmed) {
      kept.push("");
      continue;
    }
    if (/^Running\s+head:/i.test(trimmed)) continue;
    if (/^AP\s+Seminar\b/i.test(trimmed) && trimmed.length < 40) continue;
    if (/^Individual\s+Written\s+Argument$/i.test(trimmed)) continue;
    if (/^Word\s+Count:\s*\d+/i.test(trimmed)) continue;
    if (/^\d{1,4}$/.test(trimmed)) continue;
    if (/^[A-Z][A-Z\s]{4,55}\s+\d{1,4}\s*$/i.test(trimmed)) continue;
    if (/^[A-Z][a-zA-Z\s,'-]{3,70}\s+\d{1,4}\s*$/i.test(trimmed)) continue;

    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripSeminarBoilerplate(raw: string): SeminarBodyStripResult {
  let text = truncateAfterFirstBibliography(prepareSeminarText(raw));
  const cover = stripCoverPageLines(text);
  text = cover.text;
  text = stripSeminarRunningHeadersAndNoise(text);
  return {
    text,
    linesStripped: cover.linesStripped,
    wordsStripped: cover.wordsStripped,
  };
}

export interface SeminarSubmissionMetrics {
  bodyText: string;
  referencesText: string;
  bodyWordCount: number;
  fullWordCount: number;
  statedWordCount: number | null;
  coverPageLinesStripped: number;
  coverPageWordsStripped: number;
}

/** Partitioned body word count for pre-flight (body only, no references). */
export function prepareSeminarSubmissionMetrics(
  raw: string,
): SeminarSubmissionMetrics {
  const stripped = stripSeminarBoilerplate(raw);
  const { bodyText, referencesText } = partitionSeminarText(stripped.text);
  const bodyWordCount = countWords(bodyText);
  const fullWordCount = countWords(stripped.text);
  return {
    bodyText,
    referencesText,
    bodyWordCount,
    fullWordCount,
    statedWordCount: detectStatedWordCount(raw),
    coverPageLinesStripped: stripped.linesStripped,
    coverPageWordsStripped: stripped.wordsStripped,
  };
}
