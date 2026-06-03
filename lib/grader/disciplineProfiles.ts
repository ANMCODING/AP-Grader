import { makeBand } from "@/lib/grader/format";
import type { BandScore } from "@/lib/grader/types";
import type { PaperEvidence } from "@/lib/grader/evidence";

export type DetectedDiscipline =
  | "natural_sciences"
  | "humanities"
  | "social_sciences"
  | "education"
  | "general";

export interface DisciplineDetection {
  discipline: DetectedDiscipline;
  flag: string | null;
}

export function detectDiscipline(ev: PaperEvidence): DisciplineDetection {
  const text = `${ev.methodSection}\n${ev.literatureReview}\n${ev.introRegion}`.slice(
    0,
    8000,
  );

  if (
    /\b(?:species|compound|chemical|laboratory|experiment|ANOVA|t-test|hypothesis|control\s+group|mg\/|ml\/|sativa|organism)\b/i.test(
      text,
    )
  ) {
    return {
      discipline: "natural_sciences",
      flag: null,
    };
  }

  if (
    /\b(?:theoretical\s+framework|close\s+reading|primary\s+sources?|historical\s+period|literary|discourse|phenomenolog|hermeneutic)\b/i.test(
      text,
    )
  ) {
    return {
      discipline: "humanities",
      flag: null,
    };
  }

  if (
    /\b(?:students?|teachers?|classroom|curriculum|learning\s+outcomes?|pedagogy|instruction)\b/i.test(
      text,
    ) &&
    /\b(?:survey|interview|education|teaching)\b/i.test(text)
  ) {
    return {
      discipline: "education",
      flag: null,
    };
  }

  if (
    /\b(?:survey|interview|participants?|psycholog|sociolog|IRB|human\s+subjects)\b/i.test(
      text,
    )
  ) {
    return {
      discipline: "social_sciences",
      flag: null,
    };
  }

  return { discipline: "general", flag: null };
}

function scoreNumeric(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

function numericToBand(n: number): BandScore {
  const clamped = Math.min(4.7, Math.max(0, n));
  const band = Math.min(5, Math.max(1, Math.floor(clamped) + 1)) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  const frac = clamped - (band - 1);
  let tier: "Low" | "Mid" | "High" = "Low";
  if (frac >= 0.55) tier = "High";
  else if (frac >= 0.2) tier = "Mid";
  return makeBand(band, tier);
}

/** At most one tier adjustment on overall after base scoring. */
export function applyDisciplineOverallAdjustment(
  ev: PaperEvidence,
  overall: BandScore,
): { overall: BandScore; flag: string | null } {
  const { discipline } = detectDiscipline(ev);
  const n = scoreNumeric(overall);

  if (discipline === "humanities" && ev.humanitiesDemonstratedGap && n < scoreNumeric(makeBand(3, "Mid"))) {
    return {
      overall: numericToBand(Math.min(scoreNumeric(makeBand(3, "Mid")), n + 0.35)),
      flag: null,
    };
  }

  if (
    discipline === "natural_sciences" &&
    ev.inferentialStatsPresent &&
    n < scoreNumeric(makeBand(3, "Low"))
  ) {
    return {
      overall: numericToBand(n + 0.35),
      flag: null,
    };
  }

  return { overall, flag: null };
}
