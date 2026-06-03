export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function cleanText(text: string): string {
  return text
    .replace(/\ufeff/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

export function firstPercent(text: string, percent: number): string {
  const len = Math.floor(text.length * percent);
  return text.slice(0, Math.max(len, 500));
}

export function extractSection(
  text: string,
  headingPatterns: RegExp[],
): string {
  const lines = text.split(/\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 150) continue;
    for (const pat of headingPatterns) {
      if (pat.test(line)) {
        start = text.indexOf(lines[i]);
        break;
      }
    }
    if (start >= 0) break;
  }
  if (start < 0) return "";
  const rest = text.slice(start);
  const nextHeading = rest.slice(100).search(/\n[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s*\n/);
  return nextHeading > 0 ? rest.slice(0, nextHeading + 100) : rest;
}

export function hasSection(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function averageSentenceLength(text: string): number {
  const withoutQuotes = text.replace(/"[^"]{20,}"/g, " ").replace(/'[^']{20,}'/g, " ");
  const sents = sentences(withoutQuotes);
  if (sents.length === 0) return 0;
  const total = sents.reduce((a, s) => a + s.split(/\s+/).length, 0);
  return total / sents.length;
}
