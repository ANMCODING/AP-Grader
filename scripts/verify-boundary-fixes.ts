import { readFileSync } from "fs";
import { preparePaperForGrading } from "../lib/grader/cleanDocument";
import { isPredominantlyEnglish, shouldFlagNonEnglishPaper } from "../lib/grader/languageDetect";
import { isBibliographyHeadingLine, partitionDocument } from "../lib/grader/paperBoundaries";
import { collectEvidence } from "../lib/grader/evidence";
import { scoreAllCategories, scoreOverall } from "../lib/grader/scoring";
import { formatBandScore } from "../lib/grader/format";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

assert(!isBibliographyHeadingLine("Sources"), "bare Sources is not a bibliography heading");
assert(isBibliographyHeadingLine("References"), "References heading still detected");
assert(isBibliographyHeadingLine("Sources Cited"), "Sources Cited still detected");

const falseSourcesPaper =
  "word ".repeat(2500) +
  `
Introduction
This study examines climate policy with many citations (Smith, 2020) and (Jones, 2019).
Literature Review
More cited work (Lee, 2021) and (Brown, 2018) continues here with additional synthesis.
Sources
Smith, A. (2020). Early list that is not the bibliography section.
Methodology
Participants were recruited (n=30). Interviews were conducted over two weeks.
Results
Seventy-two percent of participants reported significant findings in the data.
Discussion
These results suggest a clear pattern in the sample.
References
Smith, A. (2020). Real bibliography. Journal.
Jones, B. (2019). Another. Press.
`;

const fs = partitionDocument(
  preparePaperForGrading(falseSourcesPaper).text,
);
assert(
  fs.bodyWordCount > 2500,
  `false Sources mid-heading: body ${fs.bodyWordCount} words (expected >2500)`,
);
assert(fs.hasReferencesSection, "false Sources: real References section found");

const p17raw = readFileSync("./data/test-papers/paper17-first-generation.txt", "utf8");
const p17 = preparePaperForGrading(p17raw).text;
const z17 = partitionDocument(p17, {
  originalInputWordCount: p17raw.split(/\s+/).filter(Boolean).length,
  originalInputCharCount: p17raw.length,
});
assert(z17.bodyWordCount >= 1800, `paper 17 body ${z17.bodyWordCount} words`);
assert(
  isPredominantlyEnglish(p17) && !shouldFlagNonEnglishPaper(p17),
  "paper 17: accented names / academic vocabulary not flagged as non-English",
);

const p17ev = collectEvidence(p17raw);
assert(
  p17ev.resultsSection.toLowerCase().includes("imposter") ||
    p17ev.resultsSection.includes("Theme"),
  "paper 17: qualitative results region detected",
);

const scored17 = scoreAllCategories(p17raw);
console.log(
  "paper 17:",
  "method",
  formatBandScore(scored17.categories[2]),
  "argument",
  formatBandScore(scored17.categories[3]),
  "overall",
  formatBandScore(scoreOverall(scored17.categories)),
);

console.log("\nDone exit", process.exitCode ?? 0);
