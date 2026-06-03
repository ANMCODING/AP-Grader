import { countWords } from "@/lib/grader/text";

const REFERENCES_MIN_CHAR_FRACTION = 0.55;

/** Normalize heading text for bibliography detection (case, spacing, trailing punctuation). */
export function normalizeHeadingLine(line: string): string {
  return line
    .trim()
    .replace(/[:\-–—.]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Exact bibliography headings only — bare "sources" / "citations" are too ambiguous in body sections. */
const BIBLIOGRAPHY_HEADING_NORMALIZED = new Set([
  "references",
  "reference list",
  "reference page",
  "works cited",
  "work cited",
  "works referenced",
  "bibliography",
  "sources cited",
  "literature cited",
]);

const REF_HEADING =
  /^(?:References|Reference\s+List|Reference\s+Page|Works?\s+Cited|Works?\s+Referenced|Bibliography|Sources\s+Cited|Literature\s+Cited)\s*:?\s*$/i;

const NEARBY_HEADING_LINE =
  /^(?:introduction|literature|review|background|method|results?|findings?|discussion|conclusion|limitations?|implications?|gap|question|abstract|data|analysis|chapter|appendix|references|works?\s+cited|bibliography|participants?|procedure|materials|significance|summary|synthesis|protocol|ethics|reflection|overview|context)$/i;

/** Case-insensitive bibliography / works cited heading (heading line only, not citation-dense prose). */
export function isBibliographyHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length >= 80) return false;
  if (/\(\d{4}[a-z]?\)/.test(trimmed)) return false;
  if (/https?:\/\//i.test(trimmed)) return false;
  if (/^[A-Z][a-zA-Z]+,\s+[A-Z]/.test(trimmed)) return false;
  if (REF_HEADING.test(trimmed)) return true;
  return BIBLIOGRAPHY_HEADING_NORMALIZED.has(normalizeHeadingLine(trimmed));
}

function isNearbySectionHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length >= 80) return false;
  if (isBibliographyHeadingLine(t)) return false;
  if (NEARBY_HEADING_LINE.test(normalizeHeadingLine(t))) return true;
  if (/^\d+\.\s+[A-Za-z]/.test(t)) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}$/.test(t) && t.split(/\s+/).length <= 6) {
    return true;
  }
  return false;
}

/** Section headings that normally precede a real end-of-paper bibliography. */
const TERMINAL_SECTIONS_BEFORE_REFERENCES = new Set([
  "discussion",
  "conclusion",
  "limitations",
  "limitation",
  "implications",
  "implication",
  "summary",
  "acknowledgments",
  "acknowledgements",
  "closing remarks",
]);

/** Reject mid-paper bibliography headings (e.g. after Literature Review), not terminal References. */
export function isValidReferencesHeadingAtPosition(
  fullDocument: string,
  linePos: number,
  line: string,
): boolean {
  if (!isBibliographyHeadingLine(line)) return false;
  const before = fullDocument.slice(Math.max(0, linePos - 120), linePos);
  const priorLines = before.split("\n").map((l) => l.trim()).filter(Boolean);
  const prev = priorLines[priorLines.length - 1];
  if (!prev) return true;
  if (!isNearbySectionHeadingLine(prev)) return true;
  const normalized = normalizeHeadingLine(prev);
  if (TERMINAL_SECTIONS_BEFORE_REFERENCES.has(normalized)) return true;
  if (/^limitation/i.test(prev)) return true;
  return false;
}

/** Appendix must be an explicit appendix label — not glossary/definitions/supplementary prose. */
const APPENDIX_HEADING =
  /^Appendix(?:\s+[A-Z](?:\s*[—–\-:]\s*.+)?|\s+[A-Z0-9]{1,3})?\s*:?\s*$/i;

const BIBLIOGRAPHY_ENTRY_LINE =
  /^[A-Z][a-zA-Z'’\-]+(?:,\s+[A-Z][a-zA-Z'’\-]+)?(?:\s+et\s+al\.?)?,?\s*\(?\d{4}[a-z]?\)?/i;

const BIBLIOGRAPHY_URL_LINE = /^https?:\/\/\S+/i;

