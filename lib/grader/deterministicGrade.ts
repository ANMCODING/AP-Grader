/**
 * Deterministic grading path (no Claude) — same core as regression & synthetic suite.
 */
import {
  applyCalibration,
  buildStudentProfile,
  findClosestCalibration,
} from "@/lib/grader/calibration";
import { buildCapExplanationFlags } from "@/lib/grader/capFlags";
import { formatBandScore } from "@/lib/grader/format";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import {
  lacksStudentGeneratedData,
  type PaperEvidence,
} from "@/lib/grader/evidence";
import {
  applyEvidenceCategoryAndOverallCaps,
  finalizeOverallScore,
  scoreAllCategories,
  scoreOverall,
} from "@/lib/grader/scoring";
import { CATEGORY_NAMES } from "@/lib/grader/types";
import type { BandScore } from "@/lib/grader/types";
import type { SubmissionPipelineDiagnostic } from "@/lib/grader/pipelineDiagnostic";

export function disableExternalGrading(): void {
  process.env.ANTHROPIC_API_KEY = "";
}

export interface DeterministicGradeResult {
  rejected: boolean;
  rejectionFlag: string | null;
  overall: BandScore;
  overallLabel: string;
  apScore: number;
  categories: { name: string; label: string; band: number; tier: string }[];
  activeCaps: string[];
  flags: string[];
  bodyWordCount: number;
  statedWordCount: number | null;
  bodyToOriginalRatio: number;
  pipelineDiagnostic: SubmissionPipelineDiagnostic;
  calibrationAnchorAp: number;
  lacksStudentData: boolean;
  methodNotExecutedHard: boolean;
  futureTenseMethodDominant: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: PaperEvidence;
}

export function gradeDeterministic(
  rawText: string,
  options?: { joinSoftLineBreaksWordCount?: number | null },
): DeterministicGradeResult {
  disableExternalGrading();
  const { partition } = prepareGradingInput(rawText, {
    joinSoftLineBreaksWordCount: options?.joinSoftLineBreaksWordCount ?? null,
  });

  const { evidence, categories: rawCats } = scoreAllCategories(partition);
  let categories = rawCats;
  let overall = scoreOverall(categories);
  overall = finalizeOverallScore(categories, overall, evidence);

  let capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
  categories = capped.categories;
  overall = capped.overall;

  const cal = applyCalibration(evidence, categories, overall);
  categories = cal.categories;
  overall = cal.overall;

  const postCaps = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
  const activeCaps = [
    ...postCaps.activeCapReasons,
    ...buildCapExplanationFlags(evidence, postCaps.categories, postCaps.overall),
  ];

  const profile = buildStudentProfile(evidence);
  const closest = findClosestCalibration(profile);

  const catOut = CATEGORY_NAMES.map((name, i) => ({
    name,
    label: formatBandScore(categories[i]),
    band: categories[i].band,
    tier: categories[i].tier,
  }));

  const d = partition.pipelineDiagnostic;
  return {
    rejected: false,
    rejectionFlag: null,
    overall: postCaps.overall,
    overallLabel: formatBandScore(postCaps.overall),
    apScore: postCaps.overall.band,
    categories: catOut,
    activeCaps,
    flags: [...partition.pipelineFlags, ...activeCaps],
    bodyWordCount: partition.bodyWordCount,
    statedWordCount: partition.statedWordCount,
    bodyToOriginalRatio: d.bodyToOriginalRatio,
    pipelineDiagnostic: d,
    calibrationAnchorAp: closest.officialApScore,
    lacksStudentData: lacksStudentGeneratedData(evidence),
    methodNotExecutedHard: evidence.methodNotExecutedHard,
    futureTenseMethodDominant: evidence.futureTenseMethodDominant,
    confidence: "MEDIUM",
    evidence,
  };
}
