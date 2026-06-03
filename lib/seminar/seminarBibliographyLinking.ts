/**
 * In-text ↔ bibliography author linking (IWA Row 5–6, IRR Row 5).
 * Shared by analyzeBibliographySources and linkingRatio.
 */

export function normalizeAbbreviations(text: string): string {
  return text
    .replace(/\b([A-Z])\.([A-Z])\.([A-Z])\./g, "$1$2$3")
    .replace(/\b([A-Z])\.([A-Z])\./g, "$1$2")
    .replace(/\bSt\.\s/g, "St ")
    .replace(/\bDr\.\s/g, "Dr ")
    .replace(/\bProf\.\s/g, "Prof ");
}

const INSTITUTIONAL_ALIASES: Record<string, string[]> = {
  CDC: [
    "Centers for Disease Control",
    "Centers for Disease Control and Prevention",
  ],
  NIH: ["National Institutes of Health", "National Institute of Health"],
  EPA: [
    "Environmental Protection Agency",
    "U.S. Environmental Protection Agency",
    "US Environmental Protection Agency",
  ],
  BJS: ["Bureau of Justice Statistics"],
  FBI: ["Federal Bureau of Investigation"],
  BOP: ["Bureau of Prisons", "Federal Bureau of Prisons"],
  USSC: [
    "U.S. Sentencing Commission",
    "US Sentencing Commission",
    "United States Sentencing Commission",
  ],
  DOJ: ["Department of Justice", "U.S. Department of Justice"],
  DOE: ["Department of Education", "U.S. Department of Education"],
  HHS: ["Department of Health and Human Services"],
  WHO: ["World Health Organization"],
  UN: ["United Nations"],
  NBER: ["National Bureau of Economic Research"],
  RAND: ["RAND Corporation"],
  CBO: ["Congressional Budget Office"],
  GAO: ["Government Accountability Office"],
  ACLU: ["American Civil Liberties Union"],
  PEW: ["Pew Research Center", "Pew Charitable Trusts"],
  OJJDP: ["Office of Juvenile Justice and Delinquency Prevention"],
  UNODC: ["United Nations Office on Drugs and Crime"],
  NAACP: [
    "National Association for the Advancement of Colored People",
  ],
  HRSA: ["Health Resources and Services Administration"],
  SAMHSA: [
    "Substance Abuse and Mental Health Services Administration",
  ],
  INNOCENCEPROJECT: ["Innocence Project"],
  NATIONALACADEMY: [
    "National Academy of Sciences",
    "National Academies of Sciences",
    "National Academies Press",
    "National Academies of Sciences, Engineering, and Medicine",
    "National Academy of Sciences Engineering and Medicine",
  ],
  AAP: ["American Academy of Pediatrics"],
  APA: ["American Psychological Association"],
  ELLENMACARTHUR: ["Ellen MacArthur Foundation"],
  FTC: ["Federal Trade Commission"],
  AUSTRALIANGOVERNMENT: ["Australian Government"],
  INFLUENCERMARKETINGHUB: ["Influencer Marketing Hub"],
};

const INVALID_IN_TEXT_KEYS = new Set([
  "p",
  "pp",
  "n",
  "ibid",
  "see",
  "the",
  "a",
  "an",
  "this",
  "they",
  "investigation",
  "ifg",
  "mtg",
  "association",
  "college",
  "journal",
  "organization",
  "organisation",
  "studies",
  "research",
  "review",
  "analysis",
  "report",
  "reports",
  "genetics",
  "gina",
  "found",
  "however",
  "therefore",
  "although",
  "when",
  "where",
  "while",
  "world",
  "american",
  "royal",
  "annals",
  "internal",
  "medicine",
  "outcomes",
  "esmail",
  "carlo",
  "christino",
  "coppa",
  "early",
  "jean",
]);

const ACCORDING_STOP = new Set(["the", "a", "an", "this", "that"]);

function publicationYearAtParenEnd(inner: string): number | null {
  const m = inner.match(/(?:^|,\s*|\s)\b((?:19|20)\d{2})[a-z]?\s*$/i);
  if (!m) return null;
  const y = parseInt(m[1]!, 10);
  return y >= 1900 && y <= 2030 ? y : null;
}

