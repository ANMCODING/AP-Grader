/**
 * Fill functional regions below heading thresholds using content fingerprints.
 */

import {
  LIT_REVIEW_RESTRICT_WORD_THRESHOLD,
  MIN_CONTENT_BLOCK_WORDS,
  REGION_FILL_WORD_THRESHOLD,
  matchesConclusionFingerprint,
  matchesDiscussionFingerprint,
  matchesLiteratureReviewFingerprint,
  matchesMethodFingerprint,
  matchesResultsFingerprint,
  splitTextAtMethodFingerprint,
} from "@/lib/grader/contentRegionFingerprints";
import { expandMonolithicBlocks } from "@/lib/grader/monolithicBlockSplit";
import type { DocumentBlock, FunctionalRole } from "@/lib/grader/functionalRegions";
import { countWords } from "@/lib/grader/text";

export const CONTENT_INFERRED_SECTION_NOTE =
  "Section structure was partially inferred from content patterns rather than headings. Scores may be slightly less accurate than for papers with standard section headings.";

const FILL_ORDER: FillableRegion[] = [
  "method",
  "results",
  "literatureReview",
  "discussion",
  "conclusion",
];

const TOP_LEVEL_ROLES: FunctionalRole[] = [
  "introduction",
  "literatureReview",
  "gap",
  "method",
  "results",
  "discussion",
  "limitations",
  "implications",
  "conclusion",
];

export type FillableRegion =
  | "method"
  | "results"
  | "literatureReview"
  | "discussion"
  | "conclusion";

function findLiteratureReviewSpan(blocks: DocumentBlock[]): {
  start: number;
  end: number;
} | null {
  const litIdx = blocks.findIndex((b) => b.role === "literatureReview" && b.heading);
  if (litIdx < 0) return null;
  const start = blocks[litIdx].start;
  let end = Number.POSITIVE_INFINITY;
  for (let i = litIdx + 1; i < blocks.length; i++) {
    if (TOP_LEVEL_ROLES.includes(blocks[i].role) && blocks[i].role !== "literatureReview") {
      end = blocks[i].start;
      break;
    }
  }
  return { start, end };
}

function blockEligibleForRole(
  block: DocumentBlock,
  role: FillableRegion,
  assigned: Set<DocumentBlock>,
  litSpan: { start: number; end: number } | null,
  litWordCount: number,
): boolean {
  if (assigned.has(block)) return false;
  if (block.role !== "unknown") return false;
  if (countWords(block.body) < MIN_CONTENT_BLOCK_WORDS) return false;

  if (
    role === "literatureReview" &&
    litWordCount >= LIT_REVIEW_RESTRICT_WORD_THRESHOLD &&
    litSpan
  ) {
    if (block.start < litSpan.start || block.start >= litSpan.end) return false;
  }

  return true;
}

function fingerprintMatches(
  block: DocumentBlock,
  role: FillableRegion,
  paperBodyLength: number,
): boolean {
  const text = block.body;
  switch (role) {
    case "method":
      return matchesMethodFingerprint(text);
    case "results":
      return matchesResultsFingerprint(text);
    case "literatureReview":
      return matchesLiteratureReviewFingerprint(text);
    case "discussion":
      return matchesDiscussionFingerprint(text);
    case "conclusion":
      return matchesConclusionFingerprint(text, block.start, paperBodyLength);
    default:
      return false;
  }
}

export interface ContentRegionFallbackResult {
  contentInferredRoles: FillableRegion[];
  extraByRole: Partial<Record<FillableRegion, string[]>>;
}

/**
 * Assign unknown blocks by content fingerprint when heading regions are below threshold.
 */
export function applyContentRegionFallback(
  blocks: DocumentBlock[],
  paperBodyLength: number,
  headingWordCounts: Record<FillableRegion, number>,
): ContentRegionFallbackResult {
  const expanded = expandMonolithicBlocks(blocks, paperBodyLength);
  const monolithicSplit = expanded.length > blocks.length;
  if (monolithicSplit) {
    blocks.length = 0;
    blocks.push(...expanded);
  }

  const contentInferredRoles: FillableRegion[] = [];
  if (monolithicSplit) {
    for (const role of FILL_ORDER) {
      if (blocks.some((b) => b.role === role)) {
        contentInferredRoles.push(role);
      }
    }
  }
  const extraByRole: Partial<Record<FillableRegion, string[]>> = {};
  const assigned = new Set<DocumentBlock>();
  const litSpan = findLiteratureReviewSpan(blocks);

  for (const role of FILL_ORDER) {
    if (headingWordCounts[role] >= REGION_FILL_WORD_THRESHOLD) continue;

    let filled = false;
    const sorted = [...blocks].sort((a, b) => a.start - b.start);

    for (const block of sorted) {
      if (
        !blockEligibleForRole(
          block,
          role,
          assigned,
          litSpan,
          headingWordCounts.literatureReview,
        )
      ) {
        continue;
      }

      if (role === "method") {
        const split = splitTextAtMethodFingerprint(block.body);
        if (split && countWords(split.literature) >= 200 && countWords(split.method) >= 100) {
          block.body = split.method;
          block.role = "method";
          assigned.add(block);
          filled = true;
          extraByRole.literatureReview = [
            ...(extraByRole.literatureReview ?? []),
            split.literature,
          ];
          if (!contentInferredRoles.includes("literatureReview")) {
            contentInferredRoles.push("literatureReview");
          }
          continue;
        }
      }

      if (role === "literatureReview") {
        const split = splitTextAtMethodFingerprint(block.body);
        if (split && countWords(split.literature) >= 200) {
          block.body = split.literature;
          block.role = "literatureReview";
          assigned.add(block);
          filled = true;
          if (
            split.method.trim() &&
            headingWordCounts.method < REGION_FILL_WORD_THRESHOLD &&
            matchesMethodFingerprint(split.method)
          ) {
            extraByRole.method = [...(extraByRole.method ?? []), split.method];
            if (!contentInferredRoles.includes("method")) {
              contentInferredRoles.push("method");
            }
          }
          continue;
        }
      }

      if (!fingerprintMatches(block, role, paperBodyLength)) continue;

      block.role = role;
      assigned.add(block);
      filled = true;
    }

    if (filled && !contentInferredRoles.includes(role)) {
      contentInferredRoles.push(role);
    }
  }

  return { contentInferredRoles, extraByRole };
}

export function appendRegionExtras(
  merged: string,
  extras: string[] | undefined,
): string {
  if (!extras?.length) return merged;
  return [merged, ...extras].filter((s) => s.trim().length > 0).join("\n\n").trim();
}
