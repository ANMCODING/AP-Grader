import { countWords } from "@/lib/grader/text";
import {
  normalizeControlCharacters,
  normalizePaperText,
  stripCollegeBoardRunningHeaders,
  stripCoverPageLines,
  type StripCoverPageResult,
} from "@/lib/grader/textNormalize";

const SECTION_HEADING_LINE =
  /^(?:references|works\s+cited|bibliography|introduction|literature\s+review|method(?:ology|s)?|results?|discussion|conclusion|limitations?|implications?|appendix)\s*:?\s*$/i;

const COLLEGE_BOARD_PACKET_MARKERS = [
  /Research\s+Sample/i,
  /Scoring\s+Commentary/i,
  /AP\s*Research\s+Academic\s+Paper/i,
  /Sample\s+Student\s+Responses/i,
  /Scoring\s+Guidelines/i,
];

/** True when first 500 chars contain at least 3 College Board packet markers. */
export function shouldRunCollegeBoardClean(text: string): boolean {
  const head = text.slice(0, 500);
  let hits = 0;
  for (const pattern of COLLEGE_BOARD_PACKET_MARKERS) {
    if (pattern.test(head)) hits++;
  }
  return hits >= 3;
}

/** @deprecated Use shouldRunCollegeBoardClean — kept for sample corpus checks. */
export function isCollegeBoardSamplePacket(text: string): boolean {
  return shouldRunCollegeBoardClean(text);
}

