/**
 * Verifies Row 7 = 2 for synthetic IWA with mild colloquialisms and URL-only Sources.
 */
import { analyzeAcademicRegister } from "@/lib/seminar/seminarDeepCalibration";
import { partitionSeminarText } from "@/lib/seminar/seminarBodyPrep";
import { buildSeminarEvidence } from "@/lib/seminar/seminarEvidence";
import { scoreIwaRow7 } from "@/lib/seminar/iwaRows";

const SYNTHETIC = `
Research Question: How does social media use affect adolescent well-being?

Introduction
This is a lot of research on teens today. Social media is kind of everywhere, and it is pretty significant for how young people connect. It is really important to understand these effects because adolescents spend many hours online each week.

Body
According to Simmons (2021), platform design shapes attention. Webb (2020) found that comparison increases anxiety. These findings matter for schools and families. However, critics note benefits for marginalized youth who find community online.

Conclusion
Therefore, schools should teach digital literacy while respecting student autonomy.

Sources
https://example.com/article-one
https://example.com/article-two
https://www.psychologytoday.com/us/blog/sample
https://www.nytimes.com/2020/01/01/well/sample.html
https://www.cdc.gov/health/sample
`.trim();

function main(): void {
  const { bodyText, referencesText } = partitionSeminarText(SYNTHETIC);
  const reg = analyzeAcademicRegister(bodyText, "iwa");
  const e = buildSeminarEvidence(SYNTHETIC);
  const row7 = scoreIwaRow7(e);

  console.log("colloquialSeverity:", reg.colloquialSeverity, "(expect 2)");
  console.log("Row 7 score:", row7, "(expect 2)");
  console.log("referencesText length:", referencesText.length);
  console.log("bodyWordCount:", e.bodyWordCount);

  if (reg.colloquialSeverity !== 2 || row7 !== 2) {
    console.error("FAIL");
    process.exit(1);
  }
  console.log("PASS");
}

main();
