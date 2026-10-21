// RuleFreeze IndexedDB Controller
// Stores local drafts and recoverable transaction tracking. Not authoritative for verdicts.

import type { ChainTxRecord, EventDraft, AmendmentDraft } from "./types.ts";

const DB_NAME = "RuleFreezeDB";
const DB_VERSION = 3;
export const LEGACY_UNSCOPED_CONTRACT = "legacy-unscoped";

export function upgradeRuleFreezeDB(
  db: IDBDatabase,
  transaction: IDBTransaction,
  oldVersion: number
): void {
  if (oldVersion < 1) {
    if (!db.objectStoreNames.contains("event_drafts")) {
      const store = db.createObjectStore("event_drafts", { keyPath: "id" });
      store.createIndex("by_account", "account", { unique: false });
      store.createIndex("by_updated", "updatedAt", { unique: false });
    }
    if (!db.objectStoreNames.contains("amendment_drafts")) {
      const store = db.createObjectStore("amendment_drafts", { keyPath: "id" });
      store.createIndex("by_account", "account", { unique: false });
      store.createIndex("by_event", "event_id", { unique: false });
    }
    if (!db.objectStoreNames.contains("tx_records")) {
      const store = db.createObjectStore("tx_records", { keyPath: "txHash" });
      store.createIndex("by_status", "status", { unique: false });
      store.createIndex("by_account", "account", { unique: false });
    }
    if (!db.objectStoreNames.contains("preferences")) {
      db.createObjectStore("preferences", { keyPath: "key" });
    }
  }

  if (oldVersion < 2 && db.objectStoreNames.contains("tx_records")) {
    const txStore = transaction.objectStore("tx_records");
    if (!txStore.indexNames.contains("by_entity")) {
      txStore.createIndex("by_entity", "entityId", { unique: false });
    }
  }

  if (oldVersion < 3) {
    if (db.objectStoreNames.contains("tx_records")) {
      const txStore = transaction.objectStore("tx_records");
      if (!txStore.indexNames.contains("by_contract")) {
        txStore.createIndex("by_contract", "contractAddress", { unique: false });
      }
    }
    for (const storeName of ["event_drafts", "amendment_drafts", "tx_records"]) {
      if (!db.objectStoreNames.contains(storeName)) continue;
      const store = transaction.objectStore(storeName);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const value = cursor.value as { contractAddress?: string };
        if (!value.contractAddress) {
          value.contractAddress = LEGACY_UNSCOPED_CONTRACT;
          cursor.update(value);
        }
        cursor.continue();
      };
    }
  }
}

export function recordMatchesContract(
  record: { contractAddress?: string },
  contractAddress: string | null | undefined
): boolean {
  if (!contractAddress) return false;
  return (record.contractAddress || "").toLowerCase() === contractAddress.toLowerCase();
}

export interface IDBPreferences {
  key: string;
  value: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openRuleFreezeDB(): Promise<IDBDatabase> {
  if (typeof globalThis.indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser environments."));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const tx = request.transaction;
        if (!tx) return;
        upgradeRuleFreezeDB(request.result, tx, event.oldVersion);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error("Failed to open IndexedDB"));
      };
      request.onblocked = () => {
        console.warn("RuleFreeze IndexedDB upgrade blocked by open tab.");
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

// --------------------------------------------------------------------------------------
// Event Drafts CRUD
// --------------------------------------------------------------------------------------

export async function saveEventDraft(draft: EventDraft): Promise<void> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("event_drafts", "readwrite");
    const store = tx.objectStore("event_drafts");
    const req = store.put({ ...draft, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getEventDraft(id: string): Promise<EventDraft | null> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("event_drafts", "readonly");
    const store = tx.objectStore("event_drafts");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listEventDrafts(account?: string): Promise<EventDraft[]> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("event_drafts", "readonly");
    const store = tx.objectStore("event_drafts");
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result || []) as EventDraft[];
      if (!account) return resolve(all);
      const filtered = all.filter(
        (d) => !d.account || d.account.toLowerCase() === account.toLowerCase()
      );
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEventDraft(id: string): Promise<void> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("event_drafts", "readwrite");
    const store = tx.objectStore("event_drafts");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --------------------------------------------------------------------------------------
// Amendment Drafts CRUD
// --------------------------------------------------------------------------------------

export async function saveAmendmentDraft(draft: AmendmentDraft): Promise<void> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("amendment_drafts", "readwrite");
    const store = tx.objectStore("amendment_drafts");
    const req = store.put({ ...draft, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAmendmentDraft(id: string): Promise<AmendmentDraft | null> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("amendment_drafts", "readonly");
    const store = tx.objectStore("amendment_drafts");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listAmendmentDrafts(eventId?: string): Promise<AmendmentDraft[]> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("amendment_drafts", "readonly");
    const store = tx.objectStore("amendment_drafts");
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result || []) as AmendmentDraft[];
      if (!eventId) return resolve(all);
      resolve(all.filter((d) => d.event_id === eventId));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAmendmentDraft(id: string): Promise<void> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("amendment_drafts", "readwrite");
    const store = tx.objectStore("amendment_drafts");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --------------------------------------------------------------------------------------
// Transaction Records (Recoverable Tracking)
// --------------------------------------------------------------------------------------

export async function saveTxRecord(record: ChainTxRecord): Promise<void> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tx_records", "readwrite");
    const store = tx.objectStore("tx_records");
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getTxRecord(txHash: string): Promise<ChainTxRecord | null> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tx_records", "readonly");
    const store = tx.objectStore("tx_records");
    const req = store.get(txHash);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listPendingTxRecords(contractAddress?: string | null): Promise<ChainTxRecord[]> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tx_records", "readonly");
    const store = tx.objectStore("tx_records");
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result || []) as ChainTxRecord[];
      const pending = all.filter((r) =>
        ["SUBMITTED", "PENDING_NETWORK", "ACCEPTED", "AWAITING_WALLET"].includes(r.status) &&
        (!contractAddress || recordMatchesContract(r, contractAddress))
      );
      resolve(pending);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listAllTxRecords(): Promise<ChainTxRecord[]> {
  const db = await openRuleFreezeDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tx_records", "readonly");
    const store = tx.objectStore("tx_records");
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as ChainTxRecord[]);
    req.onerror = () => reject(req.error);
  });
}
