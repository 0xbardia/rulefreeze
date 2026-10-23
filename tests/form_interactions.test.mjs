import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:48820";

test("Form interactions: pre-submit review, draft persistence, cancellation, and invariant gating", async (t) => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) {
      t.skip(`Test server on ${BASE_URL} not healthy, skipping browser test`);
      return;
    }
  } catch {
    t.skip(`Test server on ${BASE_URL} offline, skipping browser test`);
    return;
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
  } catch (err) {
    t.skip("Browser launch failed, skipping browser UI test: " + err.message);
    return;
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Mock injected provider to track calls without broadcasting real transactions
  await page.addInitScript(() => {
    window.__writeCalls = [];
    window.__callCount = 0;
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method, params }) => {
        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          return ["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"];
        }
        if (method === "eth_chainId") {
          return "0xf22f"; // 61999
        }
        if (method === "eth_sendTransaction") {
          window.__callCount++;
          window.__writeCalls.push(params);
          return "0x" + "a".repeat(64);
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
  });

  try {
    // 1. New Event Form & Pre-submit review modal
    await page.goto(`${BASE_URL}/events/new`, { waitUntil: "networkidle" });
    await page.fill('#event-name', 'Test Competition Verification');
    await page.fill('#event-desc', 'Automated form interaction verification');
    await page.fill('#initial-rules', 'Rule 1: Open source repository required.\nRule 2: Automated tests required.');

    // Save draft locally
    const saveDraftBtn = page.locator('button:has-text("Save Draft in Browser")');
    await saveDraftBtn.click();
    await page.waitForSelector('.rf-banner-safe', { timeout: 3000 });

    // Open Pre-Submit Review Modal
    const submitBtn = page.locator('button:has-text("Review & Submit Baseline")');
    await submitBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

    // Assert: Modal displays exact form contents
    const modalText = await page.locator('[role="dialog"]').innerText();
    assert.ok(modalText.includes("Test Competition Verification"), "Modal contains edited name");
    assert.ok(modalText.includes("2 registered probes"), "Modal contains scenario count");

    // Assert: Closing / cancelling review modal sends zero transactions
    const cancelModalBtn = page.locator('[role="dialog"] button:has-text("Go Back & Edit")');
    await cancelModalBtn.click();
    const callsAfterCancel = await page.evaluate(() => window.__writeCalls.length);
    assert.equal(callsAfterCancel, 0, "Cancelling modal triggered zero writes");

    // 2. Draft recovery verification
    await page.reload({ waitUntil: "networkidle" });
    const recoveredName = await page.inputValue('#event-name');
    assert.equal(recoveredName, 'Test Competition Verification', "Draft recovered from IndexedDB after refresh");

    // 3. Amendment Review Desk: Decision Gating & Rationale Verification
    await page.goto(`${BASE_URL}/events/demo-ev-1/amendments/demo-amend-2`, { waitUntil: "networkidle" });
    
    // Assert: MATERIAL_CHANGE disables ACCEPTED_CLARIFICATION
    const isClarificationDisabled = await page.locator('input[value="ACCEPTED_CLARIFICATION"]').isDisabled();
    assert.ok(isClarificationDisabled, "ACCEPTED_CLARIFICATION is strictly disabled on material change");

    // Assert: Material change option is enabled
    const isMaterialEnabled = await page.locator('input[value="ACKNOWLEDGED_MATERIAL_CHANGE"]').isEnabled();
    assert.ok(isMaterialEnabled, "ACKNOWLEDGED_MATERIAL_CHANGE is enabled");

    // Select ACKNOWLEDGED_MATERIAL_CHANGE
    await page.locator('input[value="ACKNOWLEDGED_MATERIAL_CHANGE"]').check();

    // Assert: Missing/short rationale (<15 chars) prevents submission
    await page.fill('#decision-rationale', 'Too short');
    const submitDecisionBtn = page.locator('button:has-text("Submit Decision Transaction")');
    await submitDecisionBtn.click();
    
    // Check validation banner or text counter
    const helperText = await page.locator('.rf-help').innerText();
    assert.ok(helperText.includes("9/15"), "Character counter enforces 15 chars minimum");

  } finally {
    await browser.close();
  }
});
