import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { gradePaper } from "../lib/grader/gradePaper";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { collectEvidence } from "../lib/grader/evidence";
import { lacksStudentGeneratedData } from "../lib/grader/evidence";
import { applyCalibration } from "../lib/grader/calibration";
import { scoreAllCategories, scoreOverall, applyEvidenceCategoryAndOverallCaps, finalizeOverallScore } from "../lib/grader/scoring";
import { formatBandScore } from "../lib/grader/format";

async function main() {
  const dir = join(process.cwd(), "data/innovation-high-school");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
    const raw = readFileSync(join(dir, file), "utf-8");
    const result = await gradePaper(raw);
    const { partition } = prepareGradingInput(raw);
    const { evidence, categories } = scoreAllCategories(partition);
    let overall = scoreOverall(categories);
    overall = finalizeOverallScore(categories, overall, evidence);
    const capped = applyEvidenceCategoryAndOverallCaps(categories, overall, evidence);
    const cal = applyCalibration(evidence, capped.categories, capped.overall);
    console.log(
      [
        file.replace(".txt", ""),
        result.rejected ? "REJECTED" : result.overallLabel,
        `F:${result.categories[0].label}`,
        `S:${result.categories[1].label}`,
        `M:${result.categories[2].label}`,
        `A:${result.categories[3].label}`,
        `C:${result.categories[4].label}`,
        `cal=AP${cal.closestMatch.officialApScore}`,
        `lacks=${lacksStudentGeneratedData(evidence)}`,
        `hard=${evidence.methodNotExecutedHard}`,
        `fut=${evidence.futureTenseMethodDominant}`,
        `body=${partition.bodyWordCount}`,
      ].join(" | "),
    );
  }
}

main();
