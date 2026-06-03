import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import { countWords } from "@/lib/grader/text";

function extractRegionWordCounts(text: string): Record<string, number> {
  const headings =
    /^(Introduction|Literature Review|Method(?:ology)?|Results|Findings|Limitations|Implications|Conclusion|References)\s*$/gim;
  const parts: { name: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headings.exec(text)) !== null) {
    parts.push({ name: m[1].toLowerCase(), start: m.index + m[0].length });
  }
  const end = text.length;
  const slice = (from: number, to: number) =>
    countWords(text.slice(from, to).trim());
  const get = (names: string[]): number => {
    const idx = parts.findIndex((p) =>
      names.some((n) => p.name.startsWith(n.slice(0, 4))),
    );
    if (idx < 0) return 0;
    return slice(parts[idx].start, parts[idx + 1]?.start ?? end);
  };
  return {
    introduction: get(["introduction"]),
    literatureReview: get(["literature"]),
    method: get(["method"]),
    results: get(["results", "findings"]),
    conclusion: get(["conclusion"]),
  };
}

const MIN_REGION = 50;
const MIN_BODY_RATIO = 80;
const MIN_WORDS = 500;
const MIN_REFS_ZONE = 50;

export interface VerifyResult {
  ok: boolean;
  reasons: string[];
  bodyToOriginalRatio: number;
  bodyWordCount: number;
  refsZoneWords: number;
  regions: Record<string, number>;
}

export function verifyPaper(text: string, expectedAP: number): VerifyResult {
  const reasons: string[] = [];
  const { partition } = prepareGradingInput(text);
  const ratio = partition.pipelineDiagnostic.bodyToOriginalRatio;
  const bodyWordCount = partition.bodyWordCount;
  const refsZoneWords = countWords(partition.referencesZone);
  const rw = extractRegionWordCounts(partition.paperBody);

  if (bodyWordCount < MIN_WORDS) {
    reasons.push(`body ${bodyWordCount} < ${MIN_WORDS} words`);
  }
  if (ratio < MIN_BODY_RATIO) {
    reasons.push(`body/original ${ratio}% < ${MIN_BODY_RATIO}%`);
  }
  const refBodyMatch = partition.fullDocument.match(
    /\nReferences\s*\n([\s\S]+)$/i,
  );
  const refWordsFromHeading = refBodyMatch
    ? countWords(refBodyMatch[1])
    : refsZoneWords;
  if (
    refWordsFromHeading < MIN_REFS_ZONE &&
    refsZoneWords < MIN_REFS_ZONE
  ) {
    reasons.push(
      `references zone ${refWordsFromHeading} < ${MIN_REFS_ZONE} or missing heading`,
    );
  }

  if (expectedAP >= 3) {
    for (const key of ["introduction", "literatureReview", "method", "results", "conclusion"] as const) {
      if (rw[key] < MIN_REGION) {
        reasons.push(`${key} ${rw[key]} < ${MIN_REGION} words`);
      }
    }
  } else {
    if (rw.introduction < MIN_REGION) reasons.push(`introduction ${rw.introduction} < ${MIN_REGION}`);
    if (rw.conclusion < MIN_REGION) reasons.push(`conclusion ${rw.conclusion} < ${MIN_REGION}`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    bodyToOriginalRatio: ratio,
    bodyWordCount,
    refsZoneWords,
    regions: rw,
  };
}

/** Adjust stated word count line to improve ratio on retry. */
export function adjustStatedWordCount(text: string, targetRatio: number): string {
  const { partition } = prepareGradingInput(text);
  const body = partition.bodyWordCount;
  const implied = Math.round(body / (targetRatio / 100));
  const rounded = Math.round(implied / 100) * 100;
  return text.replace(
    /Word Count: approximately [\d,]+/i,
    `Word Count: approximately ${rounded.toLocaleString()}`,
  );
}

export function simplifyReferencesFormat(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}
