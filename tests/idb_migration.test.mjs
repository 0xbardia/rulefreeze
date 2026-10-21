import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";

const OLD = "0xC8a83C62da126891aB8F60e6D5E171480aE91c23";
const NEXT = "0x1111111111111111111111111111111111111111";

function requestDone(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("transaction aborted"));
  });
}

test("v2 records without a contract address are tagged and do not match a new deployment", async () => {
  globalThis.window = globalThis;
  const idb = await import("../src/lib/idb.ts");

  await requestDone(indexedDB.deleteDatabase("RuleFreezeDB"));

  const openV2 = indexedDB.open("RuleFreezeDB", 2);
  openV2.onupgradeneeded = () => {
    const db = openV2.result;
    const events = db.createObjectStore("event_drafts", { keyPath: "id" });
    events.createIndex("by_account", "account", { unique: false });
    events.createIndex("by_updated", "updatedAt", { unique: false });
    const amendments = db.createObjectStore("amendment_drafts", { keyPath: "id" });
    amendments.createIndex("by_account", "account", { unique: false });
    amendments.createIndex("by_event", "event_id", { unique: false });
    const txs = db.createObjectStore("tx_records", { keyPath: "txHash" });
    txs.createIndex("by_status", "status", { unique: false });
    txs.createIndex("by_account", "account", { unique: false });
    txs.createIndex("by_entity", "entityId", { unique: false });
    db.createObjectStore("preferences", { keyPath: "key" });
  };
  const seeded = await requestDone(openV2);
  const seedTx = seeded.transaction(["event_drafts", "amendment_drafts", "tx_records"], "readwrite");
  seedTx.objectStore("event_drafts").put({
    id: "active_draft",
    account: "0x40d7eca78017697c1916819f48850a7f739b6beb",
    name: "old deployment draft",
    updatedAt: 1,
  });
  seedTx.objectStore("event_drafts").put({
    id: "kept",
    contractAddress: NEXT,
    name: "already scoped",
    updatedAt: 2,
  });
  seedTx.objectStore("amendment_drafts").put({
    id: "amend_draft_ev-1",
    event_id: "ev-1",
    proposed_rules: "old contract proposal",
    updatedAt: 3,
  });
  seedTx.objectStore("tx_records").put({
    txHash: "0xoldpending",
    status: "SUBMITTED",
    entityId: "ev-1",
    account: "0x40d7eca78017697c1916819f48850a7f739b6beb",
  });
  seedTx.objectStore("tx_records").put({
    txHash: "0xnewpending",
    status: "PENDING_NETWORK",
    entityId: "ev-1",
    contractAddress: NEXT,
    account: "0x40d7eca78017697c1916819f48850a7f739b6beb",
  });
  seedTx.objectStore("tx_records").put({
    txHash: "0xfinal",
    status: "FINALIZED",
    entityId: "ev-1",
  });
  await txDone(seedTx);
  seeded.close();

  const upgraded = await idb.openRuleFreezeDB();
  assert.equal(upgraded.version, 3);
  const readTx = upgraded.transaction(["event_drafts", "amendment_drafts", "tx_records"], "readonly");
  const oldDraft = await requestDone(readTx.objectStore("event_drafts").get("active_draft"));
  const kept = await requestDone(readTx.objectStore("event_drafts").get("kept"));
  const oldAmend = await requestDone(readTx.objectStore("amendment_drafts").get("amend_draft_ev-1"));
  const oldPending = await requestDone(readTx.objectStore("tx_records").get("0xoldpending"));
  const indexed = await requestDone(readTx.objectStore("tx_records").index("by_contract").getAll());
  await txDone(readTx);

  assert.equal(oldDraft.contractAddress, idb.LEGACY_UNSCOPED_CONTRACT);
  assert.equal(oldAmend.contractAddress, idb.LEGACY_UNSCOPED_CONTRACT);
  assert.equal(oldPending.contractAddress, idb.LEGACY_UNSCOPED_CONTRACT);
  assert.equal(kept.contractAddress, NEXT);
  assert.equal(idb.recordMatchesContract(oldDraft, NEXT), false);
  assert.equal(idb.recordMatchesContract(oldDraft, OLD), false);
  assert.equal(idb.recordMatchesContract(kept, NEXT), true);
  assert.equal(idb.recordMatchesContract(kept, OLD), false);
  assert.ok(indexed.some((row) => row.txHash === "0xoldpending"));
  assert.ok(indexed.some((row) => row.txHash === "0xnewpending"));

  const pendingForNext = await idb.listPendingTxRecords(NEXT);
  assert.deepEqual(pendingForNext.map((row) => row.txHash), ["0xnewpending"]);
  const pendingForOld = await idb.listPendingTxRecords(OLD);
  assert.deepEqual(pendingForOld, []);
});

test("fresh install creates the v3 contract index", async () => {
  const idb = await import("../src/lib/idb.ts");
  const name = "RuleFreezeDB-fresh";
  await requestDone(indexedDB.deleteDatabase(name));
  const request = indexedDB.open(name, 3);
  request.onupgradeneeded = (event) => {
    idb.upgradeRuleFreezeDB(request.result, request.transaction, event.oldVersion);
  };
  const db = await requestDone(request);
  assert.equal(db.version, 3);
  assert.equal(db.objectStoreNames.contains("event_drafts"), true);
  assert.equal(db.objectStoreNames.contains("tx_records"), true);
  const tx = db.transaction("tx_records", "readonly");
  assert.equal(tx.objectStore("tx_records").indexNames.contains("by_contract"), true);
  assert.equal(tx.objectStore("tx_records").indexNames.contains("by_entity"), true);
  db.close();
});
