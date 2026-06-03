import { readFileSync } from "fs";
import { join } from "path";

/** Official AP score keyed by sample file basename. */
export const OFFICIAL_SAMPLE_SCORES: Record<string, 1 | 2 | 3 | 4 | 5> = {
  "ap23-apc-research-sample-a.txt": 5,
  "ap23-apc-research-sample-b.txt": 5,
  "ap23-apc-research-sample-c.txt": 4,
  "ap23-apc-research-sample-d.txt": 4,
  "ap23-apc-research-sample-e.txt": 3,
  "ap23-apc-research-sample-f.txt": 3,
  "ap23-apc-research-sample-g.txt": 2,
  "ap23-apc-research-sample-h.txt": 2,
  "ap23-apc-research-sample-i.txt": 1,
  "ap23-apc-research-sample-j.txt": 1,
  "ap24-apc-research-sample-a.txt": 5,
  "ap24-apc-research-sample-b.txt": 5,
  "ap24-apc-research-sample-c.txt": 4,
  "ap24-apc-research-sample-d.txt": 4,
  "ap24-apc-research-sample-e.txt": 3,
  "ap24-apc-research-sample-f.txt": 3,
  "ap24-apc-research-sample-g.txt": 2,
  "ap24-apc-research-sample-h.txt": 2,
  "ap24-apc-research-sample-i.txt": 1,
  "ap24-apc-research-sample-j.txt": 1,
  "ap25-apc-research-sample-a.txt": 5,
  "ap25-apc-research-sample-b.txt": 5,
  "ap25-apc-research-sample-c.txt": 4,
  "ap25-apc-research-sample-d.txt": 4,
  "ap25-apc-research-sample-e.txt": 3,
  "ap25-apc-research-sample-f.txt": 3,
  "ap25-apc-research-sample-g.txt": 2,
  "ap25-apc-research-sample-h.txt": 2,
  "ap25-apc-research-sample-i.txt": 1,
  "ap25-apc-research-sample-j.txt": 1,
};

export function listOfficialSampleFiles(samplesDir: string): string[] {
  return Object.keys(OFFICIAL_SAMPLE_SCORES).map((name) => join(samplesDir, name));
}

/** Extract student paper text from a College Board sample packet file. */
export function extractStudentPaperFromPacket(fullText: string): string {
  const researchStart = fullText.search(/Research Sample [A-J]\s+1\s+of\s+\d+/i);
  const commentaryStart = fullText.search(/\nScore:\s*[1-5]\s*\n/);
  if (researchStart < 0) return fullText.slice(0, 50_000);
  const end =
    commentaryStart > researchStart ? commentaryStart : fullText.length;
  return fullText.slice(researchStart, end).trim();
}

export function loadOfficialSamplePaper(filePath: string): {
  text: string;
  fileName: string;
  officialScore: 1 | 2 | 3 | 4 | 5;
} {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  const officialScore = OFFICIAL_SAMPLE_SCORES[fileName];
  if (!officialScore) {
    throw new Error(`Unknown official sample file: ${fileName}`);
  }
  const raw = readFileSync(filePath, "utf-8");
  return {
    text: extractStudentPaperFromPacket(raw),
    fileName,
    officialScore,
  };
}
