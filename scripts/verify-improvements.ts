/**
 * Verification tests from improvement prompt.
 * Run: npx tsx scripts/verify-improvements.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { collectEvidence } from "../lib/grader/evidence";
import { identifyFunctionalRegions } from "../lib/grader/functionalRegions";
import { isBibliographyHeadingLine } from "../lib/grader/paperBoundaries";
import { scoreAllCategories, scoreOverall } from "../lib/grader/scoring";
import { applyEvidenceCategoryAndOverallCaps } from "../lib/grader/scoring";
import { applyCalibration } from "../lib/grader/calibration";
import { finalizeOverallScore } from "../lib/grader/scoring";
import { shouldFlagNonEnglishPaper } from "../lib/grader/languageDetect";
import { gradePaper } from "../lib/grader/gradePaper";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

function gradeSummary(text: string) {
  const { evidence, categories } = scoreAllCategories(text);
  let overall = scoreOverall(categories);
  overall = finalizeOverallScore(categories, overall, evidence);
  const capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
  const cal = applyCalibration(evidence, capped.categories, capped.overall);
  return { evidence, overall: cal.overall, categories: capped.categories };
}

const bodyImage = `
Introduction
Research Question: How does social media relate to body image among high school students?
Literature Review
Prior work (Smith, 2020) links social media to body image concerns.
Method
Participants were recruited (n=40). Data were collected via survey.
Data Analysis
47% of respondents reported daily comparison pressure on social media.
Connection to Research Question
These findings partially answer how social media relates to body image.
Work Cited
Smith, A. (2020). Journal of Youth Studies, 12(3), 45-60.
`;

const harlequin = `
Introduction
QUESTION
How does Harlequin Ichthyosis affect quality of life?
GAP IN THE BODY OF KNOWLEDGE
No study has examined patient narratives in rural clinics.
Method
Participants were recruited. Interviews were conducted.
RESULTS
Themes emerged from interviews with caregivers.
Conclusion
Limitations include small sample size.
References
Jones, A. (2019). Dermatology Review, 8(2), 12-30.
`;

async function main() {
  assert(isBibliographyHeadingLine("Work Cited"), "Work Cited heading");
  const bi = identifyFunctionalRegions(bodyImage);
  assert(bi.results.includes("47%"), "Data Analysis → results");
  const hq = identifyFunctionalRegions(harlequin);
  assert(
    hq.blocks.some((b) => b.role === "researchQuestion"),
    "QUESTION → RQ",
  );

  const p17Path = join(process.cwd(), "data/test-papers/paper17-first-generation.txt");
  const p17 = readFileSync(p17Path, "utf-8");
  const { partition: p17z } = prepareGradingInput(p17);
  assert(!shouldFlagNonEnglishPaper(p17z.paperBody), "paper 17 not flagged non-English");
  const p17g = gradeSummary(p17);
  console.log(
    `Paper 17: body=${p17z.bodyWordCount} stated=${p17z.statedWordCount} overall band=${p17g.overall.band} tier=${p17g.overall.tier} signals=${p17g.evidence.studentResultsSignals}`,
  );

  const p18 = readFileSync(
    join(process.cwd(), "data/test-papers/paper18-neuroscience.txt"),
    "utf-8",
  );
  const { partition: p18z } = prepareGradingInput(p18);
  const p18g = gradeSummary(p18);
  console.log(`Paper 18: body=${p18z.bodyWordCount} overall=${p18g.overall.band}`);

  const p19 = readFileSync(
    join(process.cwd(), "data/test-papers/paper19-youtube-climate.txt"),
    "utf-8",
  );
  const p19g = gradeSummary(p19);
  console.log(
    `Paper 19: overall=${p19g.overall.band} gapQuality=${p19g.evidence.gapQuality}`,
  );

  const biG = gradeSummary(bodyImage);
  console.log(`Body image survey: overall=${biG.overall.band}`);
  const hqG = gradeSummary(harlequin);
  console.log(`Harlequin: overall=${hqG.overall.band}`);

  const r1 = await gradePaper(p17);
  const r2 = await gradePaper(p17);
  assert(r1.overall.band === r2.overall.band, "deterministic grading");
}

main();
