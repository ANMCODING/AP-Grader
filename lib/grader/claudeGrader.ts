import Anthropic from "@anthropic-ai/sdk";
import { makeBand } from "@/lib/grader/format";
import {
  CLAUDE_GRADING_INSTRUCTIONS,
  loadGradingKnowledge,
} from "@/lib/grader/gradingKnowledge";
import { CATEGORY_NAMES, type BandScore, type BandTier } from "@/lib/grader/types";

const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

export function isClaudeGradingAvailable(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return Boolean(key && key !== "your-key-here" && !key.startsWith("your_key"));
}

interface ClaudeGradePayload {
  categories: { name: string; band: number; tier: string }[];
  overall: { band: number; tier: string };
  rationale?: string;
}

function parseTier(t: string): BandTier {
  const n = t.toLowerCase();
  if (n === "high") return "High";
  if (n === "mid") return "Mid";
  return "Low";
}

function clampBand(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}

function parseClaudeResponse(text: string): ClaudeGradePayload | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as ClaudeGradePayload;
  } catch {
    return null;
  }
}

export interface ClaudeGradeResult {
  categories: BandScore[];
  overall: BandScore;
  rationale: string | null;
}

/** Grade via Claude API for ambiguous (band 3–4) papers. */
export async function gradeWithClaude(
  paperBody: string,
  localEvidenceDigest?: string,
): Promise<ClaudeGradeResult | null> {
  if (!isClaudeGradingAvailable()) return null;

  const client = new Anthropic();
  const knowledge = loadGradingKnowledge();
  const system = `${CLAUDE_GRADING_INSTRUCTIONS}\n\n---\nCOLLEGE BOARD SCORING KNOWLEDGE:\n${knowledge}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);

  let message;
  try {
    message = await client.messages.create(
      {
        model: DEFAULT_MODEL,
        max_tokens: 1200,
        system,
        messages: [
          {
            role: "user",
            content: `Grade this AP Research paper (body text only, references and appendices omitted).

LOCAL ENGINE EVIDENCE (use as signals, verify against the text):
${localEvidenceDigest ?? "No local digest available."}

PAPER BODY:
${paperBody.slice(0, 48_000)}`,
          },
        ],
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeout);
  }

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;

  const parsed = parseClaudeResponse(block.text);
  if (!parsed?.categories?.length || !parsed.overall) return null;

  const categories: BandScore[] = CATEGORY_NAMES.map((name, i) => {
    const item =
      parsed.categories.find((c) => c.name === name) ?? parsed.categories[i];
    if (!item) return makeBand(3, "Mid");
    return makeBand(clampBand(item.band), parseTier(item.tier));
  });

  const overall = makeBand(
    clampBand(parsed.overall.band),
    parseTier(parsed.overall.tier),
  );

  return {
    categories,
    overall,
    rationale: parsed.rationale ?? null,
  };
}
