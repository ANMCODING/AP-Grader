"use client";

import { useState } from "react";
import type { ScoreReport as ScoreReportType } from "@/lib/types";
import { SubmissionDiagnosticPanel } from "@/components/SubmissionDiagnosticPanel";

interface ScoreReportProps {
  report: ScoreReportType;
}

function parseRowScore(label: string): { score: number; max: number } | null {
  const m = label.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { score: parseInt(m[1]!, 10), max: parseInt(m[2]!, 10) };
}

function rowBarColor(score: number, max: number): string {
  if (score <= 0) return "bg-red-500";
  if (score >= max) return "bg-green-600";
  return "bg-amber-500";
}

function rowLabelColor(score: number, max: number): string {
  if (score <= 0) return "text-red-700";
  if (score >= max) return "text-green-800";
  return "text-amber-800";
}

function CategoryRow({
  name,
  label,
  fillPercent,
  barClass,
  labelClass,
}: {
  name: string;
  label: string;
  fillPercent: number;
  barClass: string;
  labelClass: string;
}) {
  return (
    <li className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:gap-4">
      <span className="text-sm font-medium leading-snug text-ink">{name}</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border sm:order-none">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums sm:text-right ${labelClass}`}
      >
        {label}
      </span>
    </li>
  );
}

function RowFeedbackAccordion({
  rowName,
  message,
}: {
  rowName: string;
  message: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-surface-border/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-ink-muted hover:bg-surface-muted/50"
        aria-expanded={open}
      >
        <span>Feedback: {rowName}</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="border-t border-surface-border/80 px-3 py-2 text-sm leading-relaxed text-ink-muted">
          {message}
        </p>
      )}
    </div>
  );
}

