/**
 * Synthesis vs isolation detection for AP Seminar (parallel to AP Research literatureQuality).
 * Uses shared citation utilities from lib/grader without modifying Research scoring.
 */

import { citationsInSentence } from "@/lib/grader/citations";
import { COMPARISON_PATTERNS, EVALUATIVE_PERSPECTIVE_PATTERNS } from "@/lib/seminar/seminarPatterns";
import { PERSPECTIVE_ISOLATION_INDICATORS } from "@/lib/seminar/seminarIwaPhrasePatterns";

const PARAGRAPH_OPENER_ISOLATION =
  /^(?:According to|In|As|While|When|The study by|Research by|[A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)?\s+\(\d{4}\))/;

const ISOLATION_ALSO_PATTERN =
  /\b[A-Z][A-Za-z'-]+(?:\s+and\s+[A-Z][A-Za-z'-]+)?\s+also\s+(?:found|wrote|studied|examined|noted)\b/gi;

function splitParagraphs(text: string): string[] {
  const byPara = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 60);
  if (byPara.length >= 3) return byPara;

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);
  if (sentences.length >= 3) {
    const pseudo: string[] = [];
    for (let i = 0; i < sentences.length; i += 4) {
      pseudo.push(sentences.slice(i, i + 4).join(" "));
    }
    return pseudo;
  }
  return sentences;
}

/** Higher count = sources listed in isolation, not in dialogue. */
export function countSynthesisIsolation(body: string): number {
  const lit = body.trim();
  if (lit.length < 200) return 0;

  let isolationPatternCount = 0;
  const paragraphs = splitParagraphs(lit);

  let consecutiveIsolated = 0;
  let maxConsecutiveIsolated = 0;
  for (const p of paragraphs) {
    const firstSentence = p.split(/[.!?]+\s+/)[0] ?? p;
    const opensWithSingleSource =
      PARAGRAPH_OPENER_ISOLATION.test(firstSentence.trim()) ||
      PARAGRAPH_OPENER_ISOLATION.test(p.trim());
    const citesInPara = citationsInSentence(p);
    if (opensWithSingleSource && citesInPara.length <= 2) {
      consecutiveIsolated++;
      maxConsecutiveIsolated = Math.max(maxConsecutiveIsolated, consecutiveIsolated);
    } else {
      consecutiveIsolated = 0;
    }
  }
  if (maxConsecutiveIsolated >= 3) isolationPatternCount++;

  if (ISOLATION_ALSO_PATTERN.test(lit)) isolationPatternCount++;

  const singleSourceParagraphs = paragraphs.filter(
    (p) => citationsInSentence(p).length === 1,
  ).length;
  if (paragraphs.length >= 4 && singleSourceParagraphs / paragraphs.length >= 0.65) {
    isolationPatternCount++;
  }

  const comparativeHits =
    countPatternHitsLocal(lit, COMPARISON_PATTERNS) +
    countPatternHitsLocal(lit, EVALUATIVE_PERSPECTIVE_PATTERNS);
  const hasComparativeLanguage = comparativeHits >= 2;
  if (!hasComparativeLanguage && paragraphs.length >= 3) isolationPatternCount++;

  const foundThatHits = lit.match(/\bfound that\b/gi) ?? [];
  if (foundThatHits.length >= 4 && citationsInSentence(lit).length >= 8) {
    isolationPatternCount++;
  }

  const phraseIsolation = countPatternHitsLocal(
    lit,
    PERSPECTIVE_ISOLATION_INDICATORS,
  );
  if (phraseIsolation >= 3 && comparativeHits < 2) {
    isolationPatternCount += Math.min(2, Math.floor(phraseIsolation / 3));
  }

  return isolationPatternCount;
}

function countPatternHitsLocal(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    n += text.match(p)?.length ?? 0;
  }
  return n;
}
