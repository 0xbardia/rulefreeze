// Separates GenLayer protocol status, consensus result, and execution result.
// Numeric names match genlayer-js 1.1.8 dist/chunk-EY35NPSE.js and are checked by tests/tx_result.test.mjs.

import type { ChainTxStatus } from "./types.ts";

export type ExecutionLabel = "SUCCESS" | "FAILURE" | "UNKNOWN";

export interface ParsedTxOutcome {
  protocolStatus: string;
  consensusResult: string;
  executionResult: ExecutionLabel;
  contradictions: string[];
  notes: string[];
  validatorVotes?: string[];
}

export interface TxRollup {
  action: "pending" | "watch" | "stop";
  status: ChainTxStatus;
  error?: string;
}

/** Protocol status codes published by genlayer-js 1.1.8. */
export const PROTOCOL_STATUS_BY_CODE: Record<string, string> = {
  "0": "UNINITIALIZED",
  "1": "PENDING",
  "2": "PROPOSING",
  "3": "COMMITTING",
  "4": "REVEALING",
  "5": "ACCEPTED",
  "6": "UNDETERMINED",
  "7": "FINALIZED",
  "8": "CANCELED",
  "9": "APPEAL_REVEALING",
  "10": "APPEAL_COMMITTING",
  "11": "READY_TO_FINALIZE",
  "12": "VALIDATORS_TIMEOUT",
  "13": "LEADER_TIMEOUT",
};

/** Consensus result codes published by genlayer-js 1.1.8. These are not execution results. */
export const CONSENSUS_RESULT_BY_CODE: Record<string, string> = {
  "0": "IDLE",
  "1": "AGREE",
  "2": "DISAGREE",
  "3": "TIMEOUT",
  "4": "DETERMINISTIC_VIOLATION",
  "5": "NO_MAJORITY",
  "6": "MAJORITY_AGREE",
  "7": "MAJORITY_DISAGREE",
};

/**
 * Execution-result codes on the non-studio getTransactionAllData field.
 * 0 is NOT_VOTED, not success.
 */
export const EXECUTION_RESULT_BY_CODE: Record<string, string> = {
  "0": "NOT_VOTED",
  "1": "FINISHED_WITH_RETURN",
  "2": "FINISHED_WITH_ERROR",
};

const PROTOCOL_NAMES = new Set(Object.values(PROTOCOL_STATUS_BY_CODE));
const CONSENSUS_NAMES = new Set(Object.values(CONSENSUS_RESULT_BY_CODE));
const DECIDED_PROTOCOLS = new Set([
  "ACCEPTED",
  "FINALIZED",
  "UNDETERMINED",
  "CANCELED",
  "LEADER_TIMEOUT",
  "VALIDATORS_TIMEOUT",
]);
const PENDING_PROTOCOLS = new Set([
  "UNINITIALIZED",
  "PENDING",
  "PROPOSING",
  "COMMITTING",
  "REVEALING",
  "APPEAL_REVEALING",
  "APPEAL_COMMITTING",
  "READY_TO_FINALIZE",
]);
const FAIL_RESULT_STATUS = new Set(["rollback", "contract_error", "error"]);
const NEGATIVE_CONSENSUS = new Set([
  "MAJORITY_DISAGREE",
  "NO_MAJORITY",
  "DETERMINISTIC_VIOLATION",
  "TIMEOUT",
]);

type ReceiptLabel = "SUCCESS" | "FAILURE" | "UNKNOWN" | "CONTRADICTION" | "IGNORE";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function upperName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function namedOrUnknown(name: string, allowed: Set<string>): string {
  return name && allowed.has(name) ? name : "";
}

function codeName(value: unknown, table: Record<string, string>): string {
  if (typeof value === "number" && Number.isFinite(value)) return table[String(value)] || "";
  if (typeof value === "string" && /^[0-9]+$/.test(value)) return table[value] || "";
  return "";
}

function contradictingPair(label: string, named: string, fromCode: string, raw: unknown): string | null {
  if (named && fromCode && named !== fromCode) {
    return `${label} ${named} contradicts code ${String(raw)} (${fromCode})`;
  }
  return null;
}

function readProtocol(tx: Record<string, unknown>, contradictions: string[]): string {
  const named = namedOrUnknown(upperName(tx.statusName || tx.status_name), PROTOCOL_NAMES);
  const fromCode = codeName(tx.status, PROTOCOL_STATUS_BY_CODE);
  const clash = contradictingPair("protocol status", named, fromCode, tx.status);
  if (clash) {
    contradictions.push(clash);
    return "UNKNOWN";
  }
  return named || fromCode || "UNKNOWN";
}

