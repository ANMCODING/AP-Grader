/** Detect student-composed graphs/figures from synthesized secondary data. */

const GRAPH_SYNTHESIS_PHRASES = [
  /\bby creating graphs?\b/i,
  /\bcombining percentages from other data is the technique used\b/i,
  /\bthese graphs have been synthesized\b/i,
  /\bcreated percentages that specifically include\b/i,
  /\bmy own data through success rates and percentages\b/i,
  /\bsynthesized in qualitative data\b/i,
  /\bcombining percentages from other data\b/i,
  /\bto create this graph\b/i,
  /\bto create specific data\b/i,
  /\bcreate data to see which\b/i,
  /\bcreating graphs based on already-existing data\b/i,
  /\bcreating my own data\b/i,
  /\bcombining percentages from other data is the technique used specifically to create this graph\b/i,
];

const FIRST_PERSON_GRAPH =
  /\b(?:my|I created|I made|this research (?:will )?demonstrate|by creating)\b/i;
const VISUAL_REF = /\b(?:graph|figure|chart|table)\b/i;
const DATA_SOURCE_REF =
  /\b(?:from various|from other|from sources|synthesized|collected from|extracted from|combining percentages|combining data|already-existing)\b/i;

export interface StudentGraphSynthesisResult {
  detected: boolean;
  phraseHits: number;
  bonusSignals: number;
}

export function detectStudentGraphSynthesis(text: string): StudentGraphSynthesisResult {
  let phraseHits = 0;
  for (const p of GRAPH_SYNTHESIS_PHRASES) {
    if (p.test(text)) phraseHits++;
  }

  let pattern1 = false;
  const windowSize = 320;
  for (let i = 0; i < text.length; i += 80) {
    const chunk = text.slice(i, i + windowSize);
    if (
      FIRST_PERSON_GRAPH.test(chunk) &&
      VISUAL_REF.test(chunk) &&
      DATA_SOURCE_REF.test(chunk)
    ) {
      pattern1 = true;
      break;
    }
  }

  const detected = phraseHits > 0 || pattern1;
  const bonusSignals = detected ? Math.min(6, 2 + phraseHits + (pattern1 ? 1 : 0)) : 0;

  return { detected, phraseHits, bonusSignals };
}
