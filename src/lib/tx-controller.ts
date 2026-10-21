// RuleFreeze Typed Centralized Transaction Controller
// Manages submission, polling, receipt verification, error recovery, and IndexedDB sync.

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { DEFAULT_STUDIONET_RPC } from "./config.ts";
import { saveTxRecord } from "./idb.ts";
import { parseTransactionOutcome, rollupTransaction } from "./tx-result.ts";
import type { ChainTxRecord } from "./types.ts";

export interface TransactionListener {
  (record: ChainTxRecord): void;
}

const listeners: Set<TransactionListener> = new Set();

export function subscribeTxUpdates(listener: TransactionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(record: ChainTxRecord) {
  listeners.forEach((l) => {
    try {
      l(record);
    } catch (e) {
      console.error("Tx listener error:", e);
    }
  });
}

/**
 * Tracks a submitted transaction until finalized, reverted, or timeout.
 * Updates IndexedDB on every state transition.
 */
export async function trackTransaction(
  txHash: string,
  method: string,
  argsSummary: string,
  contractAddress: string,
  chainId: number,
  account: string,
  entityId?: string,
  endpoint: string = DEFAULT_STUDIONET_RPC,
  maxAttempts = 35,
  intervalMs = 3000
): Promise<ChainTxRecord> {
  const record: ChainTxRecord = {
    txHash,
    method,
    argsSummary,
    status: "SUBMITTED",
    submittedAt: Date.now(),
    contractAddress,
    chainId,
    account,
    entityId,
  };

  await saveTxRecord(record);
  notify(record);

  const client = createClient({
    chain: studionet,
    endpoint,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const tx = await client.getTransaction({ hash: txHash as any });
      if (tx) {
        const outcome = parseTransactionOutcome(tx);
        const rollup = rollupTransaction(outcome);
        record.protocolStatus = outcome.protocolStatus;
        record.consensusResult = outcome.consensusResult;
        record.executionResult = outcome.executionResult;
        record.executionContradictions = outcome.contradictions;
        record.validatorVotes = outcome.validatorVotes;
        if (rollup.action === "pending") {
          record.status = "PENDING_NETWORK";
          notify(record);
        } else {
          record.status = rollup.status;
          record.confirmedAt = Date.now();
          record.error = rollup.error;
          await saveTxRecord(record);
          notify(record);
          if (rollup.action === "stop") return record;
        }
      }
    } catch (rpcErr) {
      // Non-fatal transient RPC error while polling
      record.status = "PENDING_NETWORK";
      notify(record);
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  // Polling exceeded max attempts
  if (record.status !== "FINALIZED" && record.status !== "ACCEPTED") {
    record.status = "TIMEOUT";
    record.error = `Polling timed out after ${maxAttempts * (intervalMs / 1000)}s. Status on chain remains unknown. Do not re-submit.`;
    await saveTxRecord(record);
    notify(record);
  }

  return record;
}
