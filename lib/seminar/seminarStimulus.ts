/**
 * Hard-coded stimulus packet author lists for Row 1 / Row 5 detection.
 * Extend when new years are confirmed from official samples.
 */

import { matchesStimulusAuthorStrict } from "@/lib/seminar/stimulusAuthorMatch";

export interface StimulusPacket {
  year: string;
  topic: string;
  authors: string[];
}

export const STIMULUS_PACKETS: StimulusPacket[] = [
  {
    year: "2025",
    topic: "nostalgia, memory, and identity",
    authors: [
      "Norberg",
      "Lawless",
      "Shaw",
      "Porter",
      "Lau-Zhu",
      "Yang",
      "Clark",
      "Alakbarova",
      "Howe",
      "Knott",
      "Garry",
      "Gerrie",
      "Reid",
      "Strange",
      "Sims",
      "Helm",
      "Rubin",
      "Fleury",
      "Johnson",
      "Novotney",
      "Suttie",
      "Ghansah",
      "FBI",
    ],
  },
  {
    year: "2024",
    topic: "athlete mental health / climbing risk (official 2024 samples)",
    authors: [
      "Putukian",
      "Shewale",
      "Ng",
      "Lessing",
      "Mortimer",
      "Palmer",
      "Hughes",
      "Goldsmith",
      "Luttenberger",
      "Hamilton",
      "Norberg",
      "Johnson",
      "Fleury",
      "Meadow",
      "Lawless",
      "Shaw",
      "Porter",
      "Zanette",
    ],
  },
  {
    year: "2023",
    topic: "resilience / transport-adjacent (official 2023 samples)",
    authors: [
      "Norberg",
      "Johnson",
      "Fleury",
      "Lessing",
      "Zanette",
      "Rahill",
      "Gielan",
      "Ganapati",
      "Kopans",
      "Molinsky",
      "Meadow",
      "Lawless",
      "Shaw",
      "Porter",
    ],
  },
];

/** Title-only stimulus integration (when students cite packet titles, not surnames). */
export const STIMULUS_TITLE_PATTERNS_BY_YEAR: Record<string, RegExp[]> = {
  "2023": [
    /\bThe Dark Side of Resilience\b/i,
    /\bIn Their Own Words\b/i,
    /\bResilience Among Haitian Survivors\b/i,
  ],
  "2024": [
    /\bFalse Nostalgia\b/i,
    /\bMy Mother'?s House\b/i,
    /\bMeadow Report\b/i,
  ],
  "2025": [
    /\bFalse Nostalgia\b/i,
    /\bMy Mother'?s House\b/i,
    /\bMeadow Report\b/i,
  ],
};

const STIMULUS_ALIAS: Record<string, string[]> = {
  "Shaw and Porter": ["Shaw", "Porter"],
  "Howe and Knott": ["Howe", "Knott"],
  "Garry and Gerrie": ["Garry", "Gerrie"],
  "Lau-Zhu": ["Lau", "Zhu"],
  "Yang et al.": ["Yang"],
  "Clark et al.": ["Clark"],
  "Nicole Johnson": ["Johnson"],
};

/** Word-boundary match — prevents "Howe" matching inside "However". */
export function stimulusAuthorRegex(author: string): RegExp {
  const escaped = author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "gi");
}

function authorInText(text: string, author: string): boolean {
  return matchesStimulusAuthorStrict(text, author);
}

export function getStimulusPacket(year: string): StimulusPacket | undefined {
  return STIMULUS_PACKETS.find((p) => p.year === year);
}

export function detectStimulusYear(text: string): {
  year: string | null;
  topic: string | null;
  matchedAuthors: string[];
} {
  let bestYear: string | null = null;
  let bestTopic: string | null = null;
  let bestMatches: string[] = [];
  let bestCount = 0;

  for (const packet of STIMULUS_PACKETS) {
    const matched: string[] = [];
    for (const author of packet.authors) {
      if (authorInText(text, author)) matched.push(author);
    }
    if (matched.length > bestCount) {
      bestCount = matched.length;
      bestYear = packet.year;
      bestTopic = packet.topic;
      bestMatches = matched;
    }
  }

  if (bestCount >= 3) {
    return { year: bestYear, topic: bestTopic, matchedAuthors: bestMatches };
  }
  return { year: null, topic: null, matchedAuthors: bestMatches };
}

export function isStimulusAuthor(name: string, year?: string | null): boolean {
  const packets = year
    ? STIMULUS_PACKETS.filter((p) => p.year === year)
    : STIMULUS_PACKETS;
  const norm = name.split(/\s+/)[0] ?? name;
  for (const packet of packets) {
    for (const author of packet.authors) {
      if (author.toLowerCase() === norm.toLowerCase()) return true;
      const aliases = STIMULUS_ALIAS[author];
      if (aliases?.some((a) => a.toLowerCase() === norm.toLowerCase())) return true;
    }
  }
  return false;
}

export function stimulusAuthorsInText(text: string): string[] {
  const found = new Set<string>();
  for (const packet of STIMULUS_PACKETS) {
    for (const author of packet.authors) {
      if (authorInText(text, author)) found.add(author);
    }
  }
  return [...found];
}

/** Visual / institutional stimulus markers (e.g. Lawless photographs, FBI). */
export const VISUAL_STIMULUS_PATTERNS: RegExp[] = [
  /\bLawless(?:'s)?\s+(?:photograph|photo|image)/i,
  /\bphotograph(?:s)?\s+by\s+Lawless/i,
  /\bFBI\b[^.]{0,80}\b(?:report|data|statistics)/i,
  /\bstimulus\s+(?:packet|materials|source)/i,
  /\bsource\s+(?:A|B|C|D)\s+in\s+the\s+packet/i,
];
