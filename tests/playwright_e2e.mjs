import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:48820";
const SCREENSHOT_DIR = path.resolve("screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log("Starting Real Chromium E2E Verification against", BASE_URL);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const consoleErrors = [];
  const networkFailures = [];

  // Helper to create page with logging
  async function createTrackedPage(viewport = { width: 1440, height: 900 }) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push({ url: page.url(), text: msg.text() });
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push({ url: page.url(), text: err.message });
    });

    page.on("requestfailed", (req) => {
      networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
    });

    return page;
  }

  try {
    // 1. Landing Page (Desktop 1440x900)
    console.log("Testing 1: Landing Page (Desktop)");
    const page = await createTrackedPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForSelector(".rf-brand");
    const heading = await page.textContent("h1");
    assert.ok(heading.includes("Understand when a rule clarification"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_desktop_home.png") });

    // 2. Events Registry Page
    console.log("Testing 2: Events Registry Page");
    await page.goto(`${BASE_URL}/events`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    const eventsHeading = await page.textContent("h1");
    assert.ok(eventsHeading.includes("Public Event Registry"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_desktop_events.png") });

    // 3. New Event Registration Form
    console.log("Testing 3: New Event Registration Form & Scenario Builder");
    await page.goto(`${BASE_URL}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    // Fill form
    await page.fill('input[placeholder*="Autonomous Agents"]', "Zero-Knowledge Bounty 2026");
    await page.fill('textarea[placeholder*="Brief description"]', "Proving verifiable computations.");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_desktop_new_event.png") });

    // 4. Event Detail Page (demo-ev-1)
    console.log("Testing 4: Event Detail Page (demo-ev-1)");
    await page.goto(`${BASE_URL}/events/demo-ev-1`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    const evTitle = await page.textContent("h1");
    assert.ok(evTitle.includes("GenLayer Winter Hackathon 2026"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_desktop_event_detail.png") });

    // 5. Propose Amendment View
    console.log("Testing 5: Propose Amendment View with Diff Preview");
    await page.goto(`${BASE_URL}/events/demo-ev-1/amend`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_desktop_propose_amend.png") });

    // 6. Amendment Review Desk (Core Product: demo-amend-2 with Material Change)
    console.log("Testing 6: Amendment Review Desk (demo-amend-2 with MATERIAL_CHANGE)");
    await page.goto(`${BASE_URL}/events/demo-ev-1/amendments/demo-amend-2`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    const reviewTitle = await page.textContent("h1");
    assert.ok(reviewTitle.includes("Amendment Review Desk"));
    // Verify Material Change badge is present
    const content = await page.content();
    assert.ok(content.includes("MATERIAL_CHANGE"));
    assert.ok(content.includes("Outcome Changed"));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_desktop_amendment_review.png") });

    // 7. Methodology & Limitations Page
    console.log("Testing 7: Methodology & Limitations Page");
    await page.goto(`${BASE_URL}/methodology`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_desktop_methodology.png") });

    // 8. Diagnostics Page
    console.log("Testing 8: Diagnostics & Setup Page");
    await page.goto(`${BASE_URL}/diagnostics`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1");
    // wait for live policy or config to render
    await page.waitForSelector(".rf-card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_desktop_diagnostics.png"), timeout: 15000 });

    // 9. Mobile Viewport (360x800)
    console.log("Testing 9: Mobile Viewport (360px width)");
    const mobilePage = await createTrackedPage({ width: 360, height: 800 });
    await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "09_mobile_home.png") });

    await mobilePage.goto(`${BASE_URL}/events/demo-ev-1/amendments/demo-amend-2`, { waitUntil: "networkidle" });
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "10_mobile_review_desk.png") });

    console.log("Playwright E2E Verification Complete!");
    console.log("Console Errors:", consoleErrors.length);
    console.log("Network Failures:", networkFailures.length);

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "qa_browser_audit.json"),
      JSON.stringify({ consoleErrors, networkFailures, timestamp: new Date().toISOString() }, null, 2)
    );

    assert.equal(consoleErrors.length, 0, `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Playwright E2E Failed:", err);
  process.exit(1);
});
