/**
 * Convert IWA phrase templates (with [author], [X], etc.) to loose case-insensitive RegExp.
 */

const BRACKET_PLACEHOLDER = /\[([^\]]+)\]/g;

/** Map common placeholder labels to regex fragments (longest match first at use site). */
function placeholderToRegex(label: string): string {
  const l = label.toLowerCase().trim();
  if (
    l === "author" ||
    l === "stimulus author" ||
    l === "named prior-year author" ||
    l === "named source" ||
    l === "source a" ||
    l === "source b" ||
    l === "source c" ||
    l === "source" ||
    l.startsWith("named ") ||
    l.startsWith("specific ")
  ) {
    return ".{2,80}";
  }
  if (l === "n" || l.startsWith("n ") || l === "year") {
    return l === "year" ? "(?:19|20)\\d{2}" : "\\d+";
  }
  if (l === "x" || l === "y" || l === "z") return ".{2,100}";
  if (l.includes("he/she")) return "(?:he|she|they)";
  if (l.includes("/")) return ".{2,80}";
  return ".{2,120}";
}

function escapeRegexLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convert a phrase template to a loose RegExp (case-insensitive). */
export function phraseToRegex(phrase: string): RegExp {
  const trimmed = phrase.trim();
  if (!trimmed) return /(?!)/;

  let pattern = "";
  let last = 0;
  BRACKET_PLACEHOLDER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BRACKET_PLACEHOLDER.exec(trimmed)) !== null) {
    if (m.index > last) {
      pattern += escapeRegexLiteral(trimmed.slice(last, m.index));
    }
    pattern += placeholderToRegex(m[1]!);
    last = m.index + m[0].length;
  }
  if (last < trimmed.length) {
    pattern += escapeRegexLiteral(trimmed.slice(last));
  }
  pattern = pattern.replace(/\s+/g, "\\s+");
  return new RegExp(pattern, "i");
}

export function phrasesToRegex(phrases: readonly string[]): RegExp[] {
  const seen = new Set<string>();
  const out: RegExp[] = [];
  for (const p of phrases) {
    const key = p.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    try {
      out.push(phraseToRegex(p));
    } catch {
      out.push(new RegExp(escapeRegexLiteral(p).replace(/\s+/g, "\\s+"), "i"));
    }
  }
  return out;
}

/** Replace [Author] with a specific token before compiling (Row 1 integration windows). */
export function phraseToRegexForAuthor(
  phrase: string,
  authorToken: string,
): RegExp {
  const token = authorToken.trim();
  if (!token) return phraseToRegex(phrase);
  const substituted = phrase.replace(
    /\[Author\]/gi,
    escapeRegexLiteral(token),
  );
  return phraseToRegex(substituted);
}

export function phrasesToRegexForAuthor(
  phrases: readonly string[],
  authorToken: string,
): RegExp[] {
  const seen = new Set<string>();
  const out: RegExp[] = [];
  for (const p of phrases) {
    const key = p.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    try {
      out.push(phraseToRegexForAuthor(p, authorToken));
    } catch {
      out.push(
        new RegExp(
          escapeRegexLiteral(p).replace(/\s+/g, "\\s+"),
          "i",
        ),
      );
    }
  }
  return out;
}
