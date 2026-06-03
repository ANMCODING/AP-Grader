import { gradeDeterministic } from "@/lib/grader/deterministicGrade";
import { bandScoreToFillPercent } from "@/lib/grader/format";
import {
  AP_TRADEMARK_DISCLAIMER,
  GRADER_VERSION,
  PRACTICE_DISCLAIMER,
} from "@/lib/grader/gradingSpec";
import { completenessIndicator } from "@/lib/grader/pipelineDiagnostic";
import {
  gradeSeminarPaper,
  seminarGradeToApiReport,
} from "@/lib/seminar";
import type { SeminarTask } from "@/lib/seminar/seminarTypes";
import type { PdfSubmissionMeta } from "@/lib/server/pdfCleanTypes";
import type { ScoreReport } from "@/lib/types";

export const STATIC_HOST_NOTE =
  "Hosted on GitHub Pages — grading runs in your browser. PDF upload and Google Docs import are unavailable here; paste text or upload .docx. AP Research uses the local engine only (no Claude review).";

function researchReport(
  text: string,
  joinSoftLineBreaksWordCount?: number | null,
): ScoreReport {
  const d = gradeDeterministic(text, { joinSoftLineBreaksWordCount });
  const overall = d.overall;
  return {
    gradingCourse: "research",
    graderVersion: GRADER_VERSION,
    categories: d.categories.map((c) => ({
      name: c.name,
      label: c.label,
      fillPercent: bandScoreToFillPercent({
        band: c.band as 1 | 2 | 3 | 4 | 5,
        tier: c.tier as "Low" | "Mid" | "High",
      }),
    })),
    overallLabel: d.overallLabel,
    overallFillPercent: bandScoreToFillPercent(overall),
    apScore: d.apScore,
    apLabel: overall.tier,
    apDisplay: String(d.apScore),
    confidence: d.confidence,
    confidenceExplanation:
      "GitHub Pages uses local scoring only (no server-side Claude review).",
    flags: [...d.flags, "github-pages-host"],
    practiceDisclaimer: `${PRACTICE_DISCLAIMER} ${AP_TRADEMARK_DISCLAIMER}`,
    wordCount: d.bodyWordCount,
    citationStyleDetected: d.evidence.citationStyle,
    pipelineDiagnostic: d.pipelineDiagnostic,
    completenessIndicator: completenessIndicator(d.pipelineDiagnostic),
    rejected: d.rejected,
  };
}

export function gradeInBrowser(options: {
  course: "research" | "seminar";
  text: string;
  seminarTask?: SeminarTask;
  joinSoftLineBreaksWordCount?: number | null;
  pdfSubmission?: PdfSubmissionMeta | null;
}): ScoreReport {
  if (options.pdfSubmission) {
    throw new Error(
      "PDF grading metadata is not supported on GitHub Pages. Paste your paper text or upload a .docx file.",
    );
  }

  if (options.course === "seminar") {
    const task = options.seminarTask === "irr" ? "irr" : "iwa";
    const result = gradeSeminarPaper(options.text, task);
    const report = seminarGradeToApiReport(result);
    return {
      ...report,
      flags: [...report.flags, "github-pages-host"],
    };
  }

  return researchReport(options.text, options.joinSoftLineBreaksWordCount);
}
