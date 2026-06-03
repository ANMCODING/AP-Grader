/**
 * Strict stimulus author matching (Section 2 policy).
 * Prevents false positives: However/Howe, standalone Johnson/Shaw/Knott, Gerrie/Garry.
 */

import { stimulusAuthorRegex } from "@/lib/seminar/seminarStimulus";

export function matchesStimulusAuthorStrict(body: string, author: string): boolean {
  const a = author.trim();
  switch (a) {
    case "Howe":
      return /\bHowe\s+and\b/i.test(body) || /\bHowe\s*\(/i.test(body);
    case "Knott":
      return (
        /\bHowe\s+and\s+Knott\b/i.test(body) ||
        /\bKnott\s*\(\s*\d{4}/i.test(body)
      );
    case "Johnson":
      return (
        /\bJohnson\s*\(\s*\d{4}/i.test(body) ||
        /\bJohnson,\s*N\./i.test(body) ||
        /\bN\.\s+Johnson\b/i.test(body)
      );
    case "Shaw":
      return (
        /\bShaw\s*\(\s*\d{4}/i.test(body) ||
        /\bShaw\s+and\s+Porter\b/i.test(body)
      );
    case "Garry":
      return /\bGarry\b/i.test(body) && !/\bGerrie\b/i.test(body);
    case "Gerrie":
      return /\bGerrie\b/i.test(body);
    default:
      return stimulusAuthorRegex(a).test(body);
  }
}

/** Stimulus author appears only inside the research-question sentence. */
export function stimulusOnlyInRqSentence(body: string, author: string): boolean {
  const rqRe =
    /(?:research question|to what extent)[^?\n]{10,220}\?/gi;
  let m: RegExpExecArray | null;
  const rqSpans: { start: number; end: number }[] = [];
  while ((m = rqRe.exec(body)) !== null) {
    rqSpans.push({ start: m.index, end: m.index + m[0].length });
  }
  if (rqSpans.length === 0) return false;

  const re = stimulusAuthorRegex(author);
  let hit: RegExpExecArray | null;
  let inRq = 0;
  let outside = 0;
  while ((hit = re.exec(body)) !== null) {
    const idx = hit.index;
    if (rqSpans.some((s) => idx >= s.start && idx <= s.end)) inRq++;
    else outside++;
  }
  return inRq > 0 && outside === 0;
}

/** Block false-positive stimulus author hits (Category I guards). */
export function isStimulusAuthorFalsePositive(
  body: string,
  author: string,
  matchIndex: number,
): boolean {
  const a = author.trim();
  const slice = body.slice(Math.max(0, matchIndex - 10), matchIndex + 12);
  if (a === "Howe" && /\bHowever\b/i.test(slice)) return true;
  if (a === "Howe" && /\bWhoever\b/i.test(slice)) return true;
  if (a === "Knott" && !/\bHowe\s+and\s+Knott\b/i.test(body.slice(Math.max(0, matchIndex - 40), matchIndex + 40))) {
    if (!/\bKnott\s*\(\s*\d{4}/i.test(body.slice(matchIndex, matchIndex + 30))) {
      return true;
    }
  }
  if (a === "Johnson" && !/\bJohnson\s*\(\s*\d{4}/i.test(body.slice(matchIndex, matchIndex + 35))) {
    if (!/\bJohnson,\s*N\./i.test(body)) return true;
  }
  if (a === "Shaw" && !/\bShaw\s+and\s+Porter\b/i.test(body.slice(Math.max(0, matchIndex - 30), matchIndex + 30))) {
    if (!/\bShaw\s*\(\s*\d{4}/i.test(body.slice(matchIndex, matchIndex + 30))) {
      return true;
    }
  }
  if (a === "Garry" && /\bGerrie\b/i.test(body.slice(Math.max(0, matchIndex - 20), matchIndex + 20))) {
    return true;
  }
  if (/^Source [A-D]$/i.test(body.slice(Math.max(0, matchIndex - 15), matchIndex + 15))) {
    return true;
  }
  return stimulusOnlyInRqSentence(body, a);
}
