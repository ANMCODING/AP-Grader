/**
 * Row 1 content-based source integration (seminar-3.1.0).
 * Six-level integration quality (0–5) from in-text signals — not packet author lists.
 */
import { extractInTextAuthors } from "@/lib/seminar/seminarBibliographyAnalysis";
import {
  computeRow1IntegrationQuality,
  countIntegrationAppearances,
  detectArgumentativeDialogue,
  detectMultipleFunctions,
  EMPTY_ROW1_INTEGRATION_QUALITY,
  measureCommentaryDepth,
} from "@/lib/seminar/row1IntegrationQuality";
import { countDistinctPatternHits } from "@/lib/seminar/seminarPatterns";
import { IWA_STIMULUS_WITHHOLD_TRIGGERS } from "@/lib/seminar/seminarIwaPenaltyPatterns";
import type { Row1IntegrationQuality } from "@/lib/seminar/seminarTypes";

export {
  countIntegrationAppearances,
  measureCommentaryDepth,
  detectMultipleFunctions,
  detectArgumentativeDialogue,
} from "@/lib/seminar/row1IntegrationQuality";

const WINDOW = 900;

const HONORIFIC_POSITION =
  /\b(?:Dr\.|Prof\.|Professor|Dr)\s+(?:[A-Z][a-z]+\s+)?([A-Z][a-z]{2,})\s+(?:argues?|contends?|maintains?|claims?|asserts?|found|showed?|demonstrated?|notes?|states?|reports?|established?|identified?|concluded?|discovered?|documented?)\s+that\b/gi;
/** Dr. First Last of the [Institution] found that … */
const HONORIFIC_OF_INSTITUTION =
  /\b(?:Dr\.|Prof\.|Professor)\s+[A-Z][a-z]+\s+([A-Z][a-z]{2,})\s+of\s+(?:the\s+)?[A-Z][A-Za-z\s]{4,70}?\s+(?:found|showed?|demonstrated?|reported?|established?|argues?|contends?|notes?|states?|documented)\s+(?:that\b|something\b)/gi;
const FIRST_LAST_POSITION =
  /\b[A-Z][a-z]+\s+([A-Z][a-z]{2,})\s+(?:argues?|contends?|maintains?|found|showed?|notes?|states?)\s+that\b/gi;
const BARE_SURNAME_THAT =
  /\b([A-Z][a-z]{2,})\s+(?:argues?|contends?|maintains?|claims?|found|showed?|demonstrated?|notes?|states?|reports?)\s+that\b/gi;