export interface PartitionDocumentOptions {
  /** Immutable word count from raw submission before cleaning. */
  originalInputWordCount?: number;
  /** Character length of raw submission before cleaning (boundary thresholds). */
  originalInputCharCount?: number;
  /** @deprecated Use originalInputWordCount */
  rawDocumentWordCount?: number;
  statedWordCountFromRaw?: number | null;
  statedWordCountSource?: string;
}

/** Minimum char fraction for references search — anchored to original document length. */
function referencesMinCharFraction(
  cleanedLength: number,
  originalCharCount: number,
): number {
  if (originalCharCount <= 0 || cleanedLength <= 0) {
    return REFERENCES_MIN_CHAR_FRACTION;
  }
  const targetPos = originalCharCount * REFERENCES_MIN_CHAR_FRACTION;
  const fractionInCleaned = targetPos / cleanedLength;
  return Math.min(0.95, Math.max(0.45, fractionInCleaned));
}

function isCitationDenseProseWindow(text: string): boolean {
  const cites = (text.match(/\([A-Z][a-zA-Z]+[^)]*\d{4}[a-z]?\)/g) ?? [])
    .length;
  return cites >= 6;
}

function countBibliographyEntryLinesAfter(
  fullDocument: string,
  headingPos: number,
): number {
  const after = fullDocument.slice(headingPos, headingPos + 1200);
  const lines = after.split("\n").slice(1, 12);
  let entries = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (BIBLIOGRAPHY_ENTRY_LINE.test(t) || BIBLIOGRAPHY_URL_LINE.test(t)) {
      entries++;
    }
  }
  return entries;
}

/** Strict references heading: short line, no prior prose sentences, bibliography entries follow. */
export function isStrictReferencesBoundaryLine(
  fullDocument: string,
  linePos: number,
  line: string,
): boolean {
  const trimmed = line.trim();
  if (!isBibliographyHeadingLine(trimmed)) return false;
  if (trimmed.length >= 80) return false;
  if (!isValidReferencesHeadingAtPosition(fullDocument, linePos, line)) {
    return false;
  }

  const priorWindow = fullDocument.slice(Math.max(0, linePos - 500), linePos);
  if (isCitationDenseProseWindow(priorWindow)) {
    return false;
  }

  if (countBibliographyEntryLinesAfter(fullDocument, linePos) >= 2) {
    return true;
  }

  return isValidReferencesHeadingAtPosition(fullDocument, linePos, line);
}

export interface PaperZones {
  /** Full cleaned submission text. */
  fullDocument: string;
  /** Scored paper content only (excludes references and appendices). */
  paperBody: string;
  appendixZone: string;
  referencesZone: string;
  referencesBoundary: number;
  appendixBoundary: number;
  bodyWordCount: number;
  /** Words in cleaned fullDocument (post-prep). */
  fullDocumentWordCount: number;
  /** Words in original input before preparePaperForGrading. */
  rawDocumentWordCount: number;
  statedWordCount: number | null;
  hasReferencesSection: boolean;
  hasAppendix: boolean;
  appendixCount: number;
  appendixReferencedInBody: boolean;
  unusualDocumentStructure: boolean;
  appendixBeforeReferences: boolean;
  boundaryDetectionWarning: string | null;
}

export function extractStatedWordCount(text: string): number | null {
  return extractStatedWordCountWithSource(text).count;
}

export function extractStatedWordCountWithSource(text: string): {
  count: number | null;
  source: string;
} {
  const header = text.slice(0, Math.min(text.length, 1200));
  const patterns = [
    /\bWord\s+Count\s*:\s*([\d,]+)/i,
    /\bWords?\s*:\s*([\d,]+)/i,
    /\bTotal\s+Words?\s*:\s*([\d,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = header.match(pattern);
    if (match) {
      const n = parseInt(match[1].replace(/,/g, ""), 10);
      if (Number.isFinite(n)) {
        const lineNum =
          header.slice(0, match.index ?? 0).split("\n").length;
        return {
          count: n,
          source: `line ${lineNum}: ${match[0].trim().slice(0, 60)}`,
        };
      }
    }
  }
  return { count: null, source: "not found" };
}

function isReferencesHeadingLine(line: string): boolean {
  return isBibliographyHeadingLine(line);
}

function isAppendixHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length >= 100) return false;
  if (/^(?:definitions?|glossary)\s*:?\s*$/i.test(t)) return false;
  return APPENDIX_HEADING.test(t);
}