function isCompleteSentenceLine(trimmed: string): boolean {
  if (trimmed.length > 80) return true;
  if (/\(\d{4}[a-z]?\)/.test(trimmed)) return true;
  if (/\b(?:et al\.|pp\.|vol\.|doi:|https?:\/\/)/i.test(trimmed)) return true;
  if (/[.!?]["'”]?\s*$/.test(trimmed) && trimmed.length > 40) return true;
  if (
    /\b(?:r\s*=\s*[-.]?\d|p\s*[<>=]|χ²|chi-square|F\s*\(|t\s*\(|Cohen|participants?|significant|found that|results?)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

function shouldNeverStripStudentLine(trimmed: string): boolean {
  if (!trimmed) return true;
  if (SECTION_HEADING_LINE.test(trimmed)) return true;
  if (isCompleteSentenceLine(trimmed)) return true;
  return false;
}

function shouldStripCollegeBoardPacketLine(trimmed: string): boolean {
  if (shouldNeverStripStudentLine(trimmed)) return false;

  if (/^Research\s+Sample\s+[A-J]\s+\d+\s+of\s+\d+/i.test(trimmed)) {
    return true;
  }

  if (
    trimmed.length < 50 &&
    /^AP\s*RESEARCH\s*\d{4}/i.test(trimmed) &&
    /SCORING|COMMENTARY|GUIDELINES/i.test(trimmed)
  ) {
    return true;
  }

  if (
    trimmed.length < 60 &&
    /^[A-Z0-9][A-Z0-9\s\-–—]{2,48}\s+\d{1,3}$/.test(trimmed) &&
    !/\(\d{4}/.test(trimmed)
  ) {
    return true;
  }

  if (/^\d{1,3}$/.test(trimmed)) return true;

  if (
    trimmed.length < 80 &&
    /^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+\d{1,3}$/.test(trimmed) &&
    !/\(\d{4}/.test(trimmed)
  ) {
    return true;
  }

  if (/^©\s*\d{4}\s+College Board/i.test(trimmed)) return true;
  if (/^AP\s*Central is the official/i.test(trimmed)) return true;
  if (/^Inside:\s*$/i.test(trimmed)) return true;
  if (/^Sample\s+[A-J]\s*$/i.test(trimmed)) return true;

  return false;
}

function shouldStripStudentSubmissionLine(trimmed: string): boolean {
  if (shouldNeverStripStudentLine(trimmed)) return false;

  if (/^Research\s+Sample\s+[A-J]\s+\d+\s+of\s+\d+/i.test(trimmed)) {
    return true;
  }

  if (
    trimmed.length < 50 &&
    /^AP\s*RESEARCH\s*\d{4}/i.test(trimmed) &&
    /SCORING|COMMENTARY|GUIDELINES/i.test(trimmed)
  ) {
    return true;
  }

  if (/^\d{1,3}$/.test(trimmed) && trimmed.length <= 3) {
    return true;
  }

  return false;
}

function filterLines(
  rawText: string,
  shouldStrip: (trimmed: string) => boolean,
): string {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      kept.push("");
      continue;
    }
    if (shouldStrip(trimmed)) continue;
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Strip College Board sample-packet formatting — only when packet markers match.
 */
export function cleanCollegeBoardFormatting(rawText: string): string {
  if (!shouldRunCollegeBoardClean(rawText)) {
    return rawText;
  }
  return filterLines(rawText, shouldStripCollegeBoardPacketLine);
}

const MIN_RETENTION_RATIO = 0.85;

export interface CleaningCheckpoints {
  afterControlCharNorm: number;
  afterTestMetadata: number;
  afterCollegeBoardClean: number | "skipped";
  afterCoverPageStrip: number;
  afterNormalizePaperText: number;
  afterAllCleaning: number;
}

export interface PreparePaperResult {
  text: string;
  checkpoints: CleaningCheckpoints;
  collegeBoardCleanRan: boolean;
  coverPageStrip: StripCoverPageResult;
}

function applyCleaningStep(
  stepName: string,
  text: string,
  step: (input: string) => string,
  logCheckpoints: boolean,
): string {
  const before = countWords(text);
  const afterText = step(text);
  const after = countWords(afterText);
  if (logCheckpoints) {
    console.log(`CLEANING CHECKPOINT [${stepName}]: ${after} words`);
  }
  if (before > 100 && after / before < MIN_RETENTION_RATIO) {
    if (logCheckpoints) {
      console.log(
        `CLEANING CHECKPOINT [${stepName}] SKIPPED: retained ${after}/${before} words (below ${MIN_RETENTION_RATIO * 100}%)`,
      );
    }
    return text;
  }
  return afterText;
}

/** Strip test-harness metadata lines before grading. */
export function stripTestPaperMetadata(rawText: string): string {
  return rawText
    .replace(/^TEST\s+PAPER\s+\d+\s*[—–-]\s*Expected\s+score:[^\n]*\n?/gim, "")
    .trim();
}

export interface PreparePaperOptions {
  logCheckpoints?: boolean;
}

/**
 * Single cleaning pipeline for validation, boundaries, and evidence.
 */
export function preparePaperForGrading(
  rawText: string,
  options: PreparePaperOptions = {},
): PreparePaperResult {
  const log = options.logCheckpoints ?? false;
  const step = (name: string, t: string, fn: (s: string) => string) =>
    applyCleaningStep(name, t, fn, log);

  let text = rawText.trim();
  const afterControlCharNorm = countWords(
    (text = step("normalizeControlCharacters", text, normalizeControlCharacters)),
  );
  const afterTestMetadata = countWords(
    (text = step("stripTestPaperMetadata", text, stripTestPaperMetadata)),
  );

  const collegeBoardCleanRan = shouldRunCollegeBoardClean(text);
  let afterCollegeBoardClean: number | "skipped";
  if (collegeBoardCleanRan) {
    text = step("cleanCollegeBoardFormatting", text, cleanCollegeBoardFormatting);
    afterCollegeBoardClean = countWords(text);
  } else {
    if (log) {
      console.log("CLEANING CHECKPOINT [cleanCollegeBoardFormatting]: skipped");
    }
    afterCollegeBoardClean = "skipped";
  }

  const coverResult = stripCoverPageLines(text, { log });
  text = coverResult.text;
  const afterCoverPageStrip = countWords(text);

  text = step("stripCollegeBoardRunningHeaders", text, stripCollegeBoardRunningHeaders);
  const afterRunningHeaderStrip = countWords(text);

  const afterNormalizePaperText = countWords(
    (text = step("normalizePaperText", text, normalizePaperText)),
  );
  const afterAllCleaning = countWords(text);

  if (log) {
    console.log(
      `CLEANING CHECKPOINT [before partitionDocument]: ${afterAllCleaning} words`,
    );
  }

  return {
    text,
    checkpoints: {
      afterControlCharNorm,
      afterTestMetadata,
      afterCollegeBoardClean,
      afterCoverPageStrip,
      afterNormalizePaperText,
      afterAllCleaning,
    },
    collegeBoardCleanRan,
    coverPageStrip: coverResult,
  };
}
