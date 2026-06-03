/**
 * Bibliography normalization and citation linking spot checks (seminar-3.2.6).
 * Run: npx tsx scripts/test-bibliography-normalization.ts
 */
import {
  extractInTextCitationRefs,
  joinBrokenBibliographyUrls,
  linkCitationsToBibliography,
  normalizeAbbreviations,
} from "@/lib/seminar/seminarBibliographyLinking";

function linksBibliography(
  citation: string,
  bibliographyEntry: string,
): boolean {
  const body = `Body text ${citation} supports the claim.`;
  const refs = extractInTextCitationRefs(body);
  if (refs.length === 0) return false;
  const entries = [bibliographyEntry];
  const { missingFromBibliographyCount } = linkCitationsToBibliography(
    body,
    entries,
    bibliographyEntry,
  );
  return missingFromBibliographyCount === 0;
}

const NORM_CASES: { input: string; expected: string }[] = [
  { input: "U.S. Sentencing Commission", expected: "US Sentencing Commission" },
  { input: "U.K. Home Office", expected: "UK Home Office" },
  { input: "U.S.A. Department", expected: "USA Department" },
  { input: "Dr. Smith", expected: "Dr Smith" },
  { input: "Prof. Jones", expected: "Prof Jones" },
  { input: "St. Mary's Hospital", expected: "St Mary's Hospital" },
  { input: "Normal text unchanged", expected: "Normal text unchanged" },
  { input: "CDC report", expected: "CDC report" },
];

const LINK_TRUE: { citation: string; entry: string }[] = [
  {
    citation: "(U.S. Sentencing Commission, 2017)",
    entry: "U.S. Sentencing Commission. (2017). Annual Report.",
  },
  {
    citation: "(Carson, 2021)",
    entry: "Carson, E. A. (2021). Prisoners in 2020.",
  },
  {
    citation: "(Carson et al., 2021)",
    entry:
      "Carson, E. A., Smith, J. B., & Jones, C. (2021). Report.",
  },
  {
    citation: "(BJS, 2020)",
    entry: "Bureau of Justice Statistics. (2020). Data Report.",
  },
  {
    citation: "(CDC, 2019)",
    entry: "Centers for Disease Control and Prevention. (2019). Study.",
  },
  {
    citation: "(USSC, 2017)",
    entry: "U.S. Sentencing Commission. (2017). Guidelines Manual.",
  },
  {
    citation: "(WHO, 2021)",
    entry: "World Health Organization. (2021). Health Report.",
  },
  {
    citation: "(Van Niekerk, 2023)",
    entry: "Van Niekerk, M. (2023). Article Title.",
  },
  {
    citation: "(Lau-Zhu, 2017)",
    entry: "Lau-Zhu, A. (2017). Research Paper.",
  },
  {
    citation: "(Dal Corso, 2019)",
    entry: "Dal Corso, L. (2019). Study Title.",
  },
  {
    citation: "(Haugen, 2021)",
    entry:
      "Haugen, F. (2021, October 5). Testimony before the United States Senate Committee on Commerce, Science, and Transportation. U.S. Senate.",
  },
];

const LINK_FALSE: { citation: string; entry: string }[] = [
  {
    citation: "(Smith, 2021)",
    entry: "Jones, A. (2021). Article.",
  },
  {
    citation: "(Carson, 2021)",
    entry: "Carson, E. A. (2020). Different Year.",
  },
  {
    citation: "(However, 2021)",
    entry: "Howe, M. (2021). Article.",
  },
  {
    citation: "(CDC, 2019)",
    entry: "Smith, J. (2019). Article.",
  },
  {
    citation: "(The Guardian, 2020)",
    entry: "Jones, A. (2020). Article.",
  },
];

function main(): void {
  let failed = 0;

  const broken =
    "Loftus, E. F. (1974). Journal. https://doi.org/\n10.1016/S0022-5371(74)80011-3";
  const joined = joinBrokenBibliographyUrls(broken);
  if (!joined.includes("doi.org/10.1016")) {
    failed++;
    console.error("FAIL joinBrokenBibliographyUrls: split DOI not joined");
  } else {
    console.log("PASS joinBrokenBibliographyUrls");
  }

  for (const c of NORM_CASES) {
    const actual = normalizeAbbreviations(c.input);
    const ok = actual === c.expected;
    if (ok) {
      console.log(`PASS normalize: "${c.input}"`);
    } else {
      failed++;
      console.error(
        `FAIL normalize: "${c.input}" — expected "${c.expected}", got "${actual}"`,
      );
    }
  }

  for (const c of LINK_TRUE) {
    const ok = linksBibliography(c.citation, c.entry);
    if (ok) {
      console.log(`PASS link true: ${c.citation}`);
    } else {
      failed++;
      console.error(`FAIL link true (expected match): ${c.citation}`);
    }
  }

  for (const c of LINK_FALSE) {
    const ok = !linksBibliography(c.citation, c.entry);
    if (ok) {
      console.log(`PASS link false: ${c.citation}`);
    } else {
      failed++;
      console.error(`FAIL link false (expected no match): ${c.citation}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} case(s) failed`);
    process.exit(1);
  }
  console.log(
    `\nAll normalization and bibliography linking tests passed (${NORM_CASES.length + LINK_TRUE.length + LINK_FALSE.length} cases).`,
  );
}

main();
