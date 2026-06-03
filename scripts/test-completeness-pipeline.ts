/**
 * Completeness pipeline regression — paste/PDF/DOCX retention and boundary false positives.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { prepareGradingInput } from "../lib/grader/gradingPipeline";
import { preparePaperForGrading } from "../lib/grader/cleanDocument";
import { countWords } from "../lib/grader/text";
import { cleanPdfExtractedText } from "../lib/server/cleanPdfText";

const SENTENCE =
  "This study examines the effect of social media use on academic performance in high school students using a validated survey instrument and Pearson correlation analysis.";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  }
}

function repeatToWordCount(target: number, filler: string): string {
  const words = filler.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  while (out.length < target) {
    out.push(...words);
  }
  return out.slice(0, target).join(" ");
}

function buildStructuredPaper(options: {
  bodyWords?: number;
  includeReferences?: boolean;
  includeAppendix?: boolean;
  citationDenseLit?: boolean;
  earlyReferencesSentence?: boolean;
  runningHeaders?: boolean;
  statedWordCount?: number;
}): string {
  const stated = options.statedWordCount ?? 4500;
  const bodyTarget = (options.bodyWords ?? 3500) - 200;
  const lines: string[] = [
    "AP Research Academic Paper",
    `Word Count: ${stated}`,
    "Student Name",
    "School Name",
    "Teacher Name",
    "",
    "Introduction",
    repeatToWordCount(400, SENTENCE),
    "",
    "Literature Review",
  ];

  if (options.earlyReferencesSentence) {
    lines.push(
      "The references cited in prior literature suggest that social media may influence outcomes.",
    );
  }

  if (options.citationDenseLit) {
    lines.push(
      "Prior work shows effects (Smith, 2020) (Jones, 2019) (Lee, 2021) (Brown, 2018) (Davis, 2017) (Miller, 2016) (Wilson, 2015) (Taylor, 2014) (Anderson, 2013) (Thomas, 2012) (Moore, 2011) (Jackson, 2010) (White, 2009) (Harris, 2008) (Martin, 2007) in adolescents.",
    );
  }

  lines.push(
    repeatToWordCount(900, SENTENCE),
    "",
    "Method",
    repeatToWordCount(500, SENTENCE),
    "",
    "Results",
    repeatToWordCount(500, SENTENCE),
    "",
    "Discussion",
    repeatToWordCount(500, SENTENCE),
    "",
    "Limitations",
    repeatToWordCount(200, SENTENCE),
    "",
    "Implications",
    repeatToWordCount(200, SENTENCE),
    "",
    "Conclusion",
    repeatToWordCount(Math.max(200, bodyTarget - 2800), SENTENCE),
  );

  if (options.runningHeaders) {
    const withHeaders: string[] = [];
    let page = 1;
    for (const line of lines) {
      withHeaders.push(`Test Paper Smith ${page}`);
      withHeaders.push(line);
      if (line.trim() === "") page++;
    }
    lines.length = 0;
    lines.push(...withHeaders);
  }

  if (options.includeReferences !== false) {
    lines.push("", "References", "Smith, A. (2020). Journal article title. Journal Name.");
    lines.push("Jones, B. (2019). Another source. University Press.");
    lines.push("Lee, C. (2021). Third source. https://example.org/paper");
  }

  if (options.includeAppendix) {
    lines.push("", "Appendix A", repeatToWordCount(1000, SENTENCE));
  }

  return lines.join("\n");
}

interface TestRow {
  name: string;
  method: string;
  originalInputWordCount: number;
  bodyWordCount: number;
  bodyToOriginalRatio: number;
  pass: boolean;
}

const rows: TestRow[] = [];

function record(
  name: string,
  method: string,
  original: number,
  body: number,
  threshold: number,
): void {
  const ratio =
    original > 0 ? Math.round((body / original) * 1000) / 10 : 0;
  const pass = ratio >= threshold;
  rows.push({
    name,
    method,
    originalInputWordCount: original,
    bodyWordCount: body,
    bodyToOriginalRatio: ratio,
    pass,
  });
  if (!pass) {
    console.error(
      `FAIL ${name} (${method}): body/original ${ratio}% < ${threshold}%`,
    );
    process.exitCode = 1;
  }
}

function largestCleaningDrop(
  diag: ReturnType<typeof prepareGradingInput>["partition"]["pipelineDiagnostic"],
): string {
  const steps: [string, number | "skipped"][] = [
    ["controlChar", diag.afterControlCharNormWordCount],
    ["coverStrip", diag.afterCoverPageStripWordCount],
    [
      "collegeBoard",
      typeof diag.afterCollegeBoardCleanWordCount === "number"
        ? diag.afterCollegeBoardCleanWordCount
        : diag.afterNormalizePaperTextWordCount,
    ],
    ["normalize", diag.afterNormalizePaperTextWordCount],
    ["afterAll", diag.afterAllCleaningWordCount],
  ];
  let maxDrop = 0;
  let label = "none";
  let prev = diag.originalInputWordCount;
  for (const [name, wc] of steps) {
    if (typeof wc !== "number") continue;
    const drop = prev - wc;
    if (drop > maxDrop) {
      maxDrop = drop;
      label = name;
    }
    prev = wc;
  }
  return `${label} (−${maxDrop} words)`;
}

// Test 1 — paste retention
const paper4500 = buildStructuredPaper({ statedWordCount: 4500 });
const t1 = prepareGradingInput(paper4500);
record(
  "4500-word structured paste",
  "paste",
  t1.partition.originalInputWordCount,
  t1.partition.bodyWordCount,
  85,
);
if (t1.partition.pipelineDiagnostic.bodyToOriginalRatio < 85) {
  console.error(
    "Largest cleaning drop:",
    largestCleaningDrop(t1.partition.pipelineDiagnostic),
  );
}

// Test 2 — PDF path (cleaned extraction + grade prep)
const pdfSim = cleanPdfExtractedText(paper4500.replace(/\n/g, "\n\n"));
const t2 = prepareGradingInput(pdfSim.text, {
  joinSoftLineBreaksWordCount: pdfSim.joinSoftLineBreaksWordCount,
});
record(
  "4500-word PDF simulation",
  "pdf",
  t2.partition.originalInputWordCount,
  t2.partition.bodyWordCount,
  80,
);

// Test 3 — DOCX path (raw text through same prep as paste, no PDF join)
const t3 = prepareGradingInput(paper4500);
record(
  "4500-word DOCX simulation",
  "docx",
  t3.partition.originalInputWordCount,
  t3.partition.bodyWordCount,
  90,
);

// Test 4 — running headers
const t4paper = buildStructuredPaper({ runningHeaders: true });
const t4pdf = cleanPdfExtractedText(t4paper);
const t4 = prepareGradingInput(t4pdf.text, {
  joinSoftLineBreaksWordCount: t4pdf.joinSoftLineBreaksWordCount,
});
record(
  "running header PDF",
  "pdf",
  t4.partition.originalInputWordCount,
  t4.partition.bodyWordCount,
  80,
);

// Test 5 — citation-dense literature review
const t5 = prepareGradingInput(
  buildStructuredPaper({ citationDenseLit: true }),
);
record(
  "citation-dense lit review",
  "paste",
  t5.partition.originalInputWordCount,
  t5.partition.bodyWordCount,
  85,
);

// Test 6 — early "references" in body sentence
const t6 = prepareGradingInput(
  buildStructuredPaper({ earlyReferencesSentence: true }),
);
record(
  "early references sentence",
  "paste",
  t6.partition.originalInputWordCount,
  t6.partition.bodyWordCount,
  85,
);

// Test 7 — no references section
const t7 = prepareGradingInput(
  buildStructuredPaper({ includeReferences: false }),
);
record(
  "no references section",
  "paste",
  t7.partition.originalInputWordCount,
  t7.partition.bodyWordCount,
  95,
);

// Test 8 — large appendix (body ~3500)
const t8paper = buildStructuredPaper({
  bodyWords: 3500,
  includeAppendix: true,
  statedWordCount: 4500,
});
const t8 = prepareGradingInput(t8paper);
const appendixExcluded =
  t8.partition.pipelineDiagnostic.appendixWordCount >= 800 ||
  t8.partition.bodyWordCount <
    t8.partition.pipelineDiagnostic.afterAllCleaningWordCount - 500;
assert(
  appendixExcluded || t8.partition.pipelineDiagnostic.detectedBoundaryHeading !== "none found",
  `appendix test: appendixWords=${t8.partition.pipelineDiagnostic.appendixWordCount} body=${t8.partition.bodyWordCount}`,
);
record(
  "large appendix",
  "paste",
  t8.partition.originalInputWordCount,
  t8.partition.bodyWordCount,
  70,
);

// Test 9 — real student papers in data/test-papers
const testDir = join(process.cwd(), "data/test-papers");
if (existsSync(testDir)) {
  for (const file of readdirSync(testDir).filter((f) =>
    /\.(txt|md)$/i.test(f),
  )) {
    const raw = readFileSync(join(testDir, file), "utf8");
    const { partition } = prepareGradingInput(raw);
    record(file, "paste", partition.originalInputWordCount, partition.bodyWordCount, 70);
  }
} else {
  console.log("SKIP Test 9: data/test-papers not found");
}

// Test 10 — consistency
const bodiesPaste: number[] = [];
for (let i = 0; i < 5; i++) {
  bodiesPaste.push(prepareGradingInput(paper4500).partition.bodyWordCount);
}
const pasteUnique = new Set(bodiesPaste);
assert(
  pasteUnique.size === 1,
  `paste consistency: bodies ${bodiesPaste.join(", ")}`,
);

const bodiesPdf: number[] = [];
for (let i = 0; i < 5; i++) {
  const cleaned = cleanPdfExtractedText(paper4500);
  bodiesPdf.push(
    prepareGradingInput(cleaned.text, {
      joinSoftLineBreaksWordCount: cleaned.joinSoftLineBreaksWordCount,
    }).partition.bodyWordCount,
  );
}
const pdfMin = Math.min(...bodiesPdf);
const pdfMax = Math.max(...bodiesPdf);
const pdfVariance =
  pdfMin > 0 ? ((pdfMax - pdfMin) / pdfMin) * 100 : 0;
assert(
  pdfVariance <= 2,
  `PDF consistency variance ${pdfVariance.toFixed(2)}% (bodies ${bodiesPdf.join(", ")})`,
);
record("consistency paste×5", "paste", t1.partition.originalInputWordCount, bodiesPaste[0], 85);
record("consistency pdf×5", "pdf", t2.partition.originalInputWordCount, bodiesPdf[0], 80);

// Test 11 — repeated sentence 4500 words cleaning ratio
const repeated = repeatToWordCount(4500, SENTENCE);
const before = countWords(repeated);
const prep = preparePaperForGrading(repeated);
const after = countWords(prep.text);
console.log(
  `\nTest 11 sentence repeat: before=${before} after=${after} (${Math.round((after / before) * 100)}% retained)`,
);

console.log("\n--- Completeness test results ---\n");
console.log(
  "| Paper | Method | Original | Body | Body/Original % | Pass |",
);
console.log("| --- | --- | ---: | ---: | ---: | --- |");
for (const r of rows) {
  console.log(
    `| ${r.name} | ${r.method} | ${r.originalInputWordCount} | ${r.bodyWordCount} | ${r.bodyToOriginalRatio} | ${r.pass ? "PASS" : "FAIL"} |`,
  );
}

const failed = rows.filter((r) => !r.pass).length;
console.log(`\n${rows.length - failed}/${rows.length} tests passed.`);
if (failed > 0) process.exitCode = 1;
