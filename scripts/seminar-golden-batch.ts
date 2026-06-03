import fs from "node:fs";
import path from "node:path";
import { gradeIwa } from "@/lib/seminar/iwaGrader";

const BATCH = path.join(process.cwd(), "data/batch-iwa-papers");
const GOLDEN = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "data/seminar/golden-batch-iwa.json"),
    "utf8",
  ),
) as { file: string; rows: number[]; total: number }[];

let pass = 0;
for (const g of GOLDEN) {
  const text = fs.readFileSync(path.join(BATCH, g.file), "utf8");
  const r = gradeIwa(text);
  const rows = r.rows.map((x) => x.score);
  const ok =
    r.total === g.total && rows.every((v, i) => v === g.rows[i]);
  if (ok) pass++;
  else {
    console.log(
      `FAIL ${g.file}: expected ${g.total} [${g.rows.join("+")}] got ${r.total} [${rows.join("+")}]`,
    );
  }
}
console.log(`\nGolden batch: ${pass}/${GOLDEN.length}`);
process.exit(pass === GOLDEN.length ? 0 : 1);
