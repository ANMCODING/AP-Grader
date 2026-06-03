/**
 * IRR Row 5 proportional missing cap — branch tests for applyIrrRow5MissingCap (seminar-3.2.6).
 * Run: npx tsx scripts/test-irr-row5-cap.ts
 */
import { applyIrrRow5MissingCap } from "@/lib/seminar/irrRows";
import type { SeminarEvidence } from "@/lib/seminar/seminarTypes";

function ev(
  fields: Pick<
    SeminarEvidence,
    "bibliographyEntryCount" | "inTextCitationCount" | "bibliographyLinkedRatio"
  >,
): SeminarEvidence {
  return fields as SeminarEvidence;
}

type Case = {
  label: string;
  organic: number;
  missing: number;
  fields: Pick<
    SeminarEvidence,
    "bibliographyEntryCount" | "inTextCitationCount" | "bibliographyLinkedRatio"
  >;
  expected: number;
};

const CASES: Case[] = [
  {
    label: "Branch 1 — >20% missing → hard cap at 2",
    organic: 3,
    missing: 6,
    fields: {
      bibliographyEntryCount: 25,
      inTextCitationCount: 20,
      bibliographyLinkedRatio: 0.76,
    },
    expected: 2,
  },
  {
    label: "Branch 2 — 10–20% missing, override not met → cap at 2",
    organic: 3,
    missing: 3,
    fields: {
      bibliographyEntryCount: 20,
      inTextCitationCount: 15,
      bibliographyLinkedRatio: 0.8,
    },
    expected: 2,
  },
  {
    label: "Branch 3 — 10–20% missing, override met → no cap",
    organic: 3,
    missing: 2,
    fields: {
      bibliographyEntryCount: 15,
      inTextCitationCount: 12,
      bibliographyLinkedRatio: 0.87,
    },
    expected: 3,
  },
  {
    label: "Branch 4 — <10% missing, large bibliography → no cap",
    organic: 3,
    missing: 5,
    fields: {
      bibliographyEntryCount: 53,
      inTextCitationCount: 20,
      bibliographyLinkedRatio: 0.9,
    },
    expected: 3,
  },
  {
    label: "Branch 5 — single missing on small paper → cap at 2",
    organic: 3,
    missing: 1,
    fields: {
      bibliographyEntryCount: 5,
      inTextCitationCount: 4,
      bibliographyLinkedRatio: 0.75,
    },
    expected: 2,
  },
  {
    label: "Branch 6 — zero missing → no cap",
    organic: 3,
    missing: 0,
    fields: {
      bibliographyEntryCount: 10,
      inTextCitationCount: 8,
      bibliographyLinkedRatio: 1.0,
    },
    expected: 3,
  },
  {
    label: "Branch 7 — organic 2, cap has no effect",
    organic: 2,
    missing: 8,
    fields: {
      bibliographyEntryCount: 20,
      inTextCitationCount: 15,
      bibliographyLinkedRatio: 0.47,
    },
    expected: 2,
  },
  {
    label: "Branch 8 — organic 1, cap cannot lower further",
    organic: 1,
    missing: 10,
    fields: {
      bibliographyEntryCount: 15,
      inTextCitationCount: 12,
      bibliographyLinkedRatio: 0.5,
    },
    expected: 1,
  },
];

function main(): void {
  let failed = 0;
  for (const c of CASES) {
    const actual = applyIrrRow5MissingCap(c.organic, c.missing, ev(c.fields));
    const ok = actual === c.expected;
    if (ok) {
      console.log(`PASS: ${c.label} → ${actual}`);
    } else {
      failed++;
      console.error(
        `FAIL: ${c.label} — expected ${c.expected}, got ${actual}`,
      );
    }
  }
  if (failed > 0) {
    console.error(`\n${failed}/${CASES.length} failed`);
    process.exit(1);
  }
  console.log(`\nAll ${CASES.length} IRR Row 5 cap branch tests passed.`);
}

main();
