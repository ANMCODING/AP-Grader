/**
 * Split single-block papers (no headings) into functional regions by content fingerprints.
 */

import {
  citationDensityPer150Words,
  matchesConclusionFingerprint,
  matchesDiscussionFingerprint,
  matchesLiteratureReviewFingerprint,
  matchesMethodFingerprint,
  matchesResultsFingerprint,
  splitTextAtMethodFingerprint,
} from "@/lib/grader/contentRegionFingerprints";
import type { DocumentBlock, FunctionalRole } from "@/lib/grader/functionalRegions";
import { countWords } from "@/lib/grader/text";

function findSectionStart(
  text: string,
  matcher: (slice: string) => boolean,
  minWords = 80,
): number {
  const sents = text.split(/(?<=[.!?])\s+/);
  let offset = 0;
  for (let i = 0; i < sents.length; i++) {
    const tail = sents.slice(i).join(" ");
    if (countWords(tail) >= minWords && matcher(tail)) {
      return offset;
    }
    offset += sents[i].length + 1;
  }
  return -1;
}

const METHOD_ANCHOR =
  /\b(?:for\s+this\s+study|in\s+this\s+study|I\s+recruited|I\s+conducted|I\s+administered|participants\s+were\s+recruited|methods?\s+that\s+this\s+research|mainly\s+focused\s+on\s+were|repertory\s+grid|in\s+depth\s+scan\s+at\s+the\s+multiple)\b/i;
const RESULTS_ANCHOR =
  /\b(?:the\s+survey\s+showed|analysis\s+revealed|findings?\s+indicate|findings?\s+that\s+were\s+obtained|the\s+data\s+that\s+has\s+been\s+collected|theme\s+\d|table\s+1|figure\s+1|\d+\s+percent\s+of\s+(?:participants|countries))\b/i;
const DISCUSSION_ANCHOR =
  /\b(?:these\s+findings?\s+suggest|one\s+possible\s+explanation|a\s+limitation\s+of\s+this\s+study)\b/i;
const CONCLUSION_ANCHOR =
  /\b(?:in\s+conclusion|in\s+summary|to\s+conclude|taken\s+together|to\s+conclude\s+what\s+has\s+been\s+spoken)\b/i;

function findAnchorIndex(text: string, pattern: RegExp): number {
  const m = text.search(pattern);
  return m >= 0 ? m : -1;
}

function segmentBodyByAnchors(
  text: string,
  pushSlice: (role: FunctionalRole, slice: string) => void,
  blockStart: number,
  paperBodyLength: number,
): void {
  const ordered = (
    [
      { idx: findAnchorIndex(text, METHOD_ANCHOR), role: "method" as FunctionalRole },
      { idx: findAnchorIndex(text, RESULTS_ANCHOR), role: "results" as FunctionalRole },
      { idx: findAnchorIndex(text, DISCUSSION_ANCHOR), role: "discussion" as FunctionalRole },
      {
        idx: findAnchorIndex(text, CONCLUSION_ANCHOR),
        role: "conclusion" as FunctionalRole,
      },
    ] as { idx: number; role: FunctionalRole }[]
  )
    .filter((c) => c.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  const seen = new Set<number>();
  const unique = ordered.filter((c) => {
    if (seen.has(c.idx)) return false;
    seen.add(c.idx);
    return true;
  });

  for (let i = 0; i < unique.length; i++) {
    const start = unique[i].idx;
    const end = i + 1 < unique.length ? unique[i + 1].idx : text.length;
    const slice = text.slice(start, end).trim();
    const role = unique[i].role;
    if (countWords(slice) < 40) continue;
    pushSlice(role, slice);
  }
}

const PAST_THIRD_PERSON_REPORTING =
  /\b(?:found\s+that|reported\s+that|demonstrated\s+that|showed\s+that|argued\s+that|concluded\s+that|suggested\s+that|indicated\s+that|established\s+that|noted\s+that|has\s+shown|have\s+shown)\b/i;

const FIRST_PERSON_COLLECTION =
  /\b(?:I\s+collected|I\s+administered|I\s+recruited|I\s+surveyed|I\s+interviewed)\b/i;

/** Relaxed lit fingerprint for monolithic split (min 100 words). */
function matchesLitSlice(text: string): boolean {
  const words = countWords(text);
  if (words >= 200) return matchesLiteratureReviewFingerprint(text);
  if (words < 80) return false;
  if (citationDensityPer150Words(text) <= 1) return false;
  if (!PAST_THIRD_PERSON_REPORTING.test(text)) return false;
  if (FIRST_PERSON_COLLECTION.test(text)) return false;
  return true;
}

function peelLeadingQuestion(block: DocumentBlock): void {
  const m = block.body.match(/^([\s\S]{15,500}\?)\s+([\s\S]+)$/);
  if (!m || countWords(m[2]) < 120) return;
  block.heading = block.heading || m[1].trim();
  block.body = m[2].trim();
  if (block.role === "researchQuestion") {
    block.role = "unknown";
  }
}

/**
 * Replace one large unheaded block with multiple role-tagged blocks (Case 1 / no headings).
 */
export function expandMonolithicBlocks(
  blocks: DocumentBlock[],
  paperBodyLength: number,
): DocumentBlock[] {
  const out: DocumentBlock[] = [];

  for (const block of blocks) {
    peelLeadingQuestion(block);

    const words = countWords(block.body);
    const monolithic =
      words >= 250 &&
      (block.role === "unknown" ||
        block.role === "introduction" ||
        block.role === "researchQuestion" ||
        block.role === "limitations");

    if (!monolithic) {
      out.push(block);
      continue;
    }

    let text = block.body;
    let cursor = block.start;
    const pushSlice = (role: FunctionalRole, slice: string) => {
      const trimmed = slice.trim();
      if (countWords(trimmed) < 40) return;
      out.push({
        heading: "",
        headingNormalized: "",
        body: trimmed,
        start: cursor,
        end: cursor + trimmed.length,
        role,
      });
      cursor += trimmed.length + 2;
    };

    const litMethod = splitTextAtMethodFingerprint(text);
    if (litMethod && countWords(litMethod.literature) >= 80) {
      const litSlice = litMethod.literature;
      const denseLit =
        citationDensityPer150Words(litSlice) >= 1.5 &&
        PAST_THIRD_PERSON_REPORTING.test(litSlice) &&
        !FIRST_PERSON_COLLECTION.test(litSlice);
      const narrativeLitSlice =
        /\b(?:studies?\s+(?:are|have|show)|research\s+(?:has|shows)|found\s+that|reported\s+that|key\s+point\s+that\s+will\s+be\s+brought\s+up)\b/i.test(
          litSlice,
        );
      if (matchesLitSlice(litSlice) || denseLit || narrativeLitSlice) {
        pushSlice("literatureReview", litSlice);
      } else {
        pushSlice("unknown", litSlice);
      }
      text = litMethod.method;
    } else if (matchesLitSlice(text) || matchesLiteratureReviewFingerprint(text)) {
      const methodAt = findSectionStart(text, matchesMethodFingerprint, 100);
      if (methodAt > 0) {
        pushSlice("literatureReview", text.slice(0, methodAt));
        text = text.slice(methodAt);
      }
    }

    segmentBodyByAnchors(text, pushSlice, block.start, paperBodyLength);

    if (block.heading && block.role === "researchQuestion") {
      out.unshift({
        heading: block.heading,
        headingNormalized: block.heading,
        body: "",
        start: block.start,
        end: block.start + block.heading.length,
        role: "researchQuestion",
      });
    }
  }

  return out.length > 0 ? out : blocks;
}