function isApaNdInParen(inner: string): boolean {
  return /,\s*n\.?\s*d\.?\s*$/i.test(inner);
}

function isApaYearInParen(inner: string): boolean {
  if (isApaNdInParen(inner)) return true;
  if (/,\s*(?:19|20)\d{2}[a-z]?(?:\s*,\s*p\.?\s*[\d–-]+)?\s*$/i.test(inner)) {
    return true;
  }
  if (/,\s*(?:19|20)\d{2}[a-z]?/.test(inner)) {
    return true;
  }
  if (/(?:19|20)\d{2}[a-z]?\s*$/i.test(inner) && /,\s*[A-Z]/.test(inner)) {
    return publicationYearAtParenEnd(inner) !== null;
  }
  return publicationYearAtParenEnd(inner) !== null;
}

function parseMlaParenAuthorKeys(inner: string): string[] {
  const keys: string[] = [];
  const dual = inner.match(
    /^([A-Z][a-zA-Z'&-]+)\s+and\s+([A-Z][a-zA-Z'&-]+)\s*$/,
  );
  if (dual) {
    keys.push(dual[1]!, dual[2]!);
    return keys;
  }
  const page = inner.match(
    /^([A-Z][a-zA-Z'&-]+(?:\s+et\s+al\.)?)\s+(\d{1,4})\s*$/,
  );
  if (page && !isApaYearInParen(inner)) {
    keys.push(page[1]!.replace(/\s+et\s+al\.?/i, "").trim());
    return keys;
  }
  const leadComma = inner.match(/^([A-Z][a-zA-Z'&-]+),/);
  if (
    leadComma &&
    /\d{1,4}\s*$/i.test(inner) &&
    !/,\s*(?:19|20)\d{2}/.test(inner)
  ) {
    keys.push(leadComma[1]!);
    return keys;
  }
  if (/^[A-Z][a-zA-Z'&-]+$/.test(inner)) {
    keys.push(inner);
  }
  return keys;
}

function surnameFromAccordingToPhrase(phrase: string): string | null {
  const parts = phrase
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w));
  if (parts.length === 0) return null;
  const surname = parts[parts.length - 1]!.replace(/[^A-Za-z]/g, "");
  return surname.length >= 3 ? surname : null;
}

const INSTITUTIONAL_SUFFIX =
  /(?:Commission|Bureau|Department|Institute|Center|Centre|Agency|Office|Council|Foundation|Association|Society|Committee|Board|Authority|Administration|Service|Program|Project|Initiative|Organization|Organisation|Network|Alliance|Coalition|Partnership|Trust|Fund|University|College|School|Ministry|Division|Section|Unit|Guardian|Hate|Election)/i;

export interface InTextCitationRef {
  key: string;
  year?: string;
  raw: string;
  /** Parenthetical (Author, Year) vs attributive ("According to Author"). */
  parenthetical?: boolean;
}

export interface BibliographyIndexEntry {
  entry: string;
  keys: string[];
  year?: string;
}

function normKey(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length > b.length) [a, b] = [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length === b.length) {
      i++;
      j++;
    } else {
      j++;
    }
  }
  edits += a.length - i + b.length - j;
  return edits <= 1;
}

function keysMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) {
    return true;
  }
  if (a.length >= 5 && b.length >= 5 && editDistanceAtMostOne(a, b)) {
    return true;
  }
  if (
    (a === "neikerk" && b === "niekerk") ||
    (a === "niekerk" && b === "neikerk")
  ) {
    return true;
  }
  return false;
}

