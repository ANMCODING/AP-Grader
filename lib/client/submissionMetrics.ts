import { countWords } from "@/lib/grader/text";

const REF_HEADING =
  /^(?:References|Reference\s+List|Reference\s+Page|Works?\s+Cited|Works?\s+Referenced|Bibliography|Sources\s+Cited|Literature\s+Cited)\s*:?\s*$/i;

const STATED_WORD_COUNT =
  /^\s*word\s+count\s*:\s*([\d,]+)\s*$/im;

export interface SubmissionMetrics {
  totalWords: number;
  estimatedBodyWords: number;
  statedWordCount: number | null;
  completenessPercent: number | null;
}

export function extractStatedWordCountClient(text: string): number | null {
  const head = text.split(/\n/).slice(0, 20).join("\n");
  const match = head.match(STATED_WORD_COUNT);
  if (!match) return null;
  const n = parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Client-side body word estimate: split at bibliography heading after 50% of document. */
export function estimateBodyWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const lines = trimmed.split(/\n/);
  const minCharPos = Math.floor(trimmed.length * 0.5);
  let charOffset = 0;
  let boundary = -1;

  for (const line of lines) {
    const lineStart = charOffset;
    const t = line.trim();
    if (
      t.length > 0 &&
      t.length < 80 &&
      REF_HEADING.test(t) &&
      lineStart >= minCharPos
    ) {
      boundary = lineStart;
      break;
    }
    charOffset += line.length + 1;
  }

  const bodyText =
    boundary >= 0 ? trimmed.slice(0, boundary) : trimmed;
  return countWords(bodyText);
}

export function computeSubmissionMetrics(text: string): SubmissionMetrics {
  const totalWords = countWords(text);
  const estimatedBodyWords = estimateBodyWords(text);
  const statedWordCount = extractStatedWordCountClient(text);
  const completenessPercent =
    statedWordCount && statedWordCount > 0
      ? Math.round((estimatedBodyWords / statedWordCount) * 100)
      : null;

  return {
    totalWords,
    estimatedBodyWords,
    statedWordCount,
    completenessPercent,
  };
}

/** Client-only completeness colors (approximate body vs stated on cover). */
export function completenessColorClass(percent: number | null): string {
  if (percent === null) return "text-ink-muted";
  if (percent >= 65) return "text-green-700";
  if (percent >= 50) return "text-yellow-700";
  if (percent >= 35) return "text-orange-700";
  return "text-red-700";
}

/** Show soft note when client estimate is well below stated (below server incomplete threshold). */
export const CLIENT_SOFT_WARNING_COMPLETENESS_MAX = 50;
