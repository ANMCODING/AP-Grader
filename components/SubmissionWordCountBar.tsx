"use client";

import { useEffect, useState } from "react";
import {
  CLIENT_SOFT_WARNING_COMPLETENESS_MAX,
  completenessColorClass,
  computeSubmissionMetrics,
  type SubmissionMetrics,
} from "@/lib/client/submissionMetrics";

interface SubmissionWordCountBarProps {
  contentVersion: number;
  getText: () => string;
  pdfLayoutWarning?: boolean;
}

export function SubmissionWordCountBar({
  contentVersion,
  getText,
  pdfLayoutWarning = false,
}: SubmissionWordCountBarProps) {
  const [metrics, setMetrics] = useState<SubmissionMetrics | null>(null);

  useEffect(() => {
    const text = getText();
    if (!text.trim()) {
      setMetrics(null);
      return;
    }

    const id = window.setTimeout(() => {
      setMetrics(computeSubmissionMetrics(text));
    }, 300);

    return () => window.clearTimeout(id);
  }, [contentVersion, getText]);

  if (!metrics || metrics.totalWords === 0) {
    return null;
  }

  const showSoftWarning =
    metrics.statedWordCount !== null &&
    metrics.completenessPercent !== null &&
    metrics.completenessPercent < CLIENT_SOFT_WARNING_COMPLETENESS_MAX;

  return (
    <div className="mt-3">
      <div className="rounded-lg border border-surface-border bg-surface-muted/60 px-3 py-2.5 text-xs text-ink-muted">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              Total words
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {metrics.totalWords.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              Est. body words
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {metrics.estimatedBodyWords.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              Stated count
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {metrics.statedWordCount !== null
                ? metrics.statedWordCount.toLocaleString()
                : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              Completeness
            </span>
            <span
              className={`font-semibold tabular-nums ${completenessColorClass(metrics.completenessPercent)}`}
            >
              {metrics.completenessPercent !== null
                ? `${metrics.completenessPercent}%`
                : "—"}
            </span>
          </div>
        </div>
      </div>
      {showSoftWarning && (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Word count estimate may differ from final count. Submit to see your
          accurate word count.
        </p>
      )}
      {pdfLayoutWarning && (
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          This PDF may have used a two-column layout. Extracted text order may
          be affected, which can change section detection. If results look
          wrong, try uploading a .docx file or pasting your paper directly.
        </p>
      )}
    </div>
  );
}
