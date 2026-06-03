"use client";

import { useEffect, useState } from "react";
import type { SectionPreviewResult } from "@/lib/client/sectionPreview";

interface SectionDetectionPreviewProps {
  scan: SectionPreviewResult;
  active: boolean;
}

type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  ok: boolean;
};

function buildItems(scan: SectionPreviewResult): ChecklistItem[] {
  const rq = scan.researchQuestion;
  const lit = scan.literatureReview;
  const refs = scan.references;

  return [
    {
      key: "rq",
      label: "Research question detected",
      ok: rq.found,
      detail: rq.found
        ? `Yes — ${rq.preview ?? ""}`
        : `Not found — ${rq.suggestion ?? "Check that your research question is clearly stated."}`,
    },
    {
      key: "lit",
      label: "Literature review detected",
      ok: lit.found,
      detail: lit.found
        ? `Yes — ${lit.sectionCount} section heading${lit.sectionCount === 1 ? "" : "s"} found`
        : "Not found",
    },
    {
      key: "method",
      label: "Method section detected",
      ok: scan.method.found,
      detail: scan.method.found ? "Yes" : "Not found",
    },
    {
      key: "results",
      label: "Results section detected",
      ok: scan.results.found,
      detail: scan.results.found ? "Yes" : "Not found",
    },
    {
      key: "refs",
      label: "References section detected",
      ok: refs.found,
      detail: refs.found
        ? `Yes — ${refs.entryCount} bibliography entr${refs.entryCount === 1 ? "y" : "ies"} detected`
        : "Not found — include a References or Works Cited section",
    },
  ];
}

function Row({ item, visible }: { item: ChecklistItem; visible: boolean }) {
  if (!visible) return null;
  return (
    <li className="flex gap-2.5 text-sm leading-snug">
      <span
        className={`mt-0.5 shrink-0 font-semibold ${item.ok ? "text-green-700" : "text-ink-faint"}`}
        aria-hidden
      >
        {item.ok ? "✓" : "—"}
      </span>
      <div>
        <p className="font-medium text-ink">{item.label}</p>
        <p className="mt-0.5 text-ink-muted">{item.detail}</p>
      </div>
    </li>
  );
}

export function SectionDetectionPreview({ scan, active }: SectionDetectionPreviewProps) {
  const items = buildItems(scan);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    const timers: number[] = [];
    for (let i = 0; i < items.length; i++) {
      timers.push(
        window.setTimeout(() => {
          setVisibleCount(i + 1);
        }, 400 * (i + 1)),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, scan]);

  if (!active) return null;

  return (
    <div
      className="mt-6 rounded-xl border border-surface-border bg-surface-muted/40 p-5"
      aria-live="polite"
      aria-label="Section detection preview"
    >
      <h3 className="mb-4 text-xs font-medium uppercase tracking-widest text-ink-faint">
        Paper structure preview
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <Row key={item.key} item={item} visible={i < visibleCount} />
        ))}
      </ul>
    </div>
  );
}
