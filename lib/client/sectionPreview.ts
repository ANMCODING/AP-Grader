export function emptySectionPreview(): SectionPreviewResult {
  return {
    researchQuestion: { found: false, preview: null, suggestion: null },
    literatureReview: { found: false, sectionCount: 0 },
    method: { found: false },
    results: { found: false },
    references: { found: false, entryCount: 0 },
    issueLoadingMessage: null,
  };
}

export interface SectionPreviewResult {
  researchQuestion: {
    found: boolean;
    preview: string | null;
    suggestion: string | null;
  };
  literatureReview: {
    found: boolean;
    sectionCount: number;
  };
  method: { found: boolean };
  results: { found: boolean };
  references: {
    found: boolean;
    entryCount: number;
  };
  /** First issue-specific loading message, if any. */
  issueLoadingMessage: string | null;
}

const RQ_PATTERNS = [
  /\b(?:research\s+question|guiding\s+question|purpose\s+of\s+(?:this|the)\s+(?:study|research|paper))\b[^.?!]{0,200}[.?!]/i,
  /(?:^|\n)\s*(?:RQ\d*[:.]?\s*)?([^\n?]{20,300}\?)/im,
];

const LIT_HEADINGS =
  /^(?:literature\s+review|review\s+of\s+literature|related\s+work|theoretical\s+framework|background)\s*:?\s*$/im;

const METHOD_HEADING =
  /^(?:methods?|methodology|research\s+method|research\s+design|procedure|materials?\s+and\s+methods?)\s*:?\s*$/im;

const RESULTS_HEADING =
  /^(?:results?|findings?|data\s+analysis|analysis\s+of\s+results?)\s*:?\s*$/im;

const REF_HEADING =
  /^(?:References|Reference\s+List|Works?\s+Cited|Bibliography|Sources\s+Cited|Literature\s+Cited)\s*:?\s*$/im;

function countBibliographyEntries(text: string): number {
  const tail = text.slice(Math.floor(text.length * 0.45));
  const lines = tail.split(/\n/);
  let refStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (REF_HEADING.test(lines[i].trim())) {
      refStart = i + 1;
      break;
    }
  }
  if (refStart < 0) return 0;
  let count = 0;
  for (let i = refStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (
      /\(\d{4}[a-z]?\)/.test(line) ||
      /^\[[\d,\s]+\]/.test(line) ||
      /^[A-Z][a-zA-Z''-]+,\s+[A-Z]/.test(line) ||
      /^\d+\.\s+[A-Z]/.test(line)
    ) {
      count++;
    }
  }
  return count;
}

function detectResearchQuestion(text: string): {
  found: boolean;
  preview: string | null;
  suggestion: string | null;
} {
  const intro = text.slice(0, Math.min(text.length, 12000));
  for (const pat of RQ_PATTERNS) {
    const m = intro.match(pat);
    if (m) {
      const raw = (m[1] ?? m[0]).replace(/\s+/g, " ").trim();
      if (raw.length >= 15) {
        const preview =
          raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
        return { found: true, preview, suggestion: null };
      }
    }
  }
  return {
    found: false,
    preview: null,
    suggestion:
      "State your research question clearly in the introduction, ideally as a direct question ending with a question mark.",
  };
}

function countHeadingMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  return (text.match(re) ?? []).length;
}

/** Fast client-side section scan for loading preview (approximate). */
export function scanSectionsForPreview(text: string): SectionPreviewResult {
  const researchQuestion = detectResearchQuestion(text);
  const litCount = countHeadingMatches(text, LIT_HEADINGS);
  const methodFound = METHOD_HEADING.test(text);
  const resultsFound = RESULTS_HEADING.test(text);
  const refFound = REF_HEADING.test(text);
  const entryCount = refFound ? countBibliographyEntries(text) : 0;

  const issues: string[] = [];
  if (!researchQuestion.found) {
    issues.push(
      "Note: No research question was detected. Focus score may be affected.",
    );
  }
  if (!refFound) {
    issues.push(
      "Note: No references section was detected. Scholarly Grounding score may be affected.",
    );
  }

  return {
    researchQuestion,
    literatureReview: { found: litCount > 0, sectionCount: litCount },
    method: { found: methodFound },
    results: { found: resultsFound },
    references: { found: refFound, entryCount },
    issueLoadingMessage: issues[0] ?? null,
  };
}
