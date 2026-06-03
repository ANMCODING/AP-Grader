import type { SeminarEvidence } from "@/lib/seminar/seminarTypes";
import { classifyIwaAnchor, classifyIrrAnchor } from "@/lib/seminar/seminarEvidence";
import { ANCHOR_DISCREPANCY_LOW_CONFIDENCE } from "@/lib/seminar/seminarPolicy";

export type AnchorTier = "high" | "mid" | "low" | "none";

const IWA_ANCHOR_PROFILES: Record<Exclude<AnchorTier, "none">, number[]> = {
  high: [5, 5, 9, 12, 9, 5, 3],
  mid: [5, 0, 6, 8, 6, 5, 3],
  low: [0, 0, 0, 0, 0, 0, 0],
};

const IRR_ANCHOR_PROFILES: Record<Exclude<AnchorTier, "none">, number[]> = {
  high: [6, 6, 6, 6, 3, 3],
  mid: [4, 4, 4, 4, 2, 2],
  low: [2, 2, 2, 2, 1, 1],
};

function totalDelta(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + Math.abs(v - (b[i] ?? 0)), 0);
}

export interface AnchorComparison {
  tier: AnchorTier;
  profile: number[] | null;
  signalTotal: number;
  anchorTotal: number | null;
  discrepancy: boolean;
  note: string | null;
}

export function compareIwaToAnchor(
  signalScores: number[],
  e: SeminarEvidence,
): AnchorComparison {
  const tier = classifyIwaAnchor(e);
  const profile = tier !== "none" ? IWA_ANCHOR_PROFILES[tier] : null;
  const signalTotal = signalScores.reduce((a, b) => a + b, 0);
  const anchorTotal = profile?.reduce((a, b) => a + b, 0) ?? null;
  const delta = profile ? totalDelta(signalScores, profile) : 0;
  const discrepancy =
    tier !== "none" && delta >= ANCHOR_DISCREPANCY_LOW_CONFIDENCE;

  let note: string | null = null;
  if (tier === "high") {
    note =
      "Your paper's signal profile most closely resembles College Board high-scoring IWA samples (48/48): strong stimulus integration, multiple synthesized perspectives, and student-driven argument.";
  } else if (tier === "mid") {
    note =
      "Your paper's profile most closely resembles mid-range official samples (33–35/48): solid argument and sources, with room to strengthen context-significance linking or perspective synthesis.";
  } else if (tier === "low") {
    note =
      "Your paper's profile resembles low-scoring official samples: focus on taking a clear position, integrating stimulus sources into the argument, and using well-vetted evidence with complete citations.";
  }
  if (discrepancy) {
    note =
      (note ?? "") +
      " Some row scores differ from the typical anchor pattern — review per-row feedback.";
  }

  return { tier, profile, signalTotal, anchorTotal, discrepancy, note };
}

export function compareIrrToAnchor(
  signalScores: number[],
  e: SeminarEvidence,
): AnchorComparison {
  const tier = classifyIrrAnchor(e);
  const profile = tier !== "none" ? IRR_ANCHOR_PROFILES[tier] : null;
  const signalTotal = signalScores.reduce((a, b) => a + b, 0);
  const anchorTotal = profile?.reduce((a, b) => a + b, 0) ?? null;
  const delta = profile ? totalDelta(signalScores, profile) : 0;
  const discrepancy = tier !== "none" && delta >= 8;

  let note: string | null = null;
  if (tier === "high") {
    note =
      "Profile aligns with high IRR samples (30/30): specific context, explained source reasoning, and systematic source evaluation.";
  } else if (tier === "mid") {
    note =
      "Profile aligns with mid IRR samples (~20/30): strengthen methodology explanation and cross-source synthesis.";
  } else if (tier === "low") {
    note =
      "Profile aligns with low IRR samples (~10/30): add context, explain source arguments, and evaluate credibility.";
  }
  if (discrepancy) {
    note = (note ?? "") + " Per-row scores may vary from the anchor template.";
  }

  return { tier, profile, signalTotal, anchorTotal, discrepancy, note };
}
