/**
 * seminar-3.2.6 verification (Tests 1-3 from spec).
 */
import fs from "node:fs";
import { isCoverAuthorNameLine } from "@/lib/grader/textNormalize";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { analyzeCommentaryStructure } from "@/lib/seminar/seminarDeepCalibration";
import { detectThesis } from "@/lib/seminar/seminarThesisDetection";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

// Test 1
assert(!isCoverAuthorNameLine("Works Cited"), "Works Cited not author line");
assert(!isCoverAuthorNameLine("References"), "References not author line");
assert(!isCoverAuthorNameLine("Bibliography"), "Bibliography not author line");
assert(!isCoverAuthorNameLine("Sources"), "Sources not author line");
assert(!isCoverAuthorNameLine("Annotated Bibliography"), "Annotated Bibliography not author line");
assert(isCoverAuthorNameLine("Nadia Carry"), "Nadia Carry is author line");
assert(isCoverAuthorNameLine("John Smith"), "John Smith is author line");
assert(!isCoverAuthorNameLine("Bib"), "Bib not author line");
assert(!isCoverAuthorNameLine("Refs"), "Refs not author line");
assert(isCoverAuthorNameLine("Eli Pariser"), "Eli Pariser is author line");

// Test 2
const paper1 = fs.readFileSync("data/pasted-iwa/paper1-algorithmic.txt", "utf8");
const r1 = gradeIwa(paper1);
const e1 = buildSeminarEvidence(paper1);
assert(e1.bibliographyPresent, "Paper 1 bibliographyPresent");
assert(r1.rows[5]!.score > 0, `Paper 1 Row 6 > 0 (${r1.rows[5]!.score})`);
assert(r1.rows[4]!.score > 6, `Paper 1 Row 5 > 6 (${r1.rows[4]!.score})`);
console.log("Paper 1 rows:", r1.rows.map((x) => x.score).join("+"), "total", r1.total);

// Test 3
const boxell =
  "The most serious empirical challenge to this paper's argument comes from research by Professor Levi Boxell of Stanford University, who has documented that political polarization in the United States has increased most sharply among demographic groups — older Americans — with the lowest rates of social media use (Boxell et al., 2017). Boxell's finding is genuine and should constrain this paper's claim: algorithmic curation is a significant contributor to epistemic fragmentation, but it is not the only cause and may not be dominant across all demographic groups. However, three qualifications limit the force of this challenge.";
const tBoxell = detectThesis(boxell);
assert(tBoxell.counterclaimPresent, "Boxell paragraph counterclaimPresent");

const constrain =
  "Boxell's finding is genuine and should constrain this paper's claim.";
assert(detectThesis(constrain).counterclaimPresent, "constrain sentence counterclaim");

const granting =
  "Even granting Boxell's point, this does not exonerate algorithmic curation.";
const strong = analyzeCommentaryStructure(granting).strongCounterclaim;
assert(strong, "even granting strongCounterclaim");

console.log("\nAll seminar-3.2.6 spot checks passed.");
