import { collectEvidence } from "../lib/grader/evidence";
import { partitionDocument } from "../lib/grader/paperBoundaries";
import { countWords } from "../lib/grader/text";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

const body3800 = Array.from({ length: 3800 }, (_, i) => `word${i}`).join(" ");
const refs400 = Array.from({ length: 400 }, () => "Smith, J. (2020). Title. Journal.").join("\n");
const app600 = Array.from({ length: 600 }, () => "appendixline").join(" ");

const paper1 = `${body3800}\n\nReferences\n${refs400}\n\nAppendix A\n${app600}`;
const z1 = partitionDocument(paper1);
assert(z1.bodyWordCount === 3800, `word count body-only: got ${z1.bodyWordCount}, want 3800`);

const body8cites =
  "Introduction\n" +
  "(Alpha, 2020) (Beta, 2021) (Gamma, 2022) (Delta, 2023) " +
  "(Epsilon, 2024) (Zeta, 2025) (Eta, 2026) (Theta, 2027) " +
  "method results discussion conclusion ".repeat(80);
const refs15 =
  "\n\nReferences\n" +
  Array.from({ length: 15 }, (_, i) => `Author${i}, A. (20${10 + i}). Title. Journal.`).join("\n");
const paper2 = body8cites + refs15;
const ev2 = collectEvidence(paper2);
assert(ev2.citationCount === 8, `in-text citations: got ${ev2.citationCount}, want 8`);
assert(ev2.bibliographyEntryCount >= 10, `bibliography entries detected: ${ev2.bibliographyEntryCount}`);

const bodyNoStats =
  "Introduction method results discussion. The study found participants reported higher scores. ".repeat(40);
const appendixAnova =
  "\n\nAppendix C — SPSS Output\nANOVA F(2, 45) = 4.2, p < .05\n".repeat(20);
const paper3 = bodyNoStats + appendixAnova + "\n\nReferences\nSmith, A. (2020). X.";
const ev3 = collectEvidence(paper3);
assert(
  !ev3.inferentialStatsPresent,
  `appendix-only ANOVA must not set inferentialStatsPresent (got ${ev3.inferentialStatsPresent})`,
);

const bodyRef =
  "Introduction literature method results discussion conclusion ".repeat(50);
const appFirst = "\n\nAppendix A\nSurvey instrument\n";
const refsLast =
  "\n\nReferences\nSmith, A. (2020). Title. https://doi.org/10.1/x\n";
const paper4 = bodyRef + appFirst + "appendix content ".repeat(30) + refsLast;
const z4 = partitionDocument(paper4);
const ev4 = collectEvidence(paper4);
assert(z4.hasReferencesSection, "references after appendices detected");
assert(
  ev4.citationCount < 15,
  `refs zone must not inflate in-text cites (got ${ev4.citationCount})`,
);

const paper5 = "Introduction method results discussion ".repeat(120);
const z5 = partitionDocument(paper5);
const ev5 = collectEvidence(paper5);
assert(z5.bodyWordCount === countWords(paper5), "no refs/appendix: full doc is body");
assert(ev5.wordCount === z5.bodyWordCount, "evidence word count matches body zone");

console.log("\nDone. exitCode=", process.exitCode ?? 0);