function readRoundResult(tx: Record<string, unknown>): unknown {
  const round = asRecord(tx.last_round) || asRecord(tx.lastRound);
  return round ? round.result : undefined;
}

function readConsensus(tx: Record<string, unknown>, contradictions: string[]): string {
  const named = namedOrUnknown(
    upperName(tx.result_name || tx.resultName),
    CONSENSUS_NAMES
  );
  const fromCode = codeName(tx.result, CONSENSUS_RESULT_BY_CODE);
  const clash = contradictingPair("consensus result", named, fromCode, tx.result);
  if (clash) contradictions.push(clash);

  const roundRaw = readRoundResult(tx);
  const roundNamed = namedOrUnknown(upperName(roundRaw), CONSENSUS_NAMES);
  const roundCode = codeName(roundRaw, CONSENSUS_RESULT_BY_CODE);
  const roundLabel = roundNamed || roundCode;
  const topLabel = clash ? "" : named || fromCode;
  if (roundLabel && topLabel && roundLabel !== topLabel) {
    contradictions.push(`round consensus ${roundLabel} contradicts transaction consensus ${topLabel}`);
  }
  if (clash) return "UNKNOWN";
  return topLabel || roundLabel || "UNKNOWN";
}

function isQuorumTermination(receipt: Record<string, unknown>): boolean {
  const genvm = asRecord(receipt.genvm_result);
  const code = String(genvm?.error_code || "");
  const rawError = asRecord(genvm?.raw_error);
  const causes = Array.isArray(rawError?.causes) ? rawError.causes : [];
  const stderr = String(genvm?.stderr || "");
  const causeHit = causes.some((cause) => String(cause).includes("VALIDATOR_QUORUM_REACHED"));
  return code === "CONSENSUS_VALIDATOR_QUORUM_REACHED" || causeHit || /cancelled after quorum/i.test(stderr);
}

function resultStatus(receipt: Record<string, unknown>): string {
  const result = asRecord(receipt.result);
  return result ? String(result.status || "").toLowerCase() : "";
}

function labelLeader(receipt: Record<string, unknown>): ReceiptLabel {
  if (isQuorumTermination(receipt)) return "IGNORE";
  const exec = upperName(receipt.execution_result);
  const status = resultStatus(receipt);
  const successExec = exec === "SUCCESS";
  const failExec = exec === "ERROR" || exec === "FAILURE";
  const failStatus = FAIL_RESULT_STATUS.has(status);
  if ((successExec && failStatus) || (failExec && status === "return")) return "CONTRADICTION";
  if (successExec && (status === "return" || status === "")) return "SUCCESS";
  if (failExec) return "FAILURE";
  if (status === "return") return "SUCCESS";
  if (failStatus) return "FAILURE";
  return "UNKNOWN";
}

function leaderReceipts(tx: Record<string, unknown>): Record<string, unknown>[] {
  const consensus = asRecord(tx.consensus_data) || asRecord(tx.consensusData);
  const raw = consensus?.leader_receipt ?? consensus?.leaderReceipt;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null && upperName(item.mode) === "LEADER");
}

function executionFromField(value: unknown): "SUCCESS" | "FAILURE" | "NONE" | "NOT_VOTED" | "UNMAPPED" {
  if (value === undefined || value === null || value === "") return "NONE";
  const named = namedOrUnknown(upperName(value), new Set(Object.values(EXECUTION_RESULT_BY_CODE)));
  const fromCode = codeName(value, EXECUTION_RESULT_BY_CODE);
  const label = named || fromCode;
  if (!label) return "UNMAPPED";
  if (label === "NOT_VOTED") return "NOT_VOTED";
  if (label === "FINISHED_WITH_RETURN") return "SUCCESS";
  if (label === "FINISHED_WITH_ERROR") return "FAILURE";
  return "UNMAPPED";
}