/** References heading must appear in the second half of the document (never before 50%). */
function findReferencesBoundaryAfterHalf(fullDocument: string): number {
  const halfPos = Math.floor(fullDocument.length * 0.5);
  const lines = fullDocument.split("\n");
  let pos = 0;
  let last = -1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      pos >= halfPos &&
      trimmed.length > 0 &&
      isStrictReferencesBoundaryLine(fullDocument, pos, trimmed)
    ) {
      last = pos;
    }
    pos += line.length + 1;
  }
  return last;
}

/** If body is truncated vs stated count, use a later references heading when present. */
function extendReferencesBoundaryForLowBodyRatio(
  fullDocument: string,
  referencesBoundary: number,
  bodyWordCount: number,
  statedWordCount: number | null,
): number {
  if (referencesBoundary < 0) return referencesBoundary;
  if (statedWordCount === null || statedWordCount <= 0) return referencesBoundary;
  if (bodyWordCount / statedWordCount >= 0.6) return referencesBoundary;

  const lines = fullDocument.split("\n");
  let pos = 0;
  let lastAfterCurrent = referencesBoundary;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      pos > referencesBoundary &&
      trimmed.length > 0 &&
      isStrictReferencesBoundaryLine(fullDocument, pos, trimmed)
    ) {
      lastAfterCurrent = pos;
    }
    pos += line.length + 1;
  }
  const afterHalf = findReferencesBoundaryAfterHalf(fullDocument);
  return Math.max(lastAfterCurrent, afterHalf);
}

/** Last matching line boundary at or after minCharFraction. */
function findLastLineBoundary(
  text: string,
  minCharFraction: number,
  testLine: (line: string, linePos: number) => boolean,
): number {
  const minPos = Math.floor(text.length * minCharFraction);
  const lines = text.split("\n");
  let pos = 0;
  let last = -1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (pos >= minPos && trimmed.length > 0 && testLine(trimmed, pos)) {
      last = pos;
    }
    pos += line.length + 1;
  }
  return last;
}

function countAppendixHeadings(text: string): number {
  if (!text.trim()) return 0;
  let count = 0;
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.length > 0 && t.length < 100 && isAppendixHeadingLine(t)) {
      count++;
    }
  }
  return count > 0 ? count : text.trim().length > 50 ? 1 : 0;
}

/** True when body prose references an appendix with analytical intent. */
export function bodyReferencesAppendixAnalytically(paperBody: string): boolean {
  if (
    !/\b(?:see|refer\s+to|shown\s+in|presented\s+in|discussed\s+in|as\s+in)\s+(?:Appendix|the\s+appendix)\b/i.test(
      paperBody,
    )
  ) {
    return false;
  }
  return /\b(?:shows?|demonstrates?|results?|data|analysis|ANOVA|SPSS|output|findings?|table|figure)\b/i.test(
    paperBody,
  );
}

function applyPartitionMeta(
  zones: PaperZones,
  meta: PartitionDocumentOptions,
): PaperZones {
  const raw =
    meta.originalInputWordCount ??
    meta.rawDocumentWordCount ??
    zones.fullDocumentWordCount;
  const stated =
    meta.statedWordCountFromRaw !== undefined
      ? meta.statedWordCountFromRaw
      : zones.statedWordCount;
  return {
    ...zones,
    rawDocumentWordCount: raw,
    statedWordCount: stated,
  };
}

