import type { FunctionalRegions } from "@/lib/grader/functionalRegions";

/** True when major sections appear in a non-standard order. */
export function detectUnusualSectionOrder(regions: FunctionalRegions): boolean {
  const blocks = regions.blocks.filter((b) => b.role !== "supplementary" && b.role !== "unknown");
  const order: string[] = [];
  for (const b of blocks) {
    if (["literatureReview", "method", "results", "discussion", "conclusion", "implications"].includes(b.role)) {
      if (order[order.length - 1] !== b.role) order.push(b.role);
    }
  }

  const litIdx = order.indexOf("literatureReview");
  const methodIdx = order.indexOf("method");
  const resultsIdx = order.indexOf("results");
  const conclusionIdx = order.indexOf("conclusion");
  const discussionIdx = order.indexOf("discussion");
  const implicationsIdx = order.indexOf("implications");

  if (methodIdx >= 0 && litIdx >= 0 && methodIdx < litIdx) return true;
  if (resultsIdx >= 0 && methodIdx >= 0 && resultsIdx < methodIdx) return true;
  if (conclusionIdx >= 0 && discussionIdx >= 0 && conclusionIdx < discussionIdx) return true;
  if (implicationsIdx >= 0 && resultsIdx >= 0 && implicationsIdx < resultsIdx) return true;

  return false;
}
