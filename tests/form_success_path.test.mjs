// tests/form_success_path.test.mjs
// Browser integration with intercepted writes — no blockchain submission.
// Intercepts eth_sendTransaction at the injected provider boundary
// (window.ethereum.request — the existing contract-client/provider boundary
// used by executeContractWrite), decodes ABI-encoded calldata with viem and
// genlayer-js, and asserts exact match against reviewed form inputs across
// registration, amendment proposal, and organizer decision flows.
// Mocks read RPC and transaction polling via page.route.
// Never forwards intercepted writes to the real RPC.

import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { decodeFunctionData, toHex } from "viem";
import * as gl from "genlayer-js";

const BASE = process.env.BASE_URL || "http://127.0.0.1:48820";
const RPC = "https://studio.genlayer.com/api";
const ACCOUNT = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

const ADD_TRANSACTION_ABI_V5 = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_sender", type: "address" },
      { name: "_recipient", type: "address" },
      { name: "_numOfInitialValidators", type: "uint256" },
      { name: "_maxRotations", type: "uint256" },
      { name: "_txData", type: "bytes" },
    ],
    outputs: [],
  },
];

function buildProviderScript(rejecting = false, demo = false) {
  const account = JSON.stringify(ACCOUNT);
  return `(() => {
    const ethereum = {
      isMetaMask: true,
      _account: ${account},
      async request({ method, params }) {
        if (method === "eth_accounts" || method === "eth_requestAccounts") {
          return [ethereum._account];
        }
        if (method === "eth_chainId") return "0xf22f";
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "wallet_addEthereumChain") return null;
        if (method === "eth_sendTransaction") {
          const tx = Array.isArray(params) ? params[0] : params;
          window.__rf_interceptedWrites = window.__rf_interceptedWrites || [];
          window.__rf_interceptedWrites.push({ method, params: tx, ts: Date.now() });
          ${
            rejecting
              ? `const err = new Error("User rejected the request."); err.code = 4001; throw err;`
              : `return "0x" + "01".repeat(32);`
          }
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
    window.ethereum = ethereum;
    try {
      ${
        demo
          ? `localStorage.setItem("rf_demo_mode", "true");`
          : `localStorage.removeItem("rf_demo_mode");`
      }
    } catch {}
  })();`;
}

function decodeWrite(interceptedWrites, expectedMethod) {
  assert.equal(
    interceptedWrites.length,
    1,
    `expected exactly 1 intercepted write, got ${interceptedWrites.length}`
  );
  const tx = interceptedWrites[0].params;
  const data = tx && tx.data ? tx.data : null;
  assert.ok(data, "intercepted eth_sendTransaction has ABI-encoded data field");

  const outer = decodeFunctionData({ abi: ADD_TRANSACTION_ABI_V5, data });
  const txData = outer.args["4"];
  const recipient = outer.args["1"];
  assert.ok(txData, "intercepted write contains _txData payload");

  const inner = gl.decodeInputData(txData, recipient);
  assert.equal(inner.type, "call", "intercepted write is a contract call, not a deploy");
  assert.ok(inner.callData instanceof Map, "intercepted callData is a genlayer-js calldata Map");
  const method = inner.callData.get("method");
  if (expectedMethod) {
    assert.equal(method, expectedMethod, `intercepted function is ${expectedMethod}`);
  }
  const innerArgs = inner.callData.get("args");
  assert.ok(Array.isArray(innerArgs), "intercepted args is an array");
  return { method, args: innerArgs };
}

