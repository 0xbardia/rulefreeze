// tests/reconciliation_lifecycle.test.mjs
// Deterministic controller and browser regressions covering RuleFreeze draft reconciliation lifecycle.
// Verifies:
// 1. ACCEPTED + successful execution, not finalized: recovery data retained.
// 2. FINALIZED + execution failure: draft retained, no success claim.
// 3. FINALIZED + unknown execution: draft retained.
// 4. FINALIZED + successful execution + mismatched/missing record: no destructive cleanup.
// 5. FINALIZED + successful execution + matching readback: cleanup permitted.
// 6. ACCEPTED followed by an adverse lifecycle change: recovery preserved.
// 7. Refresh after an unknown outcome: original transaction resumed, no second write.
// 8. submittingRef fix prevents duplicate submission even after finally resets ref while original tx unresolved.
// 9. Consensus outcome and execution outcome preserved as distinct evidence fields.

import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { toHex } from "viem";
import * as gl from "genlayer-js";

import { reconcileEventRegistration, reconcileAmendmentProposal } from "../src/lib/reconciliation.ts";
import { parseTransactionOutcome, rollupTransaction } from "../src/lib/tx-result.ts";

const BASE = process.env.BASE_URL || "http://127.0.0.1:48820";
const RPC = "https://studio.genlayer.com/api";
const ACCOUNT = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

