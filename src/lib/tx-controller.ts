// RuleFreeze Typed Centralized Transaction Controller
// Manages submission, polling, receipt verification, error recovery, and IndexedDB sync.

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { DEFAULT_STUDIONET_RPC } from "./config.ts";
import { saveTxRecord } from "./idb.ts";
import type { ChainTxRecord, ChainTxStatus } from "./types.ts";

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
        const statusName = String(tx.statusName || "").toUpperCase();
        const consensusVotes = tx.lastRound?.validatorVotesName;
        const consensusResult = tx.lastRound?.result ? String(tx.lastRound.result) : undefined;

        if (statusName === "FINALIZED" || statusName === "ACCEPTED") {
          // Verify execution result (0 = success in GenLayer)
          const execRes = tx.txExecutionResult;
          if (execRes !== undefined && execRes !== 0 && execRes !== 1) {
            record.status = "EXECUTION_FAILURE";
            record.confirmedAt = Date.now();
            record.error = `Transaction executed with error code ${execRes}`;
            record.consensusResult = consensusResult;
            record.validatorVotes = consensusVotes;
            await saveTxRecord(record);
            notify(record);
            return record;
          }

          record.status = statusName === "FINALIZED" ? "FINALIZED" : "ACCEPTED";
          record.confirmedAt = Date.now();
          record.consensusResult = consensusResult;
          record.validatorVotes = consensusVotes;
          await saveTxRecord(record);
          notify(record);

          // If accepted, keep monitoring for finality if attempts remain
          if (statusName === "FINALIZED") {
            return record;
          }
        } else if (statusName === "REVERTED" || statusName === "FAILED") {
          record.status = "EXECUTION_FAILURE";
          record.confirmedAt = Date.now();
          record.error = "Transaction reverted on GenLayer Studionet.";
          record.consensusResult = consensusResult;
          record.validatorVotes = consensusVotes;
          await saveTxRecord(record);
          notify(record);
          return record;
        } else {
          record.status = "PENDING_NETWORK";
          notify(record);
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
