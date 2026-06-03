const STORAGE_KEY = "ap-research-grader-submission-history";
const MAX_ENTRIES = 3;

export interface HistoryCategoryScore {
  name: string;
  label: string;
}

export interface SubmissionHistoryEntry {
  id: string;
  timestamp: number;
  title: string;
  overallLabel: string;
  apScore: number;
  categories: HistoryCategoryScore[];
  coursePrefix?: string;
}

export function detectPaperTitle(text: string): string {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (/^word\s+count\s*:/i.test(line)) continue;
    if (/^ap\s+research\b/i.test(line)) continue;
    if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(line)) {
      continue;
    }
    if (/^\d{4}$/.test(line)) continue;
    if (/^student\s*:/i.test(line)) continue;
    if (line.length >= 12 && line.length <= 220) {
      return line.length > 80 ? `${line.slice(0, 77)}…` : line;
    }
  }
  return "Untitled Paper";
}

export function loadSubmissionHistory(): SubmissionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SubmissionHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveSubmissionHistory(entry: SubmissionHistoryEntry): void {
  if (typeof window === "undefined") return;
  const existing = loadSubmissionHistory().filter((e) => e.id !== entry.id);
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearSubmissionHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function pushHistoryFromReport(
  report: {
    overallLabel: string;
    apScore: number;
    categories: { name: string; label: string }[];
    gradingCourse?: string;
    seminarTask?: string;
  },
  paperText: string,
): SubmissionHistoryEntry[] {
  const coursePrefix =
    report.gradingCourse === "seminar"
      ? report.seminarTask === "irr"
        ? "[IRR]"
        : "[IWA]"
      : undefined;
  const entry: SubmissionHistoryEntry = {
    id: `${Date.now()}`,
    timestamp: Date.now(),
    title: detectPaperTitle(paperText),
    overallLabel: report.overallLabel,
    apScore: report.apScore,
    coursePrefix,
    categories: report.categories.map((c) => ({
      name: c.name,
      label: c.label,
    })),
  };
  saveSubmissionHistory(entry);
  return loadSubmissionHistory();
}
