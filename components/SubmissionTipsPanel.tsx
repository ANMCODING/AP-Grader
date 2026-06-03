"use client";

import { useState } from "react";

const TIPS: string[] = [
  "For the most accurate results upload your paper as a PDF file using the Upload File button. PDF upload delivers your complete paper to the engine reliably without any clipboard truncation issues. Simply export your paper as a PDF from Google Docs or Microsoft Word and upload it directly.",
  "If pasting your paper select all text first with Ctrl+A on Windows or Cmd+A on Mac before copying. For papers longer than 3,000 words PDF upload is more reliable than paste and is recommended.",
  "If your paper has results tables as images the engine cannot read the numbers inside them. Write your key statistics in sentences in your results section to get the most accurate score.",
  "If your paper has results tables make sure your key findings are also described in words in your results section. The engine reads your prose but cannot read tables that are images or screenshots. Writing your main statistics in sentences will give you a more accurate score.",
  "Paste your complete paper including introduction, literature review, method, results, discussion, limitations, implications, conclusion, and references. Do not paste only part of your paper.",
  "Include your references section. The engine uses your references to count your sources. Without the references section your Scholarly Grounding score will be lower than it should be.",
  "If your paper has tables or figures they cannot be read by the engine. The engine will credit you for figures and tables that are referenced and discussed in your prose but cannot read the actual images or embedded tables.",
  'Your word count on the cover page helps the engine verify your submission is complete. Make sure your paper starts with a line saying Word Count: followed by your word count.',
  "If you see the incomplete submission warning try using the file upload option instead of pasting. Upload your paper as a .txt or .docx file for the most reliable submission.",
  "PDF upload works best with text-based PDFs exported directly from Google Docs or Microsoft Word. Scanned PDFs or PDFs created from images cannot be read. If your PDF upload fails try downloading your paper as a .docx file and uploading that instead.",
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
    </svg>
  );
}

export function SubmissionTipsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-muted/50 px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
        aria-expanded={open}
      >
        <span>Submission Tips</span>
        <Chevron open={open} />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <ul className="mt-2 list-inside list-disc space-y-2.5 rounded-lg border border-surface-border bg-accent-light/30 px-4 py-3 text-sm leading-relaxed text-ink-muted marker:text-accent">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
