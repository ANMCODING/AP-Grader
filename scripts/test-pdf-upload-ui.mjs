/**
 * E2E: upload PDF via file input on HomePage.
 */
import { chromium } from "playwright";
import { join } from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3002";
const PDF = join(process.cwd(), "tmp/paper24-test.pdf");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /Upload File/i }).click(),
  ]);
  await chooser.setFiles(PDF);
  await page.waitForSelector("text=Loaded: paper24-test.pdf", { timeout: 60_000 });

  const bar = await page
    .locator(".rounded-lg.border.border-surface-border.bg-surface-muted\\/60")
    .first()
    .textContent();
  const total = bar?.match(/Total\s*words\s*([\d,]+)/i)?.[1];
  const textareaLen = (await page.locator("#paper-text").inputValue()).length;

  console.log(`Loaded filename visible: yes`);
  console.log(`Word count bar total: ${total}`);
  console.log(`Textarea chars: ${textareaLen}`);
  console.log(`Pass: ${parseInt(total?.replace(/,/g, "") ?? "0", 10) >= 3500}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
