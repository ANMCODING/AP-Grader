/**
 * synthetic_iwa_21 URL-only bibliography + Row 1 checks (Fix 2.3 / 1.4).
 * Run: npx tsx scripts/test-synthetic-iwa21-url-bib.ts
 */
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { iwaOrganicScores } from "@/lib/seminar/iwaRows";

const PAD =
  "Adolescents spend many hours online each week, which shapes memory and identity in ways schools must address. ".repeat(
    65,
  );

const SYNTHETIC_IWA_21 = `
Research Question: How does social media use reshape adolescent memory and identity?

Introduction
Social media is kind of reshaping how adolescents remember and present themselves. This paper argues that frequent posting and curated feeds distort autobiographical memory and widen the gap between online and offline identity. It is pretty important to study this now.

According to Dr. Rachel Simmons of the Adolescent Psychology Institute, adolescents who post frequently show reduced memory accuracy. This means that the platform is actively degrading personal history.

Dr. Marcus Webb of the University of Digital Cognition found that social media highlight reel culture creates false memory consolidation. This suggests that the brain is being trained to prefer curated experience.

Rachel Simmons argues that frequent posting reduces autobiographical memory accuracy when teens rehearse idealized versions of events.

The Digital Wellness Research Center (2022) found that 67% of teenagers reported social media influenced their memories. This finding indicates that the distortion is widespread.

The National Survey on Teen Digital Behavior (2023) reported that 58% of adolescents felt their online identity did not match their real-world self. This suggests schools must address memory literacy.

However, some educators note benefits of online community for marginalized youth. In conclusion, this investigation demonstrates that policy must balance connectivity with memory safeguards.

${PAD}

Sources
https://example.com/article-one
https://example.com/article-two
https://www.psychologytoday.com/us/blog/sample
https://www.nytimes.com/2020/01/01/well/sample.html
https://www.cdc.gov/health/sample
`.trim();

function main(): void {
  const r = gradeIwa(SYNTHETIC_IWA_21);
  const e = buildSeminarEvidence(SYNTHETIC_IWA_21);
  const organic = iwaOrganicScores(e);
  const row1 = r.rows.find((x) => x.id === "row1_stimulus")!;
  const row5 = r.rows.find((x) => x.id === "row5_evidence")!;
  const row6 = r.rows.find((x) => x.id === "row6_citation")!;
  const row7 = r.rows.find((x) => x.id === "row7_style")!;

  const checks: [string, boolean][] = [
    ["bibliographyPresent", e.bibliographyPresent],
    ["urlOnlyBibliography", e.urlOnlyBibliography],
    ["row1=5", row1.score === 5],
    ["row5=0", row5.score === 0],
    ["row6=0", row6.score === 0],
    [
      "row7=2 (organic)",
      organic[6] === 2 && e.colloquialSeverity === 2,
    ],
    ["row5 url feedback", row5.feedback?.includes("web addresses") ?? false],
    ["row6 url feedback", row6.feedback?.includes("only URLs") ?? false],
    ["namedSourceInBody", e.namedSourceInBody],
    ["bodyWordCount eligible", e.bodyWordCount >= 400],
  ];

  console.log("bodyWordCount:", e.bodyWordCount, "total:", r.total);
  console.log("rows:", r.rows.map((x) => x.score).join("+"));
  console.log("namedSources:", e.namedSourcesFound?.join(", ") ?? e.row1ZeroReason);

  let fail = 0;
  for (const [label, ok] of checks) {
    console.log(ok ? "PASS" : "FAIL", label);
    if (!ok) fail++;
  }
  if (fail > 0) process.exit(1);
  console.log("\nAll synthetic_iwa_21 checks passed");
}

main();
