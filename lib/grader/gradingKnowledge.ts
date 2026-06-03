import { readFileSync, existsSync } from "fs";
import { join } from "path";

const KNOWLEDGE_FILES = [
  "data/guidelines/ap25-sg-research-academic-paper.txt",
  "data/guidelines/ap25-research-scoring-statistics.txt",
  "data/guidelines/ap25-cr-report-research.txt",
];

const MAX_KNOWLEDGE_CHARS = 14_000;

/** Load College Board scoring knowledge for Claude secondary grading. */
export function loadGradingKnowledge(): string {
  const parts: string[] = [];
  for (const rel of KNOWLEDGE_FILES) {
    const path = join(process.cwd(), rel);
    if (existsSync(path)) {
      parts.push(readFileSync(path, "utf8"));
    }
  }
  const combined = parts.join("\n\n---\n\n");
  if (combined.length <= MAX_KNOWLEDGE_CHARS) return combined;
  return combined.slice(0, MAX_KNOWLEDGE_CHARS) + "\n\n[Guidelines truncated for length.]";
}

export const CLAUDE_GRADING_INSTRUCTIONS = `You are an AP Research academic paper grader. Score the student paper on five categories and one overall AP score using the College Board 5-point scale with Low/Mid/High tiers within each band (e.g. "Mid 3", "Low 5").

Categories:
1. Focus and Scope
2. Scholarly Grounding — penalize asserted (not demonstrated) gaps and annotated-bibliography literature reviews that list sources in isolation without synthesis
3. Method and Replicability — Low 1 if data collection was not completed; Low 2 max if only partial data
4. Argument and Evidence
5. Communication and Citation

Respond with ONLY valid JSON (no markdown fences):
{
  "categories": [
    {"name": "Focus and Scope", "band": 3, "tier": "Mid"},
    {"name": "Scholarly Grounding", "band": 2, "tier": "Low"},
    {"name": "Method and Replicability", "band": 3, "tier": "Mid"},
    {"name": "Argument and Evidence", "band": 3, "tier": "Mid"},
    {"name": "Communication and Citation", "band": 3, "tier": "Mid"}
  ],
  "overall": {"band": 3, "tier": "Mid"},
  "rationale": "One short paragraph."
}

band must be 1-5. tier must be "Low", "Mid", or "High".`;
