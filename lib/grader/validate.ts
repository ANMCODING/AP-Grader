import {
  HARD_REJECT_WORD_COUNT,
  MEANINGFUL_MIN_BODY_WORDS,
  WARN_WORD_COUNT_MAX,
  WARN_WORD_COUNT_MIN,
} from "@/lib/grader/gradingSpec";
import type { DocumentPartition } from "@/lib/grader/gradingPipeline";
import { cleanText, sentences } from "@/lib/grader/text";
import { detectMultiplePapers } from "@/lib/grader/textNormalize";

/** True if text looks like random gibberish, not an academic paper. */
export function isGibberish(text: string): boolean {
  const cleaned = cleanText(text);
  if (!cleaned) return true;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 20) return true;

  let realWords = 0;
  for (const w of words) {
    const core = w
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z]/g, "");
    if (core.length >= 3) realWords++;
    else if (/^[\p{L}]{3,}$/u.test(w.replace(/['']/g, ""))) realWords++;
  }
  const realRatio = realWords / words.length;
  if (realRatio < 0.55) return true;

  const sents = sentences(cleaned);
  if (sents.length < 3) return true;

  const hasCitation =
    /\([A-Z][a-zA-Z]+,?\s*\d{4}\)/.test(cleaned) ||
    /\[\d+\]/.test(cleaned) ||
    /\b(?:et al\.|pp\.|vol\.)\b/i.test(cleaned);

  const hasAcademic =
    /\b(?:research|study|method|analysis|literature|hypothesis|participants|data|findings|conclusion|implications|evidence|survey|interview|sample|correlation|significant|variable|qualitative|quantitative|framework|theoretical|empirical|methodology|instrument|validity)\b/i.test(
      cleaned,
    );

  if (!hasCitation && !hasAcademic && realRatio < 0.75) return true;

  const uniqueChars = new Set(cleaned.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 12 && words.length > 50) return true;

  return false;
}

export function validateSubmission(partition: DocumentPartition): {
  ok: boolean;
  wordCount: number;
  flag: string | null;
  warningFlag: string | null;
} {
  const cleaned = partition.preparedText;

  if (detectMultiplePapers(cleaned)) {
    return {
      ok: false,
      wordCount: 0,
      flag: "Multiple papers detected. Please submit one paper at a time.",
      warningFlag: null,
    };
  }

  const wordCount = partition.bodyWordCount;
  const paperBody = partition.paperBody;

  const refsOnly =
    wordCount < HARD_REJECT_WORD_COUNT &&
    partition.referencesZone.trim().length > 200 &&
    paperBody.trim().length < 100;
  if (refsOnly) {
    return {
      ok: false,
      wordCount,
      flag: "A reference list alone is not a paper. Please paste your full paper including all sections.",
      warningFlag: null,
    };
  }

  const abstractOnly =
    wordCount < MEANINGFUL_MIN_BODY_WORDS &&
    /\babstract\b/i.test(paperBody.slice(0, 500)) &&
    !/\b(?:method|results|literature|introduction)\b/i.test(paperBody);
  if (abstractOnly) {
    return {
      ok: false,
      wordCount,
      flag:
        "This submission appears to be only an abstract. Please paste your full paper including all sections.",
      warningFlag: null,
    };
  }

  if (wordCount < HARD_REJECT_WORD_COUNT) {
    return {
      ok: false,
      wordCount,
      flag: `Submission is too short to grade (minimum ${HARD_REJECT_WORD_COUNT} words in the body).`,
      warningFlag: null,
    };
  }

  let warningFlag: string | null = null;
  if (wordCount >= WARN_WORD_COUNT_MIN && wordCount <= WARN_WORD_COUNT_MAX) {
    warningFlag =
      "This paper is below the recommended minimum length. Scores may not be reliable.";
  }
  const academicKeywords =
    /\b(?:research|study|method|analysis|literature|hypothesis|participants|data|findings|conclusion|implications)\b/gi;
  const academicHits = (paperBody.match(academicKeywords) ?? []).length;

  if (isGibberish(paperBody) && academicHits < 5) {
    return {
      ok: false,
      wordCount,
      flag: "Submission does not appear to be an academic paper.",
      warningFlag: null,
    };
  }
  return { ok: true, wordCount, flag: null, warningFlag };
}
