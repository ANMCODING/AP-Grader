/**
 * Row 1 six-level integration quality metrics (seminar-3.1.0).
 */
import { phrasesToRegexForAuthor } from "@/lib/seminar/phraseToRegex";
import score1Phrases from "@/data/seminar/row1-integration-phrases/score1.json";
import score2Phrases from "@/data/seminar/row1-integration-phrases/score2.json";
import score3Phrases from "@/data/seminar/row1-integration-phrases/score3.json";
import score5Phrases from "@/data/seminar/row1-integration-phrases/score5.json";
import {
  ROW1_ADEQUATE_INTEGRATION_SECTIONS_MIN,
  ROW1_BASIC_COMMENTARY_SENTENCES_MIN,
} from "@/lib/seminar/seminarPolicy";
import { countDistinctPatternHits } from "@/lib/seminar/seminarPatterns";
import {
  ROW1_SCORE0_SIGNALS,
  ROW1_SCORE1_SIGNALS,
  ROW1_SCORE2_SIGNALS,
  ROW1_SCORE3_SIGNALS,
  ROW1_SCORE4_SIGNALS,
  ROW1_SCORE5_SIGNALS,
} from "@/lib/seminar/seminarRow1IntegrationPatterns";
import type {
  Row1CommentaryQuality,
  Row1IntegrationFunction,
  Row1IntegrationQuality,
} from "@/lib/seminar/seminarTypes";

const INTRO_CHARS = 1200;
const CONCLUSION_CHARS = 3000;
const CITATION_WINDOW = 900;
const PATTERN_SCAN_CAP = 10;

const COUNTERARGUMENT_NEAR = [
  /\bcounter(?:argument|claim)|opposing view|objection\b/i,
  /\b(?:however|while|although|despite|nevertheless|yet|on the other hand)\b/i,
  /\bsome argue|critics|skeptics|detractors\b/i,
];

const DIALOGUE_AGREE = [
  /\b(?:agree|accept|endorse|embrace|valid|correct|right about|justified)\b/i,
  /\b(?:builds? on|draws? on|takes? seriously)\b/i,
];
const DIALOGUE_EXTEND = [
  /\b(?:extend|further|beyond|goes? further|implies? that|derived?|develops? into)\b/i,
  /\b(?:does not (?:argue|claim|draw)|did not (?:argue|claim|draw))\b/i,
  /\bthis paper (?:argues|claims|contends|uses)\b/i,
];
const DIALOGUE_QUALIFY = [
  /\b(?:qualif|nuanc|refin|limit|incomplete|misses|however|although|while|despite)\b/i,
  /\b(?:more specific than|not just|but also)\b/i,
];
const DIALOGUE_CHALLENGE = [
  /\b(?:challeng|push(?:es)? back|disput|complicat|wrong about|incorrect|objection|rebut)\b/i,
  /\b(?:fails? to account|does not establish|correlational)\b/i,
  /\bdoes not draw\b/i,
  /\bdoes not state\b/i,
  /\bdoes not acknowledge\b/i,
  /\bdoes not address\b/i,
  /\bdoes not engage\b/i,
  /\bdoes not fully\b/i,
  /\bdoes not adequately\b/i,
  /\bframework does not\b/i,
  /\baccount is insufficient\b/i,
  /\bframework is insufficient\b/i,
  /\bunderstates?\b/i,
  /\boverstates?\b/i,
  /\b(?:misses|overlooks?)\b/i,
  /\bfails? to\b/i,
  /\blimited by\b/i,
  /\bfalls short of\b/i,
  /\bstops short of\b/i,
  /\bdoes not go far enough\b/i,
  /\bimplication\b[^.]{0,80}\bdoes not draw\b/i,
  /\bgoes beyond what\b[^.]{0,60}\bclaims?\b/i,
  /\bfurther than\b[^.]{0,60}\bargues?\b/i,
  /\bthis paper argues\b[^.]{0,80}\bdoes not\b/i,
  /\bframing\b[^.]{0,40}\b(?:misses|obscures?|underestimates?)\b/i,
  /\b(?:may|might)\s+actually\b[^.]{0,60}\b(?:undermine|reduce|weaken)\b/i,
  /\breduces? the political pressure\b/i,
  /\brisks\b[^.]{0,60}\b(?:undermining|weakening)\b/i,
];

