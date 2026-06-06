"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccuracyBanner } from "@/components/AccuracyBanner";
import { ScoreReport } from "@/components/ScoreReport";
import { SiteHeader } from "@/components/SiteHeader";
import { SubmissionWordCountBar } from "@/components/SubmissionWordCountBar";
import { SubmissionTipsPanel } from "@/components/SubmissionTipsPanel";
import { SubmissionAccuracyTip } from "@/components/SubmissionAccuracyTip";
import { SectionDetectionPreview } from "@/components/SectionDetectionPreview";
import { SubmissionHistoryPanel } from "@/components/SubmissionHistoryPanel";
import { SchoolSelector } from "@/components/SchoolSelector";
import {
  emptySectionPreview,
  scanSectionsForPreview,
  type SectionPreviewResult,
} from "@/lib/client/sectionPreview";
import { gradeInBrowser, STATIC_HOST_NOTE } from "@/lib/client/browserGrading";
import { pushHistoryFromReport } from "@/lib/client/submissionHistory";
import { countWords } from "@/lib/grader/text";
import type {
  GradingCourse,
  ScoreReport as ScoreReportType,
  SeminarTaskType,
} from "@/lib/types";
import type { PdfSubmissionMeta } from "@/lib/server/pdfCleanTypes";

const PASTE_SHORT_WARNING =
  "Paste may have been cut short by your browser. Try using the Upload File button instead for papers longer than 2,000 words.";

const staticGitHubPagesHost =
  process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

function isGoogleDocsUrl(text: string): boolean {
  return /^https?:\/\/(www\.)?docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/i.test(
    text.trim(),
  );
}

type Phase = "idle" | "analyzing" | "done" | "error";

const MIN_ANALYSIS_MS = 30_000;
const LOADING_STEP_MS = 5_500;
const SHORT_REJECTION_MAX_WORDS = 450;

const RESEARCH_LOADING_MESSAGES = [
  "Reading your paper structure...",
  "Analyzing your research question and focus...",
  "Evaluating your literature review and sources...",
  "Reviewing your methodology and research design...",
  "Assessing your results and argument...",
  "Finalizing your scores...",
] as const;

const SEMINAR_LOADING_MESSAGES = [
  "Reading your essay...",
  "Analyzing context and stimulus integration...",
  "Evaluating perspectives and argument...",
  "Reviewing evidence and source use...",
  "Checking citation conventions...",
  "Finalizing rubric row scores...",
] as const;

function isInstantShortRejection(report: ScoreReportType): boolean {
  return Boolean(
    report.rejected && report.wordCount < SHORT_REJECTION_MAX_WORDS,
  );
}

