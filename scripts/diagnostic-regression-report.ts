/**
 * One-off diagnostic for regression papers (read-only report).
 * Usage: npx tsx scripts/diagnostic-regression-report.ts [path1] [path2...]
 */
import { readFileSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "@/lib/grader/gradingPipeline";
import { collectEvidence, questionConsistency } from "@/lib/grader/evidence";
import {
  applyEvidenceCategoryAndOverallCaps,
  finalizeOverallScore,
  scoreAllCategories,
  scoreFocusAndScope,
  scoreOverall,
} from "@/lib/grader/scoring";
import { applyCalibration } from "@/lib/grader/calibration";
import { gradeDeterministic } from "@/lib/grader/deterministicGrade";
import { formatBandScore, makeBand } from "@/lib/grader/format";
import type { BandScore } from "@/lib/grader/types";
import {
  computeFocusSpecificityScore,
  detectExplicitLiteratureReviewIntro,
  hasInvestigableResearchQuestion,
  isBroadQuestion,
} from "@/lib/grader/focusRules";
import { CATEGORY_NAMES } from "@/lib/grader/types";

function scoreNumeric(score: BandScore): number {
  const tierOffset = { Low: 0, Mid: 0.35, High: 0.7 } as const;
  return score.band - 1 + tierOffset[score.tier];
}

function capBandScore(score: BandScore, ceiling: BandScore): BandScore {
  return scoreNumeric(score) > scoreNumeric(ceiling) ? ceiling : score;
}

function describeWeightedFocusCap(spec: number): string {
  if (spec < 1.5) return "spec < 1.5 → ceiling Low 2";
  if (spec < 2) return "spec < 2 → ceiling Mid 2";
  if (spec < 2.5) return "spec < 2.5 → ceiling Low 3";
  if (spec < 3) return "spec < 3 → ceiling High 3";
  if (spec < 3.5) return "spec < 3.5 → ceiling Low 4";
  if (spec < 4) return "spec < 4 → ceiling High 4";
  return "spec >= 4 → no weighted cap";
}

function capFocusByWeightedSpecificity(
  score: BandScore,
  spec: number,
  hasParsedRq: boolean,
  highlySpecificFocus: boolean,
): { after: BandScore; applied: boolean; rule: string; guardFired: boolean } {
  const guardFired = !hasParsedRq || highlySpecificFocus;
  if (guardFired) {
    return {
      after: score,
      applied: false,
      rule: "GUARD: skip weighted bands (no parsed RQ OR highlySpecificFocus)",
      guardFired: true,
    };
  }
  const before = score;
  let after = score;
  if (spec < 1.5) after = capBandScore(score, makeBand(2, "Low"));
  else if (spec < 2) after = capBandScore(score, makeBand(2, "Mid"));
  else if (spec < 2.5) after = capBandScore(score, makeBand(3, "Low"));
  else if (spec < 3) after = capBandScore(score, makeBand(3, "High"));
  else if (spec < 3.5) after = capBandScore(score, makeBand(4, "Low"));
  else if (spec < 4) after = capBandScore(score, makeBand(4, "High"));
  return {
    after,
    applied: scoreNumeric(after) < scoreNumeric(before),
    rule: describeWeightedFocusCap(spec),
    guardFired: false,
  };
}

function getElementWeights(introRegion: string, researchQuestionText: string) {
  const window = `${researchQuestionText}\n${introRegion}`.slice(0, 2200);
  return runElementScores(window);
}

function runElementScores(window: string) {
  const isBiology =
    /\b(?:species|organism|plant|animal|cell|germination|sativa|lactuca|mice|rats|bacteria)\b/i.test(
      window,
    ) && !/\b[A-Z][a-z]+\s+[a-z]{3,}\b/.test(window);
  let population = 0;
  if (!isBiology) {
    if (
      /\b(?:High School|Innovation High|Roosevelt High|Lincoln High|School District|first-generation|ACEs|students with ADHD|Black adolescent|urban elementary|rural Missouri|pediatric ICU)\b/i.test(
        window,
      )
    )
      population = 1;
    else if (
      /\b(?:aged?\s+\d{1,2}\s*(?:to|-|–)\s*\d{1,2}|eighth-?grade|ninth and tenth grade|first-year|University of)\b/i.test(
        window,
      )
    )
      population = 1;
    else if (/\b[A-Z][a-z]+\s+[a-z]{3,}\b/.test(window)) population = 1;
    else if (
      /\b(?:high school students?|teenagers?|adolescents?|college students?|elementary students?)\b/i.test(
        window,
      )
    )
      population = 0.5;
  }
  let outcome = 0;
  if (
    /\b(?:GAD-7|Beck Depression|BDI|PANAS|AES|MAP scores?|SAT|state achievement|disciplinary referrals|cortisol|heart rate variability)\b/i.test(
      window,
    )
  )
    outcome = 1;
  else if (
    /\b(?:academic performance|mental health|wellbeing|well-?being|grades?|test scores?)\b/i.test(
      window,
    )
  )
    outcome = 0.5;
  else if (
    /\b(?:outcome|retention|performance|score|GPA|growth|recovery|learning|achievement|effect|correlation|rate|accuracy)\b/i.test(
      window,
    )
  )
    outcome = 0.5;
  let context = 0;
  if (
    /\b(?:Roosevelt High|Innovation High|Lincoln High|School District|urban elementary|rural Missouri|pediatric ICU|named school)\b/i.test(
      window,
    )
  )
    context = 1;
  else if (
    /\b(?:during|over\s+\d+|for\s+\d+\s+(?:weeks?|months?|days?)|competitive season|school year|\d{4})\b/i.test(
      window,
    ) ||
    /\b(?:six-?week|four-?week|one semester|academic year)\b/i.test(window)
  )
    context = 0.5;
  else if (
    /\b(?:while studying|in school|in the classroom|in the United States)\b/i.test(
      window,
    )
  )
    context = 0.5;
  let intervention = 0;
  if (
    /\b(?:intervention|treatment|condition|variable|practice|exposure|dose|concentration|versus|vs\.?|compared to|manipulation)\b/i.test(
      window,
    ) ||
    /\b\d+(?:\.\d+)?\s*(?:%|mg|ml|mm|cm|hours?|minutes?|days?|weeks?)\b/i.test(window)
  )
    intervention = 1;
  return { population, intervention, outcome, context };
}

function inferFocusBranch(ev: ReturnType<typeof collectEvidence>): {
  branch: string;
  rawBand: BandScore;
} {
  const reviewIntro = detectExplicitLiteratureReviewIntro(ev.introRegion);
  const investigableRq = hasInvestigableResearchQuestion(
    ev.introRegion,
    ev.researchQuestionText,
  );
  if (
    reviewIntro &&
    ev.researchQuestions.length === 0 &&
    !ev.highlySpecificFocus
  ) {
    return { branch: "reviewIntro + no RQ + not highlySpecific", rawBand: makeBand(1, "Low") };
  }
  if (ev.exploratoryFramingOnly && ev.researchQuestions.length === 0) {
    return { branch: "exploratoryFramingOnly", rawBand: makeBand(2, "Low") };
  }
  if (ev.hypothesisOnly && ev.researchQuestions.length === 0) {
    return { branch: "hypothesisOnly no RQ", rawBand: makeBand(3, "Mid") };
  }
  if (ev.researchQuestions.length === 0 && ev.focusSpecificityScore === 0) {
    return { branch: "no RQ + spec 0", rawBand: makeBand(1, "Low") };
  }
  const rq = ev.researchQuestions[0] ?? "";
  if (rq && isBroadQuestion(rq)) {
    return { branch: "isBroadQuestion(rq)", rawBand: makeBand(2, "Low") };
  }
  const hasParsedRq =
    ev.researchQuestions.length > 0 ||
    (ev.researchQuestionText ?? "").trim().length > 0;
  const consistency = questionConsistency(ev);
  const spec = ev.focusSpecificityScore;
  if (hasParsedRq) {
    if (spec >= 4) {
      return {
        branch: `hasParsedRq spec>=4 consistency=${consistency}`,
        rawBand: consistency === "drift" ? makeBand(4, "High") : makeBand(5, "High"),
      };
    }
    if (spec >= 3.5) {
      return {
        branch: `hasParsedRq spec>=3.5 consistency=${consistency}`,
        rawBand: consistency === "drift" ? makeBand(2, "Mid") : makeBand(4, "Mid"),
      };
    }
    if (spec >= 2.5) return { branch: "hasParsedRq spec>=2.5", rawBand: makeBand(3, "High") };
    if (spec >= 2) return { branch: "hasParsedRq spec>=2", rawBand: makeBand(4, "Low") };
    if (spec >= 1.5) return { branch: "hasParsedRq spec>=1.5", rawBand: makeBand(2, "Mid") };
  }
  if (ev.highlySpecificFocus) {
    return {
      branch: `highlySpecificFocus consistency=${consistency}`,
      rawBand:
        consistency === "narrow" || consistency === "consistent"
          ? makeBand(5, "High")
          : makeBand(4, "High"),
    };
  }
  if (consistency === "drift") return { branch: "consistency drift", rawBand: makeBand(2, "Mid") };
  if (consistency === "consistent") {
    return { branch: "consistency consistent", rawBand: makeBand(4, "Mid") };
  }
  if (consistency === "narrow") return { branch: "consistency narrow", rawBand: makeBand(5, "High") };
  return { branch: "default fallback", rawBand: makeBand(3, "Mid") };
}

function diagnose(path: string, label: string) {
  const raw = readFileSync(path, "utf-8");
  const { partition } = prepareGradingInput(raw);
  const ev = collectEvidence(partition);

  let { categories } = scoreAllCategories(partition);
  const focusFinal = categories[0];
  const preCapOverall = scoreOverall(categories);
  let overall = finalizeOverallScore(categories, preCapOverall, ev);
  const capped1 = applyEvidenceCategoryAndOverallCaps(categories, overall, ev);
  const cal = applyCalibration(ev, capped1.categories, capped1.overall);
  const capped2 = applyEvidenceCategoryAndOverallCaps(
    cal.categories,
    cal.overall,
    ev,
  );
  const det = gradeDeterministic(raw);

  const hasParsedRq =
    ev.researchQuestions.length > 0 ||
    (ev.researchQuestionText ?? "").trim().length > 0;
  const elements = getElementWeights(ev.introRegion, ev.researchQuestionText);
  const { branch, rawBand } = inferFocusBranch(ev);
  const weighted = capFocusByWeightedSpecificity(
    rawBand,
    ev.focusSpecificityScore,
    hasParsedRq,
    ev.highlySpecificFocus,
  );

  console.log(`\n${"=".repeat(72)}`);
  console.log(label);
  console.log(`Path: ${path}`);
  console.log("=".repeat(72));

  console.log("\n--- Categories (regression path, post-calibration) ---");
  cal.categories.forEach((c, i) => {
    console.log(`  ${CATEGORY_NAMES[i]}: ${formatBandScore(c)}`);
  });
  console.log(`  Overall: ${formatBandScore(cal.overall)} (AP band ${cal.overall.band})`);
  console.log(`  gradeDeterministic overall: ${det.overallLabel} (apScore ${det.apScore})`);

  console.log("\n--- Focus specificity (BUG 4) ---");
  console.log(`  focusSpecificityScore: ${ev.focusSpecificityScore}`);
  console.log(`  highlySpecificFocus: ${ev.highlySpecificFocus}`);
  console.log(`  RQ parsed: ${ev.researchQuestions.length > 0 ? "yes" : "no"}`);
  console.log(`  researchQuestions (${ev.researchQuestions.length}):`);
  for (const q of ev.researchQuestions) console.log(`    - ${JSON.stringify(q.slice(0, 200))}`);
  console.log(`  researchQuestionText: ${JSON.stringify(ev.researchQuestionText.slice(0, 300))}`);
  console.log(`  hasParsedRq (guard input): ${hasParsedRq}`);
  console.log(`  Elements (population, intervention, outcome, context):`);
  console.log(
    `    hasPopulation: ${elements.population} | hasIntervention: ${elements.intervention} | hasOutcome: ${elements.outcome} | hasContext: ${elements.context}`,
  );
  console.log(`  scoreFocus branch: ${branch}`);
  console.log(`  Focus BEFORE caps: ${formatBandScore(rawBand)}`);
  console.log(`  Weighted cap rule: ${weighted.rule}`);
  console.log(`  CB no-RQ guard fired: ${weighted.guardFired}`);
  console.log(`  Weighted cap applied: ${weighted.applied}`);
  console.log(`  Focus AFTER weighted cap: ${formatBandScore(weighted.after)}`);
  console.log(`  Focus FINAL (engine): ${formatBandScore(focusFinal)}`);

  console.log("\n--- Gap & method evidence ---");
  console.log(`  gapQuality: ${ev.gapQuality}`);
  console.log(`  demonstratedGapSignals: ${ev.demonstratedGapSignals}`);
  console.log(`  borderlineDemonstratedGap: ${ev.borderlineDemonstratedGap}`);
  console.log(`  methodElements: ${ev.methodElements}`);
  console.log(`  studentResultsSignals: ${ev.studentResultsSignals}`);
  console.log(`  methodNotExecutedHard: ${ev.methodNotExecutedHard}`);
  console.log(`  methodPartialExecution: ${ev.methodPartialExecution}`);
  console.log(`  lacksStudentGeneratedData: ${det.lacksStudentData}`);

  console.log("\n--- Active caps (applyEvidenceCategoryAndOverallCaps) ---");
  const allCaps = [...capped1.activeCapReasons, ...capped2.activeCapReasons];
  if (allCaps.length === 0) console.log("  (none)");
  else for (const c of [...new Set(allCaps)]) console.log(`  - ${c}`);

  console.log("\n--- Cap explanation flags (gradeDeterministic) ---");
  if (det.activeCaps.length === 0) console.log("  (none)");
  else for (const c of det.activeCaps) console.log(`  - ${c}`);

  console.log(`\n  questionConsistency: ${questionConsistency(ev)}`);
}

const defaults = [
  join(process.cwd(), "data/samples/ap25-apc-research-sample-b.txt"),
  join(process.cwd(), "data/test-papers/paper24-ap-biology-retrieval.txt"),
];
const paths = process.argv.length > 2 ? process.argv.slice(2) : defaults;
paths.forEach((p, i) =>
  diagnose(p, i === 0 ? "PAPER 1: ap25-apc-research-sample-b" : "PAPER 2: paper24-ap-biology-retrieval"),
);