/** Challenge signals scoped to windows near the integrated author. */
export const CHALLENGE_SOURCE_PATTERNS: RegExp[] = [
  ...DIALOGUE_CHALLENGE,
  /\b(?:is|are)\s+insufficient\b/i,
  /\bnot\s+merely\b[^.]{0,80}\bbut\b/i,
  /\bwhile\s+empirically\s+rigorous\b[^.]{0,80}\bdoes not\b/i,
];

export const EMPTY_ROW1_INTEGRATION_QUALITY: Row1IntegrationQuality = {
  primaryAuthor: null,
  appearanceCount: 0,
  isMultiSection: false,
  sections: [],
  functionCount: 0,
  functions: [],
  commentaryQuality: "none",
  dialogueScore: 0,
  agreesWithSource: false,
  extendsSource: false,
  qualifiesSource: false,
  challengesSource: false,
  passesDeleteTest: false,
};

/** Surname token for multi-word author names (seminar-3.2.6). */
export function extractAnchorSurnameToken(authorString: string): string {
  const firstAuthor = authorString.split(/[&,]|\band\s/i)[0]?.trim() ?? "";
  const words = firstAuthor.split(/\s+/).filter(Boolean);
  return (words[words.length - 1] ?? firstAuthor).toLowerCase();
}

function authorRegex(authorToken: string): RegExp {
  const token = authorToken.trim();
  const alts: string[] = [];
  if (token.includes(" ")) {
    const escaped = token
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    alts.push(`${escaped}(?:'s|'s)?`);
    const surname = extractAnchorSurnameToken(token);
    if (surname.length >= 3) {
      const sur = surname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      alts.push(`\\b${sur}(?:'s|'s)?\\b`);
    }
  } else {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    alts.push(`\\b${escaped}(?:'s|'s)?\\b`);
  }
  return new RegExp(`(?:${alts.join("|")})`, "gi");
}

function paragraphIndex(body: string, index: number): number {
  return (body.slice(0, index).match(/\n\n/g) ?? []).length;
}

function nearAuthor(body: string, index: number, authorToken: string): string {
  const start = Math.max(0, index - 200);
  const end = Math.min(body.length, index + CITATION_WINDOW);
  return body.slice(start, end);
}

