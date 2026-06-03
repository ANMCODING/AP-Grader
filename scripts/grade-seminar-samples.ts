import { execSync } from "node:child_process";

console.log("Running AP Seminar sample grading regression...\n");
execSync("npx tsx scripts/seminar-regression.ts", {
  stdio: "inherit",
  cwd: process.cwd(),
});