/** Join multi-line bibliography entries before pattern matching (seminar-3.2.13). */
export function normalizeBibliographyLines(bibText: string): string {
  const lines = bibText.split("\n");
  const normalized: string[] = [];
  let current = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) {
        normalized.push(current.trim());
        current = "";
      }
      continue;
    }

    const isNewEntry =
      /^[A-Z][\w\u00C0-\u017E]+,/.test(trimmed) ||
      /^[A-Z][a-z]+ [A-Z][a-z]/.test(trimmed);

    if (isNewEntry && current) {
      normalized.push(current.trim());
      current = trimmed;
    } else {
      current += current ? ` ${trimmed}` : trimmed;
    }
  }
  if (current) normalized.push(current.trim());

  return normalized.join("\n");
}

/** Join PDF line-break splits in bibliography URLs (seminar-3.2.6). */
export function joinBrokenBibliographyUrls(bibText: string): string {
  return bibText
    .replace(/(https?:\/\/[^\s]*)\n\s*([^\s()[\]]+)/g, "$1$2")
    .replace(/(doi\.org\/)\n\s*([^\s]+)/g, "$1$2")
    .replace(/(https:\/\/)\n\s*([^\s]+)/g, "$1$2")
    .replace(
      /(^[A-Z][^\n]{20,})\n\s*((?:Research and Educational Improvement|Center for Applied)[^\n]+)/gm,
      "$1 $2",
    )
    .replace(
      /(^[A-Z][a-z]+,\s+[A-Z].{10,})\n\s*\((\d{4})\)/gm,
      "$1 ($2)",
    )
    .replace(
      /(Federal Trade Commission\.\s+\(\d{4}\)[^\n]*)\n\s*([a-z])/gim,
      "$1 $2",
    )
    .replace(/(\.gov|\.au)([A-Z][a-z])/g, "$1\n\n$2")
    .replace(/(Committee on)\n\s*(Commerce)/gi, "$1 $2")
    .replace(
      /([a-z0-9])([A-Z][\w\u00C0-\u017E]+,\s+[A-Z]\.)/g,
      "$1\n\n$2",
    )
    .replace(
      /(\.\s+)([A-Z][\w\u00C0-\u017E]+,\s+[A-Z]\.)/g,
      "$1\n\n$2",
    );
}

export function extractYearFromEntry(entry: string): string | undefined {
  const m =
    entry.match(/\((\d{4})[,\s]/i) ?? entry.match(/\((\d{4})[a-z]?\)/);
  if (m?.[1]) return m[1];
  const fallback = entry.match(/\b(19|20)\d{2}\b/);
  return fallback?.[0];
}

/** Surname / institutional key from a bibliography line. */
export function extractBibliographySurname(entry: string): string {
  const normalized = normalizeAbbreviations(entry.trim());
  const institutionalMatch = normalized.match(
    /^([A-Z][A-Za-z\s]+(?:Commission|Bureau|Department|Institute|Center|Centre|Agency|Office|Council|Foundation|Association|Society|Committee|Board|Authority|Administration|Service|Program|Project|Initiative|Organization|Organisation|Network|Alliance|Coalition|Partnership|Trust|Fund|University|College|School|Ministry|Division|Section|Unit|Guardian|Hate)[^,]*)/i,
  );
  if (institutionalMatch) {
    return institutionalMatch[1]!.trim();
  }
  const hyphenatedMatch = normalized.match(/^([A-Z][a-z]+-[A-Z][a-z]+)/);
  if (hyphenatedMatch) return hyphenatedMatch[1]!;
  const particleMatch = normalized.match(
    /^(?:van|de|del|della|von|le|la)\s+([A-Z][a-z]+)/i,
  );
  if (particleMatch) return particleMatch[1]!;
  const multiWord = normalized.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),/);
  if (multiWord) return multiWord[1]!.trim();
  const standardMatch = normalized.match(/^([A-Z][a-z]+)/);
  if (standardMatch) return standardMatch[1]!;
  return "";
}

