import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:48820";

test("Load synthetic QA example button on /events/new loads Section 8 baseline", async (t) => {
  // If local dev/staging server is not running on BASE_URL, skip browser UI automation
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) {
      t.skip("Local test server on 48820 is not responsive, skipping Playwright browser test");
      return;
    }
  } catch {
    t.skip("Local test server on 48820 is not running, skipping Playwright browser test");
    return;
  }

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
    assert.ok(content.includes("One person submitting two entries via different wallets"));
    assert.ok(content.includes("wallet A and a second entry through wallet B"));
    assert.ok(content.includes("Is this person's second entry allowed?"));
    assert.ok(
      rulesVal.includes(
        "Final submissions must be submitted no later than 2026-11-15 at 23:59:59 UTC."
      )
    );

    // Verify deadline input field matches metadata
    const deadlineVal = await page.inputValue('input[placeholder*="2026-11-15T23:59:59Z"]');
    assert.equal(deadlineVal, "2026-11-15T23:59:59Z");

    // Verify form was not automatically submitted (still on /events/new)
    assert.ok(page.url().endsWith("/events/new"));
  } finally {
    await browser.close();
  }
});
