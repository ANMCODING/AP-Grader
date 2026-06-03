/** Low-level pattern counters (no session cache). */

export function countPatternHits(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) n += m.length;
  }
  return n;
}

/** Stop once total hit count reaches maxHits (scoring often caps with Math.min). */
export function countPatternHitsUpTo(
  text: string,
  patterns: RegExp[],
  maxHits: number,
): number {
  let n = 0;
  for (const p of patterns) {
    if (n >= maxHits) return n;
    const m = text.match(p);
    if (m) n += m.length;
  }
  return n;
}

/** At most one hit per pattern; optional cap on how many patterns may match. */
export function countDistinctPatternHits(
  text: string,
  patterns: RegExp[],
  maxPatterns = patterns.length,
): number {
  let n = 0;
  for (const p of patterns) {
    if (n >= maxPatterns) break;
    p.lastIndex = 0;
    if (p.test(text)) n++;
  }
  return n;
}

/**
 * Compiles a pattern array into a single combined regex at module load time.
 * Use for arrays where you only need a COUNT of distinct matches,
 * not which specific patterns matched.
 */
export function buildCombinedRegex(patterns: RegExp[]): RegExp {
  if (patterns.length === 0) return /(?!)/;
  const sources = patterns.map((p) => `(?:${p.source})`);
  return new RegExp(sources.join("|"), "gi");
}

/** Smaller alternations compile faster and avoid giant-DFA overhead on short texts. */
export function buildCombinedRegexChunks(
  patterns: RegExp[],
  chunkSize = 25,
): RegExp[] {
  const chunks: RegExp[] = [];
  for (let i = 0; i < patterns.length; i += chunkSize) {
    chunks.push(buildCombinedRegex(patterns.slice(i, i + chunkSize)));
  }
  return chunks;
}

export function combinedChunksMatch(
  chunks: RegExp[],
  text: string,
  sliceLimit?: number,
): boolean {
  const searchText = sliceLimit ? text.slice(0, sliceLimit) : text;
  for (const chunk of chunks) {
    chunk.lastIndex = 0;
    if (chunk.test(searchText)) return true;
  }
  return false;
}

/**
 * Count distinct matched substrings from a combined regex (one pass over text).
 */
export function countCombinedMatches(
  combinedRegex: RegExp,
  text: string,
  sliceLimit?: number,
): number {
  combinedRegex.lastIndex = 0;
  const searchText = sliceLimit ? text.slice(0, sliceLimit) : text;
  const matched = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = combinedRegex.exec(searchText)) !== null) {
    matched.add(match[0].toLowerCase().trim());
    if (matched.size > 50) break;
  }
  return matched.size;
}

/** Fast yes/no: does the combined alternation match anywhere in text? */
export function combinedRegexMatches(
  combinedRegex: RegExp,
  text: string,
  sliceLimit?: number,
): boolean {
  combinedRegex.lastIndex = 0;
  const searchText = sliceLimit ? text.slice(0, sliceLimit) : text;
  return combinedRegex.test(searchText);
}

/** Distinct pattern hits with combined-regex prefilter (preserves scoring semantics). */
export function countDistinctPatternHitsWithCombined(
  text: string,
  patterns: RegExp[],
  combined: RegExp | RegExp[],
  maxPatterns: number,
  sliceLimit?: number,
): number {
  const searchText = sliceLimit ? text.slice(0, sliceLimit) : text;
  const matches = Array.isArray(combined)
    ? combinedChunksMatch(combined, searchText)
    : combinedRegexMatches(combined, searchText);
  if (!matches) return 0;
  return countDistinctPatternHits(searchText, patterns, maxPatterns);
}

export function countPatternHitsWithCombined(
  text: string,
  patterns: RegExp[],
  combined: RegExp | RegExp[],
  sliceLimit?: number,
): number {
  const searchText = sliceLimit ? text.slice(0, sliceLimit) : text;
  const matches = Array.isArray(combined)
    ? combinedChunksMatch(combined, searchText)
    : combinedRegexMatches(combined, searchText);
  if (!matches) return 0;
  return countPatternHits(searchText, patterns);
}