async function waitForMinimumAnalysisTime(startedAt: number): Promise<void> {
  const remaining = MIN_ANALYSIS_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`}
      aria-hidden
    />
  );
}

function buildLoadingSchedule(
  scan: SectionPreviewResult,
  messages: readonly string[],
): { at: number; text: string }[] {
  const schedule: { at: number; text: string }[] = [];
  let t = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    schedule.push({ at: t, text: messages[i]! });
    t += LOADING_STEP_MS;
  }
  if (scan.issueLoadingMessage) {
    schedule.push({ at: t, text: scan.issueLoadingMessage });
    t += 4_000;
  }
  schedule.push({ at: t, text: messages[messages.length - 1]! });
  return schedule;
}

export function HomePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [hasPastedText, setHasPastedText] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [report, setReport] = useState<ScoreReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const SEMINAR_TASK_STORAGE_KEY = "ap-seminar-last-task";

  const [gradingCourse, setGradingCourse] = useState<GradingCourse>("research");
  const [seminarTask, setSeminarTask] = useState<SeminarTaskType>("iwa");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SEMINAR_TASK_STORAGE_KEY);
    if (saved === "iwa" || saved === "irr") setSeminarTask(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SEMINAR_TASK_STORAGE_KEY, seminarTask);
  }, [seminarTask]);
  const loadingMessages =
    gradingCourse === "seminar"
      ? SEMINAR_LOADING_MESSAGES
      : RESEARCH_LOADING_MESSAGES;
  const [loadingMessage, setLoadingMessage] = useState<string>(
    RESEARCH_LOADING_MESSAGES[0],
  );
  const [sectionScan, setSectionScan] = useState<SectionPreviewResult | null>(
    null,
  );
  const [googleDocsLoading, setGoogleDocsLoading] = useState(false);
  const [googleDocsMessage, setGoogleDocsMessage] = useState<string | null>(
    null,
  );
  const [fileLoading, setFileLoading] = useState(false);
  const [fileLoadingLabel, setFileLoadingLabel] = useState("Reading file…");
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [pdfLayoutWarning, setPdfLayoutWarning] = useState(false);
  const [pdfSubmissionMeta, setPdfSubmissionMeta] =
    useState<PdfSubmissionMeta | null>(null);
  const [joinSoftLineBreaksWordCount, setJoinSoftLineBreaksWordCount] =
    useState<number | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [pasteSizeWarning, setPasteSizeWarning] = useState<string | null>(
    null,
  );

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pendingPasteRef = useRef<{
    clipboardChars: number;
    clipboardWords: number;
  } | null>(null);

  const getPastedText = useCallback(
    () => textareaRef.current?.value ?? "",
    [],
  );

  const bumpContent = useCallback(() => {
    setContentVersion((v) => v + 1);
    setHasPastedText(getPastedText().trim().length > 0);
  }, [getPastedText]);

  const populateTextarea = useCallback(
    (
      content: string,
      fileName?: string | null,
      options?: {
        pdfLayoutWarning?: boolean;
        pdfSubmission?: PdfSubmissionMeta | null;
        joinSoftLineBreaksWordCount?: number | null;
      },
    ) => {
      const el = textareaRef.current;
      if (!el) return;
      el.value = content;
      setLoadedFileName(fileName ?? null);
      setPasteSizeWarning(null);
      setPdfLayoutWarning(options?.pdfLayoutWarning ?? false);
      setPdfSubmissionMeta(options?.pdfSubmission ?? null);
      setJoinSoftLineBreaksWordCount(
        options?.joinSoftLineBreaksWordCount ?? null,
      );
      pendingPasteRef.current = null;
      bumpContent();
    },
    [bumpContent],
  );

  const importGoogleDocs = useCallback(
    async (url: string): Promise<boolean> => {
      const trimmed = url.trim();
      if (!isGoogleDocsUrl(trimmed)) return false;
      if (staticGitHubPagesHost) {
        setError(
          "Google Docs import is not available on GitHub Pages. Open the doc, copy the text, and paste it here.",
        );
        return false;
      }
      setError(null);
      setGoogleDocsMessage(null);
      setGoogleDocsLoading(true);
      try {
        const res = await fetch("/api/google-docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = (await res.json()) as {
          text?: string;
          wordCount?: number;
          possibleTwoColumn?: boolean;
          pdfSubmission?: PdfSubmissionMeta | null;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            data.error ??
              "Document is not publicly viewable. In Google Docs go to Share, change access to Anyone with the link, then try again.",
          );
        }
        if (!data.text?.trim()) {
          throw new Error("No text was returned from the document.");
        }
        populateTextarea(data.text, "Google Docs import", {
          pdfLayoutWarning: Boolean(data.possibleTwoColumn),
          pdfSubmission: data.pdfSubmission ?? null,
        });
        setGoogleDocsMessage(
          `Loaded ${(data.wordCount ?? 0).toLocaleString()} words from Google Docs.`,
        );
        return true;
      } catch (err) {
        setGoogleDocsMessage(
          err instanceof Error
            ? err.message
            : "Document is not publicly viewable. In Google Docs go to Share, change access to Anyone with the link, then try again.",
        );
        return false;
      } finally {
        setGoogleDocsLoading(false);
      }
    },
    [populateTextarea],
  );

  const handleTextareaPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = e.clipboardData.getData("text/plain");
      if (isGoogleDocsUrl(pasted)) {
        e.preventDefault();
        void importGoogleDocs(pasted);
        return;
      }
      const clipboardChars = pasted.length;
      const clipboardWords = countWords(pasted);

      console.log(
        `PASTE EVENT: clipboard text length = ${clipboardChars} characters`,
      );
      console.log(`PASTE EVENT: clipboard word count = ${clipboardWords} words`);
      console.log(
        `PASTE EVENT: first 200 chars = ${pasted.slice(0, 200)}`,
      );
      console.log(`PASTE EVENT: last 200 chars = ${pasted.slice(-200)}`);
      console.log("PASTE EVENT: preventDefault called = false");

      pendingPasteRef.current = { clipboardChars, clipboardWords };
      setLoadedFileName(null);
      setPdfSubmissionMeta(null);
      setPasteSizeWarning(null);
      // Native browser paste — do not preventDefault or manually splice value.
    },
    [importGoogleDocs],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const onInput = () => {
      const domValue = el.value;
      const domChars = domValue.length;
      const domWords = countWords(domValue);

      bumpContent();

      const pending = pendingPasteRef.current;
      if (!pending) return;
      pendingPasteRef.current = null;

      console.log(
        `PASTE INPUT: DOM text length = ${domChars} characters, ${domWords} words`,
      );

      const { clipboardChars, clipboardWords } = pending;
      const truncatedInHandler =
        clipboardChars > 0 && domChars < clipboardChars * 0.85;
      const truncatedVsClipboard =
        clipboardWords > 0 && domWords < clipboardWords * 0.85;

      if (
        domChars < 500 ||
        truncatedInHandler ||
        truncatedVsClipboard
      ) {
        setPasteSizeWarning(PASTE_SHORT_WARNING);
      } else {
        setPasteSizeWarning(null);
      }
    };

    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, [bumpContent]);

  const canSubmit = hasPastedText && phase !== "analyzing";

  const hasSubmissionContent =
    hasPastedText || loadedFileName !== null;

  const clearSubmission = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.value = "";
    }
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    setLoadedFileName(null);
    setPasteSizeWarning(null);
    setFileUploadError(null);
    setPdfLayoutWarning(false);
    setPdfSubmissionMeta(null);
    setJoinSoftLineBreaksWordCount(null);
    setGoogleDocsMessage(null);
    pendingPasteRef.current = null;
    bumpContent();
  }, [bumpContent]);

  useEffect(() => {
    if (phase !== "analyzing") return;

    const scan = sectionScan ?? emptySectionPreview();
    const schedule = buildLoadingSchedule(scan, loadingMessages);
    const timers = schedule.map(({ at, text }) =>
      window.setTimeout(() => setLoadingMessage(text), at),
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase, sectionScan, loadingMessages]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setGoogleDocsMessage(null);
      setFileUploadError(null);
      setFileLoading(true);
      setFileLoadingLabel("Reading file…");
      try {
        const lower = file.name.toLowerCase();
        let text = "";
        let pdfLayout = false;

        if (lower.endsWith(".txt") || file.type === "text/plain") {
          text = await file.text();
        } else if (lower.endsWith(".docx")) {
          const mammoth = await import("mammoth");
          const buffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          text = result.value;
        } else if (lower.endsWith(".pdf") || file.type === "application/pdf") {
          if (staticGitHubPagesHost) {
            throw new Error(
              "PDF upload is not available on GitHub Pages. Paste your paper text or upload a .docx file.",
            );
          }
          setFileLoadingLabel("Extracting PDF…");
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/extract-pdf", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as {
            text?: string;
            wordCount?: number;
            joinSoftLineBreaksWordCount?: number;
            possibleTwoColumn?: boolean;
            pdfSubmission?: PdfSubmissionMeta;
            error?: string;
          };
          if (!res.ok) {
            throw new Error(
              data.error ??
                "Could not extract text from this PDF. Try pasting your paper directly or uploading a .docx file instead.",
            );
          }
          text = data.text ?? "";
          pdfLayout = Boolean(data.possibleTwoColumn);
          populateTextarea(text, file.name, {
            pdfLayoutWarning: pdfLayout,
            pdfSubmission: data.pdfSubmission ?? null,
            joinSoftLineBreaksWordCount: data.joinSoftLineBreaksWordCount ?? null,
          });
          return;
        } else {
          throw new Error(
            "Please upload a .txt, .docx, or .pdf file.",
          );
        }
        if (!text.trim()) {
          throw new Error("The file appears to be empty.");
        }
        populateTextarea(text, file.name, {
          pdfLayoutWarning: pdfLayout,
          pdfSubmission: null,
          joinSoftLineBreaksWordCount: null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not read file.";
        setFileUploadError(message);
      } finally {
        setFileLoading(false);
        setFileLoadingLabel("Reading file…");
      }
    },
    [populateTextarea],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      let submissionText = getPastedText().trim();
      if (!submissionText) return;

      if (isGoogleDocsUrl(submissionText)) {
        const imported = await importGoogleDocs(submissionText);
        if (!imported) return;
        submissionText = getPastedText().trim();
        if (!submissionText) return;
      }

      setPhase("analyzing");
      setError(null);
      setReport(null);
      setGoogleDocsMessage(null);
      const scan =
        gradingCourse === "research"
          ? scanSectionsForPreview(submissionText)
          : null;
      setSectionScan(scan);
      setLoadingMessage(loadingMessages[0]!);
      const analysisStartedAt = Date.now();

      try {
        let reportData: ScoreReportType;
        if (staticGitHubPagesHost) {
          reportData = gradeInBrowser({
            course: gradingCourse,
            text: submissionText,
            seminarTask,
            joinSoftLineBreaksWordCount,
            pdfSubmission: pdfSubmissionMeta,
          });
        } else {
          const apiUrl =
            gradingCourse === "seminar" ? "/api/grade-seminar" : "/api/grade";
          const body =
            gradingCourse === "seminar"
              ? { text: submissionText, task: seminarTask }
              : {
                  text: submissionText,
                  pdfSubmission: pdfSubmissionMeta,
                  joinSoftLineBreaksWordCount,
                };
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = (await res.json()) as ScoreReportType & {
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error ?? "Grading failed.");
          }
          reportData = data as ScoreReportType;
        }
        if (!isInstantShortRejection(reportData)) {
          await waitForMinimumAnalysisTime(analysisStartedAt);
        }

        setReport(reportData);
        pushHistoryFromReport(reportData, submissionText);
        setHistoryRefreshKey((k) => k + 1);
        setPhase("done");
        setSectionScan(null);
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setPhase("error");
        setSectionScan(null);
      }
    },
    [
      canSubmit,
      getPastedText,
      gradingCourse,
      seminarTask,
      loadingMessages,
      pdfSubmissionMeta,
      joinSoftLineBreaksWordCount,
      importGoogleDocs,
    ],
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AccuracyBanner />
      <SiteHeader />

      <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-xl">
          <form onSubmit={onSubmit}>
            <article className="rounded-2xl border border-surface-border bg-white p-8 shadow-card sm:p-10">
              <div className="mb-6 flex justify-center">
                <div
                  className="inline-flex rounded-lg border border-surface-border bg-surface-muted/50 p-0.5"
                  role="tablist"
                  aria-label="Grading course"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={gradingCourse === "research"}
                    onClick={() => setGradingCourse("research")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      gradingCourse === "research"
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    AP Research
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={gradingCourse === "seminar"}
                    onClick={() => setGradingCourse("seminar")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      gradingCourse === "seminar"
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    AP Seminar
                  </button>
                </div>
              </div>

              <header className="mb-8 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.65rem]">
                  {gradingCourse === "research"
                    ? "AP Research Grading"
                    : "AP Seminar Grading"}
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                  {gradingCourse === "research"
                    ? "Upload your paper and get a full score report."
                    : "Submit your IWA or IRR for rubric row scoring."}
                </p>
              </header>

              <SchoolSelector />

              {gradingCourse === "seminar" && (
                <div className="mb-6">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Task type
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSeminarTask("iwa")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        seminarTask === "iwa"
                          ? "border-accent/40 bg-accent-light text-accent"
                          : "border-surface-border text-ink-muted hover:bg-surface-muted"
                      }`}
                    >
                      IWA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeminarTask("irr")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        seminarTask === "irr"
                          ? "border-accent/40 bg-accent-light text-accent"
                          : "border-surface-border text-ink-muted hover:bg-surface-muted"
                      }`}
                    >
                      IRR
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                    {seminarTask === "iwa"
                      ? "Individual Written Argument — argument essay responding to a stimulus packet (up to 2,000 words, scored out of 48 points)"
                      : "Individual Research Report — research-based analytical report (up to 1,200 words, scored out of 30 points)"}
                  </p>
                </div>
              )}

              {gradingCourse === "research" && (
                <p className="mb-3 text-sm leading-relaxed text-ink-muted">
                  <span className="font-medium text-ink">Visual content note:</span>{" "}
                  This tool analyzes text only. Figures, charts, graphs, and tables
                  embedded as images are not read. Paste or type labels and analysis
                  in the text (e.g. &quot;Figure 1 shows…&quot;, &quot;as shown in Table
                  2&quot;) so your visual data can be credited.
                </p>
              )}

              <label className="sr-only" htmlFor="paper-text">
                Paste your paper
              </label>
              <div>
                {(loadedFileName || (hasSubmissionContent && phase !== "analyzing")) && (
                  <div className="mb-1.5 flex min-h-5 items-center justify-end gap-3">
                    {loadedFileName ? (
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-accent">
                        Loaded: {loadedFileName}
                      </p>
                    ) : (
                      <span className="flex-1" aria-hidden />
                    )}
                    {hasSubmissionContent && phase !== "analyzing" && (
                      <button
                        type="button"
                        onClick={clearSubmission}
                        className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink-muted"
                        aria-label="Clear submission"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  id="paper-text"
                  defaultValue=""
                  onPaste={handleTextareaPaste}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) void handleUploadFile(f);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  placeholder="Paste your paper here"
                  rows={7}
                  disabled={phase === "analyzing"}
                  className="w-full resize-y overflow-y-auto rounded-xl border border-surface-border bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint/70 outline-none transition-shadow focus:border-accent/40 focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
                />
              </div>

              {pasteSizeWarning && (
                <p className="mt-2 text-xs leading-relaxed text-orange-700" role="status">
                  {pasteSizeWarning}
                </p>
              )}

              <SubmissionWordCountBar
                contentVersion={contentVersion}
                getText={getPastedText}
                pdfLayoutWarning={pdfLayoutWarning}
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="sr-only"
                  accept=".txt,.docx,.pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUploadFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={phase === "analyzing" || fileLoading}
                  onClick={() => uploadInputRef.current?.click()}
                  aria-label="Upload your paper as a PDF, Word document, or text file. PDF upload recommended for best results."
                  className="rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  {fileLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="border-ink/20 border-t-ink" />
                      {fileLoadingLabel}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Upload File (.txt, .docx, or .pdf)
                      <span className="rounded-full bg-green-700 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                        Recommended
                      </span>
                    </span>
                  )}
                </button>
                {fileUploadError && (
                  <p className="mt-2 text-xs leading-relaxed text-red-600" role="alert">
                    {fileUploadError}
                  </p>
                )}
              </div>

              <p className="mt-2 text-xs text-ink-muted">
                Or paste a Google Docs link
              </p>
              {staticGitHubPagesHost && (
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {STATIC_HOST_NOTE}
                </p>
              )}
              {googleDocsLoading && (
                <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted" role="status">
                  <Spinner className="border-ink/20 border-t-ink" />
                  Loading document…
                </p>
              )}
              {googleDocsMessage && !googleDocsLoading && (
                <p
                  className={`mt-1 text-xs leading-relaxed ${googleDocsMessage.startsWith("Loaded") ? "text-green-800" : "text-red-600"}`}
                  role="status"
                >
                  {googleDocsMessage}
                </p>
              )}

              <SubmissionAccuracyTip course={gradingCourse} />

              <SubmissionTipsPanel />

              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 flex w-full flex-col items-center justify-center gap-1 rounded-xl bg-ink px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1a2129] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {phase === "analyzing" ? (
                  <>
                    <span className="flex items-center gap-2.5">
                      <Spinner />
                      Analyzing
                    </span>
                    <span className="text-xs font-normal text-white/70 transition-opacity duration-500">
                      {loadingMessage}
                    </span>
                  </>
                ) : (
                  "Submit for Scoring"
                )}
              </button>

              <p className="mt-3 w-full text-xs leading-relaxed text-gray-400">
                This tool provides practice scoring only and is not affiliated
                with, endorsed by, or a product of College Board. Scores are
                estimates and may differ from official AP exam scoring.
              </p>
              <p className="mt-2 w-full text-xs text-gray-400">
                If you have any questions, email me at{" "}
                <a
                  href="mailto:anmosman@gmail.com"
                  className="underline hover:text-gray-500"
                >
                  anmosman@gmail.com
                </a>
                .
              </p>

              {phase === "analyzing" &&
                gradingCourse === "research" &&
                sectionScan && (
                  <SectionDetectionPreview scan={sectionScan} active />
                )}
            </article>
          </form>

          <div ref={resultsRef}>
            {phase === "done" && report && <ScoreReport report={report} />}
            <SubmissionHistoryPanel
              currentReport={phase === "done" ? report : null}
              refreshKey={historyRefreshKey}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
