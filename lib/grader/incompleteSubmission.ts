/** Detect and message incomplete pastes (stated word count >> received body). */

export const INCOMPLETE_SUBMISSION_CONFIDENCE_NOTE =
  "Score reliability is LOW because the submitted text appears to be significantly shorter than the stated word count. Resubmit with complete paper text for a reliable score.";

export const INCOMPLETE_SUBMISSION_TIP =
  "How to fix this: In Google Docs press Ctrl+A or Cmd+A to select all text, then Ctrl+C or Cmd+C to copy, then paste into this tool. Make sure you scroll to the bottom of your document before copying to confirm all content is selected including your references section and any appendices.";

export function isIncompleteSubmission(
  statedWordCount: number | null,
  bodyWordCount: number,
  originalInputWordCount?: number,
): boolean {
  if (statedWordCount === null || statedWordCount <= 500) return false;
  const receivedWords = originalInputWordCount ?? bodyWordCount;
  if (receivedWords <= 0) return true;
  if (bodyWordCount / statedWordCount < 0.75) return true;
  if (receivedWords / statedWordCount < 0.75) return true;
  return false;
}

export function isUrgentIncompleteSubmission(
  statedWordCount: number | null,
  bodyWordCount: number,
): boolean {
  if (statedWordCount === null || statedWordCount <= 0) return false;
  return bodyWordCount / statedWordCount < 0.5;
}

export function buildIncompleteSubmissionWarning(
  statedWordCount: number,
  receivedWordCount: number,
  bodyWordCount?: number,
): string {
  const bodyNote =
    bodyWordCount !== undefined
      ? ` Only ${bodyWordCount.toLocaleString()} words were scored as paper body (excluding references).`
      : "";
  return (
    `Incomplete submission detected. Your paper states ${statedWordCount.toLocaleString()} words but only ${receivedWordCount.toLocaleString()} words were received by the engine.${bodyNote} ` +
    `This usually means only part of your paper was pasted or boundaries were mis-detected. Please resubmit with your complete paper text selected from top to bottom. ` +
    `Scores shown below are based only on the incomplete text received and may significantly underestimate your actual paper quality.`
  );
}
