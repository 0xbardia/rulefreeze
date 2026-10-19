import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:48820";

test("Load synthetic QA example button on /events/new loads Section 8 baseline", async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/events/new`, { waitUntil: "networkidle" });

    // Assert button is visible
    const loadBtn = page.locator("#btn-load-synthetic-qa");
    await loadBtn.waitFor({ state: "visible" });

    // Click button
    await loadBtn.click();

    // Verify fields populated
    const nameVal = await page.inputValue('input[placeholder*="Autonomous Agents"]');
    assert.equal(nameVal, "RuleFreeze Live QA — run-20261019");

    const rulesVal = await page.inputValue("textarea.rf-code-editor");
    assert.ok(rulesVal.includes("One entry per person"));
    assert.ok(rulesVal.includes("70%"));
    assert.ok(rulesVal.includes("30%"));

    // Verify 3 scenario titles present
    const content = await page.content();
    assert.ok(content.includes("Public repository, no hosted frontend"));
    assert.ok(content.includes("Public repository and hosted frontend"));
    assert.ok(content.includes("One person with two wallets"));
  } finally {
    await browser.close();
  }
});
