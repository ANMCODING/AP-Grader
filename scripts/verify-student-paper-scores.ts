/**
 * Grade the three reference student paper fixtures (Test 5).
 * Run: npx tsx scripts/verify-student-paper-scores.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { gradePaper } from "../lib/grader/gradePaper";
import { formatBandScore } from "../lib/grader/format";

const PAPERS: { label: string; path: string }[] = [
  {
    label: "Social media body image",
    path: "data/test-papers/social-media.txt",
  },
  {
    label: "Social media depression (alt)",
    path: "data/test-papers/social-media-depression.txt",
  },
  {
    label: "Harlequin (inline fixture)",
    path: "",
  },
];

const HARLEQUIN_INLINE = `
Introduction
QUESTION
How do surgical treatments compare to therapeutic treatments for patients with Harlequin Ichthyosis?
GAP IN THE BODY OF KNOWLEDGE
While prior reviews discuss HI generally (Author, 2018), no study has compared surgical versus therapeutic outcomes in pediatric cases.
Method
Participants were recruited. Interviews were conducted with caregivers.
RESULTS
Themes emerged from interviews. 75% of cases showed therapeutic benefit.
Conclusion
One limitation is the small sample. Future research should expand samples.
References
Jones, A. (2019). Dermatology Review, 8(2), 12-30.
`.trim();

async function main() {
  for (const p of PAPERS) {
    const text =
      p.path && existsSync(join(process.cwd(), p.path))
        ? readFileSync(join(process.cwd(), p.path), "utf-8")
        : p.label.includes("Harlequin")
          ? HARLEQUIN_INLINE
          : null;
    if (!text) {
      console.log(`${p.label}: file not found, skipped`);
      continue;
    }
    const result = await gradePaper(text);
    console.log(
      `${p.label}: overall ${formatBandScore(result.overall)} (AP ${result.apScore})`,
    );
  }
  console.log(
    "\nNote: No before/after scores are stored in repo; re-run on prior build to compare.",
  );
}

main();
