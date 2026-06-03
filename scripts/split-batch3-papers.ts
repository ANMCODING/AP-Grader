import fs from "node:fs";
import path from "node:path";

const SRC =
  process.argv[2] ??
  path.join(process.env.HOME ?? "", "Downloads/batch3_grade_these.txt");
const OUT = path.join(process.cwd(), "data/seminar/batch3-calibration");

const NAMES: Record<string, string> = {
  "IWA-1": "iwa_1_crispr.txt",
  "IWA-2": "iwa_2_gig_economy.txt",
  "IWA-3": "iwa_3_mandatory_voting.txt",
  "IWA-4": "iwa_4_antibiotics.txt",
  "IWA-5": "iwa_5_screen_time.txt",
  "IRR-1": "irr_1_social_isolation.txt",
  "IRR-2": "irr_2_charter_schools.txt",
  "IRR-3": "irr_3_min_wage.txt",
  "IRR-4": "irr_4_homework.txt",
  "IRR-5": "irr_5_outdoor_education.txt",
};

const text = fs.readFileSync(SRC, "utf8");
const markers = [
  ...text.matchAll(
    /^={8,}\n\[(IWA|IRR)-(\d+)\] \[(\w+)\] \[TARGET: ([^\]]+)\]/gm,
  ),
];

fs.mkdirSync(OUT, { recursive: true });

for (let i = 0; i < markers.length; i++) {
  const m = markers[i]!;
  const id = `${m[1]}-${m[2]}`;
  const name = NAMES[id];
  if (!name) continue;
  const start = m.index!;
  const end = i + 1 < markers.length ? markers[i + 1].index! : text.length;
  fs.writeFileSync(path.join(OUT, name), text.slice(start, end).trim() + "\n");
  console.log("wrote", name);
}
