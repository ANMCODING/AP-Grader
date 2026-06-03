import { isBibliographyHeadingLine } from "../lib/grader/paperBoundaries";
import { collectEvidence } from "../lib/grader/evidence";
import {
  scoreArgumentAndEvidence,
  scoreFocusAndScope,
  scoreMethodAndReplicability,
  scoreScholarlyGrounding,
} from "../lib/grader/scoring";
import { hasReferencesHeadingInDocument } from "../lib/grader/citations";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

assert(isBibliographyHeadingLine("Work Cited"), "Work Cited heading");
assert(isBibliographyHeadingLine("  Works Cited:  "), "Works Cited with punctuation");

const surveyPaper =
  "x".repeat(2500) +
  `
Introduction
Research Question: How does social media relate to body image?
Methods: survey N=36 participants google form
Data Analysis
About 50% of participants said they use social media 3-4 hours daily.
47% said that social media has made them feel the need to compare their bodies.
Discussion
The survey showed patterns among respondents.
Work Cited
Smith, A. (2020). Title. Journal. https://doi.org/10.1/x
`;

const ev1 = collectEvidence(surveyPaper);
assert(ev1.hasBibliography, "survey paper bibliography");
assert(ev1.studentResultsSignals >= 2, `survey results signals ${ev1.studentResultsSignals}`);
assert(
  scoreArgumentAndEvidence(ev1).band >= 3,
  `survey argument band ${scoreArgumentAndEvidence(ev1).band}`,
);

const harlequin = `
Definitions
term one
QUESTION
How do surgical treatments compare to therapeutic treatments for HI?
METHOD
This review approaches with a literature perspective gathering data from other sources to create specific data.
RESULTS
Graph A shows 75% therapeutic.
Works Cited
Author, A. (2020). Title. Press.
`.repeat(8);

const ev2 = collectEvidence(harlequin);
assert(ev2.researchQuestions.length > 0, "harlequin RQ detected");
assert(ev2.unverifiableLiteratureSynthesisMethod, "harlequin lit synthesis method");
assert(
  scoreMethodAndReplicability(ev2).band <= 2,
  `harlequin method capped ${scoreMethodAndReplicability(ev2).band}`,
);
assert(
  scoreFocusAndScope(ev2).band >= 2,
  `harlequin focus ${scoreFocusAndScope(ev2).band}`,
);

const simPaper = `
Introduction
Method
simulation-based study using computer-based simulation over 14 days
Results
Control group reached 21.6 cm on day 10. Tide group died by day 3.
t-test p-values ranged from 0.076 to 0.082. Seven experimental groups.
Discussion
References
Author (2020). Journal.
`.repeat(5);

const ev3 = collectEvidence(simPaper);
assert(ev3.simulationEmpiricalResults, "simulation empirical");
assert(
  scoreArgumentAndEvidence(ev3).band >= 3,
  `sim argument floor ${scoreArgumentAndEvidence(ev3).band}`,
);

console.log("\nDone exit", process.exitCode ?? 0);
