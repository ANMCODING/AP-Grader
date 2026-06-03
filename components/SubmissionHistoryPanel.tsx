"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreReport as ScoreReportType } from "@/lib/types";
import {
  clearSubmissionHistory,
  loadSubmissionHistory,
  type SubmissionHistoryEntry,
} from "@/lib/client/submissionHistory";

interface SubmissionHistoryPanelProps {
  currentReport: ScoreReportType | null;
  /** Bump after a new grade is saved so the list refreshes without reload. */
  refreshKey?: number;
}

function compareLabel(current: string, past: string): string | null {
  if (current === past) return null;
  const parse = (label: string) => {
    const m = label.match(/^(Low|Mid|High)\s+(\d)$/);
    if (!m) return null;
    const tier = { Low: 0, Mid: 0.35, High: 0.7 }[m[1] as "Low" | "Mid" | "High"];
    return parseInt(m[2], 10) - 1 + tier;
  };
  const a = parse(current);
  const b = parse(past);
  if (a === null || b === null) return null;
  if (a > b) return "↑";
  if (a < b) return "↓";
  return null;
}

function ComparisonView({
  entry,
  current,
  onClose,
}: {
  entry: SubmissionHistoryEntry;
  current: ScoreReportType;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-surface-border bg-surface-muted/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{entry.title}</p>
          <p className="text-xs text-ink-faint">
            {new Date(entry.timestamp).toLocaleDateString()} — was{" "}
            {entry.overallLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-accent hover:underline"
        >
          Close
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {current.categories.map((cat, i) => {
          const past = entry.categories[i];
          const arrow = past
            ? compareLabel(cat.label, past.label)
            : null;
          return (
            <li
              key={cat.name}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/60 pb-2 last:border-0"
            >
              <span className="text-ink-muted">{cat.name}</span>
              <span className="tabular-nums text-ink">
                {past?.label ?? "—"} → {cat.label}
                {arrow && (
                  <span
                    className={`ml-1.5 font-semibold ${arrow === "↑" ? "text-green-700" : "text-red-600"}`}
                  >
                    {arrow}
                  </span>
                )}
              </span>
            </li>
          );
        })}
        <li className="flex flex-wrap items-center justify-between gap-2 pt-1 font-medium">
          <span>Overall</span>
          <span className="tabular-nums">
            {entry.overallLabel} → {current.overallLabel}
            {compareLabel(current.overallLabel, entry.overallLabel) && (
              <span className="ml-1.5">
                {compareLabel(current.overallLabel, entry.overallLabel)}
              </span>
            )}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function SubmissionHistoryPanel({
  currentReport,
  refreshKey = 0,
}: SubmissionHistoryPanelProps) {
  const [history, setHistory] = useState<SubmissionHistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadSubmissionHistory());
  }, [refreshKey]);

  const handleClear = useCallback(() => {
    clearSubmissionHistory();
    setHistory([]);
    setSelectedId(null);
  }, []);

  if (history.length === 0) {
    return null;
  }

  const selected = history.find((h) => h.id === selectedId) ?? null;

  return (
    <section
      className="mt-6 rounded-2xl border border-surface-border bg-white p-6 shadow-card sm:p-8"
      aria-label="Previous submissions"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-faint">
          Previous Submissions
        </h2>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-ink-faint hover:text-ink hover:underline"
        >
          Clear History
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() =>
              setSelectedId((id) => (id === entry.id ? null : entry.id))
            }
            className={[
              "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              selectedId === entry.id
                ? "border-accent bg-accent-light"
                : "border-surface-border bg-surface-muted/40 hover:border-ink-faint/30",
            ].join(" ")}
          >
            <p className="truncate font-medium text-ink">
              {entry.coursePrefix ? `${entry.coursePrefix} ` : ""}
              {entry.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {new Date(entry.timestamp).toLocaleDateString()}
            </p>
            <p className="mt-1 font-semibold tabular-nums text-ink">
              {entry.overallLabel}
            </p>
          </button>
        ))}
        {history.length < 3 &&
          Array.from({ length: 3 - history.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-lg border border-dashed border-surface-border bg-surface-muted/20 px-3 py-2.5 text-xs text-ink-faint"
            >
              Empty slot
            </div>
          ))}
      </div>
      {selected && currentReport && (
        <ComparisonView
          entry={selected}
          current={currentReport}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}
