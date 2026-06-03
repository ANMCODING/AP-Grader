/**
 * Machine-readable policy from calibration Q&A (Sections 1–12).
 * Versioned with SEMINAR_GRADER_VERSION.
 */

/** Default exam year when not detected from submission metadata. */
export const DEFAULT_STIMULUS_YEAR = "2025";

/** IWA regression: max absolute diff from official total. */
export const IWA_REGRESSION_TOLERANCE = 3;

/** IRR regression tolerance (unchanged). */
export const IRR_REGRESSION_TOLERANCE = 3;

/** Practical max total when Row 1 = 0 (theoretical max 43). */
export const IWA_MAX_TOTAL_WITHOUT_STIMULUS = 35;

/** Quality band ranges (IWA /48). */
export const IWA_QUALITY_BANDS = {
  belowMinimum: { min: 0, max: 15 },
  developing: { min: 16, max: 30 },
  strong: { min: 31, max: 42 },
  high: { min: 43, max: 48 },
} as const;

/** Row 1 integration quality thresholds (0–5 scale). */
export const ROW1_DEEP_INTEGRATION_FUNCTIONS_MIN = 3;
export const ROW1_STRONG_INTEGRATION_FUNCTIONS_MIN = 2;
export const ROW1_ADEQUATE_INTEGRATION_SECTIONS_MIN = 2;
export const ROW1_BASIC_COMMENTARY_SENTENCES_MIN = 1;
export const ROW1_MARGINAL_APPEARANCE_MAX = 1;

/** Row 2 specificity gate. */
export const ROW2_SPECIFICITY_THRESHOLD = 4;

/** Row 5 = 9 gates. */
export const ROW5_NINE_CREDIBILITY_MIN = 12;
export const ROW5_NINE_SCHOLARLY_RATIO_MIN = 0.5;
export const ROW5_NINE_ANALYSIS_DEPTH_MIN = 2;
export const ROW5_NINE_MIN_TIER1_OR_TIER2_SOURCES = 2;

/** Row 6 linking ratio gates (primary signal). */
export const ROW6_LINKING_RATIO_FIVE = 0.9;
export const ROW6_LINKING_RATIO_THREE = 0.7;

/** Anchor note only — discrepancy triggers LOW confidence. */
export const ANCHOR_DISCREPANCY_LOW_CONFIDENCE = 12;

/** IWA Word Count Constants (CB-aligned, seminar-3.1.1). */
export const IWA_PREFLIGHT_FLOOR = 400;
export const IWA_BAND_SEVERE_MAX = 800;
export const IWA_BAND_SIGNIFICANT_MAX = 1200;
export const IWA_BAND_MODERATE_MAX = 1600;
export const IWA_BAND_MINOR_MAX = 1799;
export const IWA_CB_MIN = 1800;
export const IWA_CB_MAX = 2200;

/** IWA body word count gates (body text only, after cover/reference strip). */
export const IWA_WORD_COUNT_HARD_FLOOR = IWA_PREFLIGHT_FLOOR;
export const IWA_WORD_COUNT_WARNING_FLOOR = 800;
export const IWA_WORD_COUNT_WARNING_CEILING = IWA_CB_MAX;

/** IRR Word Count Constants (CB-aligned, seminar-3.1.1). */
export const IRR_PREFLIGHT_FLOOR = 400;
export const IRR_BAND_SEVERE_MAX = 600;
export const IRR_BAND_SIGNIFICANT_MAX = 800;
export const IRR_BAND_MODERATE_MAX = 1000;
export const IRR_BAND_MINOR_MAX = 1079;
export const IRR_CB_MIN = 1080;
export const IRR_CB_MAX = 1320;

/** IRR body word count gates. */
export const IRR_WORD_COUNT_HARD_FLOOR = IRR_PREFLIGHT_FLOOR;
export const IRR_WORD_COUNT_WARNING_FLOOR = 1100;
