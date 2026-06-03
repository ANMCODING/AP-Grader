import { identifyFunctionalRegions } from "../lib/grader/functionalRegions";
import { collectEvidence } from "../lib/grader/evidence";
import { partitionDocument } from "../lib/grader/paperBoundaries";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else console.log("OK:", msg);
}

function blockRoles(paper: string): string[] {
  return identifyFunctionalRegions(paper).blocks.map(
    (b) => `${b.heading || "(no heading)"}→${b.role}`,
  );
}

const embeddedLitIntro = `
Introduction
Prior work (Smith, 2020) shows X. Jones (2019) found Y. Lee (2021) argued Z.
No study has examined Q in this population. This study investigates whether A affects B.
Method
Participants were recruited via survey (n=40). Data were collected over two weeks.
Results
47% of respondents reported daily use. Figure 1 shows the distribution.
Conclusion
One limitation is the small sample. Educators should use these findings carefully.
Works Cited
Smith, A. (2020). Journal.
`;

const regions = identifyFunctionalRegions(embeddedLitIntro);
assert(regions.literatureReview.length > 80, "lit embedded in intro detected");
assert(regions.method.length > 40, "method region detected");
assert(regions.results.includes("47%"), "results content detected");
assert(regions.limitations.includes("limitation"), "embedded limitations in conclusion");
assert(regions.hasResultsByContent, "hasResultsByContent");

const unconventional = `
Background
Many citations here (A, 2020) and (B, 2019). Gap: limited research on topic X.
How I Did It
I ran a simulation for 14 days and recorded height each day.
What I Found
Control reached 21.6 cm on day 10.
What This Means
Coaches should consider these findings for training.
Work Cited
Author (2020). Title.
`;

const u = identifyFunctionalRegions(unconventional);
assert(u.method.length > 30, "How I Did It maps to method");
assert(u.results.includes("21.6") || u.results.includes("day 10"), "What I Found maps to results");

const ev = collectEvidence(unconventional);
assert(ev.methodSection.length > 20, "collectEvidence maps unconventional method");
assert(
  ev.resultsSection.includes("21.6") ||
    ev.resultsSection.includes("day 10") ||
    ev.studentResultsSignals > 0,
  `results mapped (${ev.studentResultsSignals} signals)`,
);

// --- Social media body image survey (Work Cited, Data Analysis, Connection to RQ) ---
const bodyImagePaper =
  "word ".repeat(600) +
  `
Introduction
Research Question: How does social media relate to body image among high school students?
Literature Review
Prior studies (Smith, 2020) and (Jones, 2019) link platforms to comparison. (Lee, 2021) found effects.
Methods
A Google Form survey was administered to N=36 participants at one suburban high school.
Data Analysis
About 50% of participants said they use social media 3-4 hours daily.
47% said that social media has made them feel the need to compare their bodies to others online.
62% reported lower body satisfaction after heavy use. Figure 1 summarizes responses.
Connection to Research Question
These findings partially answer how social media relates to body image: comparison pressure appears common.
Work Cited
Smith, A. (2020). Social media and teens. Journal of Youth Studies, 12(3), 45-60.
Jones, B. (2019). Body image online. APA.
`;

const bi = identifyFunctionalRegions(bodyImagePaper);
assert(
  bi.results.includes("50%") || bi.results.includes("47%"),
  `body image: Data Analysis → results (${bi.results.slice(0, 80)}...)`,
);
assert(
  bi.conclusion.includes("Connection") ||
    bi.conclusion.includes("comparison") ||
    bi.blocks.some((b) => b.role === "conclusion"),
  "body image: Connection to Research Question → conclusion",
);
assert(
  bi.researchQuestionRegion.length > 20 ||
    bi.introRegion.toLowerCase().includes("body image"),
  "body image: RQ region detected",
);

const biZones = partitionDocument(bodyImagePaper);
assert(biZones.hasReferencesSection, "body image: Work Cited → references zone");

// --- Harlequin Ichthyosis (QUESTION, GAP IN THE BODY OF KNOWLEDGE, RESULTS) ---
const harlequinPaper =
  "content ".repeat(500) +
  `
Definitions
Clinical term definitions appear here.
QUESTION
How do surgical treatments compare to therapeutic treatments for patients with Harlequin Ichthyosis?
GAP IN THE BODY OF KNOWLEDGE
While prior reviews discuss HI generally (Author, 2018) and (Author, 2020), none compare surgical versus therapeutic outcomes in pediatric cases.
METHOD
This review approaches HI with a literature perspective gathering data from other sources to create specific percentages.
RESULTS
Graph A shows 75% of patients benefited from therapeutic approaches. Surgical intervention showed 40% improvement in documented cases.
Works Cited
Author, A. (2018). HI review. Medical Journal.
Author, B. (2020). Treatment outcomes. Press.
`;

const hq = identifyFunctionalRegions(harlequinPaper);
assert(
  hq.researchQuestionRegion.toLowerCase().includes("surgical") ||
    hq.blocks.some((b) => b.heading.toUpperCase().includes("QUESTION") && b.role === "researchQuestion"),
  `harlequin: QUESTION → RQ (blocks: ${blockRoles(harlequinPaper).join("; ")})`,
);
assert(
  hq.gap.toLowerCase().includes("body of knowledge") ||
    hq.blocks.some((b) => /gap/i.test(b.heading) && b.role === "gap"),
  "harlequin: GAP IN THE BODY OF KNOWLEDGE → gap",
);
assert(
  hq.results.includes("75%") || hq.results.includes("Graph"),
  "harlequin: RESULTS → results region",
);

// --- Detergent simulation (Data Analysis as results, duplicate bibliography) ---
const detergentPaper =
  "intro ".repeat(400) +
  `
Introduction
This study examines detergent effects on plant growth using simulation.
Method
A computer-based simulation ran for 14 days with seven experimental groups and one control.
Data Analysis
Control group reached 21.6 cm on day 10. Tide group plants died by day 3.
t-test p-values ranged from 0.076 to 0.082 across detergent groups.
Discussion
The simulation suggests detergent concentration strongly affects growth.
References
Author, A. (2019). Plants. Journal.
Smith, B. (2020). Detergents. Press.
Works Cited
Author, A. (2019). Plants. Journal.
Smith, B. (2020). Detergents. Press.
`;

const det = identifyFunctionalRegions(detergentPaper);
assert(
  det.results.includes("21.6") || det.results.includes("day 10"),
  "detergent: Data Analysis → results",
);
const detZones = partitionDocument(detergentPaper);
assert(detZones.hasReferencesSection, "detergent: bibliography detected");
assert(
  detZones.referencesZone.includes("Smith") || detZones.bodyWordCount > 0,
  "detergent: last bibliography used for references zone",
);

// ALL CAPS + numbered heading normalization
const caps = identifyFunctionalRegions(`
1. Introduction
This study examines X (Smith, 2020).
II. Literature Review
Prior work (Jones, 2019) and (Lee, 2020) disagree on mechanism.
3. Method
Participants were recruited (n=20). Data were collected over two weeks.
4. Results
42% reported significant improvement. p < .05.
5. Conclusion
One limitation is sample size.
References
Smith (2020). Journal.
`);
assert(caps.method.length > 20, "numbered headings: method detected");
assert(caps.results.includes("42%"), "numbered headings: results detected");

console.log("\nDone exit", process.exitCode ?? 0);