export function countIntegrationAppearances(
  body: string,
  authorToken: string,
): {
  total: number;
  inIntroduction: boolean;
  inBody: boolean;
  inCounterargument: boolean;
  inConclusion: boolean;
  sections: string[];
} {
  const indices: number[] = [];
  const useCaseSensitiveOnly = isCommonNounFalseAuthor(authorToken, body);
  if (useCaseSensitiveOnly) {
    const citeCount = hasAuthorParenCitation(body, authorToken);
    if (citeCount === 0) {
      return {
        total: 0,
        inIntroduction: false,
        inBody: false,
        inCounterargument: false,
        inConclusion: false,
        sections: [],
      };
    }
    const esc = authorToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const citeRe = new RegExp(
      `(?:\\(${esc}(?:\\s+et\\s+al\\.)?\\)|\\b${esc}\\s+\\(\\d{4}|n\\.d\\.\\))`,
      "gi",
    );
    let m: RegExpExecArray | null;
    while ((m = citeRe.exec(body)) !== null) {
      if (m.index != null) indices.push(m.index);
    }
  } else {
    const authorRe = authorRegex(authorToken);
    let m: RegExpExecArray | null;
    const global = new RegExp(authorRe.source, "gi");
    while ((m = global.exec(body)) !== null) {
      if (m.index != null) indices.push(m.index);
    }
  }
  const introEnd = Math.min(body.length, INTRO_CHARS);
  const conclStart = Math.max(0, body.length - CONCLUSION_CHARS);
  const paraIndices = new Set<number>();

  let inIntroduction = false;
  let inBody = false;
  let inCounterargument = false;
  let inConclusion = false;
  const sections: string[] = [];

  for (const idx of indices) {
    paraIndices.add(paragraphIndex(body, idx));
    if (idx < introEnd) {
      inIntroduction = true;
      if (!sections.includes("introduction")) sections.push("introduction");
    } else if (idx >= conclStart) {
      inConclusion = true;
      if (!sections.includes("conclusion")) sections.push("conclusion");
    } else {
      inBody = true;
      if (!sections.includes("body")) sections.push("body");
    }
    const w = nearAuthor(body, idx, authorToken);
    if (COUNTERARGUMENT_NEAR.some((p) => p.test(w))) {
      inCounterargument = true;
      if (!sections.includes("counterargument")) {
        sections.push("counterargument");
      }
    }
  }

  if (paraIndices.size >= 2 && !sections.includes("body")) {
    sections.push("body");
    inBody = true;
  }

  return {
    total: indices.length,
    inIntroduction,
    inBody,
    inCounterargument,
    inConclusion,
    sections,
  };
}

export function measureCommentaryDepth(
  body: string,
  citationIndex: number,
  authorToken: string,
): {
  echoSentences: number;
  developingSentences: number;
  ratio: number;
  quality: Row1CommentaryQuality;
} {
  const w = nearAuthor(body, citationIndex, authorToken);
  const after = body.slice(
    citationIndex,
    Math.min(body.length, citationIndex + 700),
  );
  const sentences = after.split(/(?<=[.!?])\s+/).slice(1, 5);
  let echoSentences = 0;
  let developingSentences = 0;

  const authorPatterns = phrasesToRegexForAuthor(
    score1Phrases.slice(0, 120),
    authorToken,
  );
  const developPatterns = [
    ...phrasesToRegexForAuthor(score2Phrases.slice(0, 80), authorToken),
    ...phrasesToRegexForAuthor(score3Phrases.slice(0, 60), authorToken),
  ];

  for (const s of sentences) {
    if (s.length < 20) continue;
    if (authorRegex(authorToken).test(s) && s.length < 80) continue;
    const echoHits = countDistinctPatternHits(s, authorPatterns, 4);
    const devHits = countDistinctPatternHits(s, developPatterns, 4);
    const structuralDevelop =
      /\b(?:implication|consequence|means that|this (?:extends|applies|reframes)|not (?:just|merely)|deeper|identity|thesis|moratorium)\b/i.test(
        s,
      ) && !/^(?:this (?:shows|demonstrates|proves)|as .+ (?:shows|found))/i.test(s);
    if (devHits >= 1 || structuralDevelop) {
      developingSentences++;
    } else if (echoHits >= 1) {
      echoSentences++;
    }
  }

  const denom = echoSentences + developingSentences;
  const ratio = denom > 0 ? developingSentences / denom : 0;
  let quality: Row1CommentaryQuality = "none";
  if (developingSentences >= 3 && ratio >= 0.6) quality = "deep";
  else if (developingSentences >= 2 && ratio >= 0.45) quality = "developing";
  else if (developingSentences >= ROW1_BASIC_COMMENTARY_SENTENCES_MIN)
    quality = "basic";
  else if (echoSentences > 0) quality = "echo";

  if (countDistinctPatternHits(w, developPatterns, 6) >= 2 && quality === "echo") {
    quality = "basic";
  }

  return { echoSentences, developingSentences, ratio, quality };
}

