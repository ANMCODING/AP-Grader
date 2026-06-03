import type { FunctionalRegions } from "@/lib/grader/functionalRegions";

export interface FunctionalRegionDebugEntry {
  region: string;
  source: string;
  preview: string;
  wordCount: number;
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function preview(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= 100 ? t : `${t.slice(0, 97)}...`;
}

function sourceForRegion(
  regionKey: keyof Pick<
    FunctionalRegions,
    | "introduction"
    | "researchQuestionRegion"
    | "literatureReview"
    | "gap"
    | "method"
    | "results"
    | "discussion"
    | "limitations"
    | "implications"
    | "conclusion"
  >,
  regions: FunctionalRegions,
): string {
  const roleMap: Record<string, string> = {
    introduction: "introduction",
    researchQuestionRegion: "researchQuestion",
    literatureReview: "literatureReview",
    gap: "gap",
    method: "method",
    results: "results",
    discussion: "discussion",
    limitations: "limitations",
    implications: "implications",
    conclusion: "conclusion",
  };
  const role = roleMap[regionKey];
  const blocks = regions.blocks.filter((b) => b.role === role);
  if (blocks.length === 0) {
    const text = regions[regionKey];
    return text.trim() ? "content-based fallback" : "not detected";
  }
  const headings = [...new Set(blocks.map((b) => b.heading.trim()).filter(Boolean))];
  if (headings.length === 1) return `heading: ${headings[0]}`;
  if (headings.length > 1) return `headings: ${headings.join("; ")}`;
  return "content-based fallback (block body)";
}

/** Full functional region map for teacher debug / FUNCTIONAL_REGION_DEBUG=1. */
export function buildFunctionalRegionDebug(
  regions: FunctionalRegions,
): FunctionalRegionDebugEntry[] {
  const keys = [
    "introduction",
    "researchQuestionRegion",
    "literatureReview",
    "gap",
    "method",
    "results",
    "discussion",
    "limitations",
    "implications",
    "conclusion",
  ] as const;

  return keys.map((region) => {
    const text = regions[region];
    return {
      region,
      source: sourceForRegion(region, regions),
      preview: preview(text),
      wordCount: wordCount(text),
    };
  });
}

export function isFunctionalRegionDebugEnabled(): boolean {
  return process.env.FUNCTIONAL_REGION_DEBUG === "1";
}

export function logFunctionalRegionDebug(regions: FunctionalRegions): void {
  if (!isFunctionalRegionDebugEnabled()) return;
  console.log(
    "[FUNCTIONAL_REGION_DEBUG]",
    JSON.stringify(buildFunctionalRegionDebug(regions), null, 2),
  );
}
