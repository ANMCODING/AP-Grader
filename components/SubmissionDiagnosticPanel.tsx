"use client";

import { useState } from "react";
import type {
  CompletenessIndicator,
  SubmissionPipelineDiagnostic,
} from "@/lib/types";

interface SubmissionDiagnosticPanelProps {
  diagnostic?: SubmissionPipelineDiagnostic;
  completenessIndicator?: CompletenessIndicator;
}

/** Ratios from pipeline diagnostic are 0–1 decimals; display as 0–100%. */
function formatPercentRatio(ratio: number): string {
  const pct = ratio <= 1 ? ratio * 100 : ratio;
  return `${pct.toFixed(1)}%`;
}

function indicatorClass(level: CompletenessIndicator["level"]): string {
  switch (level) {
    case "green":
      return "border-emerald-300 bg-emerald-50 text-emerald-950";
    case "yellow":
      return "border-amber-300 bg-amber-50 text-amber-950";
    case "orange":
      return "border-orange-400 bg-orange-50 text-orange-950";
    case "red":
      return "border-red-500 bg-red-50 text-red-950";
    default:
      return "border-surface-border bg-surface-muted/40 text-ink-muted";
  }
}

export function SubmissionDiagnosticPanel({
  diagnostic,
  completenessIndicator,
}: SubmissionDiagnosticPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!diagnostic) return null;

  const studentSummary = (
    <div className="space-y-2 text-sm">
      {completenessIndicator && (
        <p
          className={`rounded-md border px-3 py-2 font-medium ${indicatorClass(completenessIndicator.level)}`}
        >
          {completenessIndicator.message}
        </p>
      )}
      <p>
        <span className="font-medium text-ink">Body words scored:</span>{" "}
        {diagnostic.bodyWordCount.toLocaleString()}
        {diagnostic.statedWordCount
          ? ` · Stated on cover: ${diagnostic.statedWordCount.toLocaleString()}`
          : ""}
        {" · "}
        <span className="font-medium text-ink">Completeness:</span>{" "}
        {formatPercentRatio(diagnostic.bodyToOriginalRatio)} of submitted text
        {diagnostic.bodyToStatedRatio !== null
          ? ` (${formatPercentRatio(diagnostic.bodyToStatedRatio)} of stated count)`
          : ""}
      </p>
    </div>
  );

  const bodyToOriginalPct =
    diagnostic.bodyToOriginalRatio <= 1
      ? diagnostic.bodyToOriginalRatio * 100
      : diagnostic.bodyToOriginalRatio;
  const lowRetention = bodyToOriginalPct < 70;

  return (
    <div className="mb-6 rounded-lg border border-surface-border bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-ink"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        Submission Diagnostic
        <span className="text-ink-faint">{expanded ? "−" : "+"}</span>
      </button>

      <div className="border-t border-surface-border px-4 py-3">
        {studentSummary}

        {lowRetention && (
          <p
            role="alert"
            className="mt-3 rounded-md border-2 border-orange-600 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-950"
          >
            Warning: The engine processed only{" "}
            {formatPercentRatio(diagnostic.bodyToOriginalRatio)} of your submitted
            text. This usually indicates a boundary detection
            error. Please report this submission using the feedback button.
          </p>
        )}

        {expanded && (
          <dl className="mt-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
            {(
              [
                ["Original input words", diagnostic.originalInputWordCount],
                ["After control-char norm", diagnostic.afterControlCharNormWordCount],
                ["After cover strip", diagnostic.afterCoverPageStripWordCount],
                [
                  "After College Board clean",
                  diagnostic.afterCollegeBoardCleanWordCount,
                ],
                ["After normalize", diagnostic.afterNormalizePaperTextWordCount],
                [
                  "After join soft breaks (PDF)",
                  diagnostic.afterJoinSoftLineBreaksWordCount,
                ],
                ["After all cleaning", diagnostic.afterAllCleaningWordCount],
                ["Body words", diagnostic.bodyWordCount],
                ["References words", diagnostic.referencesWordCount],
                ["Appendix words", diagnostic.appendixWordCount],
                [
                  "Body / original %",
                  formatPercentRatio(diagnostic.bodyToOriginalRatio),
                ],
                [
                  "Body / stated %",
                  diagnostic.bodyToStatedRatio !== null
                    ? formatPercentRatio(diagnostic.bodyToStatedRatio)
                    : "n/a",
                ],
                ["Stated word count", diagnostic.statedWordCount ?? "n/a"],
                ["Stated source", diagnostic.statedWordCountSource],
                ["Boundary position", diagnostic.detectedBoundaryPosition],
                ["Boundary heading", diagnostic.detectedBoundaryHeading],
                ["Fallback triggered", String(diagnostic.fallbackTriggered)],
                ["Fallback reason", diagnostic.fallbackReason ?? "n/a"],
                ["Cover lines stripped", diagnostic.coverPageLinesStripped],
                ["Cover words stripped", diagnostic.coverPageWordsStripped],
                ["College Board clean ran", String(diagnostic.collegeBoardCleanRan)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium text-ink">{label}</dt>
                <dd className="tabular-nums">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