export function detectMultipleFunctions(
  body: string,
  authorToken: string,
  appearances: ReturnType<typeof countIntegrationAppearances>,
): {
  functions: Row1IntegrationFunction[];
  functionCount: number;
  isMultiFunction: boolean;
} {
  const functions = new Set<Row1IntegrationFunction>();
  const authorRe = authorRegex(authorToken);
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  const global = new RegExp(authorRe.source, authorRe.flags);
  while ((m = global.exec(body)) !== null) {
    if (m.index != null) indices.push(m.index);
  }

  const introEnd = Math.min(body.length, INTRO_CHARS);
  const conclStart = Math.max(0, body.length - CONCLUSION_CHARS);

  const classifyAt = (idx: number): Row1IntegrationFunction => {
    const w = nearAuthor(body, idx, authorToken);
    if (COUNTERARGUMENT_NEAR.some((p) => p.test(w))) return "counterargument";
    if (idx >= conclStart) return "confirmation";
    if (
      idx < introEnd &&
      /\b(?:context|framework|theoretical|background|establishes?|framing)\b/i.test(
        w,
      )
    ) {
      return "context";
    }
    if (
      /\b(?:extends?|further|beyond|implies?|application|consequence|does not (?:argue|claim))\b/i.test(
        w,
      )
    ) {
      return "extension";
    }
    if (/\b(?:framework|theoretical|lens|model|concept)\b/i.test(w)) {
      return "framework";
    }
    return "evidence";
  };

  for (const idx of indices) {
    functions.add(classifyAt(idx));
  }

  const list = [...functions];
  return {
    functions: list,
    functionCount: list.length,
    isMultiFunction: list.length >= 2,
  };
}

export function detectArgumentativeDialogue(
  body: string,
  authorToken: string,
): {
  agreesWithSource: boolean;
  extendsSource: boolean;
  qualifiesSource: boolean;
  challengesSource: boolean;
  dialogueScore: number;
} {
  const authorRe = authorRegex(authorToken);
  const spans: string[] = [];
  let m: RegExpExecArray | null;
  const global = new RegExp(authorRe.source, "gi");
  while ((m = global.exec(body)) !== null) {
    if (m.index != null) spans.push(nearAuthor(body, m.index, authorToken));
  }
  const text = spans.join("\n");
  const score5Hits = countDistinctPatternHits(
    text,
    phrasesToRegexForAuthor(score5Phrases.slice(0, 100), authorToken),
    8,
  );

  const agreesWithSource =
    DIALOGUE_AGREE.some((p) => p.test(text)) || score5Hits >= 2;
  const extendsSource =
    DIALOGUE_EXTEND.some((p) => p.test(text)) ||
    countDistinctPatternHits(text, ROW1_SCORE4_SIGNALS.slice(0, 60), 6) >= 2;
  const qualifiesSource = DIALOGUE_QUALIFY.some((p) => p.test(text));
  let challengesSource = CHALLENGE_SOURCE_PATTERNS.some((p) => p.test(text));
  if (!challengesSource) {
    const authorReGlobal = new RegExp(authorRe.source, "gi");
    let hit: RegExpExecArray | null;
    while ((hit = authorReGlobal.exec(body)) !== null) {
      if (hit.index == null) continue;
      const window = body.slice(
        Math.max(0, hit.index - 350),
        Math.min(body.length, hit.index + CITATION_WINDOW + 200),
      );
      if (CHALLENGE_SOURCE_PATTERNS.some((p) => p.test(window))) {
        challengesSource = true;
        break;
      }
    }
  }

  let dialogueScore = 0;
  if (agreesWithSource) dialogueScore++;
  if (extendsSource) dialogueScore++;
  if (qualifiesSource) dialogueScore++;
  if (challengesSource) dialogueScore++;

  return {
    agreesWithSource,
    extendsSource,
    qualifiesSource,
    challengesSource,
    dialogueScore,
  };
}