function buildZonesFromBoundaries(
  fullDocument: string,
  referencesBoundary: number,
  appendixBoundary: number,
): PaperZones {
  const len = fullDocument.length;
  let unusualDocumentStructure = false;

  if (
    appendixBoundary >= 0 &&
    appendixBoundary < Math.floor(len * 0.5)
  ) {
    unusualDocumentStructure = true;
    appendixBoundary = findLastLineBoundary(
      fullDocument,
      0.5,
      (line) => isAppendixHeadingLine(line),
    );
  }

  const appendixBeforeReferences =
    appendixBoundary >= 0 &&
    referencesBoundary >= 0 &&
    appendixBoundary < referencesBoundary;

  let paperBody = fullDocument;
  let appendixZone = "";
  let referencesZone = "";

  if (referencesBoundary < 0 && appendixBoundary < 0) {
    paperBody = fullDocument;
  } else if (referencesBoundary >= 0 && appendixBoundary < 0) {
    paperBody = fullDocument.slice(0, referencesBoundary);
    referencesZone = fullDocument.slice(referencesBoundary);
  } else if (appendixBoundary >= 0 && referencesBoundary < 0) {
    paperBody = fullDocument.slice(0, appendixBoundary);
    appendixZone = fullDocument.slice(appendixBoundary);
  } else if (appendixBeforeReferences) {
    paperBody = fullDocument.slice(0, appendixBoundary);
    appendixZone = fullDocument.slice(
      appendixBoundary,
      referencesBoundary,
    );
    referencesZone = fullDocument.slice(referencesBoundary);
  } else {
    paperBody = fullDocument.slice(0, referencesBoundary);
    referencesZone = fullDocument.slice(
      referencesBoundary,
      appendixBoundary,
    );
    appendixZone = fullDocument.slice(appendixBoundary);
  }

  const bodyWordCount = countWords(paperBody);
  const fullDocumentWordCount = countWords(fullDocument);
  const statedWordCount = extractStatedWordCount(fullDocument);

  return {
    fullDocument,
    paperBody,
    appendixZone,
    referencesZone,
    referencesBoundary,
    appendixBoundary,
    bodyWordCount,
    fullDocumentWordCount,
    rawDocumentWordCount: fullDocumentWordCount,
    // overwritten by applyPartitionMeta with originalInputWordCount
    statedWordCount,
    hasReferencesSection: referencesBoundary >= 0,
    hasAppendix: appendixBoundary >= 0,
    appendixCount: countAppendixHeadings(appendixZone),
    appendixReferencedInBody: bodyReferencesAppendixAnalytically(paperBody),
    unusualDocumentStructure,
    appendixBeforeReferences,
    boundaryDetectionWarning: null,
  };
}

function partitionWithBoundaries(
  fullDocument: string,
  referencesBoundary: number,
  appendixBoundary: number,
): PaperZones {
  return buildZonesFromBoundaries(
    fullDocument,
    referencesBoundary,
    appendixBoundary,
  );
}

function partitionStandard(
  fullDocument: string,
  originalCharCount: number,
): PaperZones {
  let referencesBoundary = findReferencesBoundaryAfterHalf(fullDocument);
  if (referencesBoundary < 0) {
    const refMinFraction = Math.max(0.5, referencesMinCharFraction(
      fullDocument.length,
      originalCharCount,
    ));
    referencesBoundary = findLastLineBoundary(
      fullDocument,
      refMinFraction,
      (line, pos) => isStrictReferencesBoundaryLine(fullDocument, pos, line),
    );
  }
  const appendixBoundary = findLastLineBoundary(
    fullDocument,
    REFERENCES_MIN_CHAR_FRACTION,
    (line) => isAppendixHeadingLine(line),
  );
  const zones = partitionWithBoundaries(
    fullDocument,
    referencesBoundary,
    appendixBoundary,
  );
  const extendedBoundary = extendReferencesBoundaryForLowBodyRatio(
    fullDocument,
    zones.referencesBoundary,
    zones.bodyWordCount,
    zones.statedWordCount,
  );
  if (extendedBoundary > zones.referencesBoundary) {
    return partitionWithBoundaries(fullDocument, extendedBoundary, appendixBoundary);
  }
  return zones;
}

/** Last-resort partition: body = first 85%, last 15% treated as back matter. */
function partitionLastFifteenPercentBackMatter(
  fullDocument: string,
): PaperZones {
  const splitAt = Math.floor(fullDocument.length * 0.85);
  return partitionWithBoundaries(fullDocument, splitAt, -1);
}

function formatBoundaryDebug(
  phase: string,
  zones: PaperZones,
  fallbackTriggered: boolean,
): string {
  const stated = zones.statedWordCount;
  const statedRatio =
    stated && stated > 0
      ? (zones.bodyWordCount / stated).toFixed(3)
      : "n/a";
  const bodyToRaw = (
    zones.bodyWordCount / Math.max(zones.rawDocumentWordCount, 1)
  ).toFixed(3);
  const bodyToCleanedFull = (
    zones.bodyWordCount / Math.max(zones.fullDocumentWordCount, 1)
  ).toFixed(3);
  return (
    `[boundary ${phase}] refBoundary=${zones.referencesBoundary} ` +
    `bodyWords=${zones.bodyWordCount} rawWords=${zones.rawDocumentWordCount} ` +
    `cleanedFullWords=${zones.fullDocumentWordCount} stated=${stated ?? "n/a"} ` +
    `body/raw=${bodyToRaw} body/cleanedFull=${bodyToCleanedFull} body/stated=${statedRatio} ` +
    `fallback=${fallbackTriggered}`
  );
}

