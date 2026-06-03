/**
 * Simulates Google Docs PDF text layout (running headers, page numbers, extra blanks)
 * before converting to a test PDF.
 */

const WORDS_PER_PAGE = 380;

function splitIntoPages(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const pages: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
    pages.push(words.slice(i, i + WORDS_PER_PAGE).join(" "));
  }
  return pages.length > 0 ? pages : [text];
}

function addExtraParagraphBlanks(pageText: string): string {
  return pageText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n\n");
}

export function buildGoogleDocsStyleCover(paperTitle: string): string {
  return [
    paperTitle,
    "",
    "AP Research",
    "April 2025",
    "Word Count: 4,876",
    "",
    "",
  ].join("\n");
}

export function simulateGoogleDocsPdfPlaintext(
  bodyText: string,
  options: {
    runningHeaderTemplate: (pageNum: number) => string;
    titleForCover?: string;
  },
): string {
  const title =
    options.titleForCover ??
    bodyText.split("\n").find((l) => l.trim().length > 10)?.trim() ??
    "AP Research Paper";

  const pages = splitIntoPages(bodyText);
  const parts: string[] = [buildGoogleDocsStyleCover(title)];

  pages.forEach((pageBody, index) => {
    const pageNum = index + 1;
    const header = options.runningHeaderTemplate(pageNum);
    const expanded = addExtraParagraphBlanks(pageBody);
    parts.push(
      header,
      "",
      expanded,
      "",
      String(pageNum),
      "",
    );
  });

  return parts.join("\n");
}