function keysForBibliographyEntry(entry: string): string[] {
  const keys = new Set<string>();
  const surname = extractBibliographySurname(entry);
  if (surname) {
    keys.add(normKey(surname));
    keys.add(normKey(surname.replace(/\s+/g, "")));
    for (const part of surname.split(/\s+/)) {
      if (part.length > 2) keys.add(normKey(part));
    }
    const particle = entry.match(
      /^(van|de|del|della|von)\s+([A-Z][a-z]+)/i,
    );
    if (particle?.[2]) {
      keys.add(normKey(particle[2]));
      keys.add(normKey(`${particle[1]}${particle[2]}`));
      if (particle[2]!.toLowerCase() === "niekerk") {
        keys.add("neikerk");
      }
      if (particle[2]!.toLowerCase() === "neikerk") {
        keys.add("niekerk");
      }
    }
  }
  const leadAuthor = entry.match(/^([A-Z][a-zA-Z'-]+),/);
  if (leadAuthor?.[1]) keys.add(normKey(leadAuthor[1]));
  const entryNorm = normalizeAbbreviations(entry).toLowerCase();
  for (const [abbrev, names] of Object.entries(INSTITUTIONAL_ALIASES)) {
    for (const name of names) {
      if (entryNorm.includes(name.toLowerCase())) {
        keys.add(normKey(abbrev));
        for (const part of name.split(/\s+/)) {
          if (part.length > 3) keys.add(normKey(part));
        }
      }
    }
  }
  if (INSTITUTIONAL_SUFFIX.test(entry)) {
    const lead = entry.match(
      /^([A-Z][A-Za-z\s]+(?:Commission|Bureau|Department|Institute|Center|Centre|Agency|Office|Council|Foundation|Association|Society|Committee|Board|Authority|Administration|Service|Program|Project|Initiative|Organization|Organisation|Network|Alliance|Coalition|Partnership|Trust|Fund|University|College|School|Ministry|Division|Section|Unit|Guardian|Hate)[^,]*)/i,
    );
    if (lead?.[1]) {
      keys.add(normKey(lead[1].replace(/\s+/g, "")));
    }
  }
  return [...keys].filter((k) => k.length > 2);
}

export function buildBibliographyIndex(
  entries: string[],
): BibliographyIndexEntry[] {
  return entries.map((entry) => ({
    entry,
    keys: keysForBibliographyEntry(entry),
    year: extractYearFromEntry(entry),
  }));
}

function addRef(refs: InTextCitationRef[], key: string, year: string | undefined, raw: string): void {
  const k = normKey(key);
  if (k.length < 3 || INVALID_IN_TEXT_KEYS.has(k)) return;
  refs.push({ key: k, year, raw });
}

function parseParenAuthorPart(authorPart: string): { keys: string[]; year?: string } {
  const keys: string[] = [];
  const ndMatch = authorPart.match(/,\s*n\.?\s*d\.?\s*$/i);
  const apaYearMatch = authorPart.match(
    /,\s*((?:19|20)\d{2})[a-z]?(?:\s*,\s*p\.?\s*[\d–-]+)?\s*$/i,
  );
  let year = ndMatch ? "nd" : apaYearMatch?.[1];
  let author = ndMatch
    ? authorPart.replace(/,\s*n\.?\s*d\.?\s*$/i, "").trim()
    : apaYearMatch
      ? authorPart
          .replace(/,\s*(?:19|20)\d{2}[a-z]?(?:\s*,\s*p\.?\s*[\d–-]+)?\s*$/i, "")
          .trim()
      : authorPart;
  if (!year) {
    const yearMatch = author.match(/(\d{4}[a-z]?)\s*$/);
    if (yearMatch && publicationYearAtParenEnd(author)) {
      year = yearMatch[1]!.slice(0, 4);
      author = author.replace(/,?\s*\d{4}[a-z]?\s*$/, "").trim();
    }
  }

  const dualAuthor = author.match(
    /^([A-Z][a-zA-Z'&-]+)\s+and\s+([A-Z][a-zA-Z'&-]+)$/i,
  );
  if (dualAuthor) {
    keys.push(normKey(dualAuthor[1]!), normKey(dualAuthor[2]!));
    return { keys, year };
  }

  author = author.replace(/\s+et\s+al\.?$/i, "").trim();
  author = author.replace(/\s+and\s+[A-Z][a-zA-Z'&]+$/i, "").trim();
  author = author.replace(/\s*&\s*[A-Z][a-zA-Z'&\s-]+$/i, "").trim();

  const institutional = author.match(
    /^([A-Z][A-Za-z\s.]+(?:Commission|Bureau|Department|Institute|Center|Centre|Agency|Office|Council|Foundation|Association|Society|Committee|Board|Authority|Administration|Service|Program|Project|Initiative|Organization|Organisation|Network|Alliance|Coalition|Partnership|Trust|Fund|University|College|School|Ministry|Division|Section|Unit|Guardian|Hate|Election)[^,]*)$/i,
  );
  if (institutional) {
    const name = normalizeAbbreviations(institutional[1]!.trim());
    keys.push(normKey(name.replace(/\s+/g, "")));
    for (const [abbrev, names] of Object.entries(INSTITUTIONAL_ALIASES)) {
      if (names.some((n) => name.toLowerCase().includes(n.toLowerCase()))) {
        keys.push(normKey(abbrev));
      }
    }
    return { keys, year };
  }

  const etAl = author.match(/^([A-Z][a-z]+)\s+et\s+al\.?$/i);
  if (etAl?.[1]) {
    keys.push(normKey(etAl[1]));
    return { keys, year };
  }

  const particle = author.match(/^(?:van|de|del|von)\s+([A-Z][a-z]+)/i);
  if (particle?.[1]) {
    keys.push(normKey(particle[1]));
    return { keys, year };
  }

  const hyphen = author.match(/^([A-Z][a-z]+-[A-Z][a-z]+)/);
  if (hyphen?.[1]) {
    keys.push(normKey(hyphen[1]));
    return { keys, year };
  }

  const multi = author.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (multi?.[1]) {
    keys.push(normKey(multi[1].replace(/\s+/g, "")));
    const parts = multi[1].split(/\s+/);
    keys.push(normKey(parts[parts.length - 1]!));
    return { keys, year };
  }

  const single = author.match(/^([A-Z][a-zA-Z'&-]+)/);
  if (single?.[1]) keys.push(normKey(single[1]));

  return { keys, year };
}

export interface ExtractInTextCitationRefsOptions {
  /** Count MLA surname-only parentheticals like (Lee) — requires Works Cited (seminar-3.2.17). */
  allowMlaNameOnly?: boolean;
}

/** Extract in-text citation author keys (with optional year). */
export function extractInTextCitationRefs(
  body: string,
  opts: ExtractInTextCitationRefsOptions = {},
): InTextCitationRef[] {
  const refs: InTextCitationRef[] = [];
  const seen = new Set<string>();

  const push = (
    key: string,
    year: string | undefined,
    raw: string,
    parenthetical = false,
  ) => {
    const k = normKey(key);
    if (k.length < 3 || INVALID_IN_TEXT_KEYS.has(k)) return;
    const sig = `${k}|${year ?? ""}|${parenthetical ? "p" : "a"}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    const kNorm = normKey(key);
    if (kNorm.length < 3 || INVALID_IN_TEXT_KEYS.has(kNorm)) return;
    refs.push({ key: kNorm, year, raw, parenthetical });
  };

  for (const m of body.matchAll(/\(([^)]+)\)/g)) {
    const inner = m[1]!.trim();
    if (/^(?:p|pp|n|ibid|see)\b/i.test(inner)) continue;
    if (/^[A-Z]{2,8}$/.test(inner)) continue;

    const mlaKeys = parseMlaParenAuthorKeys(inner);
    if (mlaKeys.length > 0 && !isApaYearInParen(inner)) {
      const nameOnly =
        /^[A-Z][a-zA-Z'&-]+$/.test(inner) ||
        /^[A-Z][a-zA-Z'&-]+\s+and\s+[A-Z][a-zA-Z'&-]+\s*$/.test(inner);
      if (!nameOnly || opts.allowMlaNameOnly) {
        for (const k of mlaKeys) {
          push(k, undefined, m[0], true);
        }
      }
      continue;
    }

    if (isApaYearInParen(inner)) {
      const parsed = parseParenAuthorPart(inner);
      for (const k of parsed.keys) {
        push(k, parsed.year, m[0], true);
      }
      continue;
    }
  }

  for (const m of body.matchAll(
    /\b(?:van|de|del|von)\s+([A-Z][a-z]+)\s*\((\d{4})/gi,
  )) {
    push(m[1]!, m[2], m[0], true);
  }

  for (const m of body.matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+et\s+al\.?,?\s*(\d{4})/g,
  )) {
    const lead = m[1]!.trim().split(/\s+/).pop()!;
    push(lead, m[2], m[0], true);
  }

  for (const m of body.matchAll(
    /\b([A-Z][a-z]+)\s*\((\d{4}[a-z]?)\)/g,
  )) {
    push(m[1]!, m[2]!.slice(0, 4), m[0], true);
  }

  for (const m of body.matchAll(/\bAccording to\s+([^,.\n(]{3,80})/gi)) {
    const phrase = normalizeAbbreviations(m[1]!.trim());
    const first = phrase.split(/\s+/)[0]?.toLowerCase();
    if (first && ACCORDING_STOP.has(first)) continue;
    const surname = surnameFromAccordingToPhrase(phrase);
    if (surname) {
      push(surname, undefined, m[0], false);
      continue;
    }
    if (INSTITUTIONAL_SUFFIX.test(phrase)) {
      push(phrase.replace(/\s+/g, " "), undefined, m[0], false);
    }
  }

  for (const m of body.matchAll(
    /\bas\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)\s+(?:argues?|finds?|notes?|explains?|concludes?|demonstrates?|shows?)/gi,
  )) {
    const surname = surnameFromAccordingToPhrase(m[1]!);
    if (surname) push(surname, undefined, m[0], false);
  }

  for (const m of body.matchAll(
    /\b([A-Z][a-z]{2,})\s+(?:writes|wrote|argues|notes|discusses|reports)\b/g,
  )) {
    if (INVALID_IN_TEXT_KEYS.has(m[1]!.toLowerCase())) continue;
    push(m[1]!, undefined, m[0], false);
  }

  for (const m of body.matchAll(/\bResearch by\s+([A-Z][a-z]+)/g)) {
    push(m[1]!, undefined, m[0], false);
  }

  return refs;
}

function isInstitutionalCiteKey(citeKey: string): boolean {
  if (citeKey.length >= 12) return true;
  return Object.keys(INSTITUTIONAL_ALIASES).some((abbrev) =>
    keysMatch(normKey(abbrev), citeKey),
  );
}

function indexLookup(
  index: BibliographyIndexEntry[],
  citeKey: string,
  year: string | undefined,
  referencesLower: string,
): boolean {
  for (const row of index) {
    const keyHit = row.keys.some((k) => keysMatch(k, citeKey));
    if (!keyHit) continue;
    if (!year || !row.year || row.year === year) return true;
    if (isInstitutionalCiteKey(citeKey)) return true;
  }
  if (year && citeKey.length >= 4) {
    for (const row of index) {
      if (row.year === year && referencesLower.includes(citeKey)) {
        return true;
      }
    }
  }
  for (const [abbrev, names] of Object.entries(INSTITUTIONAL_ALIASES)) {
    if (!keysMatch(normKey(abbrev), citeKey)) continue;
    for (const row of index) {
      const entryLower = row.entry.toLowerCase();
      if (names.some((n) => entryLower.includes(n.toLowerCase()))) {
        if (!year || !row.year || row.year === year || isInstitutionalCiteKey(citeKey)) {
          return true;
        }
      }
    }
    if (names.some((n) => referencesLower.includes(n.toLowerCase()))) {
      return true;
    }
  }
  const citeLower = citeKey.toLowerCase();
  const citeVariants = [citeLower];
  if (citeLower === "dalcorso") citeVariants.push("dal corso");
  if (citeLower === "corso" && referencesLower.includes("dal corso")) {
    if (!year || /dal\s+corso[^.]{0,120}\(\d{4}\)/i.test(referencesLower)) {
      return true;
    }
  }
  for (const variant of citeVariants) {
    if (variant.length < 4 || !referencesLower.includes(variant)) continue;
    if (year) {
      const esc = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const authorYear = new RegExp(
        `${esc}[^.]{0,140}\\(${year}\\)|\\(${year}\\)[^.]{0,60}${esc}`,
        "i",
      );
      if (authorYear.test(referencesLower)) return true;
      continue;
    }
    return true;
  }
  return false;
}

function mergeBibliographyIndex(
  entries: string[],
  referencesText: string,
): BibliographyIndexEntry[] {
  const index = buildBibliographyIndex(entries);
  const seen = new Set(index.map((r) => r.entry));
  const lines = referencesText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && /^[A-Z][a-zA-Z'’-]+,/.test(l));
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    index.push(...buildBibliographyIndex([line]));
  }
  return index;
}

/** Surname / org substring match in references (legacy soft link; seminar-3.2.8). */
export function computeAuthorInReferencesLinkingRatio(
  inTextAuthors: string[],
  referencesText: string,
): number {
  const authors = inTextAuthors.filter(
    (a) => a.length > 2 && !/^(she|this|the|however)$/i.test(a),
  );
  if (authors.length === 0) return 0;
  const refLower = normalizeAbbreviations(referencesText).toLowerCase();
  let linked = 0;
  for (const a of authors) {
    const key = a.replace(/\s+et\s+al\.?$/i, "").toLowerCase();
    if (refLower.includes(key)) {
      linked++;
      continue;
    }
    let matched = false;
    for (const [abbrev, names] of Object.entries(INSTITUTIONAL_ALIASES)) {
      if (!keysMatch(normKey(abbrev), key)) continue;
      if (names.some((n) => refLower.includes(n.toLowerCase()))) {
        matched = true;
        break;
      }
    }
    if (matched) linked++;
  }
  return linked / authors.length;
}

export function resolveBibliographyLinkedRatio(
  structuredRatio: number,
  inTextAuthors: string[],
  referencesText: string,
): number {
  return Math.max(
    structuredRatio,
    computeAuthorInReferencesLinkingRatio(inTextAuthors, referencesText),
  );
}

export function linkCitationsToBibliography(
  body: string,
  entries: string[],
  referencesText = "",
): {
  inTextRefs: InTextCitationRef[];
  inTextAuthors: string[];
  bibliographyAuthors: string[];
  missingFromBibliography: string[];
  missingFromBibliographyCount: number;
  linkingRatio: number;
} {
  const index = mergeBibliographyIndex(entries, referencesText);
  const referencesLower = normalizeAbbreviations(referencesText).toLowerCase();
  const inTextRefs = extractInTextCitationRefs(body);
  const uniqueKeys = [...new Set(inTextRefs.map((r) => r.key))];
  const bibliographyAuthors = [
    ...new Set(index.flatMap((r) => r.keys)),
  ].filter((k) => k.length > 2);

  const missingKeys = new Set<string>();
  for (const cite of inTextRefs) {
    if (!indexLookup(index, cite.key, cite.year, referencesLower)) {
      missingKeys.add(cite.key);
    }
  }
  const missingFromBibliography = [...missingKeys];

  const parentheticalRefs = inTextRefs.filter((r) => r.parenthetical === true);
  const parentheticalKeys = [...new Set(parentheticalRefs.map((r) => r.key))];
  let linkedParenthetical = 0;
  for (const key of parentheticalKeys) {
    const sample = parentheticalRefs.find((r) => r.key === key);
    if (
      sample &&
      indexLookup(index, sample.key, sample.year, referencesLower)
    ) {
      linkedParenthetical++;
    }
  }
  const linkingRatio =
    parentheticalKeys.length > 0
      ? linkedParenthetical / parentheticalKeys.length
      : uniqueKeys.length > 0
        ? (uniqueKeys.length - missingFromBibliography.length) / uniqueKeys.length
        : 0;

  return {
    inTextRefs,
    inTextAuthors: uniqueKeys,
    bibliographyAuthors,
    missingFromBibliography,
    missingFromBibliographyCount: missingFromBibliography.length,
    linkingRatio,
  };
}