/**
 * Conservative fallback when body zone is implausibly small:
 * treat only the last 20% of the document as back matter (refs/appendix).
 */
function partitionConservative(fullDocument: string): PaperZones {
  const splitAt = Math.floor(fullDocument.length * 0.8);
  const tail = fullDocument.slice(splitAt);
  const refsInTail = findLastLineBoundary(
    tail,
    0,
    (line, pos) =>
      isValidReferencesHeadingAtPosition(
        fullDocument,
        splitAt + pos,
        line,
      ),
  );
  const appInTail = findLastLineBoundary(tail, 0, (line) =>
    isAppendixHeadingLine(line),
  );

  let referencesBoundary = -1;
  let appendixBoundary = -1;

  if (refsInTail >= 0) {
    referencesBoundary = splitAt + refsInTail;
  }
  if (appInTail >= 0) {
    appendixBoundary = splitAt + appInTail;
  }

  if (referencesBoundary < 0 && appendixBoundary < 0) {
    referencesBoundary = splitAt;
  }

  return partitionWithBoundaries(
    fullDocument,
    referencesBoundary,
    appendixBoundary,
  );
}

function needsBoundaryFallback(zones: PaperZones): boolean {
  const original = zones.rawDocumentWordCount;
  if (original < 100) return false;

  const bodyToOriginal = zones.bodyWordCount / Math.max(original, 1);
  if (bodyToOriginal < 0.85) return true;

  if (zones.statedWordCount !== null && zones.statedWordCount > 0) {
    const bodyToStated = zones.bodyWordCount / zones.statedWordCount;
    if (bodyToStated < 0.85) return true;
    if (
      zones.hasReferencesSection &&
      zones.statedWordCount > 2000 &&
      bodyToStated < 0.75
    ) {
      return true;
    }
  }

  const bodyToCleaned =
    zones.bodyWordCount / Math.max(zones.fullDocumentWordCount, 1);
  if (zones.hasReferencesSection && bodyToCleaned < 0.7) {
    return true;
  }

  if (!zones.hasReferencesSection && bodyToCleaned < 0.75) {
    return true;
  }

  return false;
}

function needsLastResortBodyPartition(zones: PaperZones): boolean {
  const stated = zones.statedWordCount;
  const raw = zones.rawDocumentWordCount;

  if (raw > 2000 && zones.bodyWordCount / raw < 0.85) {
    return true;
  }

  if (stated !== null && stated > 2000 && zones.bodyWordCount / stated < 0.75) {
    return true;
  }

  return false;
}

function applyLastResortBodyPartition(
  fullDocument: string,
  prior: PaperZones,
  priorDebug: string[],
): PaperZones {
  const raw = prior.rawDocumentWordCount;
  const stated = prior.statedWordCount;

  let best = applyPartitionMeta(
    partitionWithBoundaries(fullDocument, -1, -1),
    { rawDocumentWordCount: raw, statedWordCountFromRaw: stated },
  );

  const refsInFinalSegment = findLastLineBoundary(
    fullDocument,
    0.85,
    (line, pos) =>
      isValidReferencesHeadingAtPosition(fullDocument, pos, line),
  );
  if (refsInFinalSegment >= 0) {
    const withRefs = applyPartitionMeta(
      partitionWithBoundaries(fullDocument, refsInFinalSegment, -1),
      { rawDocumentWordCount: raw, statedWordCountFromRaw: stated },
    );
    if (withRefs.bodyWordCount > best.bodyWordCount) {
      best = withRefs;
    }
  }

  const char85 = applyPartitionMeta(
    partitionLastFifteenPercentBackMatter(fullDocument),
    { rawDocumentWordCount: raw, statedWordCountFromRaw: stated },
  );
  if (
    char85.bodyWordCount > best.bodyWordCount &&
    char85.bodyWordCount > prior.bodyWordCount
  ) {
    best = char85;
  }

  priorDebug.push(formatBoundaryDebug("last-resort", best, true));
  const statedRatio =
    stated && stated > 0
      ? (best.bodyWordCount / stated).toFixed(2)
      : "n/a";
  const rawRatio = (best.bodyWordCount / Math.max(raw, 1)).toFixed(2);
  best.boundaryDetectionWarning =
    `Document section boundaries were reset because the paper body was far below the raw submission length ` +
    `(body ${prior.bodyWordCount} → ${best.bodyWordCount} words; raw ${raw}; stated ${stated ?? "n/a"}; ` +
    `body/stated ${statedRatio}; body/raw ${rawRatio}). ` +
    priorDebug.join(" | ");
  return best;
}