function readExecution(tx: Record<string, unknown>, notes: string[], contradictions: string[]): ExecutionLabel {
  const leaders = leaderReceipts(tx);
  const labels = leaders.map(labelLeader);
  if (labels.includes("CONTRADICTION")) {
    contradictions.push("leader receipt execution_result contradicts its result status");
  }
  const concrete = labels.filter((label) => label === "SUCCESS" || label === "FAILURE");
  const unique = new Set(concrete);
  if (unique.size > 1) {
    contradictions.push("leader receipts disagree on execution result");
  }
  const fromLeaders: ExecutionLabel = unique.size === 1 ? (concrete[0] as ExecutionLabel) : "UNKNOWN";

  const field = tx.txExecutionResult !== undefined ? tx.txExecutionResult : tx.tx_execution_result;
  const fromField = executionFromField(field);
  if (fromField === "NONE") notes.push("txExecutionResult absent");
  if (fromField === "NOT_VOTED") notes.push("txExecutionResult NOT_VOTED is not execution success or failure");
  if (fromField === "UNMAPPED") notes.push(`txExecutionResult ${String(field)} has no verified meaning`);

  if ((fromField === "SUCCESS" || fromField === "FAILURE") && fromLeaders !== "UNKNOWN" && fromField !== fromLeaders) {
    contradictions.push(`txExecutionResult ${fromField} contradicts leader execution ${fromLeaders}`);
    return "UNKNOWN";
  }
  if (fromLeaders !== "UNKNOWN") return fromLeaders;
  if (fromField === "SUCCESS" || fromField === "FAILURE") return fromField;
  return "UNKNOWN";
}

function readVotes(tx: Record<string, unknown>): string[] | undefined {
  const round = asRecord(tx.last_round) || asRecord(tx.lastRound);
  const votes = round?.validator_votes_name ?? round?.validatorVotesName;
  if (!Array.isArray(votes)) return undefined;
  return votes.map((vote) => String(vote));
}

export function parseTransactionOutcome(tx: unknown): ParsedTxOutcome {
  const record = asRecord(tx);
  if (!record) {
    return {
      protocolStatus: "UNKNOWN",
      consensusResult: "UNKNOWN",
      executionResult: "UNKNOWN",
      contradictions: ["transaction response is not an object"],
      notes: [],
    };
  }
  const contradictions: string[] = [];
  const notes: string[] = [];
  const protocolStatus = readProtocol(record, contradictions);
  let consensusResult = readConsensus(record, contradictions);
  const explicitConsensusName = namedOrUnknown(upperName(record.result_name || record.resultName), CONSENSUS_NAMES);
  if (!DECIDED_PROTOCOLS.has(protocolStatus) && !explicitConsensusName && (consensusResult === "NO_MAJORITY" || consensusResult === "IDLE")) {
    notes.push("consensus code is provisional before a decided protocol status");
    consensusResult = "UNKNOWN";
  }
  const executionResult = readExecution(record, notes, contradictions);
  if (DECIDED_PROTOCOLS.has(protocolStatus) && executionResult === "SUCCESS" && NEGATIVE_CONSENSUS.has(consensusResult)) {
    contradictions.push(`consensus ${consensusResult} contradicts execution SUCCESS`);
  }
  return {
    protocolStatus,
    consensusResult,
    executionResult,
    contradictions,
    notes,
    validatorVotes: readVotes(record),
  };
}

export function rollupTransaction(outcome: ParsedTxOutcome): TxRollup {
  if (outcome.contradictions.length > 0) {
    return {
      action: "stop",
      status: "EXECUTION_UNKNOWN",
      error: outcome.contradictions.join("; "),
    };
  }
  if (PENDING_PROTOCOLS.has(outcome.protocolStatus) || outcome.protocolStatus === "UNKNOWN") {
    return { action: "pending", status: "PENDING_NETWORK" };
  }
  if (outcome.executionResult === "FAILURE") {
    return {
      action: "stop",
      status: "EXECUTION_FAILURE",
      error: `Execution result FAILURE under protocol ${outcome.protocolStatus}`,
    };
  }
  if (
    NEGATIVE_CONSENSUS.has(outcome.consensusResult) ||
    outcome.protocolStatus === "UNDETERMINED" ||
    outcome.protocolStatus === "CANCELED" ||
    outcome.protocolStatus === "LEADER_TIMEOUT" ||
    outcome.protocolStatus === "VALIDATORS_TIMEOUT"
  ) {
    return {
      action: "stop",
      status: "CONSENSUS_DISAGREEMENT",
      error: `Protocol ${outcome.protocolStatus}; consensus ${outcome.consensusResult}; execution ${outcome.executionResult}`,
    };
  }
  if (outcome.protocolStatus === "FINALIZED" || outcome.protocolStatus === "ACCEPTED") {
    if (outcome.executionResult === "SUCCESS") {
      return {
        action: outcome.protocolStatus === "FINALIZED" ? "stop" : "watch",
        status: outcome.protocolStatus,
      };
    }
    return {
      action: "stop",
      status: "EXECUTION_UNKNOWN",
      error: `Protocol ${outcome.protocolStatus} with execution UNKNOWN. Do not re-submit until the original transaction is reconciled.`,
    };
  }
  return { action: "pending", status: "PENDING_NETWORK" };
}
