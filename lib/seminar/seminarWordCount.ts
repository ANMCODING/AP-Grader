import type { SeminarTask } from "@/lib/seminar/seminarTypes";

export interface SeminarWordCountFlags {
  flags: string[];
  completenessLevel: "green" | "yellow" | "orange" | "red";
  completenessMessage: string;
}

export function iwaWordCountFlags(
  bodyWordCount: number,
  statedWordCount: number | null,
): SeminarWordCountFlags {
  const flags: string[] = [];
  let completenessLevel: SeminarWordCountFlags["completenessLevel"] = "green";
  let completenessMessage = `Body word count: ${bodyWordCount} (IWA target 1,400–2,000 words).`;

  if (bodyWordCount < 800) {
    flags.push(
      "This submission is significantly shorter than expected for an IWA. Essays below 800 words cannot demonstrate the full range of skills the rubric assesses. Row scores may not accurately reflect your writing ability.",
    );
    completenessLevel = "red";
    completenessMessage = `Body word count: ${bodyWordCount} — below 800 words.`;
  } else if (bodyWordCount < 1200) {
    flags.push(
      "Your IWA is shorter than the 1,400–2,000 word range where most strong papers fall. Consider whether you have fully developed your argument, engaged all perspectives, and addressed implications.",
    );
    completenessLevel = "yellow";
    completenessMessage = `Body word count: ${bodyWordCount} — below typical strong-paper range.`;
  } else if (bodyWordCount <= 2000) {
    completenessLevel = "green";
    completenessMessage = `Body word count: ${bodyWordCount} (within typical IWA range).`;
  } else if (bodyWordCount <= 2200) {
    flags.push(
      "Your paper is slightly above the 2,000-word guideline. AP Seminar readers typically score only up to the word limit.",
    );
    completenessLevel = "yellow";
    completenessMessage = `Body word count: ${bodyWordCount} (slightly above 2,000-word guideline).`;
  } else {
    flags.push(
      "Your paper exceeds the 2,200-word maximum (2,000 words plus 10% cushion). AP Seminar readers score only the first 2,200 words.",
    );
    completenessLevel = "orange";
    completenessMessage = `Body word count: ${bodyWordCount} — exceeds 2,200-word maximum.`;
  }

  if (
    statedWordCount != null &&
    statedWordCount > 0 &&
    bodyWordCount < statedWordCount * 0.55
  ) {
    flags.push(
      `Your cover page lists ${statedWordCount} words, but only about ${bodyWordCount} words were detected in the body. The submission may be incomplete.`,
    );
    completenessLevel = "orange";
  }

  return { flags, completenessLevel, completenessMessage };
}

export function irrWordCountFlags(
  bodyWordCount: number,
  statedWordCount: number | null,
): SeminarWordCountFlags {
  const flags: string[] = [];
  let completenessLevel: SeminarWordCountFlags["completenessLevel"] = "green";
  let completenessMessage = `Body word count: ${bodyWordCount} (IRR target 1,080–1,200 words).`;

  if (bodyWordCount < 800) {
    flags.push(
      "This submission is far below the 1,080-word minimum for an IRR (1,200 words minus 10% cushion). Papers this short cannot demonstrate sufficient research breadth. All row scores may be significantly underestimated.",
    );
    completenessLevel = "red";
    completenessMessage = `Body word count: ${bodyWordCount} — far below IRR minimum.`;
  } else if (bodyWordCount < 1080) {
    flags.push(
      "This IRR is below the 1,080-word minimum. College Board allows a 10% reduction from the 1,200-word requirement. Your paper should be at least 1,080 words to meet the minimum standard.",
    );
    completenessLevel = "yellow";
    completenessMessage = `Body word count: ${bodyWordCount} — below 1,080-word minimum.`;
  } else if (bodyWordCount <= 1200) {
    completenessLevel = "green";
    completenessMessage = `Body word count: ${bodyWordCount} (within IRR target range).`;
  } else if (bodyWordCount <= 1320) {
    flags.push(
      "Your IRR is slightly above 1,200 words but within the 10% cushion. This should not significantly affect scoring.",
    );
    completenessLevel = "yellow";
    completenessMessage = `Body word count: ${bodyWordCount} (within 10% cushion above 1,200).`;
  } else {
    flags.push(
      "Your IRR exceeds the 1,320-word maximum (1,200 words plus 10% cushion). AP Seminar readers typically score only up to the word limit.",
    );
    completenessLevel = "orange";
    completenessMessage = `Body word count: ${bodyWordCount} — exceeds 1,320-word maximum.`;
  }

  if (
    statedWordCount != null &&
    statedWordCount > 0 &&
    bodyWordCount < statedWordCount * 0.55
  ) {
    flags.push(
      `Stated word count (${statedWordCount}) is much higher than detected body words (${bodyWordCount}).`,
    );
    completenessLevel = "orange";
  }

  return { flags, completenessLevel, completenessMessage };
}

export function seminarWordCountFlags(
  task: SeminarTask,
  bodyWordCount: number,
  statedWordCount: number | null,
): SeminarWordCountFlags {
  return task === "iwa"
    ? iwaWordCountFlags(bodyWordCount, statedWordCount)
    : irrWordCountFlags(bodyWordCount, statedWordCount);
}
