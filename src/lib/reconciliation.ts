// src/lib/reconciliation.ts
// Explicit, tested reconciliation engine for RuleFreeze draft cleanup.
// Enforces 3 distinct mandatory gates:
// 1. Protocol Finality verified (FINALIZED only; ACCEPTED is provisional, not finality).
// 2. Successful execution verified (leader execution SUCCESS; not failure or unknown).
// 3. Expected on-chain record verified against submitted user intent (readback matching).

import type { ChainTxRecord, EventDraft, AmendmentDraft } from "./types.ts";
import { fetchEvents, fetchRuleVersion, fetchEventAmendments } from "./contract-adapter.ts";

export interface ReconciliationEvidence {
  protocolStatus: string;
  consensusResult: string;
  executionResult: "SUCCESS" | "FAILURE" | "UNKNOWN";
  finalityVerified: boolean;
  executionVerified: boolean;
  readbackVerified: boolean;
  canCleanup: boolean;
  entityId?: string;
  error?: string;
}

/**
 * Checks all 3 gates for event registration before destructive draft cleanup.
 */
export async function reconcileEventRegistration(
  txRecord: ChainTxRecord,
  draft: EventDraft,
  contractAddress: string
): Promise<ReconciliationEvidence> {
  const protocolStatus = txRecord.protocolStatus || txRecord.status;
  const consensusResult = txRecord.consensusResult || "UNKNOWN";
  const executionResult: "SUCCESS" | "FAILURE" | "UNKNOWN" =
    txRecord.executionResult === "SUCCESS" ||
    txRecord.executionResult === "FAILURE" ||
    txRecord.executionResult === "UNKNOWN"
      ? txRecord.executionResult
      : "UNKNOWN";

  // Gate 1: Finality verified. ACCEPTED is provisional consensus, NEVER finality.
  const finalityVerified = protocolStatus === "FINALIZED";

  // Gate 2: Execution outcome verified SUCCESS.
  const executionVerified =
    executionResult === "SUCCESS" && txRecord.status === "FINALIZED";

  if (!finalityVerified || !executionVerified) {
    const reason = !finalityVerified
      ? `Protocol status (${protocolStatus}) is not finalized.`
      : `Execution outcome (${executionResult}) did not succeed (${txRecord.error || txRecord.status}).`;
    return {
      protocolStatus,
      consensusResult,
      executionResult,
      finalityVerified,
      executionVerified,
      readbackVerified: false,
      canCleanup: false,
      error: reason,
    };
  }

  // Gate 3: Readback verification against submitted intent.
  try {
    const listRes = await fetchEvents(contractAddress, 0, 50);
    const matching = listRes.events.find(
      (e) =>
        e.name === draft.name &&
        (!draft.account || e.organizer.toLowerCase() === draft.account.toLowerCase())
    );

    if (!matching) {
      return {
        protocolStatus,
        consensusResult,
        executionResult,
        finalityVerified,
        executionVerified,
        readbackVerified: false,
        canCleanup: false,
        error: "Expected created event record missing on-chain during readback verification.",
      };
    }

    const version = await fetchRuleVersion(contractAddress, matching.active_version_id);
    const textMatches = (version.rule_text || "").trim() === (draft.initial_rules || "").trim();

    if (!textMatches) {
      return {
        protocolStatus,
        consensusResult,
        executionResult,
        finalityVerified,
        executionVerified,
        readbackVerified: false,
        canCleanup: false,
        entityId: matching.id,
        error: "Created event rule text does not match submitted draft intent.",
      };
    }

    return {
      protocolStatus,
      consensusResult,
      executionResult,
      finalityVerified: true,
      executionVerified: true,
      readbackVerified: true,
      canCleanup: true,
      entityId: matching.id,
    };
  } catch (err) {
    return {
      protocolStatus,
      consensusResult,
      executionResult,
      finalityVerified,
      executionVerified,
      readbackVerified: false,
      canCleanup: false,
      error: `Readback verification query failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Checks all 3 gates for amendment proposal before destructive draft cleanup.
 */
export async function reconcileAmendmentProposal(
  txRecord: ChainTxRecord,
  draft: AmendmentDraft,
  contractAddress: string
): Promise<ReconciliationEvidence> {
  const protocolStatus = txRecord.protocolStatus || txRecord.status;
  const consensusResult = txRecord.consensusResult || "UNKNOWN";
  const executionResult: "SUCCESS" | "FAILURE" | "UNKNOWN" =
    txRecord.executionResult === "SUCCESS" ||
    txRecord.executionResult === "FAILURE" ||
    txRecord.executionResult === "UNKNOWN"
      ? txRecord.executionResult
      : "UNKNOWN";

  // Gate 1: Finality verified.
  const finalityVerified = protocolStatus === "FINALIZED";

  // Gate 2: Execution outcome verified SUCCESS.
  const executionVerified =
    executionResult === "SUCCESS" && txRecord.status === "FINALIZED";

  if (!finalityVerified || !executionVerified) {
    const reason = !finalityVerified
      ? `Protocol status (${protocolStatus}) is not finalized.`
      : `Execution outcome (${executionResult}) did not succeed (${txRecord.error || txRecord.status}).`;
    return {
      protocolStatus,
      consensusResult,
      executionResult,
      finalityVerified,
      executionVerified,
      readbackVerified: false,
      canCleanup: false,
      error: reason,
    };
  }

  // Gate 3: Readback verification against submitted intent.
  try {
    const amendments = await fetchEventAmendments(contractAddress, draft.event_id);
    const matching = amendments.find(
      (a) =>
        a.base_version_id === draft.base_version_id &&
        a.intended_scope === draft.intended_scope &&
        (a.proposed_rules || "").trim() === (draft.proposed_rules || "").trim() &&
        (a.explanation || "").trim() === (draft.explanation || "").trim()
    );

    if (!matching) {
      return {
        protocolStatus,
        consensusResult,
        executionResult,
        finalityVerified,
        executionVerified,
        readbackVerified: false,
        canCleanup: false,
        error: "Expected amendment record missing on-chain or mismatched against submitted intent.",
      };
    }

    return {
      protocolStatus,
      consensusResult,
      executionResult,
      finalityVerified: true,
      executionVerified: true,
      readbackVerified: true,
      canCleanup: true,
      entityId: matching.id,
    };
  } catch (err) {
    return {
      protocolStatus,
      consensusResult,
      executionResult,
      finalityVerified,
      executionVerified,
      readbackVerified: false,
      canCleanup: false,
      error: `Readback verification query failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
