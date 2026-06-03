/**
 * Paste retention test via real clipboard + keyboard paste.
 * Run: npm run dev, then node scripts/test-clipboard-paste.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAPER =
  process.argv[2] ??
  join(process.cwd(), "data/test-papers/paper24-ap-biology-retrieval.txt");

async function main() {
  const text = readFileSync(PAPER, "utf-8");
  const expectedWords = text.trim().split(/\s+/).filter(Boolean).length;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();

  const logs = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("PASTE EVENT:") || t.includes("PASTE INPUT:")) {
      logs.push(t);
      console.log(t);
    }
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(async (t) => {
    await navigator.clipboard.writeText(t);
  }, text);

  const textarea = page.locator("#paper-text");
  await textarea.focus();
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(600);

  const domValue = await textarea.inputValue();
  const domWords = domValue.trim().split(/\s+/).filter(Boolean).length;
  const bar = await page
    .locator(".rounded-lg.border.border-surface-border.bg-surface-muted\\/60")
    .first()
    .textContent();
  const totalMatch = bar?.match(/Total\s*words\s*([\d,]+)/i);
  const totalUi = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
    : 0;
  const warn = await page
    .locator("text=Paste may have been cut short")
    .count();

  const pct = ((domWords / expectedWords) * 100).toFixed(1);
  console.log("\n--- Summary ---");
  console.log(`Fixture words: ${expectedWords}`);
  console.log(`DOM words after paste: ${domWords} (${pct}%)`);
  console.log(`Word count bar total: ${totalUi}`);
  console.log(`Paste warning visible: ${warn > 0}`);
  console.log(`Pass (≥95% retention): ${domWords >= expectedWords * 0.95}`);

  await browser.close();
  process.exit(domWords >= expectedWords * 0.95 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
