/**
 * Shared body pre-processing (Fix 7) — built once per submission.
 */
import { countWords } from "@/lib/grader/text";
import { collectCitationIndices } from "@/lib/seminar/seminarBibliographyAnalysis";

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

export interface BodyTextIndex {
  body: string;
  introText: string;
  conclusionText: string;
  openScanText: string;
  paragraphs: string[];
  sentences: string[];
  citationPositions: number[];
  authorMentions: Map<string, number[]>;
  rqPosition: number | undefined;
  rqAdjacentText: string;
  hasBibliographyHeading: boolean;
  hasProConHeadings: boolean;
  paragraphCount: number;
  sentenceCount: number;
  wordCount: number;
}

export function buildBodyTextIndex(
  body: string,
  scanLen = 5200,
): BodyTextIndex {
  const introText = body.slice(0, 1200);
  const conclusionText = body.slice(Math.max(0, body.length - 5000));
  const openScanText = body.slice(0, scanLen);
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const sentences = body.split(SENTENCE_SPLIT).filter((s) => s.trim().length > 8);
  const citationPositions = collectCitationIndices(body);
  const authorMentions = new Map<string, number[]>();
  const authorRe =
    /\b([A-Z][a-z]{2,})\s+(?:argues?|contends?|found|showed?|notes?|states?)\b/g;
  for (const m of body.matchAll(authorRe)) {
    if (m[1] && m.index != null) {
      const list = authorMentions.get(m[1]) ?? [];
      list.push(m.index);
      authorMentions.set(m[1], list);
    }
  }
  const rqMatch = body.search(
    /\b(?:research question|RQ|my question|I (?:ask|investigate|examine))\b/i,
  );
  const rqPosition = rqMatch >= 0 ? rqMatch : undefined;
  const rqAdjacentText =
    rqPosition != null
      ? body.slice(
          Math.max(0, rqPosition - 800),
          Math.min(body.length, rqPosition + 800),
        )
      : "";
  const hasBibliographyHeading =
    /\b(?:references|works cited|bibliography|sources)\b/i.test(body.slice(-800));
  const hasProConHeadings =
    /\b(?:pros?|cons?|advantages?|disadvantages?)\s*:/i.test(body);

  return {
    body,
    introText,
    conclusionText,
    openScanText,
    paragraphs,
    sentences,
    citationPositions,
    authorMentions,
    rqPosition,
    rqAdjacentText,
    hasBibliographyHeading,
    hasProConHeadings,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    wordCount: countWords(body),
  };
}
