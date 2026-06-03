/**
 * Automated browser verification for manual checklist (requires dev server).
 * Run: npm run dev (separate terminal), then node scripts/browser-verification.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAPER24 = readFileSync(
  join(process.cwd(), "data/test-papers/paper24-ap-biology-retrieval.txt"),
  "utf-8",
);
const PAPER24_FIRST500 = PAPER24.split(/\s+/).slice(0, 500).join(" ");

const results = [];

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} Check ${id}: ${detail}`);
}

async function waitForServer(page, maxMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 5000 });
      if (res?.ok()) return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`Dev server not reachable at ${BASE}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await waitForServer(page);

  // Check 1 — paste paper24
  await page.goto(BASE);
  const textarea = page.locator("#paper-text");
  await textarea.fill(PAPER24);
  await page.waitForTimeout(400);
  const metricsBar = await page.locator(".rounded-lg.border.border-surface-border.bg-surface-muted\\/60").first().textContent();
  const incompleteBanner = await page.locator("text=Incomplete submission detected").count();
  const softWarn = await page.locator("text=Your submission may be incomplete").count();
  const bodyMatch = metricsBar?.match(/Est\.\s*body\s*words\s*([\d,]+)/i);
  const compMatch = metricsBar?.match(/Completeness\s*([\d,]+)%/i);
  const bodyEst = bodyMatch ? parseInt(bodyMatch[1].replace(/,/g, ""), 10) : 0;
  const compPct = compMatch ? parseInt(compMatch[1], 10) : 0;
  record(
    1,
    !incompleteBanner && bodyEst > 3000,
    `Est. body words: ${bodyEst}; completeness: ${compPct}% (green needs ≥85); incomplete banner: ${incompleteBanner}; soft warn: ${softWarn}`,
  );

  // Check 2 — txt upload
  const txtPath = join(process.cwd(), "data/test-papers/paper24-ap-biology-retrieval.txt");
  await page.goto(BASE);
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /Upload File/i }).click(),
  ]);
  await fileChooser.setFiles(txtPath);
  await page.waitForTimeout(800);
  const loadedName = await page.locator("text=Loaded:").textContent();
  const txtBar = await page.locator(".rounded-lg.border.border-surface-border.bg-surface-muted\\/60").first().textContent();
  const txtWords = txtBar?.match(/Total\s*words\s*([\d,]+)/i)?.[1];
  const txtLen = (await textarea.inputValue()).length;
  record(
    2,
    loadedName?.includes("paper24") && txtLen > 20000,
    `Filename: ${loadedName}; total words UI: ${txtWords}; textarea chars: ${txtLen}`,
  );

  // Check 3 — docx upload
  const docxPath = "/tmp/paper24-test.docx";
  writeFileSync(join(process.cwd(), "data/test-papers/paper24-snippet.docx"), readFileSync(docxPath));
  await page.goto(BASE);
  const [fc2] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /Upload File/i }).click(),
  ]);
  await fc2.setFiles(join(process.cwd(), "data/test-papers/paper24-snippet.docx"));
  await page.waitForTimeout(1500);
  const docxVal = await textarea.inputValue();
  record(
    3,
    docxVal.length > 500 && /retrieval|biology|research/i.test(docxVal),
    `Mammoth extracted ${docxVal.split(/\s+/).length} words; preview: ${docxVal.slice(0, 80)}…`,
  );

  // Check 4 — Google Docs (skip if no env URL)
  if (process.env.GOOGLE_DOC_URL) {
    await page.goto(BASE);
    await page.locator("#google-docs-url").fill(process.env.GOOGLE_DOC_URL);
    await page.getByRole("button", { name: "Import" }).click();
    await page.waitForTimeout(8000);
    const msg = await page.locator("[role=status]").textContent().catch(() => "");
    const gLen = (await textarea.inputValue()).length;
    record(4, msg?.includes("Loaded") && gLen > 20000, `Status: ${msg}; chars: ${gLen}`);
  } else {
    record(4, null, "SKIPPED — set GOOGLE_DOC_URL to a public doc with paper24 text");
  }

  // Check 5 & 6 — submit paper24
  await page.goto(BASE);
  await textarea.fill(PAPER24);
  await page.getByRole("button", { name: /Submit for Scoring/i }).click();
  await page.waitForSelector("text=Paper structure preview", { timeout: 10_000 });
  const checklist = await page.locator("text=Paper structure preview").locator("..").textContent();
  const hasChecks = (checklist?.match(/✓/g) ?? []).length;
  await page.waitForSelector("text=Score report", { timeout: 120_000 });
  const overall = await page.locator("text=Overall AP score").locator("..").textContent();
  const apPill = await page.locator("text=Overall AP score").locator("..").locator("span.font-semibold").textContent();
  const categories = await page.locator("section[aria-label='Score report'] li").count();
  const incompleteAfter = await page.locator("text=Incomplete submission detected").count();
  record(
    5,
    hasChecks >= 4,
    `Checkmarks in preview: ${hasChecks}; checklist excerpt: ${checklist?.slice(0, 200)}…`,
  );
  const apNum = parseInt(apPill ?? "0", 10);
  record(
    6,
    apNum >= 4 && apNum <= 5 && categories === 5 && !incompleteAfter,
    `Overall: ${overall?.trim()}; AP pill: ${apPill}; category rows: ${categories}; incomplete banner: ${incompleteAfter}`,
  );

  // Check 7 — tips panel
  await page.goto(BASE);
  const tipsBtn = page.getByRole("button", { name: "Submission Tips" });
  await tipsBtn.click();
  const tipVisible = await page.locator("text=Select all before copying").isVisible();
  await tipsBtn.click();
  await page.waitForTimeout(400);
  const tipHidden = await page.locator("text=Select all before copying").isHidden();
  record(7, tipVisible && tipHidden, `Expanded visible: ${tipVisible}; collapsed hidden: ${tipHidden}`);

  // Check 8 — history (after check 6 we should have history)
  await page.reload();
  const histSection = await page.locator("text=Previous Submissions").count();
  const histBtn = page.locator("section[aria-label='Previous Submissions'] button").first();
  if (histSection > 0) {
    await histBtn.click();
    const comparison = await page.locator("text=→").count();
    record(8, histSection > 0 && comparison > 0, "History section visible; comparison arrows after click");
  } else {
    record(8, false, "No history section after reload (grade may not have completed in prior step)");
  }

  // Check 9 — clear history
  const clearBtn = page.getByRole("button", { name: "Clear History" });
  if (await clearBtn.count()) {
    await clearBtn.click();
    await page.reload();
    const empty = await page.locator("text=Previous Submissions").count();
    record(9, empty === 0, `After clear + reload, history section count: ${empty}`);
  } else {
    record(9, null, "SKIPPED — no Clear History button");
  }

  // Check 10 — partial paste
  await page.goto(BASE);
  await textarea.fill(PAPER24_FIRST500);
  await page.waitForTimeout(400);
  const bar10 = await page.locator(".rounded-lg.border.border-surface-border.bg-surface-muted\\/60").first().textContent();
  const comp10 = bar10?.match(/Completeness\s*([\d,]+)%/i)?.[1];
  const soft10 = await page.locator("text=Your submission may be incomplete").count();
  const submitEnabled = await page.getByRole("button", { name: /Submit for Scoring/i }).isEnabled();
  const pct = parseInt(comp10?.replace(/,/g, "") ?? "0", 10);
  record(
    10,
    soft10 > 0 && pct < 70 && submitEnabled,
    `Completeness: ${pct}%; soft warning: ${soft10 > 0}; submit enabled: ${submitEnabled}`,
  );

  await browser.close();

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    const status = r.pass === null ? "SKIP" : r.pass ? "PASS" : "FAIL";
    console.log(`Check ${r.id}: ${status} — ${r.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