function aggregateCommentaryQuality(
  body: string,
  authorToken: string,
  indices: number[],
): Row1CommentaryQuality {
  let echoTotal = 0;
  let developTotal = 0;
  let best: Row1CommentaryQuality = "none";
  const rank: Record<Row1CommentaryQuality, number> = {
    none: 0,
    echo: 1,
    basic: 2,
    developing: 3,
    deep: 4,
  };

  for (const idx of indices) {
    const d = measureCommentaryDepth(body, idx, authorToken);
    echoTotal += d.echoSentences;
    developTotal += d.developingSentences;
    if (rank[d.quality] > rank[best]) best = d.quality;
  }

  const denom = echoTotal + developTotal;
  const ratio = denom > 0 ? developTotal / denom : 0;
  if (developTotal >= 4 && ratio >= 0.55) return "deep";
  if (developTotal >= 2 && ratio >= 0.4) return "developing";
  if (developTotal >= ROW1_BASIC_COMMENTARY_SENTENCES_MIN) return "basic";
  if (echoTotal > 0) return "echo";
  return best;
}

function score0DominantInWindow(window: string): boolean {
  return (
    countDistinctPatternHits(window, ROW1_SCORE0_SIGNALS.slice(0, 150), 8) >= 4
  );
}

/** Parenthetical or author-year in-text cite for a surname token. */
function hasAuthorParenCitation(body: string, author: string): number {
  const esc = author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mla = new RegExp(`\\(${esc}(?:\\s+et\\s+al\\.)?\\)`, "gi");
  const apa = new RegExp(
    `\\(${esc}(?:\\s+et\\s+al\\.)?(?:[^)]*\\d{4}|[^)]*n\\.d\\.)[^)]*\\)`,
    "gi",
  );
  const authorYear = new RegExp(`\\b${esc}\\s+\\(\\d{4}|n\\.d\\.\\)`, "gi");
  return (
    (body.match(mla) ?? []).length +
    (body.match(apa) ?? []).length +
    (body.match(authorYear) ?? []).length
  );
}

/** Topic nouns that often appear lowercase in CB bodies (e.g. “prison population”). */
const COMMON_TOPIC_NOUN_TOKENS = new Set([
  "prison",
  "justice",
  "policy",
  "health",
  "state",
  "education",
  "research",
  "society",
  "social",
  "public",
  "national",
  "american",
  "united",
  "world",
  "digital",
  "climate",
  "nature",
  "history",
  "science",
  "sports",
  "sport",
]);

function isCommonNounFalseAuthor(name: string, body: string): boolean {
  const token = name.trim();
  if (!token || token.includes(" ")) return false;
  const lower = token.toLowerCase();
  if (!COMMON_TOPIC_NOUN_TOKENS.has(lower)) return false;
  const lowerHits = (body.match(new RegExp(`\\b${lower}\\b`, "g")) ?? []).length;
  if (lowerHits < 8) return false;
  return hasAuthorParenCitation(body, token) === 0;
}