async function setupRpcMock(page, { pollMode = "success", mockAmendAssessed = false } = {}) {
  // Public config for deterministic live address
  await page.route(`${BASE}/api/public-config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
        chainId: 61999,
      }),
    });
  });

  const assessedAmendRecord = {
    id: "amend-2",
    event_id: "ev-1",
    base_version_id: "ver-3",
    base_hash: "4a8e58427eb7609501e58868f7b526421d236c0d2e20c16ab6ed2ee94b2e839c",
    proposed_rules:
      "1. Eligibility: One entry per person.\n" +
      "2. Deliverables: A public source repository and live hosted frontend are required.\n" +
      "3. Deadlines: 2026-11-15 23:59:59 UTC.\n" +
      "4. Scoring: Functionality 70%.",
    proposed_hash: "91b24b700565135030557caf6c1e5363091ca11f5c19d2ed4859fb13990331d5",
    explanation: "Decision verification test amendment.",
    intended_scope: "CURRENT_PARTICIPANTS",
    created_at: 1792462341,
    proposer: "0x40d7eca78017697c1916819f48850a7f739b6beb",
    status: "ASSESSED",
    assessment_ids: ["assess-2"],
    decision: null,
  };
  const encAmendHex = toHex(
    new Uint8Array(gl.abi.calldata.encode(JSON.stringify(assessedAmendRecord)))
  ).slice(2);

  const mockEventsData = {
    total: 2,
    offset: 0,
    limit: 50,
    events: [
      {
        id: "ev-100",
        name: "Autonomous Agents Bounty 2026",
        description: "Live write boundary argument verification.",
        organizer: ACCOUNT,
        active_version_id: "ver-bounty",
        version_count: 1,
        amendment_count: 0,
        created_at: 1792462341,
        declared_deadline: "2026-11-30T23:59:59Z",
      },
      {
        id: "ev-101",
        name: "Double Confirm Prevention",
        description: "",
        organizer: ACCOUNT,
        active_version_id: "ver-double",
        version_count: 1,
        amendment_count: 0,
        created_at: 1792462341,
        declared_deadline: "",
      },
    ],
  };
  const encEventsHex = toHex(
    new Uint8Array(gl.abi.calldata.encode(JSON.stringify(mockEventsData)))
  ).slice(2);

  const mockVerBounty = {
    id: "ver-bounty",
    event_id: "ev-100",
    version_number: 1,
    rule_text:
      "Rule 1: Open source repository required.\n" +
      "Rule 2: Automated test suite required.\n" +
      "Rule 3: Final submission by deadline.",
    content_hash: "0xabc",
    scenarios: [],
    created_at: 1792462341,
    creator: ACCOUNT,
    parent_version_id: null,
    notice: "",
  };
  const encVerBountyHex = toHex(
    new Uint8Array(gl.abi.calldata.encode(JSON.stringify(mockVerBounty)))
  ).slice(2);

  const mockVerDouble = {
    id: "ver-double",
    event_id: "ev-101",
    version_number: 1,
    rule_text: "Rule A",
    content_hash: "0xdef",
    scenarios: [],
    created_at: 1792462341,
    creator: ACCOUNT,
    parent_version_id: null,
    notice: "",
  };
  const encVerDoubleHex = toHex(
    new Uint8Array(gl.abi.calldata.encode(JSON.stringify(mockVerDouble)))
  ).slice(2);

  const mockAmendmentsData = [
    {
      id: "amend-99",
      event_id: "ev-1",
      base_version_id: "ver-3",
      proposed_rules:
        "1. Eligibility: One entry per person.\n" +
        "2. Deliverables: Public repository and live frontend required.\n" +
        "3. Deadlines: Final submissions due Friday at 23:59 UTC.\n" +
        "4. Scoring: Functionality accounts for 70%.",
      explanation: "Require live frontend deployment and tighten scoring formula.",
      intended_scope: "FUTURE_ONLY",
      created_at: 1792462341,
      proposer: ACCOUNT,
      status: "PENDING_ASSESSMENT",
      assessment_ids: [],
      decision: null,
    },
  ];
  const encAmendmentsHex = toHex(
    new Uint8Array(gl.abi.calldata.encode(JSON.stringify(mockAmendmentsData)))
  ).slice(2);

  await page.route(RPC, async (route) => {
    const request = route.request();
    let body = {};
    try {
      body = JSON.parse(request.postData() || "{}");
    } catch {}

    // Never forward write calls to RPC
    if (body && body.method === "eth_sendTransaction") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x" + "01".repeat(32) }),
      });
      return;
    }

    if (body && body.method === "eth_getTransactionByHash") {
      let result;
      if (pollMode === "success") {
        result = {
          hash: "0x" + "01".repeat(32),
          status: "FINALIZED",
          result: 6,
          result_name: "MAJORITY_AGREE",
          last_round: { result: 6 },
          consensus_data: {
            leader_receipt: [
              { mode: "LEADER", execution_result: "SUCCESS", result: { status: "return" } },
            ],
          },
        };
      } else if (pollMode === "execution_failure") {
        result = {
          hash: "0x" + "01".repeat(32),
          statusName: "FINALIZED",
          status: "FINALIZED",
          result: 7,
          result_name: "MAJORITY_DISAGREE",
          last_round: { result: 7 },
          consensus_data: {
            leader_receipt: [
              {
                mode: "LEADER",
                execution_result: "ERROR",
                result: { status: "contract_error" },
              },
            ],
          },
        };
      } else if (pollMode === "unknown") {
        result = {
          hash: "0x" + "01".repeat(32),
          statusName: "FINALIZED",
          status: "FINALIZED",
          result: { status: "return" },
        };
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result }),
      });
      return;
    }

    // gen_call reads
    if (body && body.method === "gen_call") {
      const dataHex = body.params?.[0]?.data || "";
      // If mockAmendAssessed is enabled and get_amendment is invoked
      if (mockAmendAssessed && dataHex.includes("6765745f616d656e646d656e74")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: encAmendHex }),
        });
        return;
      }
      if (pollMode === "success" && dataHex.includes("6765745f6576656e7473")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: encEventsHex }),
        });
        return;
      }
      if (pollMode === "success" && dataHex.includes("6765745f72756c655f76657273696f6e")) {
        const hexStr = dataHex.toLowerCase();
        const verDoubleHex = Buffer.from("ver-double").toString("hex");
        const verBountyHex = Buffer.from("ver-bounty").toString("hex");
        if (hexStr.includes(verDoubleHex)) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: encVerDoubleHex }),
          });
          return;
        }
        if (hexStr.includes(verBountyHex)) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: encVerBountyHex }),
          });
          return;
        }
      }
      if (pollMode === "success" && dataHex.includes("6765745f6576656e745f616d656e646d656e7473")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: encAmendmentsHex }),
        });
        return;
      }
    }

    // Forward reads to real RPC
    try {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(json),
      });
    } catch (e) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, error: { message: String(e) } }),
      });
    }
  });
}

async function checkServerAndLaunch(t) {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) {
      t.skip(`Test server on ${BASE} not healthy, skipping browser test`);
      return null;
    }
  } catch {
    t.skip(`Test server on ${BASE} offline, skipping browser test`);
    return null;
  }
  try {
    return await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
  } catch (err) {
    t.skip("Browser launch failed, skipping browser UI test: " + err.message);
    return null;
  }
}

// --------------------------------------------------------------------------------------
// Test 1: Event Registration Form -> Review Modal -> Intercepted Write -> Argument Verification
// --------------------------------------------------------------------------------------

test("Success path: event registration -> review modal -> one intercepted write -> exact arg match -> cleanup", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript(false));
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });

  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(`[console error] ${m.text()}`);
  });

  await setupRpcMock(page, { pollMode: "success" });

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("input#event-name", { timeout: 10000 });

    const name = "Autonomous Agents Bounty 2026";
    const desc = "Live write boundary argument verification.";
    const eventUrl = "https://rulefreeze.bydx.fun/events/bounty-2026";
    const deadline = "2026-11-30T23:59:59Z";
    const rules =
      "Rule 1: Open source repository required.\n" +
      "Rule 2: Automated test suite required.\n" +
      "Rule 3: Final submission by deadline.";

    await page.fill("#event-name", name);
    await page.fill("#event-desc", desc);
    await page.fill("#event-url", eventUrl);
    await page.fill("#event-deadline", deadline);
    await page.fill("#initial-rules", rules);

    await page.fill("#sc-sit-0", "Solo developer submits Rust CLI repo at 20:00 UTC Friday.");
    await page.fill("#sc-q-0", "Is this submission eligible and timely under baseline rules?");
    await page.selectOption("#sc-dim-0", "ELIGIBILITY");

    await page.fill("#sc-sit-1", "Team of 5 submits no public repo.");
    await page.fill("#sc-q-1", "Does oversized team with no repo satisfy deliverables?");
    await page.selectOption("#sc-dim-1", "DELIVERABLES");

    // Save draft in IndexedDB
    await page.click('button:has-text("Save Draft in Browser")');
    await page.waitForSelector(".rf-banner-safe", { timeout: 3000 });

    // Review Modal cancel branch: emits zero writes and preserves draft/input
    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('[role="dialog"] button:has-text("Go Back & Edit")');
    let writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 0, "Cancel review: zero writes emitted");
    assert.equal(await page.inputValue("#event-name"), name, "Cancel: input preserved");

    // Re-open review modal and confirm
    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[role="dialog"]');
        return el && el.textContent.includes("GenLayer Studionet (Chain 61999)");
      },
      { timeout: 10000 }
    );

    const modalText = await page.locator('[role="dialog"]').innerText();
    assert.ok(modalText.includes(name), "Modal contains event name");
    assert.ok(modalText.includes("2 registered probes"), "Modal contains scenario count");

    await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');

    // Wait for redirect to registry
    await page.waitForURL(/\u002Fevents$/, { timeout: 15000 });

    writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 1, "Exactly one write reached intercepted boundary");

    const decoded = decodeWrite(writes, "register_event");
    const [argName, argDesc, argUrl, argStart, argDeadline, argRules, argScenariosJson] =
      decoded.args;

    assert.equal(argName, name, "arg: event name matches reviewed input");
    assert.equal(argDesc, desc, "arg: description matches reviewed input");
    assert.equal(argUrl, eventUrl, "arg: event URL matches reviewed input");
    assert.equal(argStart, "", "arg: declared start is empty string");
    assert.equal(argDeadline, deadline, "arg: declared deadline matches serialization");
    assert.equal(argRules, rules, "arg: full rule text matches reviewed input");

    const scenarios = JSON.parse(argScenariosJson);
    assert.equal(scenarios.length, 2, "arg: 2 scenario probes serialized");
    assert.equal(scenarios[0].id, "SC-1", "arg: scenario 0 ID preserved");
    assert.equal(
      scenarios[0].situation,
      "Solo developer submits Rust CLI repo at 20:00 UTC Friday.",
      "arg: scenario 0 situation"
    );
    assert.equal(
      scenarios[0].question,
      "Is this submission eligible and timely under baseline rules?",
      "arg: scenario 0 question"
    );
    assert.equal(scenarios[0].dimension, "ELIGIBILITY", "arg: scenario 0 dimension");

    assert.equal(scenarios[1].id, "SC-2", "arg: scenario 1 ID preserved");
    assert.equal(
      scenarios[1].situation,
      "Team of 5 submits no public repo.",
      "arg: scenario 1 situation"
    );
    assert.equal(
      scenarios[1].question,
      "Does oversized team with no repo satisfy deliverables?",
      "arg: scenario 1 question"
    );
    assert.equal(scenarios[1].dimension, "DELIVERABLES", "arg: scenario 1 dimension");

    // Lifecycle cleanup: active draft deleted from IndexedDB
    const draftState = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("RuleFreezeDB", 3);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return new Promise((res) => {
        const tx = db.transaction("event_drafts", "readonly");
        const store = tx.objectStore("event_drafts");
        const req2 = store.get("active_draft");
        req2.onsuccess = () => res(req2.result ? "present" : "deleted");
        req2.onerror = () => res("error");
      });
    });
    assert.equal(draftState, "deleted", "Draft deleted after successful registration");

    // Transaction record saved in IndexedDB
    const txRecord = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("RuleFreezeDB", 3);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return new Promise((res) => {
        const tx = db.transaction("tx_records", "readonly");
        const store = tx.objectStore("tx_records");
        const req2 = store.get("0x" + "01".repeat(32));
        req2.onsuccess = () => res(req2.result);
        req2.onerror = () => res(null);
      });
    });
    assert.ok(txRecord, "Tx record stored in IndexedDB");
    assert.equal(txRecord.status, "FINALIZED", "Tx record marked FINALIZED in IndexedDB");
    assert.equal(pageErrors.length, 0, `No console errors: ${JSON.stringify(pageErrors)}`);
  } finally {
    await browser.close();
  }
});

// --------------------------------------------------------------------------------------
// Test 2: Amendment Proposal Form -> Intercepted Write -> Argument Verification
// --------------------------------------------------------------------------------------

test("Success path: amendment proposal -> one intercepted write -> exact arg match -> cleanup", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript(false));
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });
  await setupRpcMock(page, { pollMode: "success" });

  try {
    await page.goto(`${BASE}/events/ev-1/amend`, { waitUntil: "networkidle" });
    await page.waitForSelector("#amend-proposed-rules", { timeout: 15000 });

    const proposedRules =
      "1. Eligibility: One entry per person.\n" +
      "2. Deliverables: Public repository and live frontend required.\n" +
      "3. Deadlines: Final submissions due Friday at 23:59 UTC.\n" +
      "4. Scoring: Functionality accounts for 70%.";
    const explanation = "Require live frontend deployment and tighten scoring formula.";

    await page.fill("#amend-proposed-rules", proposedRules);
    await page.fill("#amend-explanation", explanation);
    await page.check('input[value="FUTURE_ONLY"]');

    // Save draft locally
    await page.click('button:has-text("Save Draft in Browser")');
    await page.waitForSelector(".rf-banner-safe", { timeout: 3000 });

    await page.click('button:has-text("Submit Amendment Proposal")');
    await page.waitForURL(/\/events\/ev-1$/, { timeout: 15000 });

    const writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 1, "Exactly one intercepted write for amendment proposal");

    const decoded = decodeWrite(writes, "propose_amendment");
    const [argEventId, argBaseVerId, argProposedRules, argExplanation, argScope] = decoded.args;

    assert.equal(argEventId, "ev-1", "amendment arg: event ID");
    assert.match(String(argBaseVerId), /^ver-\d+$/, "amendment arg: base version ID format");
    assert.equal(argProposedRules, proposedRules, "amendment arg: proposed full rule text");
    assert.equal(argExplanation, explanation, "amendment arg: explanation");
    assert.equal(argScope, "FUTURE_ONLY", "amendment arg: declared applicability scope");

    // Amendment draft deleted
    const amendDraftState = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("RuleFreezeDB", 3);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return new Promise((res) => {
        const tx = db.transaction("amendment_drafts", "readonly");
        const store = tx.objectStore("amendment_drafts");
        const req2 = store.get("amend_draft_ev-1");
        req2.onsuccess = () => res(req2.result ? "present" : "deleted");
        req2.onerror = () => res("error");
      });
    });
    assert.equal(amendDraftState, "deleted", "Amendment draft deleted after proposal submission");
  } finally {
    await browser.close();
  }
});

// --------------------------------------------------------------------------------------
// Test 3: Organizer Decision Form -> Validation Gate -> Intercepted Write -> Argument Match
// --------------------------------------------------------------------------------------

test("Success path: organizer decision -> validation gate -> one intercepted write -> exact arg match", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript(false));
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });
  await setupRpcMock(page, { pollMode: "success", mockAmendAssessed: true });

  try {
    await page.goto(`${BASE}/events/ev-1/amendments/amend-2`, { waitUntil: "networkidle" });
    await page.waitForSelector('button:has-text("Submit Decision Transaction")', { timeout: 15000 });

    // Validation gate: rationale < 15 characters produces 0 writes
    await page.check('input[value="ACKNOWLEDGED_MATERIAL_CHANGE"]');
    await page.fill("#decision-rationale", "Too short");
    await page.click('button:has-text("Submit Decision Transaction")');

    let writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 0, "Validation gate: short rationale emits zero writes");

    // Valid rationale >= 15 characters
    const validRationale =
      "Acknowledged: mandatory hosted frontend is required for deliverables.";
    await page.fill("#decision-rationale", validRationale);
    await page.click('button:has-text("Submit Decision Transaction")');
    await page.waitForTimeout(3000);

    writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 1, "Exactly one intercepted write for decision transaction");

    const decoded = decodeWrite(writes, "decide_amendment");
    const [argAmendId, argDecisionType, argRationale] = decoded.args;

    assert.equal(argAmendId, "amend-2", "decision arg: amendment ID");
    assert.equal(
      argDecisionType,
      "ACKNOWLEDGED_MATERIAL_CHANGE",
      "decision arg: action type"
    );
    assert.equal(argRationale, validRationale, "decision arg: public rationale");
  } finally {
    await browser.close();
  }
});

// --------------------------------------------------------------------------------------
// Test 4: Lifecycle Branches: Rejection, Failure, Pending/Unknown, Double-Confirm, Demo Mode
// --------------------------------------------------------------------------------------

test("Lifecycle: wallet rejection preserves recoverable input and reports error", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript(true)); // Rejecting provider
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });
  await setupRpcMock(page, { pollMode: "success" });

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("input#event-name", { timeout: 10000 });

    const name = "Rejection Recovery Event";
    await page.fill("#event-name", name);
    await page.fill("#initial-rules", "Rule A");

    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[role="dialog"]');
        return el && el.textContent.includes("GenLayer Studionet (Chain 61999)");
      },
      { timeout: 10000 }
    );

    await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');
    await page.waitForTimeout(1000);

    // Assert: stays on form route, input preserved, error banner displayed
    assert.ok(page.url().includes("/events/new"), "Stays on /events/new after rejection");
    assert.equal(await page.inputValue("#event-name"), name, "Input preserved after rejection");
    const errText = await page.locator(".rf-banner-warning").first().innerText();
    assert.ok(/rejected/i.test(errText), "Error banner indicates rejection");
  } finally {
    await browser.close();
  }
});

for (const [pollMode, label] of [
  ["execution_failure", "Execution failure"],
  ["unknown", "Unknown outcome"],
]) {
  test(`Lifecycle: ${label} preserves draft in IndexedDB and does not report false success`, async (t) => {
    const browser = await checkServerAndLaunch(t);
    if (!browser) return;

    const ctx = await browser.newContext();
    await ctx.addInitScript(buildProviderScript(false));
    const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });
    await setupRpcMock(page, { pollMode });

    try {
      await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
      await page.waitForSelector("input#event-name", { timeout: 10000 });

      const name = `${label} Test Event`;
      await page.fill("#event-name", name);
      await page.fill("#initial-rules", "Rule A");

      // Save draft first
      await page.click('button:has-text("Save Draft in Browser")');
      await page.waitForSelector(".rf-banner-safe", { timeout: 3000 });

      await page.click('button:has-text("Review & Submit Baseline")');
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[role="dialog"]');
          return el && el.textContent.includes("GenLayer Studionet (Chain 61999)");
        },
        { timeout: 10000 }
      );

      await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');
      await page.waitForTimeout(4000);

      // Must stay on form, not navigate to /events
      assert.ok(page.url().includes("/events/new"), `${label}: did not route away`);
      assert.equal(await page.inputValue("#event-name"), name, `${label}: input preserved in form`);

      const banners = await page.locator(".rf-banner, .rf-banner-warning").allInnerTexts();
      const errText = banners.join(" ");
      assert.ok(errText.includes("Draft preserved for recovery"), `${label}: error banner displayed: ${errText}`);

      // Draft must still be present in IndexedDB
      const draftState = await page.evaluate(async () => {
        const db = await new Promise((res, rej) => {
          const req = indexedDB.open("RuleFreezeDB", 3);
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        return new Promise((res) => {
          const tx = db.transaction("event_drafts", "readonly");
          const store = tx.objectStore("event_drafts");
          const req2 = store.get("active_draft");
          req2.onsuccess = () => res(req2.result ? "present" : "deleted");
          req2.onerror = () => res("error");
        });
      });
      assert.equal(draftState, "present", `${label}: draft preserved in IndexedDB`);
    } finally {
      await browser.close();
    }
  });
}

test("Lifecycle: double confirmation emits exactly one write and prevents duplicate submission", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript(false));
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });
  await setupRpcMock(page, { pollMode: "success" });

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("input#event-name", { timeout: 10000 });

    await page.fill("#event-name", "Double Confirm Prevention");
    await page.fill("#initial-rules", "Rule A");

    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[role="dialog"]');
        return el && el.textContent.includes("GenLayer Studionet (Chain 61999)");
      },
      { timeout: 10000 }
    );

    const confirmBtn = page.locator(
      '[role="dialog"] button:has-text("Confirm & Write to GenLayer")'
    );
    await confirmBtn.click();
    await confirmBtn.click().catch(() => {});

    await page.waitForURL(/\u002Fevents$/, { timeout: 15000 });

    const writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 1, "Double confirmation produced exactly one write");
  } finally {
    await browser.close();
  }
});

test("Lifecycle: demo mode produces zero eth_sendTransaction writes", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript(false, true)); // Demo mode enabled
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });
  await setupRpcMock(page, { pollMode: "success" });

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("input#event-name", { timeout: 10000 });

    await page.fill("#event-name", "Demo Mode Submission");
    await page.fill("#initial-rules", "Rule Demo");

    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');

    await page.waitForURL(/\/events\/demo-ev-/, { timeout: 15000 });

    const writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
    assert.equal(writes.length, 0, "Demo mode: exactly zero eth_sendTransaction calls");
  } finally {
    await browser.close();
  }
});