export function ScoreReport({ report }: ScoreReportProps) {
  const isSeminar = report.gradingCourse === "seminar";
  const taskLabel =
    report.seminarTask === "irr"
      ? "Individual Research Report"
      : "Individual Written Argument";
  const maxTotal = report.seminarMaxTotal ?? (isSeminar ? 48 : 5);

  const displayFlags = report.flags.filter(
    (f) => !f.includes("automated estimate") && f !== report.practiceDisclaimer,
  );

  const feedbackByRow = new Map(
    (report.rowFeedback ?? []).map((fb) => [fb.row, fb.message]),
  );

  return (
    <section
      className="mt-6 rounded-2xl border border-surface-border bg-white p-8 shadow-card sm:p-10"
      aria-label="Score report"
    >
      <h2 className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-ink-faint">
        Score report
      </h2>

      <p className="mb-8 text-center text-xs italic text-gray-400">
        Practice score only — not official College Board grading
      </p>

      {report.wordCountGate?.show && (
        <div
          role="status"
          className="mb-6 rounded-lg border-2 border-blue-700 bg-blue-50 px-4 py-4 text-sm leading-relaxed text-blue-950 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            Word count
          </p>
          <p className="mt-2 font-semibold">
            WORD COUNT: {report.pipelineDiagnostic?.bodyWordCount ?? report.wordCount}{" "}
            words
          </p>
          <p className="mt-1 font-medium">
            Status: {report.wordCountGate.statusLabel}
          </p>
          {report.wordCountGate.studentMessage && (
            <p className="mt-3">{report.wordCountGate.studentMessage}</p>
          )}
          {report.wordCountGate.totalDeduction > 0 && (
            <div className="mt-4 border-t border-blue-200/80 pt-3">
              <p className="font-semibold">
                Word count deductions: −{report.wordCountGate.totalDeduction}{" "}
                point{report.wordCountGate.totalDeduction === 1 ? "" : "s"}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-blue-900">
                {report.wordCountGate.rowCapDetails.map((d) => (
                  <li key={d.row}>
                    {d.row} capped at {d.cappedAt} (was {d.organicScore})
                  </li>
                ))}
                {report.wordCountGate.proportionalDeduction > 0 && (
                  <li>
                    Proportional deduction: −
                    {report.wordCountGate.proportionalDeduction} point
                    {report.wordCountGate.proportionalDeduction === 1
                      ? ""
                      : "s"}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {report.incompleteSubmissionWarning && (
        <div
          role="alert"
          className="mb-6 rounded-lg border-2 border-orange-600 bg-orange-50 px-4 py-4 text-sm font-medium leading-relaxed text-orange-950 shadow-sm"
        >
          {report.incompleteSubmissionWarning}
        </div>
      )}

      <SubmissionDiagnosticPanel
        diagnostic={report.pipelineDiagnostic}
        completenessIndicator={report.completenessIndicator}
      />

      {report.pdfExtractionQualityWarning && (
        <div
          role="alert"
          className="mb-6 rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-4 text-sm font-medium leading-relaxed text-amber-950 shadow-sm"
        >
          {report.pdfExtractionQualityWarning}
        </div>
      )}

      {displayFlags.length > 0 && (
        <ul className="mb-6 space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {displayFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      )}

      {isSeminar && (
        <p className="mb-4 text-center text-sm text-ink-muted">{taskLabel}</p>
      )}

      <ul className="space-y-6">
        {report.categories.map((category, index) => {
          const parsed = parseRowScore(category.label);
          const barClass = parsed
            ? rowBarColor(parsed.score, parsed.max)
            : "bg-accent";
          const labelClass = parsed
            ? rowLabelColor(parsed.score, parsed.max)
            : "text-ink";
          const fb = feedbackByRow.get(category.name);
          return (
            <li key={category.name}>
              <CategoryRow
                name={
                  isSeminar
                    ? `Row ${index + 1} — ${category.name}`
                    : category.name
                }
                label={category.label}
                fillPercent={category.fillPercent}
                barClass={barClass}
                labelClass={labelClass}
              />
              {fb && <RowFeedbackAccordion rowName={category.name} message={fb} />}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 border-t border-surface-border pt-10 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-faint">
          {isSeminar ? "Total score" : "Overall AP score"}
        </p>
        <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">
          {report.overallLabel}
        </p>

        {isSeminar && (
          <div className="mx-auto mt-4 max-w-md">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${report.overallFillPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              {report.overallLabel} of {maxTotal} points
            </p>
          </div>
        )}

        {isSeminar ? (
          <>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-light px-4 py-2">
              <span className="text-xs font-medium text-ink-muted">
                Quality level
              </span>
              <span className="text-sm font-semibold text-accent">
                {report.apDisplay}
              </span>
            </div>
            {report.qualityMessage && (
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
                {report.qualityMessage}
              </p>
            )}
          </>
        ) : (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-light px-4 py-2">
            <span className="text-xs font-medium text-ink-muted">AP prediction</span>
            <span className="text-sm font-semibold text-accent">
              {report.apDisplay}
            </span>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-faint">
          Confidence: {report.confidence}
          {report.confidenceExplanation
            ? ` — ${report.confidenceExplanation}`
            : ""}
          {report.graderVersion ? ` · Engine ${report.graderVersion}` : ""}
        </p>

        {report.seminarAnchorNote && (
          <p className="mx-auto mt-6 max-w-lg rounded-lg border border-surface-border bg-surface-muted/30 px-4 py-3 text-sm leading-relaxed text-ink-muted">
            {report.seminarAnchorNote}
          </p>
        )}

        {report.seminarRow1InfoNote && (
          <p className="mx-auto mt-4 max-w-lg rounded-lg border border-surface-border bg-surface-muted/20 px-4 py-3 text-xs leading-relaxed text-ink-muted">
            {report.seminarRow1InfoNote}
          </p>
        )}

        {report.seminarComparisonNote && (
          <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-ink-muted">
            {report.seminarComparisonNote}
          </p>
        )}
      </div>
    </section>
  );
}
