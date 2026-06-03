/**
 * Row 1 named-source extraction tests (Fix 1.3).
 * Run: npx tsx scripts/test-row1-name-extraction.ts
 */
import { analyzeRow1SourceIntegration } from "@/lib/seminar/row1SourceIntegration";

const CASES: { text: string; expectNamed: boolean; label: string }[] = [
  {
    label: "honorific + integration",
    expectNamed: true,
    text: "According to Dr. Rachel Simmons of the Adolescent Psychology Institute, adolescents who post frequently show reduced memory accuracy. This means that the platform is actively degrading personal history.",
  },
  {
    label: "Dr Marcus Webb finding",
    expectNamed: true,
    text: "Dr. Marcus Webb of the University of Digital Cognition found that social media highlight reel culture creates false memory consolidation. This suggests that the brain is being trained to prefer curated experience.",
  },
  {
    label: "first + last argues",
    expectNamed: true,
    text: "Rachel Simmons argues that frequent posting reduces autobiographical memory accuracy.",
  },
  {
    label: "institution year",
    expectNamed: true,
    text: "The Digital Wellness Research Center (2022) found that 67% of teenagers reported social media influenced their memories. This finding indicates that the distortion is widespread.",
  },
  {
    label: "National Survey institution",
    expectNamed: true,
    text: "The National Survey on Teen Digital Behavior (2023) reported that 58% of adolescents felt their online identity did not match their real-world self.",
  },
  {
    label: "parenthetical cite",
    expectNamed: true,
    text: "Memory accuracy declines with heavy use (Smith, 2023).",
  },
  {
    label: "group noun only",
    expectNamed: false,
    text: "Researchers argue that social media harms memory",
  },
  {
    label: "name without argumentative function",
    expectNamed: false,
    text: "Dr. Rachel Simmons of the Adolescent Psychology Institute",
  },
];

function main(): void {
  let failed = 0;
  for (const c of CASES) {
    const r = analyzeRow1SourceIntegration(c.text, "");
    const ok = r.namedSourceInBody === c.expectNamed;
    if (!ok) {
      failed++;
      console.error(
        `FAIL [${c.label}]: expected namedSourceInBody=${c.expectNamed}, got ${r.namedSourceInBody} (reason=${r.row1ZeroReason}, sources=${r.namedSourcesFound.join(",")})`,
      );
    } else {
      console.log(`PASS [${c.label}]`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed}/${CASES.length} failed`);
    process.exit(1);
  }
  console.log(`\nAll ${CASES.length} cases passed`);
}

main();
