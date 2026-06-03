/**
 * Smoke test for incomplete submission detection and messaging.
 * Run: npx tsx scripts/test-incomplete-submission.ts
 */
import assert from "node:assert/strict";
import {
  buildIncompleteSubmissionWarning,
  INCOMPLETE_SUBMISSION_CONFIDENCE_NOTE,
  INCOMPLETE_SUBMISSION_TIP,
  isIncompleteSubmission,
} from "../lib/grader/incompleteSubmission";

assert.equal(isIncompleteSubmission(4000, 1500), true);
assert.equal(isIncompleteSubmission(4000, 2399), true);
assert.equal(isIncompleteSubmission(4000, 2400), false);
assert.equal(isIncompleteSubmission(4000, 2500), false);
assert.equal(isIncompleteSubmission(2000, 100), false);
assert.equal(isIncompleteSubmission(null, 100), false);

const warning = buildIncompleteSubmissionWarning(4312, 2166);
assert.ok(warning.includes("4,312"));
assert.ok(warning.includes("2,166"));
assert.ok(warning.startsWith("Incomplete submission detected."));
assert.ok(
  warning.includes(
    "Scores shown below are based only on the incomplete text received",
  ),
);

assert.ok(INCOMPLETE_SUBMISSION_CONFIDENCE_NOTE.includes("LOW"));
assert.ok(INCOMPLETE_SUBMISSION_TIP.includes("Ctrl+A"));

import { detectMethodExecution } from "../lib/grader/methodExecution";
import { readFileSync } from "fs";

const p27 = readFileSync("data/test-papers/paper27-mindfulness-anxiety.txt", "utf-8");
const exec = detectMethodExecution(p27);
assert.equal(exec.functionallyUnexecuted, true);
assert.equal(exec.notExecutedHard, true);
assert.equal(exec.partialExecution, false);

console.log("incomplete submission tests: OK");
console.log("paper 27 method execution: OK (hard non-execution)");
