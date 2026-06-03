/**
 * Phrase → irrMethodologySignalCount probe for IRR R2 calibration (seminar-3.2.11).
 * Usage: npx tsx scripts/seminar-irr-r2-phrase-probe.ts
 */
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { scoreIrrRow2 } from "@/lib/seminar/irrRows";

const TEST_PHRASES = [
  "using a meta-analytic approach",
  "Holt-Lunstad's 2015 meta-analysis of 70 studies",
  "involving more than 3.4 million participants",
  "a prospective longitudinal cohort",
  "data from the Health and Retirement Study",
  "a nationally representative longitudinal survey",
  "controlling for baseline health status",
  "after adjusting for confounding variables",
  "using biomarkers of exposure",
  "a six-year follow-up period",
  "hazard ratio of 1.45",
  "CREDO's virtual control record methodology",
  "comparing lottery winners to lottery losers",
  "random assignment that occurs when oversubscribed schools use lotteries",
  "Dube's contiguous-county design",
  "using administrative data from unemployment insurance records",
  "difference-in-differences design",
  "p < 0.05",
  "Cohen's d",
  "effect size d=0.4",
  "confidence interval 95%",
  "systematic review and meta-analysis",
  "meta-analysis",
  "odds ratio of 2.1",
  "standardized mean difference",
];

const WRAPPER = (phrase: string) =>
  `To what extent does sleep deprivation affect academic performance among high school students?\n\n` +
  `According to Walker (2017), ${phrase}. This mechanism explains the observed effect.\n\n` +
  `Works Cited\nWalker, M. (2017). Why We Sleep. Scribner.`;

function main(): void {
  const baseline = buildSeminarEvidence(WRAPPER(""), { task: "irr" });
  const baseMeth = baseline.irrMethodologySignalCount;
  const baseR2 = scoreIrrRow2(baseline);

  console.log("\nIRR R2 phrase probe\n");
  console.log(
    "Phrase".padEnd(52) +
      "methΔ".padEnd(8) +
      "meth".padEnd(6) +
      "R2".padEnd(4) +
      "hit",
  );
  console.log("-".repeat(78));

  for (const phrase of TEST_PHRASES) {
    const e = buildSeminarEvidence(WRAPPER(phrase), { task: "irr" });
    const r2 = scoreIrrRow2(e);
    const delta = e.irrMethodologySignalCount - baseMeth;
    const hit = delta > 0 || r2 > baseR2;
    console.log(
      phrase.slice(0, 50).padEnd(52) +
        String(delta).padEnd(8) +
        String(e.irrMethodologySignalCount).padEnd(6) +
        String(r2).padEnd(4) +
        (hit ? "yes" : "no"),
    );
  }
}

main();