function isIntegrationAuthorCandidate(name: string, body?: string): boolean {
  const token = name.trim();
  if (!token || token.length < 3) return false;
  if (body && isCommonNounFalseAuthor(token, body)) return false;
  const lead = token.split(/\s+/)[0] ?? "";
  if (/^(?:Some|Most|Many|Several|Various|Institute|According)$/i.test(lead)) {
    return false;
  }
  if (token.length > 50) return false;
  if (/\b(?:Dr|Prof|Professor)\b/i.test(token) && /\bof the\b/i.test(token)) {
    return false;
  }
  if (/^(?:Institute|Center|University)$/i.test(token)) return false;
  if (
    /(?:Institute|University|Center|Centre|College|Agency|Foundation|Organization|Laboratory|School|Survey)/i.test(
      token,
    )
  ) {
    return token.length >= 10;
  }
  return /^[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?$/.test(token);
}

export function computeRow1IntegrationQuality(
  body: string,
  authorCandidates: string[],
): Row1IntegrationQuality {
  const candidates = authorCandidates.filter((name) =>
    isIntegrationAuthorCandidate(name, body),
  );
  if (candidates.length === 0) return { ...EMPTY_ROW1_INTEGRATION_QUALITY };

  let best: Row1IntegrationQuality = { ...EMPTY_ROW1_INTEGRATION_QUALITY };
  let bestWeight = -1;

  for (const author of candidates) {
    const appearances = countIntegrationAppearances(body, author);
    if (appearances.total === 0) continue;

    const authorRe = authorRegex(author);
    const indices: number[] = [];
    let m: RegExpExecArray | null;
    const global = new RegExp(authorRe.source, "gi");
    while ((m = global.exec(body)) !== null) {
      if (m.index != null) indices.push(m.index);
    }

    const functions = detectMultipleFunctions(body, author, appearances);
    const dialogue = detectArgumentativeDialogue(body, author);
    const commentaryQuality = aggregateCommentaryQuality(body, author, indices);

    const paraSpread =
      indices.length > 0
        ? new Set(indices.map((idx) => paragraphIndex(body, idx))).size
        : 0;
    const isMultiSection =
      paraSpread >= ROW1_ADEQUATE_INTEGRATION_SECTIONS_MIN ||
      appearances.sections.length >= ROW1_ADEQUATE_INTEGRATION_SECTIONS_MIN ||
      (appearances.total >= 2 && functions.functionCount >= 2) ||
      (appearances.inIntroduction &&
        (appearances.inBody ||
          appearances.inConclusion ||
          appearances.inCounterargument)) ||
      (appearances.inBody && appearances.inConclusion);

    const developingNear = indices.some((idx) => {
      const d = measureCommentaryDepth(body, idx, author);
      return d.developingSentences >= 1;
    });

    // NOTE: Delete test not validated against CB 5/5 anchor papers.
    // Treated as positive signal in iwaRows (+1 toward R1=5), not a gate.
    const passesDeleteTest =
      appearances.total >= 2 &&
      functions.functionCount >= 2 &&
      (commentaryQuality === "developing" ||
        commentaryQuality === "deep" ||
        developingNear);

    let commentary = commentaryQuality;
    if (
      commentary === "none" ||
      commentary === "echo" ||
      commentary === "basic"
    ) {
      if (
        appearances.total >= 5 &&
        functions.functionCount >= 2 &&
        dialogue.dialogueScore >= 2
      ) {
        commentary = "developing";
      } else if (
        (commentary === "none" || commentary === "echo") &&
        appearances.total >= 2 &&
        functions.functionCount >= 1
      ) {
        commentary = "basic";
      }
    }

    const quality: Row1IntegrationQuality = {
      primaryAuthor: author,
      appearanceCount: appearances.total,
      isMultiSection,
      sections: appearances.sections,
      functionCount: functions.functionCount,
      functions: functions.functions,
      commentaryQuality: commentary,
      dialogueScore: dialogue.dialogueScore,
      agreesWithSource: dialogue.agreesWithSource,
      extendsSource: dialogue.extendsSource,
      qualifiesSource: dialogue.qualifiesSource,
      challengesSource: dialogue.challengesSource,
      passesDeleteTest,
    };

    const tangentialWindow =
      indices.some((idx) =>
        score0DominantInWindow(nearAuthor(body, idx, author)),
      ) &&
      !(
        appearances.sections.length >= 3 &&
        functions.functionCount >= 2 &&
        dialogue.dialogueScore >= 2
      );
    const parenCites = hasAuthorParenCitation(body, author);
    const weight =
      appearances.total * 3 +
      functions.functionCount * 4 +
      dialogue.dialogueScore * 2 +
      Math.min(parenCites * 4, 16) +
      (commentary === "deep"
        ? 8
        : commentary === "developing"
          ? 5
          : commentary === "basic"
            ? 2
            : 0) -
      (tangentialWindow ? 6 : 0);

    if (weight > bestWeight) {
      bestWeight = weight;
      best = quality;
    }
  }

  return best;
}