/**
 * Partition a cleaned document into body, appendix, and references zones.
 * Must run immediately after text cleaning and before any other analysis.
 */
export function partitionDocument(
  cleanedText: string,
  options: PartitionDocumentOptions = {},
): PaperZones {
  const fullDocument = cleanedText.trim();
  const originalInputWordCount =
    options.originalInputWordCount ??
    options.rawDocumentWordCount ??
    countWords(fullDocument);
  const originalInputCharCount =
    options.originalInputCharCount ?? fullDocument.length;

  const meta: PartitionDocumentOptions = {
    originalInputWordCount,
    originalInputCharCount,
    rawDocumentWordCount: originalInputWordCount,
    statedWordCountFromRaw:
      options.statedWordCountFromRaw !== undefined
        ? options.statedWordCountFromRaw
        : extractStatedWordCount(fullDocument),
  };

  const debug: string[] = [];
  let zones = applyPartitionMeta(
    partitionStandard(fullDocument, originalInputCharCount),
    meta,
  );
  debug.push(formatBoundaryDebug("standard", zones, false));

  if (needsBoundaryFallback(zones)) {
    zones = applyPartitionMeta(partitionConservative(fullDocument), meta);
    debug.push(formatBoundaryDebug("conservative", zones, true));
    zones.boundaryDetectionWarning =
      "Document section boundaries were adjusted because an early references or appendix heading was detected. Word count and scoring use the expanded paper body. " +
      debug.join(" | ");
  }

  if (needsLastResortBodyPartition(zones)) {
    zones = applyLastResortBodyPartition(fullDocument, zones, debug);
  }

  return zones;
}

export function buildBoundaryWordCountFlags(zones: PaperZones): string[] {
  const flags: string[] = [
    `Paper body word count: ${zones.bodyWordCount.toLocaleString()} words (excluding references and appendices). References and appendix text were excluded from this count.`,
  ];

  if (zones.boundaryDetectionWarning) {
    flags.push(zones.boundaryDetectionWarning);
  }

  if (zones.fullDocumentWordCount - zones.bodyWordCount > 500) {
    flags.push(
      "References and appendix text were excluded from this count.",
    );
  }

  if (zones.statedWordCount !== null) {
    const statedInflated =
      zones.rawDocumentWordCount > 0 &&
      zones.statedWordCount > zones.rawDocumentWordCount * 1.15;
    const diff = Math.abs(zones.bodyWordCount - zones.statedWordCount);
    const pct =
      zones.statedWordCount > 0
        ? (diff / zones.statedWordCount) * 100
        : 0;
    if (pct > 10 && !statedInflated) {
      flags.push(
        `Stated word count (${zones.statedWordCount.toLocaleString()}) differs from detected paper body count by more than 10%.`,
      );
    }
    if (
      statedInflated &&
      zones.bodyWordCount / zones.rawDocumentWordCount < 0.7
    ) {
      flags.push(
        `Stated word count (${zones.statedWordCount.toLocaleString()}) is much higher than the submitted text length (${zones.rawDocumentWordCount.toLocaleString()} words). Scoring uses the submitted text only.`,
      );
    }
  }

  if (!zones.hasReferencesSection) {
    flags.push(
      "No references section heading was found in the second half of the document; bibliography may be missing or use an unrecognized heading.",
    );
  }

  if (zones.unusualDocumentStructure) {
    flags.push(
      "Unusual document structure detected (appendix heading appeared before the midpoint); boundaries were adjusted using the references section.",
    );
  }

  return flags;
}
