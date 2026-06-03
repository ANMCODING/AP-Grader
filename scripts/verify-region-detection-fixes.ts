/**
 * Verification for functional region detection fixes (Tests 1–3).
 * Run: npx tsx scripts/verify-region-detection-fixes.ts
 */
import { identifyFunctionalRegions, normalizeHeadingForMatch } from "../lib/grader/functionalRegions";
import { extractResearchQuestionsFromPaper } from "../lib/grader/focusRules";
import { collectEvidence } from "../lib/grader/evidence";
import { scoreFocusAndScope } from "../lib/grader/scoring";
import { formatBandScore } from "../lib/grader/format";
import { buildFunctionalRegionDebug } from "../lib/grader/functionalRegionDebug";

function mechanism(
  regions: ReturnType<typeof identifyFunctionalRegions>,
  role: string,
  heading: string,
): string {
  const block = regions.blocks.find((b) => b.heading === heading);
  if (!block) return "heading line not detected";
  if (block.role === role) {
    const norm = normalizeHeadingForMatch(heading);
    return block.headingNormalized !== heading.trim()
      ? `heading alias (normalized: "${norm}")`
      : "heading alias";
  }
  return `misrouted → ${block.role}`;
}

// --- Test 1 ---
const test1Body = [
  "Background and Context",
  "Prior work (Smith, 2020) established foundations. Jones (2019) extended the model. Lee (2021) added nuance.",
  "",
  "The Problem",
  "No study has examined this combination in high school students (Smith, 2020).",
  "",
  "My Approach",
  "Participants were recruited from two classes. Data were collected using surveys. I conducted interviews with n = 24.",
  "",
  "What I Found",
  "47% of participants reported significant effects. Results showed p < .05. Theme 1 emerged from interviews.",
  "",
  "Why This Matters",
  "These findings suggest educators should consider new practices for practitioners.",
  "",
  "What This Study Could Not Do",
  "One limitation is the small sample. Results cannot be generalized beyond this school.",
].join("\n");

const r1 = identifyFunctionalRegions(test1Body);
console.log("=== Test 1: student heading routing ===");
const t1 = [
  ["Background and Context", "literatureReview"],
  ["The Problem", "gap"],
  ["My Approach", "method"],
  ["What I Found", "results"],
  ["Why This Matters", "implications"],
  ["What This Study Could Not Do", "limitations"],
] as const;
for (const [h, role] of t1) {
  console.log(`  ${h} → ${mechanism(r1, role, h)}`);
}

// --- Test 2 ---
const test2Intro = [
  "Introduction",
  "This study examines whether listening to music with lyrics affects short-term memory performance in high school students.",
  "Prior research (Smith, 2020) links music and cognition.",
].join("\n");
const rqs = extractResearchQuestionsFromPaper(test2Intro);
const test2Paper =
  test2Intro +
  "\n\nLiterature Review\n" +
  "(Smith, 2020) and (Jones, 2019) discuss memory and music.\n\n" +
  "Method\nParticipants were high school students (n=30).\n\n" +
  "Results\nMean recall differed between conditions, p < .05.\n\n" +
  "References\nSmith, A. (2020). Memory. Journal.\n";
const ev2 = collectEvidence(test2Paper);
const focus2 = scoreFocusAndScope(ev2);
console.log("\n=== Test 2: RQ without question mark ===");
console.log(`  RQ candidates: ${rqs.length > 0 ? rqs[0].slice(0, 80) + "..." : "NONE"}`);
console.log(`  Focus band: ${formatBandScore(focus2)} (need Mid 3+)`);
console.log(`  Pass: ${rqs.length > 0 && focus2.band >= 3 ? "YES" : "NO"}`);

// --- Test 3 ---
const test3 = [
  "This paper explores adolescent sleep and academic performance through a synthesis of prior empirical work.",
  "Smith (2020) found that later school start times improved attendance.",
  "Jones (2019) reported mixed effects on GPA in rural districts.",
  "Lee (2021) noted parental involvement moderated outcomes.",
  "For this study I surveyed 42 juniors using Google Forms.",
  "Participants completed the Pittsburgh Sleep Quality Index.",
  "Mean sleep duration was 6.2 hours; 61% reported feeling tired during first period.",
  "These findings suggest schools should evaluate start times.",
  "One limitation is self-reported sleep data.",
].join(" ");

const r3 = identifyFunctionalRegions(test3);
const debug3 = buildFunctionalRegionDebug(r3);
console.log("\n=== Test 3: headless prose regions ===");
for (const d of debug3) {
  if (d.wordCount > 0) console.log(`  ${d.region}: ${d.wordCount} words (${d.source})`);
}
const missed = debug3.filter((d) => d.wordCount === 0).map((d) => d.region);
console.log(`  Missed entirely: ${missed.length ? missed.join(", ") : "none"}`);

// Colon + So What? spot checks
console.log("\n=== Spot checks ===");
for (const h of ["Literature Review: Background", "Method: Participants", "So What?"]) {
  const mini = `${h}\n\n${"x".repeat(200)}`;
  const rb = identifyFunctionalRegions(mini).blocks.find((b) => b.heading === h);
  console.log(`  "${h}" → ${rb?.role ?? "not a heading"}`);
}
