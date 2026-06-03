/**
 * Locked policy constants — must match GRADING_SPEC.md.
 * College Board official samples override these when they conflict.
 */

export const PRACTICE_DISCLAIMER =
  "This score is an automated estimate for practice and feedback purposes only. It is not an official AP score and should not be used in place of teacher feedback or College Board evaluation. AP Research papers are scored holistically by trained human readers.";

export const AP_TRADEMARK_DISCLAIMER =
  "AP Research is a trademark registered by the College Board, which is not affiliated with and does not endorse this tool.";

export const HARD_REJECT_WORD_COUNT = 450;
export const MEANINGFUL_MIN_BODY_WORDS = 500;
export const WARN_WORD_COUNT_MIN = 450;
export const WARN_WORD_COUNT_MAX = 499;
export const RECOMMENDED_MAX_BODY_WORDS = 5500;
export const MAX_PASTE_CHARACTERS = 100_000;

export const PASTE_TRUNCATION_FLAG =
  "Submission exceeded maximum length. Only the first 100,000 characters were analyzed. If your paper includes large appendices or code blocks they may have been cut off.";

export const METHOD_CONTENT_MIN_CHARS = 75;
export const CONSISTENCY_DRIFT_THRESHOLD = 0.25;
export const LIT_CITATION_DENSITY_THRESHOLD = 0.6;
export const INTRO_PRESERVE_CHARS = 400;
export const CONCLUSION_FALLBACK_CHARS = 3000;

export const OVERALL_WEIGHTS = {
  method: 0.3,
  argument: 0.3,
  scholarly: 0.25,
  focus: 0.1,
  communication: 0.05,
} as const;

/** Fill percent by band+tier (§K6). */
export const FILL_PERCENT_BY_BAND_TIER: Record<string, number> = {
  "Low-1": 8,
  "Mid-1": 15,
  "High-1": 22,
  "Low-2": 30,
  "Mid-2": 38,
  "High-2": 46,
  "Low-3": 54,
  "Mid-3": 62,
  "High-3": 70,
  "Low-4": 78,
  "Mid-4": 84,
  "High-4": 90,
  "Low-5": 94,
  "Mid-5": 97,
  "High-5": 100,
};

export const BAND_34_AMBIGUITY_NOTE =
  "AP Research papers in this score range are the most difficult to grade automatically. Your teacher's feedback may differ from this estimate.";

export const CALIBRATION_STUDENT_NOTE = (officialScore: number) =>
  `Your paper most closely resembles a College Board paper that received an official score of ${officialScore}.`;

export const CALIBRATION_CAP_DISCREPANCY_NOTE =
  "Note: Your paper's content profile resembles a higher-scoring paper but active scoring caps have lowered the overall. See flags above for details.";

export const BODY_WORD_COUNT_FLAG = (n: number) =>
  `Paper body word count: ${n.toLocaleString()} words (excluding references and appendices). References and appendix text were excluded from this count.`;

export const GRADER_VERSION = "2.0.0-spec";
