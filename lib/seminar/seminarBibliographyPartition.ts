/**
 * Bibliography section detection for partitionSeminarText (seminar-3.2.0).
 */

/** Standalone bibliography heading on its own line (seminar-3.2.16). */
const STANDALONE_REF_HEADING_LINE =
  /^(?:works?\s+cited|references?|bibliography|sources?|works\s+consulted|literature\s+cited|annotated\s+bibliography|works\s+referenced|citations?|source\s+list|reference\s+list|list\s+of\s+references?)\s*[:.]?\s*$/i;

const INLINE_REF_INTRO =
  /\n(?:The following sources were consulted|The sources used in this (?:paper|essay)|This (?:paper|essay) drew on the following sources|All sources are listed below|Complete citations|Sources referenced in this (?:paper|essay)|For further reading, see|Additional sources|Supporting sources):/i;

const ENTRY_LINE =
  /^[A-Z][a-zA-Z''-]+,\s+[A-Z](?:\.|[a-z])|^[A-Z][a-zA-Z''-]+,\s+&\s+[A-Z]|^https?:\/\/doi\.org\/10\.|^doi:\s*10\.\d{4,}\//i;

/** Heading-only patterns: end-anchored or short whitelist-style. */
function isBibliographyHeadingLine(trimmed: string): boolean {
  if (!trimmed || trimmed.length > 80) return false;
  const normalized = trimmed.replace(/[:.]+\s*$/, "");
  return STANDALONE_REF_HEADING_LINE.test(normalized);
}

function findHeadingLineIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (isBibliographyHeadingLine(lines[i]!.trim())) return i;
  }
  return -1;
}

/** Scan lower portion for consecutive bibliography-style entry lines (B7/B8). */
function findEntryBlockStart(lines: string[]): number {
  const startScan = Math.max(0, Math.floor(lines.length * 0.35));
  let best = -1;
  let run = 0;
  for (let i = lines.length - 1; i >= startScan; i--) {
    const t = lines[i]!.trim();
    if (!t) {
      if (run >= 2 && best >= 0) return best;
      continue;
    }
    if (ENTRY_LINE.test(t) || /^\d{1,3}\.\s+[A-Z][a-zA-Z'’-]+,/.test(t)) {
      run++;
      best = i;
    } else if (isBibliographyHeadingLine(t)) {
      return i;
    } else if (run >= 2) {
      return best;
    } else {
      run = 0;
      best = -1;
    }
  }
  return run >= 2 ? best : -1;
}

export function splitBodyAndReferences(text: string): {
  bodyText: string;
  referencesText: string;
} {
  const lines = text.split("\n");
  const headingIdx = findHeadingLineIndex(lines);
  if (headingIdx >= 0) {
    return {
      bodyText: lines.slice(0, headingIdx).join("\n").trim(),
      referencesText: lines.slice(headingIdx).join("\n").trim(),
    };
  }

  const inline = text.search(INLINE_REF_INTRO);
  if (inline >= 0) {
    return {
      bodyText: text.slice(0, inline).trim(),
      referencesText: text.slice(inline).trim(),
    };
  }

  const entryIdx = findEntryBlockStart(lines);
  if (entryIdx >= 0) {
    return {
      bodyText: lines.slice(0, entryIdx).join("\n").trim(),
      referencesText: lines.slice(entryIdx).join("\n").trim(),
    };
  }

  return { bodyText: text.trim(), referencesText: "" };
}
