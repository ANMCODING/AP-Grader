import { makeBand } from "@/lib/grader/format";
import { EXTENDED_CALIBRATION_PAPERS } from "@/lib/grader/calibrationAnchorsExtended";
import type { BandScore } from "@/lib/grader/types";

/** Feature profile used to match student papers to calibration anchors. */
export interface CalibrationFeatures {
  executedMethod: boolean;
  hasStudentData: boolean;
  litSynthesis: boolean;
  litIsolation: boolean;
  methodDefended: boolean;
  sophisticatedLimitations: boolean;
  practicalLimitationsOnly: boolean;
  strongImplications: boolean;
  statisticalAnalysis: boolean;
  gapExplicit: boolean;
  methodNotExecuted: boolean;
}

export interface CalibrationPaper {
  id: string;
  sampleLabel: string;
  officialApScore: 1 | 2 | 3 | 4 | 5;
  title: string;
  discipline: string;
  features: CalibrationFeatures;
  /** Typical category band scores for this official AP level. */
  categoryAnchors: BandScore[];
}

/**
 * Five College Board calibration anchors (2025 Samples A, D, E, H, I).
 * Profiles encode official scoring commentary — not re-parsed at runtime.
 */
export const CALIBRATION_PAPERS: CalibrationPaper[] = [
  {
    id: "2025-sample-a",
    sampleLabel: "2025 Sample A",
    officialApScore: 5,
    title: "Methylene Blue Dye Removal with Loose and Compacted Coffee Grounds",
    discipline: "Environmental Science / Chemistry",
    features: {
      executedMethod: true,
      hasStudentData: true,
      litSynthesis: true,
      litIsolation: false,
      methodDefended: true,
      sophisticatedLimitations: true,
      practicalLimitationsOnly: false,
      strongImplications: true,
      statisticalAnalysis: true,
      gapExplicit: true,
      methodNotExecuted: false,
    },
    categoryAnchors: [
      makeBand(5, "High"),
      makeBand(5, "High"),
      makeBand(5, "High"),
      makeBand(5, "High"),
      makeBand(5, "Mid"),
    ],
  },
  {
    id: "2025-sample-d",
    sampleLabel: "2025 Sample D",
    officialApScore: 4,
    title: "Motivations of Second Career Teachers",
    discipline: "Education / Organizational Psychology",
    features: {
      executedMethod: true,
      hasStudentData: true,
      litSynthesis: true,
      litIsolation: false,
      methodDefended: true,
      sophisticatedLimitations: false,
      practicalLimitationsOnly: true,
      strongImplications: false,
      statisticalAnalysis: false,
      gapExplicit: true,
      methodNotExecuted: false,
    },
    categoryAnchors: [
      makeBand(4, "Mid"),
      makeBand(4, "High"),
      makeBand(4, "High"),
      makeBand(4, "Mid"),
      makeBand(4, "Mid"),
    ],
  },
  {
    id: "2025-sample-e",
    sampleLabel: "2025 Sample E",
    officialApScore: 3,
    title: "Online Sports Gambling Advertising Influence on High School Students",
    discipline: "Public Health / Media Studies",
    features: {
      executedMethod: true,
      hasStudentData: true,
      litSynthesis: true,
      litIsolation: false,
      methodDefended: false,
      sophisticatedLimitations: false,
      practicalLimitationsOnly: true,
      strongImplications: false,
      statisticalAnalysis: true,
      gapExplicit: true,
      methodNotExecuted: false,
    },
    categoryAnchors: [
      makeBand(3, "Mid"),
      makeBand(4, "Mid"),
      makeBand(3, "Mid"),
      makeBand(3, "Mid"),
      makeBand(3, "Mid"),
    ],
  },
  {
    id: "2025-sample-h",
    sampleLabel: "2025 Sample H",
    officialApScore: 2,
    title: "Thrombolysis and Frostbite: A Systematic Review",
    discipline: "Medicine",
    features: {
      executedMethod: false,
      hasStudentData: false,
      litSynthesis: true,
      litIsolation: false,
      methodDefended: true,
      sophisticatedLimitations: false,
      practicalLimitationsOnly: false,
      strongImplications: false,
      statisticalAnalysis: false,
      gapExplicit: true,
      methodNotExecuted: true,
    },
    categoryAnchors: [
      makeBand(3, "Mid"),
      makeBand(3, "Mid"),
      makeBand(3, "Low"),
      makeBand(2, "Low"),
      makeBand(3, "Mid"),
    ],
  },
  {
    id: "2025-sample-i",
    sampleLabel: "2025 Sample I",
    officialApScore: 1,
    title: "Mindful Eating: The Links Between Diet and Mental Wellness",
    discipline: "Nutrition / Public Health",
    features: {
      executedMethod: false,
      hasStudentData: false,
      litSynthesis: false,
      litIsolation: true,
      methodDefended: false,
      sophisticatedLimitations: false,
      practicalLimitationsOnly: false,
      strongImplications: false,
      statisticalAnalysis: false,
      gapExplicit: true,
      methodNotExecuted: true,
    },
    categoryAnchors: [
      makeBand(2, "Low"),
      makeBand(2, "Low"),
      makeBand(2, "Low"),
      makeBand(1, "Low"),
      makeBand(3, "Low"),
    ],
  },
];

/** Score 3 anchor — used for comparative floor rules. */
export const SCORE_3_ANCHOR = CALIBRATION_PAPERS.find(
  (p) => p.officialApScore === 3,
)!;

/** Score 4 anchor — used for comparative ceiling rules. */
export const SCORE_4_ANCHOR = CALIBRATION_PAPERS.find(
  (p) => p.officialApScore === 4,
)!;

/** Score 5 anchor — maximum category ceilings. */
export const SCORE_5_ANCHOR = CALIBRATION_PAPERS.find(
  (p) => p.officialApScore === 5,
)!;

/** Score 1 anchor — isolation / no-data reference. */
export const SCORE_1_ANCHOR = CALIBRATION_PAPERS.find(
  (p) => p.officialApScore === 1,
)!;

/** Score 2 anchor — unexecuted method reference. */
export const SCORE_2_ANCHOR = CALIBRATION_PAPERS.find(
  (p) => p.officialApScore === 2,
)!;

/** Hand-tuned anchors plus machine-built profiles from all official samples. */
export const ALL_CALIBRATION_PAPERS: CalibrationPaper[] = [
  ...CALIBRATION_PAPERS,
  ...EXTENDED_CALIBRATION_PAPERS,
];
