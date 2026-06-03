import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { iwaSignalTotal } from "@/lib/seminar/iwaRows";

const BATCH = path.join(process.cwd(), "data/batch-iwa-papers");
const files = fs.readdirSync(BATCH).filter((f) => f.endsWith(".txt")).sort();

const TARGETS: Record<string, [number, number]> = {
  "p01-social-media.txt": [0, 5],
  "p02-fast-fashion.txt": [14, 18],
  "p03-mandatory-voting.txt": [30, 36],
  "p04-genetic-testing.txt": [31, 36],
  "p05-ubi-norberg.txt": [38, 44],
  "p06-solitary-confinement.txt": [28, 34],
  "p07-nostalgia-political.txt": [38, 44],
  "p08-eyewitness-okafor.txt": [33, 39],
  "p09-digital-memory-identity.txt": [32, 38],
  "p10-collective-memory-injustice.txt": [36, 42],
  "p11-memory-fallibility-adesanya.txt": [33, 39],
};

for (const file of files) {
  const text = fs.readFileSync(path.join(BATCH, file), "utf8");
  const r = gradeIwa(text);
  const rows = r.rows.map((x) => x.score);
  const e = r.evidence;
  const [lo, hi] = TARGETS[file] ?? [0, 48];
  const inRange = r.total >= lo && r.total <= hi;
  console.log(
    JSON.stringify({
      file,
      rows,
      total: r.total,
      signalTotal: iwaSignalTotal(e),
      confidence: r.confidence,
      target: `${lo}-${hi}`,
      inRange,
      flags: {
        urlOnlyBibliography: e.urlOnlyBibliography,
        exploratoryMode: e.exploratoryMode,
        thesisPresent: e.thesisPresent,
        thesisInOpening: e.thesisInOpening,
        conclusionAligned: e.conclusionAligned,
        counterclaimPresent: e.counterclaimPresent,
        strongCounterclaimEngaged: e.strongCounterclaimEngaged,
        echoRatio: e.echoRatio,
        commentaryDepthRatio: e.commentaryDepthRatio,
        commentaryStructureScore: e.commentaryStructureScore,
        namedPerspectiveCount: e.namedPerspectiveCount,
        bibliographyPresent: e.bibliographyPresent,
        inTextCitationCount: e.inTextCitationCount,
      },
    }),
  );
}
