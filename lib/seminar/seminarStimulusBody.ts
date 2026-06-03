/**
 * Row 1: named stimulus author must appear in body text (not topic overlap alone).
 */

import {
  commentaryWithinWordsAfter,
  countPatternHits,
  INTEGRATION_COMMENTARY_PATTERNS,
  STUDENT_COMMENTARY_PATTERNS,
} from "@/lib/seminar/seminarPatterns";

function commentarySignalAfter(
  body: string,
  startIdx: number,
  wordWindow = 100,
): number {
  const slice = body.slice(startIdx, startIdx + wordWindow * 6);
  const explicit = countPatternHits(slice, INTEGRATION_COMMENTARY_PATTERNS);
  if (explicit >= 1) return explicit;
  if (STUDENT_COMMENTARY_PATTERNS.some((p) => p.test(slice))) return 1;
  if (
    /\b(?:distinguish|emphasiz|argues?|explains?|notes? that|demonstrates?|suggests?|supports?|illustrates?|reveals?|a scholar|professor|researcher|surgeon|activist)\b/i.test(
      slice,
    )
  ) {
    return 1;
  }
  return 0;
}

import {
  detectStimulusYear,
  getStimulusPacket,
  STIMULUS_PACKETS,
  STIMULUS_TITLE_PATTERNS_BY_YEAR,
  stimulusAuthorRegex,
  VISUAL_STIMULUS_PATTERNS,
} from "@/lib/seminar/seminarStimulus";
import { DEFAULT_STIMULUS_YEAR } from "@/lib/seminar/seminarPolicy";
import {
  matchesStimulusAuthorStrict,
  stimulusOnlyInRqSentence,
} from "@/lib/seminar/stimulusAuthorMatch";

function authorInBody(body: string, author: string): boolean {
  return matchesStimulusAuthorStrict(body, author);
}

/** Prior-year packet only (no current-year authors) → off-topic for current exam. */
export function isWrongYearStimulusSubmission(body: string): boolean {
  const current = getStimulusPacket(DEFAULT_STIMULUS_YEAR);
  if (!current) return false;
  const currentHits = current.authors.filter((a) => authorInBody(body, a));
  if (currentHits.length > 0) return false;
  const detected = detectStimulusYear(body);
  return (
    detected.year != null &&
    detected.year !== DEFAULT_STIMULUS_YEAR &&
    detected.matchedAuthors.length >= 2
  );
}

export function resolveExamStimulusYear(body: string): string {
  let bestYear: string = DEFAULT_STIMULUS_YEAR;
  let bestCount = 0;
  for (const packet of STIMULUS_PACKETS) {
    let n = 0;
    for (const author of packet.authors) {
      if (authorInBody(body, author)) n++;
    }
    if (n > bestCount) {
      bestCount = n;
      bestYear = packet.year;
    }
  }
  if (bestCount >= 2) return bestYear;
  return DEFAULT_STIMULUS_YEAR;
}

export function namedStimulusAuthorsInBody(
  body: string,
  examYear?: string | number,
): string[] {
  const year = examYear != null ? String(examYear) : resolveExamStimulusYear(body);
  if (
    examYear == null &&
    year === DEFAULT_STIMULUS_YEAR &&
    isWrongYearStimulusSubmission(body)
  ) {
    return [];
  }
  const packet = getStimulusPacket(year);
  if (!packet) return [];

  const found = new Set<string>();
  for (const author of packet.authors) {
    if (!authorInBody(body, author)) continue;
    if (stimulusOnlyInRqSentence(body, author)) continue;
    found.add(author);
  }
  return [...found];
}

const GENERIC_STIMULUS_TITLE_PATTERNS: RegExp[] = [
  /\bstimulus (?:packet|materials|source)/i,
  /\bsource [A-D] in the packet\b/i,
];

function stimulusTitlesForYear(year: string): RegExp[] {
  return [
    ...(STIMULUS_TITLE_PATTERNS_BY_YEAR[year] ?? []),
    ...(STIMULUS_TITLE_PATTERNS_BY_YEAR[DEFAULT_STIMULUS_YEAR] ?? []),
    ...GENERIC_STIMULUS_TITLE_PATTERNS,
  ];
}

export function hasNamedStimulusInBody(
  body: string,
  examYear?: string | number,
): boolean {
  if (namedStimulusAuthorsInBody(body, examYear).length > 0) return true;
  if (VISUAL_STIMULUS_PATTERNS.some((p) => p.test(body))) return true;
  const year = examYear != null ? String(examYear) : resolveExamStimulusYear(body);
  return stimulusTitlesForYear(year).some((p) => p.test(body));
}

/** Title-based stimulus integration when packet titles are quoted in the argument. */
export function scoreTitleStimulusIntegration(
  body: string,
  examYear?: string | number,
): { level: 0 | 1 | 2; integrated: boolean } {
  const year = examYear != null ? String(examYear) : resolveExamStimulusYear(body);
  const patterns = stimulusTitlesForYear(year);
  let best = 0;
  for (const p of patterns) {
    const m = body.match(p);
    if (!m?.index && m?.index !== 0) continue;
    const idx = m.index;
    best = Math.max(
      best,
      Math.max(
        commentaryWithinWordsAfter(body, idx, 100),
        commentarySignalAfter(body, idx, 100),
      ),
    );
  }
  if (best >= 2) return { level: 2, integrated: true };
  if (best >= 1) return { level: 1, integrated: true };
  return { level: 0, integrated: false };
}

export function scoreStimulusIntegrationInBody(
  body: string,
  examYear?: string | number,
): {
  integrated: boolean;
  bestQuality: number;
  authorsFound: string[];
} {
  const authors = namedStimulusAuthorsInBody(body, examYear);
  let bestQuality = 0;

  for (const author of authors) {
    const re = stimulusAuthorRegex(author);
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const commentary = Math.max(
        commentaryWithinWordsAfter(body, m.index, 100),
        commentarySignalAfter(body, m.index, 100),
      );
      bestQuality = Math.max(bestQuality, commentary);
    }
  }

  for (const p of VISUAL_STIMULUS_PATTERNS) {
    const m = body.match(p);
    if (m?.index != null) {
      bestQuality = Math.max(
        bestQuality,
        Math.max(
          commentaryWithinWordsAfter(body, m.index, 100),
          commentarySignalAfter(body, m.index, 100),
        ),
      );
    }
  }

  const titleScore = scoreTitleStimulusIntegration(body, examYear);
  const integrated =
    (authors.length > 0 && bestQuality >= 1) || titleScore.integrated;
  bestQuality = Math.max(bestQuality, titleScore.level);

  return {
    integrated,
    bestQuality,
    authorsFound: authors,
  };
}
