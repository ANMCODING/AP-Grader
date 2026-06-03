import {
  normalizeControlCharacters,
  normalizePaperText,
} from "@/lib/grader/textNormalize";

/** Stitch PDF line breaks inside parenthetical citations. */
export function stitchSplitCitations(text: string): string {
  return text.replace(
    /\(([A-Z][a-zA-Z'&]+(?:\s+et\s+al\.)?),\s*\n\s*(\d{4}[a-z]?)/g,
    "($1, $2",
  );
}

/** Join mid-sentence line breaks common in pasted text (mirrors PDF clean path). */
function joinSoftLineBreaks(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (i + 1 < lines.length) {
      const next = lines[i + 1]!.trim();
      const cur = line.trimEnd();
      if (
        !cur ||
        !next ||
        /[.!?]["')\]]?\s*$/.test(cur) ||
        /^[A-Z][A-Za-z\s]{2,50}:$/.test(cur.trim()) ||
        /^(?:sources?|references?|works?\s+cited|work\s+cited|bibliography|bibliograf[íi]a|referencias?|fuentes?|bib|refs)\s*[:.]?\s*$/i.test(
          cur.trim(),
        ) ||
        /^https?:\/\//i.test(next) ||
        !/^[a-z(,;]/.test(next)
      ) {
        break;
      }
      line = `${cur} ${next}`;
      i++;
    }
    out.push(line);
  }
  return out.join("\n");
}

export function prepareSeminarText(raw: string): string {
  let t = normalizeControlCharacters(raw);
  t = normalizePaperText(t);
  t = joinSoftLineBreaks(t);
  t = stitchSplitCitations(t);
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  return t;
}
