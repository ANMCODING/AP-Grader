import { CONTENT_INFERRED_SECTION_NOTE } from "@/lib/grader/contentRegionFallback";
import type { FunctionalRegions } from "@/lib/grader/functionalRegions";
import { countWords } from "@/lib/grader/text";

export interface FunctionalRegionCoverage {
  coveragePercent: number;
  unknownWordCount: number;
  bodyWordCount: number;
  flags: string[];
}

export function evaluateFunctionalRegionCoverage(
  regions: FunctionalRegions,
  bodyWordCount: number,
): FunctionalRegionCoverage {
  if (bodyWordCount < 50) {
    return { coveragePercent: 0, unknownWordCount: 0, bodyWordCount, flags: [] };
  }

  let covered = 0;
  const regionTexts = [
    regions.introduction,
    regions.researchQuestionRegion,
    regions.literatureReview,
    regions.gap,
    regions.method,
    regions.results,
    regions.discussion,
    regions.limitations,
    regions.implications,
    regions.conclusion,
  ];

  for (const text of regionTexts) {
    covered += countWords(text);
  }

  const unknownFromBlocks = regions.blocks
    .filter((b) => b.role === "unknown")
    .map((b) => b.body)
    .join("\n");
  const unknownWordCount = countWords(unknownFromBlocks);

  const coveragePercent = Math.min(
    100,
    Math.round((covered / bodyWordCount) * 1000) / 10,
  );

  const flags: string[] = [];

  if (coveragePercent < 60 && unknownWordCount / bodyWordCount > 0.4) {
    flags.push(
      "Large portions of your paper could not be mapped to standard sections. This may affect scoring accuracy. Consider using standard section headings.",
    );
  }

  const methodEmpty = countWords(regions.method) < 40;
  const resultsEmpty = countWords(regions.results) < 40;

  if (methodEmpty && resultsEmpty && bodyWordCount > 2000) {
    flags.push(
      "The engine could not identify your method or results sections. Make sure your method and results sections have clear headings. This significantly affects your Method and Argument scores.",
    );
  }

  if (countWords(regions.literatureReview) < 80 && bodyWordCount > 1500) {
    flags.push(
      "The engine could not identify your literature review. Make sure your literature review has a clear heading. This affects your Scholarly Grounding score.",
    );
  }

  if (regions.contentInferredRoles.length > 0) {
    flags.push(CONTENT_INFERRED_SECTION_NOTE);
  }

  return {
    coveragePercent,
    unknownWordCount,
    bodyWordCount,
    flags,
  };
}