const TYPE_A_POSITION =
  /\b([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:argues?|contends?|maintains?|claims?|asserts?)\s+that\b/gi;
const TYPE_B_FINDING =
  /\b([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:found|discovered|showed|demonstrated|established|revealed|identified|concluded|documented|reports?)\s+that\b/gi;
const TYPE_C_GENERAL =
  /\b([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:discusses?|addresses?|examines?|explores?|covers?|looks at|focuses on|deals with|is about|talks about|writes about|provides information on|offers background on)\b/gi;

const GROUP_NOUN =
  /\b(?:researchers say|experts argue|scientists found|scholars suggest|studies show|research indicates|evidence suggests|data shows|literature confirms|some researchers|many scholars|most experts|several scientists|various researchers|critics of|supporters of|proponents argue|opponents claim|advocates say|detractors argue|some people believe|others disagree|a study found|one researcher|research shows)\b/gi;

const STUDENT_VOICE =
  /\b(?:I argue that|my view is that|I contend that|this paper argues that|this investigation holds that)\b/gi;

const PAREN_CITE =
  /\(([A-Z][a-zA-Z'&]+)(?:\s+et\s+al\.)?(?:\s+(?:and|&)\s+[A-Z][a-zA-Z'&]+)?,?\s*\d{4}[a-z]?(?:,\s*pp?\.\s*[\d–-]+)?\)/g;
const MLA_PAGE =
  /\(([A-Z][a-zA-Z'&]+)(?:\s+et\s+al\.)?(?:\s+and\s+[A-Z][a-zA-Z'&]+)?\s+\d+\)/g;
const MLA_AUTHOR =
  /\(([A-Z][a-zA-Z'&]+)(?:\s+et\s+al\.)?\)/g;
const AUTHOR_YEAR =
  /\b([A-Z][a-z]+)(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?\s*\(\d{4}[a-z]?\)/g;

const ATTRIBUTIVE =
  /\bAccording to\s+(?:Dr\.|Prof\.|Professor)?\s*(?:[A-Z][a-z]+\s+)?([A-Z][a-z]{2,})\b/gi;
const ATTRIBUTIVE_AS =
  /\bAs\s+(?:Dr\.|Prof\.|Professor)?\s*(?:[A-Z][a-z]+\s+)?([A-Z][a-z]{2,})\s+(?:argues?|contends?|notes?|states?|found)\b/gi;
const ATTRIBUTIVE_LEGACY =
  /\b(?:according to|as)\s+([A-Z][a-z]+(?:\s+et\s+al\.)?)\s+(?:argues?|notes?|states?|found|contends?|maintains?|reports?)\b/gi;

const ATTRIBUTIVE_VERB =
  /\b([A-Z][a-z]+)\s+(?:writes|wrote|argues|notes|discusses|found|reports|emphasizes|mentions|elaborates|demonstrates)\b/gi;

const AUTHORED_BY =
  /\bauthored by (?:Professor |Dr\. )?([A-Z][a-z]+)/gi;

const NAME_WRITES =
  /\b([A-Z][a-z]+), .{0,120}?\bwrites\b/gi;

const INSTITUTIONAL_YEAR =
  /\b(?:The\s+)?([A-Z][A-Za-z\s]{5,60}?)\s*\(\d{4}\)\s+(?:reported?|found|showed?|documented?|identified?|concluded?|established?)/gi;
const INSTITUTIONAL_ACCORDING =
  /\bAccording to\s+(?:the\s+)?([A-Z][A-Za-z\s]{5,60}?),/gi;
const INSTITUTIONAL_STUDY_BY =
  /\bA\s+\d{4}\s+study by\s+(?:the\s+)?([A-Z][A-Za-z\s]{5,60}?)\s+found\b/gi;
const INSTITUTIONAL_POSSESSIVE =
  /\b([A-Z][A-Za-z\s]{5,50}?)'s\s+\d{4}\s+(?:report|study|survey|analysis)\s+found\b/gi;
const INSTITUTIONAL_THAT =
  /\b(?:The\s+)?([A-Z][A-Za-z\s]{5,60}?)\s+(?:reported?|found|showed?|documented?|identified?|concluded?|established?)\s+that\b/gi;

const EXCLUDED_NAMES = new Set([
  "However",
  "Whoever",
  "Whomever",
  "Therefore",
  "Furthermore",
  "Moreover",
  "According",
  "Research",
  "Digital",
  "National",
  "Survey",
  "American",
  "United",
  "States",
  "World",
  "Health",
  "Climate",
  "Nature",
  "She",
  "He",
  "It",
  "This",
  "That",
  "These",
  "Those",
  "When",
  "While",
  "Although",
  "Despite",
  "Because",
  "Since",
  "After",
  "Before",
  "During",
  "Through",
  "Their",
  "There",
  "Where",
  "What",
  "Which",
  "With",
  "Without",
  "Within",
  "Between",
  "Among",
  "Against",
  "About",
  "Above",
  "Below",
  "Under",
  "Over",
  "Into",
  "From",
  "Your",
  "They",
  "The",
  "Researchers",
  "Experts",
  "Scientists",
  "Scholars",
  "Studies",
  "Critics",
  "Advocates",
  "People",
  "Some",
  "Most",
  "Many",
  "Several",
  "Various",
  "Institute",
]);

const INTEGRATION_CONTEXT = [
  /\bresearch question\b/i,
  /\b(?:urgency|significant|prevalence|rate of|percent|million|billion|\d+%)\b/i,
  /\b(?:framework|theoretical|lens)\b/i,
  /\bthis (?:paper|essay|investigation) (?:argues|will argue|demonstrates)\b/i,
];

const INTEGRATION_CLAIM = [
  /\bthis (?:means|suggests|indicates|demonstrates|shows|implies|reveals) that\b/i,
  /\bthis is (?:significant|important|relevant) because\b/i,
  /\bwhich (?:means|suggests|indicates|demonstrates)\b/i,
  /\b(?:therefore|thus|consequently|as a result)\b/i,
];

const INTEGRATION_COUNTER = [
  /\b(?:however|while|although|despite|nevertheless|yet|on the other hand)\b/i,
  /\bcounter(?:argument|claim)|opposing view|objection\b/i,
];

const INTEGRATION_CONCLUSION = [
  /\b(?:in conclusion|ultimately|to conclude|this (?:paper|essay) (?:has )?(?:shown|demonstrated|established))\b/i,
  /\b(?:confirming|confirms) that\b/i,
  /\bas .{3,40} (?:demonstrated|established|showed|found)\b/i,
];

const TANGENTIAL_LOCAL = [
  /\bdefines? \w+ as\b/i,
  /\b(?:briefly )?mentions?\b/i,
  /\bprovides? (?:context|background|an overview)\b/i,
  /\b(?:summarizes?|outlines?|surveys?) (?:the|research)\b/i,
  /\bto (?:introduce|quote)\b/i,
  /\bin the words of\b/i,
];

const RQ_RE =
  /\b(?:research question|RQ|my question|I (?:ask|investigate|examine))\b/i;

export interface Row1SourceIntegrationAnalysis {
  namedSourceInBody: boolean;
  integrationFunctionDetected: boolean;
  row1Tangential: boolean;
  row1TypeCOnly: boolean;
  row1BibliographyOnly: boolean;
  row1IntroOnly: boolean;
  row1DefinitionOnly: boolean;
  row1ZeroReason: string | null;
  namedSourcesFound: string[];
  row1IntegrationQuality: Row1IntegrationQuality;
}

type CitationHit = {
  name: string;
  index: number;
  kind: "A" | "B" | "C" | "paren" | "attrib" | "inst";
};

function normalizeName(raw: string): string {
  return raw.split(/\s+/)[0]!.replace(/[^A-Za-z'-]/g, "");
}

function normalizeInstitution(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function isValidName(name: string): boolean {
  const token = name.split(/\s+/)[0] ?? name;
  if (token.length < 3) return false;
  if (EXCLUDED_NAMES.has(token)) return false;
  if (/\b(?:researchers?|experts?|scientists?|scholars?|studies|evidence|data)\b/i.test(name)) {
    return false;
  }
  if (!/^[A-Z][a-z]/.test(token)) return false;
  return true;
}

function collectCitationHits(body: string): CitationHit[] {
  const hits: CitationHit[] = [];
  const add = (name: string, index: number, kind: CitationHit["kind"]) => {
    const n = normalizeName(name);
    if (!isValidName(n)) return;
    hits.push({ name: n, index, kind });
  };

  for (const m of body.matchAll(HONORIFIC_POSITION)) {
    if (m[1] && m.index != null) add(m[1], m.index, "A");
  }
  for (const m of body.matchAll(HONORIFIC_OF_INSTITUTION)) {
    if (m[1] && m.index != null) add(m[1], m.index, "A");
  }
  for (const m of body.matchAll(FIRST_LAST_POSITION)) {
    if (m[1] && m.index != null) add(m[1], m.index, "A");
  }
  for (const m of body.matchAll(BARE_SURNAME_THAT)) {
    if (m[1] && m.index != null) add(m[1], m.index, "A");
  }
  for (const m of body.matchAll(TYPE_A_POSITION)) {
    if (m[1] && m.index != null) add(m[1], m.index, "A");
  }
  for (const m of body.matchAll(TYPE_B_FINDING)) {
    if (m[1] && m.index != null) add(m[1], m.index, "B");
  }
  for (const m of body.matchAll(TYPE_C_GENERAL)) {
    if (m[1] && m.index != null) add(m[1], m.index, "C");
  }
  for (const m of body.matchAll(PAREN_CITE)) {
    if (m[1] && m.index != null) add(m[1], m.index, "paren");
  }
  for (const m of body.matchAll(MLA_PAGE)) {
    if (m[1] && m.index != null) add(m[1], m.index, "paren");
  }
  for (const m of body.matchAll(MLA_AUTHOR)) {
    if (m[1] && m.index != null) add(m[1], m.index, "paren");
  }
  for (const m of body.matchAll(AUTHOR_YEAR)) {
    if (m[1] && m.index != null) add(m[1], m.index, "paren");
  }
  for (const m of body.matchAll(ATTRIBUTIVE)) {
    if (m[1] && m.index != null) add(m[1], m.index, "attrib");
  }
  for (const m of body.matchAll(ATTRIBUTIVE_AS)) {
    if (m[1] && m.index != null) add(m[1], m.index, "attrib");
  }
  for (const m of body.matchAll(ATTRIBUTIVE_LEGACY)) {
    if (m[1] && m.index != null) add(m[1], m.index, "attrib");
  }
  for (const m of body.matchAll(ATTRIBUTIVE_VERB)) {
    if (m[1] && m.index != null) add(m[1], m.index, "attrib");
  }
  for (const m of body.matchAll(AUTHORED_BY)) {
    if (m[1] && m.index != null) add(m[1], m.index, "B");
  }
  for (const m of body.matchAll(NAME_WRITES)) {
    if (m[1] && m.index != null) add(m[1], m.index, "attrib");
  }
  const addInst = (phrase: string, index: number) => {
    const n = normalizeInstitution(phrase);
    if (n.length < 8 || /^(?:The|A|An)$/i.test(n)) return;
    const lead = n.split(/\s+/)[0] ?? "";
    if (EXCLUDED_NAMES.has(lead)) return;
    if (/\b(?:have|has|had|are|were|was)\b/i.test(n)) return;
    if (/\b(?:of the|of)\s+[A-Z]/i.test(n) && /\b(?:Dr|Prof|Professor)\b/i.test(n)) {
      return;
    }
    if (
      !/(?:Institute|University|Center|Centre|College|Agency|Foundation|Organization|Laboratory|School|Survey|Academy)/i.test(
        n,
      )
    ) {
      return;
    }
    if (EXCLUDED_NAMES.has(n.split(/\s+/).pop() ?? "")) return;
    hits.push({ name: n, index, kind: "inst" });
  };
  for (const m of body.matchAll(INSTITUTIONAL_YEAR)) {
    if (m[1] && m.index != null) addInst(m[1], m.index);
  }
  for (const m of body.matchAll(INSTITUTIONAL_ACCORDING)) {
    if (m[1] && m.index != null) addInst(m[1], m.index);
  }
  for (const m of body.matchAll(INSTITUTIONAL_STUDY_BY)) {
    if (m[1] && m.index != null) addInst(m[1], m.index);
  }
  for (const m of body.matchAll(INSTITUTIONAL_POSSESSIVE)) {
    if (m[1] && m.index != null) addInst(m[1], m.index);
  }
  for (const m of body.matchAll(INSTITUTIONAL_THAT)) {
    if (m[1] && m.index != null) addInst(m[1], m.index);
  }

  return hits;
}

function windowText(body: string, index: number): string {
  const start = Math.max(0, index - 200);
  const end = Math.min(body.length, index + WINDOW);
  return body.slice(start, end);
}

function hasIntegrationFunction(body: string, index: number): boolean {
  const w = windowText(body, index);
  const inIntro = index < 2000;
  const inConclusion = index > body.length - 2500;
  const pools = [
    ...INTEGRATION_CLAIM,
    ...(inIntro ? INTEGRATION_CONTEXT : []),
    ...(inConclusion ? INTEGRATION_CONCLUSION : []),
    ...INTEGRATION_COUNTER,
  ];
  if (pools.some((p) => p.test(w))) return true;
  if (inIntro && RQ_RE.test(w)) return true;
  const after = body.slice(index, Math.min(body.length, index + 600));
  const sentences = after.split(/(?<=[.!?])\s+/);
  for (let i = 1; i < Math.min(3, sentences.length); i++) {
    const s = sentences[i] ?? "";
    if (s.length < 25) continue;
    if (!/\([A-Z][a-z]|\baccording to\b|\bet al\./i.test(s)) return true;
  }
  return false;
}

function isTangentialHit(body: string, hit: CitationHit, totalForName: number): boolean {
  const w = windowText(body, hit.index);
  if (TANGENTIAL_LOCAL.some((p) => p.test(w))) return true;
  if (countDistinctPatternHits(w, IWA_STIMULUS_WITHHOLD_TRIGGERS, 6) >= 2) return true;
  if (totalForName === 1) {
    const introEnd = Math.min(body.length, 2000);
    if (hit.index < introEnd && !body.slice(introEnd).includes(hit.name)) {
      return true;
    }
    const listCite = new RegExp(
      `\\([^)]*${hit.name}[^)]*;[^)]*\\)`,
      "i",
    ).test(w);
    if (listCite) return true;
    const after = body.slice(hit.index, hit.index + 800);
    const paraBreak = after.indexOf("\n\n");
    const beforeBreak = after.slice(0, paraBreak > 0 ? paraBreak : 400);
    if (
      paraBreak > 0 &&
      !/(?:this (?:means|suggests|indicates)|which (?:means|suggests))/i.test(
        beforeBreak,
      )
    ) {
      return true;
    }
  }
  return false;
}

export function analyzeRow1SourceIntegration(
  body: string,
  referencesText: string,
): Row1SourceIntegrationAnalysis {
  const empty: Row1SourceIntegrationAnalysis = {
    namedSourceInBody: false,
    integrationFunctionDetected: false,
    row1Tangential: true,
    row1TypeCOnly: false,
    row1BibliographyOnly: false,
    row1IntroOnly: false,
    row1DefinitionOnly: false,
    row1ZeroReason: "no_named_source",
    namedSourcesFound: [],
    row1IntegrationQuality: { ...EMPTY_ROW1_INTEGRATION_QUALITY },
  };

  const withQuality = (
    base: Omit<Row1SourceIntegrationAnalysis, "row1IntegrationQuality">,
    bodyForQuality: string,
  ): Row1SourceIntegrationAnalysis => {
    const candidates = base.namedSourcesFound.filter((n) => {
      if (n.length < 3) return false;
      return new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        bodyForQuality,
      );
    });
    return {
      ...base,
      row1IntegrationQuality: computeRow1IntegrationQuality(
        bodyForQuality,
        candidates.length > 0 ? candidates : base.namedSourcesFound,
      ),
    };
  };

  if (GROUP_NOUN.test(body) && !TYPE_A_POSITION.test(body) && !TYPE_B_FINDING.test(body)) {
    const hasNamedCite =
      PAREN_CITE.test(body) ||
      AUTHOR_YEAR.test(body) ||
      MLA_PAGE.test(body) ||
      MLA_AUTHOR.test(body) ||
      ATTRIBUTIVE_VERB.test(body);
    if (!hasNamedCite) {
      return withQuality({ ...empty, row1ZeroReason: "group_nouns_only" }, body);
    }
  }

  if (STUDENT_VOICE.test(body) && !TYPE_A_POSITION.test(body) && !TYPE_B_FINDING.test(body)) {
    const hasExternal =
      PAREN_CITE.test(body) ||
      AUTHOR_YEAR.test(body) ||
      ATTRIBUTIVE.test(body) ||
      INSTITUTIONAL_YEAR.test(body) ||
      INSTITUTIONAL_THAT.test(body);
    if (!hasExternal) {
      return withQuality({ ...empty, row1ZeroReason: "no_named_source" }, body);
    }
  }

  const hits = collectCitationHits(body);
  if (hits.length === 0) {
    const fallback = extractInTextAuthors(body).filter(isValidName);
    if (fallback.length === 0) return empty;
    for (const name of fallback) {
      const idx = body.search(new RegExp(`\\b${name}\\b`));
      if (idx >= 0) hits.push({ name, index: idx, kind: "paren" });
    }
  }

  if (hits.length === 0) return withQuality(empty, body);

  const typeAB = hits.filter((h) => h.kind === "A" || h.kind === "B" || h.kind === "inst");
  const typeC = hits.filter((h) => h.kind === "C");
  const substantiveC = typeC.filter((h) => hasIntegrationFunction(body, h.index));
  const substantive =
    typeAB.length > 0 ||
    substantiveC.length > 0 ||
    hits.some((h) => h.kind === "paren" || h.kind === "attrib");

  const typeCOnly =
    typeC.length > 0 &&
    typeAB.length === 0 &&
    substantiveC.length === 0 &&
    !hits.some((h) => h.kind === "paren" || h.kind === "attrib");

  const names = [...new Set(hits.map((h) => h.name))];
  const bibAuthors = extractInTextAuthors(referencesText);
  const bodyAuthors = extractInTextAuthors(body);
  const bibliographyOnly =
    bibAuthors.length > 0 &&
    bodyAuthors.length === 0 &&
    names.every((n) => bibAuthors.some((b) => b.startsWith(n)));

  const counts = new Map<string, number>();
  for (const h of hits) {
    counts.set(h.name, (counts.get(h.name) ?? 0) + 1);
  }

  let integrationFunctionDetected = false;
  let tangentialOnly = true;
  let definitionOnly = false;
  let introOnly = false;
  const introEnd = Math.min(body.length, 2000);

  for (const hit of hits) {
    if (
      hit.kind === "A" ||
      hit.kind === "B" ||
      hit.kind === "inst" ||
      hit.kind === "paren" ||
      hit.kind === "attrib" ||
      (hit.kind === "C" && hasIntegrationFunction(body, hit.index))
    ) {
      if (hasIntegrationFunction(body, hit.index)) {
        integrationFunctionDetected = true;
        tangentialOnly = false;
      }
    }
    const total = counts.get(hit.name) ?? 1;
    const tang = isTangentialHit(body, hit, total);
    if (/\bdefines? \w+ as\b/i.test(windowText(body, hit.index))) {
      definitionOnly = true;
    }
    if (!tang && (hit.kind === "A" || hit.kind === "B")) {
      tangentialOnly = false;
    }
    if (hit.index < introEnd && (counts.get(hit.name) ?? 0) <= 1) {
      const rest = body.slice(introEnd);
      if (!new RegExp(`\\b${hit.name}\\b`).test(rest)) introOnly = true;
    }
  }

  if (typeCOnly) {
    return withQuality(
      {
        namedSourceInBody: false,
        integrationFunctionDetected: false,
        row1Tangential: true,
        row1TypeCOnly: true,
        row1BibliographyOnly: bibliographyOnly,
        row1IntroOnly: introOnly,
        row1DefinitionOnly: definitionOnly,
        row1ZeroReason: "type_c_only",
        namedSourcesFound: names,
      },
      body,
    );
  }

  if (bibliographyOnly) {
    return withQuality(
      {
        namedSourceInBody: false,
        integrationFunctionDetected: false,
        row1Tangential: true,
        row1TypeCOnly: false,
        row1BibliographyOnly: true,
        row1IntroOnly: false,
        row1DefinitionOnly: false,
        row1ZeroReason: "bibliography_only",
        namedSourcesFound: names,
      },
      body,
    );
  }

  const namedSourceInBody = substantive;

  if (!namedSourceInBody) {
    return withQuality({ ...empty, namedSourcesFound: names }, body);
  }

  if (definitionOnly && !integrationFunctionDetected) {
    return withQuality(
      {
        namedSourceInBody: true,
        integrationFunctionDetected: false,
        row1Tangential: true,
        row1TypeCOnly: false,
        row1BibliographyOnly: false,
        row1IntroOnly: false,
        row1DefinitionOnly: true,
        row1ZeroReason: "definition_only",
        namedSourcesFound: names,
      },
      body,
    );
  }

  if (introOnly && !integrationFunctionDetected) {
    return withQuality(
      {
        namedSourceInBody: true,
        integrationFunctionDetected: false,
        row1Tangential: true,
        row1TypeCOnly: false,
        row1BibliographyOnly: false,
        row1IntroOnly: true,
        row1DefinitionOnly: false,
        row1ZeroReason: "intro_only",
        namedSourcesFound: names,
      },
      body,
    );
  }

  if (tangentialOnly && !integrationFunctionDetected) {
    return withQuality(
      {
        namedSourceInBody: true,
        integrationFunctionDetected: false,
        row1Tangential: true,
        row1TypeCOnly: false,
        row1BibliographyOnly: false,
        row1IntroOnly: introOnly,
        row1DefinitionOnly: definitionOnly,
        row1ZeroReason: "tangential",
        namedSourcesFound: names,
      },
      body,
    );
  }

  if (!integrationFunctionDetected) {
    return withQuality(
      {
        namedSourceInBody: true,
        integrationFunctionDetected: false,
        row1Tangential: true,
        row1TypeCOnly: false,
        row1BibliographyOnly: false,
        row1IntroOnly: introOnly,
        row1DefinitionOnly: definitionOnly,
        row1ZeroReason: "no_integration_function",
        namedSourcesFound: names,
      },
      body,
    );
  }

  return withQuality(
    {
      namedSourceInBody: true,
      integrationFunctionDetected: true,
      row1Tangential: false,
      row1TypeCOnly: false,
      row1BibliographyOnly: false,
      row1IntroOnly: false,
      row1DefinitionOnly: false,
      row1ZeroReason: null,
      namedSourcesFound: names,
    },
    body,
  );
}
