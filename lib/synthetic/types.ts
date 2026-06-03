export interface SyntheticPaperManifest {
  file: string;
  expectedAP: number;
  expectedBand: string;
  note: string;
  plannedNonExecution: boolean;
  lacksStudentData: boolean;
  futureTenseMethod: boolean;
  synthesizedGraphsOnly: boolean;
  expectedCaps: string[];
}

export interface SyntheticManifest {
  version: number;
  generatedAt: string;
  fastMode: boolean;
  papersPerLevel: number;
  skipped: number;
  regenerationAttempts: number;
  papers: SyntheticPaperManifest[];
}

export interface SlimGradeRecord {
  file: string;
  expectedAP: number;
  predictedAP: number;
  predictedBand: string;
  withinOneBand: boolean;
  allFiveCategoryScores: Record<string, { band: number; tier: string; label: string }>;
  activeCapsFired: string[];
  bodyWordCount: number;
  bodyToOriginalRatio: number;
  manifestFlagsMatchedToFiredCaps: Record<string, boolean>;
  pipelineDiagnostic?: unknown;
}

export interface GradingResultsFile {
  generatedAt: string;
  mode: "fast" | "full";
  claudeDisabled: boolean;
  elapsedMs: number;
  totalGraded: number;
  totalCorrect: number;
  accuracyPct: number;
  records: SlimGradeRecord[];
}

export interface AccuracyMetrics {
  generatedAt: string;
  sourceFile: string;
  mode: "fast" | "full";
  overallAccuracy: number;
  overallCorrect: number;
  overallTotal: number;
  byScoreLevel: Record<
    number,
    {
      total: number;
      correct: number;
      accuracyPct: number;
      avgDistance: number;
      direction: "too high" | "too low" | "balanced";
    }
  >;
  byCategory: Record<string, Record<number, number>>;
  capAccuracy: Record<string, { expected: number; fired: number; pct: number }>;
  completeness: {
    above80: number;
    below80: number;
    avgRatio: number;
  };
  falsePositives: { count: number; pct: number; files: string[] };
  falseNegatives: { count: number; pct: number; files: string[] };
  officialTierPct: number | null;
  customTierPct: number | null;
  topErrorCategory: string | null;
}

export interface BenchmarkTierResult {
  ok: number;
  total: number;
  pct: number;
  failures?: { file: string; expected: number; actual: number }[];
}

export interface BenchmarkFile {
  generatedAt: string;
  mode: "fast" | "full";
  tiers: {
    official: BenchmarkTierResult;
    custom: BenchmarkTierResult;
    synthetic: BenchmarkTierResult;
    innovation?: BenchmarkTierResult;
  };
  thresholdPct: number;
  passed: boolean;
}