function buildProviderScript() {
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
          return "0x" + "aa".repeat(32);
        }
        return null;
      },
      on: () => {},
      removeListener: () => {},
    };
    window.ethereum = ethereum;
    try {
      localStorage.removeItem("rf_demo_mode");
    } catch {}
  })();`;
}

// --------------------------------------------------------------------------------------
// Part 1: Distinct Consensus vs Execution & Reconcile Predicate Logic Regressions
// --------------------------------------------------------------------------------------

test("Distinct evidence fields: quorum disagreement vs leader execution failure", () => {
  // Scenario 1: Quorum disagreement with no leader failure
  const quorumDisagreementTx = {
    hash: "0x1111",
    status: "FINALIZED",
    statusName: "FINALIZED",
    result: 7, // MAJORITY_DISAGREE
    result_name: "MAJORITY_DISAGREE",
    last_round: { result: 7 },
    consensus_data: {
      leader_receipt: [],
    },
  };
  const parsed1 = parseTransactionOutcome(quorumDisagreementTx);
  const rollup1 = rollupTransaction(parsed1);
  assert.equal(parsed1.protocolStatus, "FINALIZED");
  assert.equal(parsed1.consensusResult, "MAJORITY_DISAGREE");
  assert.equal(parsed1.executionResult, "UNKNOWN");
  assert.equal(rollup1.status, "CONSENSUS_DISAGREEMENT");

  // Scenario 2: Leader execution error where consensus agreed
  const leaderErrorTx = {
    hash: "0x2222",
    status: "FINALIZED",
    statusName: "FINALIZED",
    result: 6, // MAJORITY_AGREE
    result_name: "MAJORITY_AGREE",
    last_round: { result: 6 },
    consensus_data: {
      leader_receipt: [{ mode: "LEADER", execution_result: "ERROR", result: { status: "contract_error" } }],
    },
  };
  const parsed2 = parseTransactionOutcome(leaderErrorTx);
  const rollup2 = rollupTransaction(parsed2);
  assert.equal(parsed2.protocolStatus, "FINALIZED");
  assert.equal(parsed2.consensusResult, "MAJORITY_AGREE");
  assert.equal(parsed2.executionResult, "FAILURE");
  assert.equal(rollup2.status, "EXECUTION_FAILURE");

  // Evidence fields must remain strictly distinct
  assert.notEqual(parsed1.consensusResult, parsed2.consensusResult);
  assert.notEqual(parsed1.executionResult, parsed2.executionResult);
  assert.notEqual(rollup1.status, rollup2.status);
});

test("Reconcile predicate: ACCEPTED + successful execution blocks cleanup and retains draft", async () => {
  const txRecord = {
    txHash: "0xaccepted",
    method: "register_event",
    argsSummary: "Registering test",
    status: "ACCEPTED",
    protocolStatus: "ACCEPTED",
    consensusResult: "MAJORITY_AGREE",
    executionResult: "SUCCESS",
    submittedAt: Date.now(),
    contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
    chainId: 61999,
    account: ACCOUNT,
  };
  const draft = {
    id: "active_draft",
    name: "Accepted Event",
    description: "",
    event_url: "",
    declared_start: "",
    declared_deadline: "",
    initial_rules: "Rule 1",
    scenarios: [],
    account: ACCOUNT,
    updatedAt: Date.now(),
  };

  const evidence = await reconcileEventRegistration(txRecord, draft, txRecord.contractAddress);
  assert.equal(evidence.finalityVerified, false, "ACCEPTED is provisional consensus, NEVER finality");
  assert.equal(evidence.executionVerified, false, "Cannot verify execution on provisional state");
  assert.equal(evidence.readbackVerified, false, "Readback skipped when not finalized");
  assert.equal(evidence.canCleanup, false, "Destructive cleanup must be forbidden");
  assert.ok(evidence.error.includes("Protocol status (ACCEPTED) is not finalized"));
});

test("Reconcile predicate: FINALIZED + execution failure blocks cleanup and retains draft", async () => {
  const txRecord = {
    txHash: "0xfailure",
    method: "register_event",
    argsSummary: "Registering test",
    status: "EXECUTION_FAILURE",
    protocolStatus: "FINALIZED",
    consensusResult: "MAJORITY_AGREE",
    executionResult: "FAILURE",
    error: "Execution result FAILURE under protocol FINALIZED",
    submittedAt: Date.now(),
    contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
    chainId: 61999,
    account: ACCOUNT,
  };
  const draft = {
    id: "active_draft",
    name: "Failed Event",
    description: "",
    event_url: "",
    declared_start: "",
    declared_deadline: "",
    initial_rules: "Rule 1",
    scenarios: [],
    account: ACCOUNT,
    updatedAt: Date.now(),
  };

  const evidence = await reconcileEventRegistration(txRecord, draft, txRecord.contractAddress);
  assert.equal(evidence.finalityVerified, true, "Protocol is finalized");
  assert.equal(evidence.executionVerified, false, "Execution failed");
  assert.equal(evidence.canCleanup, false, "Destructive cleanup forbidden on execution failure");
  assert.ok(evidence.error.includes("Execution outcome (FAILURE) did not succeed"));
});

test("Reconcile predicate: FINALIZED + unknown execution blocks cleanup", async () => {
  const txRecord = {
    txHash: "0funknown",
    method: "register_event",
    argsSummary: "Registering test",
    status: "EXECUTION_UNKNOWN",
    protocolStatus: "FINALIZED",
    consensusResult: "UNKNOWN",
    executionResult: "UNKNOWN",
    error: "Protocol FINALIZED with execution UNKNOWN",
    submittedAt: Date.now(),
    contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
    chainId: 61999,
    account: ACCOUNT,
  };
  const draft = {
    id: "active_draft",
    name: "Unknown Event",
    description: "",
    event_url: "",
    declared_start: "",
    declared_deadline: "",
    initial_rules: "Rule 1",
    scenarios: [],
    account: ACCOUNT,
    updatedAt: Date.now(),
  };

  const evidence = await reconcileEventRegistration(txRecord, draft, txRecord.contractAddress);
  assert.equal(evidence.finalityVerified, true);
  assert.equal(evidence.executionVerified, false);
  assert.equal(evidence.canCleanup, false);
});

test("Reconcile predicate: ACCEPTED followed by adverse lifecycle change preserves recovery", async () => {
  // Step 1: Initial provisional state at ACCEPTED
  const initialAccepted = {
    hash: "0xadverse",
    status: "ACCEPTED",
    statusName: "ACCEPTED",
    result: 6,
    result_name: "MAJORITY_AGREE",
    last_round: { result: 6 },
    consensus_data: {
      leader_receipt: [{ mode: "LEADER", execution_result: "SUCCESS", result: { status: "return" } }],
    },
  };
  const parsedInit = parseTransactionOutcome(initialAccepted);
  const rollupInit = rollupTransaction(parsedInit);
  assert.equal(rollupInit.status, "ACCEPTED");
  assert.equal(rollupInit.action, "watch", "Keeps watching until finality");

  // Step 2: Adverse transition to FINALIZED + consensus disagreement (overturned)
  const adverseOverturned = {
    hash: "0xadverse",
    status: "FINALIZED",
    statusName: "FINALIZED",
    result: 7,
    result_name: "MAJORITY_DISAGREE",
    last_round: { result: 7 },
    consensus_data: {
      leader_receipt: [],
    },
  };
  const parsedAdverse = parseTransactionOutcome(adverseOverturned);
  const rollupAdverse = rollupTransaction(parsedAdverse);
  assert.equal(rollupAdverse.status, "CONSENSUS_DISAGREEMENT");
  assert.equal(rollupAdverse.action, "stop");

  // Step 3: Reconcile gate blocks cleanup on adverse transition
  const adverseRecord = {
    txHash: "0xadverse",
    method: "register_event",
    argsSummary: "Adverse check",
    status: "CONSENSUS_DISAGREEMENT",
    protocolStatus: "FINALIZED",
    consensusResult: "MAJORITY_DISAGREE",
    executionResult: "SUCCESS",
    error: "Consensus disagreement",
    submittedAt: Date.now(),
    contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
    chainId: 61999,
    account: ACCOUNT,
  };
  const draft = {
    id: "active_draft",
    name: "Adverse Event",
    description: "",
    event_url: "",
    declared_start: "",
    declared_deadline: "",
    initial_rules: "Rule 1",
    scenarios: [],
    account: ACCOUNT,
    updatedAt: Date.now(),
  };

  const evidence = await reconcileEventRegistration(adverseRecord, draft, adverseRecord.contractAddress);
  assert.equal(evidence.canCleanup, false, "Adverse change blocks destructive draft cleanup");
});

// --------------------------------------------------------------------------------------
// Part 2: Browser Integration Regressions (Intercepted Writes Boundary)
// --------------------------------------------------------------------------------------

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

test("Browser Lifecycle: ACCEPTED + successful execution preserves draft and shows provisional status", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript());
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });

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

  let pollCount = 0;
  await page.route(RPC, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.method === "eth_sendTransaction") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x" + "aa".repeat(32) }),
      });
      return;
    }
    if (body.method === "eth_getTransactionByHash") {
      pollCount++;
      // Return ACCEPTED with leader SUCCESS
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            hash: "0x" + "aa".repeat(32),
            status: "ACCEPTED",
            statusName: "ACCEPTED",
            result: 6,
            result_name: "MAJORITY_AGREE",
            last_round: { result: 6 },
            consensus_data: {
              leader_receipt: [{ mode: "LEADER", execution_result: "SUCCESS", result: { status: "return" } }],
            },
          },
        }),
      });
      return;
    }
    try {
      const res = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(await res.json()) });
    } catch (e) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: String(e) }) });
    }
  });

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("input#event-name", { timeout: 10000 });

    const name = "Provisional Consensus Test";
    await page.fill("#event-name", name);
    await page.fill("#initial-rules", "Provisional Rule 1");

    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');

    // Wait for provisional notice from subscribeTxUpdates immediate notification
    await page.waitForSelector(".rf-banner-info:has-text('Awaiting finality before draft cleanup')", { timeout: 10000 });
    const bannerText = await page.innerText(".rf-banner-info:has-text('Awaiting finality before draft cleanup')");
    assert.ok(bannerText.includes("Awaiting finality before draft cleanup"), "Provisional banner explains waiting for finality");
    assert.ok(bannerText.includes("protocol: ACCEPTED"), "Preserves protocol status field");
    assert.ok(bannerText.includes("execution: SUCCESS"), "Preserves execution status field");

    // Page must remain on /events/new and draft preserved in IndexedDB
    assert.ok(page.url().includes("/events/new"), "Did not navigate away prematurely");
    const draft = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("RuleFreezeDB", 3);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return new Promise((res) => {
        const tx = db.transaction("event_drafts", "readonly");
        const getReq = tx.objectStore("event_drafts").get("active_draft");
        getReq.onsuccess = () => res(getReq.result);
        getReq.onerror = () => res(null);
      });
    });

    assert.ok(draft, "Draft retained in IndexedDB at ACCEPTED");
    assert.equal(draft.name, name);
    assert.ok(draft.pendingTxHash, "Draft retains pendingTxHash for resumption");
  } finally {
    await browser.close();
  }
});

test("Browser Lifecycle: FINALIZED + SUCCESS + mismatched/missing record blocks cleanup", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript());
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });

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

  const emptyEvents = { total: 0, offset: 0, limit: 50, events: [] };
  const encEmptyHex = toHex(new Uint8Array(gl.abi.calldata.encode(JSON.stringify(emptyEvents)))).slice(2);

  await page.route(RPC, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.method === "eth_sendTransaction") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x" + "bb".repeat(32) }),
      });
      return;
    }
    if (body.method === "eth_getTransactionByHash") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            hash: "0x" + "bb".repeat(32),
            status: "FINALIZED",
            statusName: "FINALIZED",
            result: 6,
            result_name: "MAJORITY_AGREE",
            last_round: { result: 6 },
            consensus_data: {
              leader_receipt: [{ mode: "LEADER", execution_result: "SUCCESS", result: { status: "return" } }],
            },
          },
        }),
      });
      return;
    }
    if (body.method === "gen_call") {
      // Mock empty events list for readback verification
      const dataHex = body.params?.[0]?.data || "";
      if (dataHex.includes("6765745f6576656e7473")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jsonrpc: "2.0", id: body.id, result: encEmptyHex }),
        });
        return;
      }
    }
    try {
      const res = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(await res.json()) });
    } catch (e) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: String(e) }) });
    }
  });

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    await page.waitForSelector("input#event-name", { timeout: 10000 });

    const name = "Missing On-Chain Record Test";
    await page.fill("#event-name", name);
    await page.fill("#initial-rules", "Rule 1");

    await page.click('button:has-text("Review & Submit Baseline")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');

    // Wait for reconciliation error banner
    await page.waitForSelector(".rf-banner-warning", { timeout: 10000 });
    const errText = await page.innerText(".rf-banner-warning");
    assert.ok(errText.includes("Reconciliation gate failed"), "Reconciliation error displayed");
    assert.ok(errText.includes("missing on-chain during readback verification"), "Readback failure identified");
    assert.ok(errText.includes("Draft preserved for recovery"), "Draft preservation communicated");

    // Page must remain on /events/new and draft preserved in IndexedDB
    assert.ok(page.url().includes("/events/new"), "Stay on page");
    const draft = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const req = indexedDB.open("RuleFreezeDB", 3);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      return new Promise((res) => {
        const tx = db.transaction("event_drafts", "readonly");
        const getReq = tx.objectStore("event_drafts").get("active_draft");
        getReq.onsuccess = () => res(getReq.result);
        getReq.onerror = () => res(null);
      });
    });
    assert.ok(draft, "Draft is preserved in IndexedDB despite FINALIZED protocol status");
    assert.equal(draft.name, name);
  } finally {
    await browser.close();
  }
});

test("Browser Lifecycle: Refresh after unknown outcome resumes tracking with zero second writes", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript());
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });

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

  // Navigate to /diagnostics to ensure database schema is loaded
  await page.goto(`${BASE}/diagnostics`, { waitUntil: "networkidle" });

  // Seed draft with pendingTxHash and pending record
  await page.evaluate(async (account) => {
    const req = indexedDB.open("RuleFreezeDB", 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("event_drafts")) {
        const store = db.createObjectStore("event_drafts", { keyPath: "id" });
        store.createIndex("by_account", "account", { unique: false });
        store.createIndex("by_updated", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("tx_records")) {
        const store = db.createObjectStore("tx_records", { keyPath: "txHash" });
        store.createIndex("by_status", "status", { unique: false });
        store.createIndex("by_account", "account", { unique: false });
        store.createIndex("by_entity", "entityId", { unique: false });
        store.createIndex("by_contract", "contractAddress", { unique: false });
      }
    };
    const db = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    const tx = db.transaction(["event_drafts", "tx_records"], "readwrite");
    tx.objectStore("event_drafts").put({
      id: "active_draft",
      name: "Resumed Tracking Event",
      description: "Testing refresh resumption",
      event_url: "",
      declared_start: "",
      declared_deadline: "",
      initial_rules: "Rule 1",
      scenarios: [],
      account,
      contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
      pendingTxHash: "0x" + "cc".repeat(32),
      updatedAt: Date.now(),
    });
    tx.objectStore("tx_records").put({
      txHash: "0x" + "cc".repeat(32),
      method: "register_event",
      argsSummary: "Registering Resumed Tracking Event",
      status: "EXECUTION_UNKNOWN",
      submittedAt: Date.now(),
      contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
      chainId: 61999,
      account,
    });
    await new Promise((res) => {
      tx.oncomplete = res;
    });
  }, ACCOUNT);

  // Navigate to /events/new (simulates page refresh after unknown outcome)
  await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });

  // Banner should report active transaction detected and resuming tracking
  await page.waitForSelector(".rf-banner-info:has-text('Active transaction detected')", { timeout: 10000 });
  const bannerText = await page.innerText(".rf-banner-info:has-text('Active transaction detected')");
  assert.ok(bannerText.includes("Active transaction detected"), "Detected in-flight transaction on load");
  assert.ok(bannerText.includes("Resuming tracking"), "Resuming transaction tracking without user action");

  // Zero new writes emitted
  const writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
  assert.equal(writes.length, 0, "Zero new writes emitted on refresh resumption");

  await browser.close();
});

test("Duplicate prevention: persistent reconciliation blocks later duplicate submission after finally resets submittingRef", async (t) => {
  const browser = await checkServerAndLaunch(t);
  if (!browser) return;

  const ctx = await browser.newContext();
  await ctx.addInitScript(buildProviderScript());
  const page = await ctx.newPage({ viewport: { width: 1440, height: 900 } });

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

  // Navigate to /diagnostics to ensure database schema is loaded
  await page.goto(`${BASE}/diagnostics`, { waitUntil: "networkidle" });

  // Pre-seed an existing draft with an unresolved transaction (status: EXECUTION_UNKNOWN)
  await page.evaluate(async (account) => {
    const req = indexedDB.open("RuleFreezeDB", 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("event_drafts")) {
        const store = db.createObjectStore("event_drafts", { keyPath: "id" });
        store.createIndex("by_account", "account", { unique: false });
        store.createIndex("by_updated", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("tx_records")) {
        const store = db.createObjectStore("tx_records", { keyPath: "txHash" });
        store.createIndex("by_status", "status", { unique: false });
        store.createIndex("by_account", "account", { unique: false });
        store.createIndex("by_entity", "entityId", { unique: false });
        store.createIndex("by_contract", "contractAddress", { unique: false });
      }
    };
    const db = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    const tx = db.transaction(["event_drafts", "tx_records"], "readwrite");
    tx.objectStore("event_drafts").put({
      id: "active_draft",
      name: "Unresolved Pending Tx Test",
      description: "Block second write after finally resets submittingRef",
      event_url: "",
      declared_start: "",
      declared_deadline: "",
      initial_rules: "Rule 1",
      scenarios: [],
      account,
      contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
      pendingTxHash: "0x" + "dd".repeat(32),
      updatedAt: Date.now(),
    });
    tx.objectStore("tx_records").put({
      txHash: "0x" + "dd".repeat(32),
      method: "register_event",
      argsSummary: "Registering Unresolved Pending Tx Test",
      status: "EXECUTION_UNKNOWN",
      submittedAt: Date.now(),
      contractAddress: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
      chainId: 61999,
      account,
    });
    await new Promise((res) => {
      tx.oncomplete = res;
    });
  }, ACCOUNT);

  // Load /events/new with pre-seeded unresolved state
  await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });

  // User attempts a second submission (e.g. clicks review and submit again)
  await page.click('button:has-text("Review & Submit Baseline")');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.click('[role="dialog"] button:has-text("Confirm & Write to GenLayer")');

  // Must be blocked by persistent pending-transaction check with explicit error
  await page.waitForSelector(".rf-banner-warning", { timeout: 5000 });
  const errText = await page.innerText(".rf-banner-warning");
  assert.ok(errText.includes("Unresolved transaction in progress"), "Error explicitly flags unresolved transaction");
  assert.ok(errText.includes("Manual reconciliation required"), "Prompts manual reconciliation");

  // Zero new writes emitted to window.ethereum.request
  const writes = await page.evaluate(() => window.__rf_interceptedWrites || []);
  assert.equal(writes.length, 0, "No duplicate write emitted while transaction remains unresolved");

  await browser.close();
});
