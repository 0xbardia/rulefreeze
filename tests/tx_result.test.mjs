import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import {
  CONSENSUS_RESULT_BY_CODE,
  EXECUTION_RESULT_BY_CODE,
  PROTOCOL_STATUS_BY_CODE,
  parseTransactionOutcome,
  rollupTransaction,
} from "../src/lib/tx-result.ts";

const require = createRequire(import.meta.url);
const sdk = require("genlayer-js/types");
const registration = JSON.parse(
  fs.readFileSync(new URL("./fixtures/studio-registration-redacted.json", import.meta.url), "utf8")
);

test("numeric maps match the installed genlayer-js SDK", () => {
  assert.deepEqual(PROTOCOL_STATUS_BY_CODE, sdk.transactionsStatusNumberToName);
  assert.deepEqual(CONSENSUS_RESULT_BY_CODE, sdk.transactionResultNumberToName);
  assert.deepEqual(EXECUTION_RESULT_BY_CODE, sdk.executionResultNumberToName);
});

test("redacted registration separates protocol, consensus, and execution", () => {
  const outcome = parseTransactionOutcome(registration);
  assert.equal(outcome.protocolStatus, "FINALIZED");
  assert.equal(outcome.consensusResult, "MAJORITY_AGREE");
  assert.equal(outcome.executionResult, "SUCCESS");
  assert.deepEqual(outcome.contradictions, []);
  assert.ok(outcome.notes.includes("txExecutionResult absent"));
  assert.deepEqual(outcome.validatorVotes, ["IDLE", "IDLE", "AGREE", "AGREE", "AGREE"]);
  const rollup = rollupTransaction(outcome);
  assert.equal(rollup.status, "FINALIZED");
  assert.equal(rollup.action, "stop");
  assert.equal(rollup.error, undefined);
});

test("missing txExecutionResult is not success when no leader receipt exists", () => {
  const outcome = parseTransactionOutcome({ statusName: "FINALIZED", status: 7, result_name: "MAJORITY_AGREE", result: 6 });
  assert.equal(outcome.executionResult, "UNKNOWN");
  assert.equal(outcome.consensusResult, "MAJORITY_AGREE");
  const rollup = rollupTransaction(outcome);
  assert.equal(rollup.status, "EXECUTION_UNKNOWN");
  assert.equal(rollup.action, "stop");
});

test("txExecutionResult codes use the verified SDK names", () => {
  assert.equal(parseTransactionOutcome({ statusName: "FINALIZED", txExecutionResult: 0 }).executionResult, "UNKNOWN");
  assert.equal(parseTransactionOutcome({ statusName: "FINALIZED", txExecutionResult: 1 }).executionResult, "SUCCESS");
  assert.equal(parseTransactionOutcome({ statusName: "FINALIZED", txExecutionResult: 2 }).executionResult, "FAILURE");
  const unmapped = parseTransactionOutcome({ statusName: "FINALIZED", txExecutionResult: 99 });
  assert.equal(unmapped.executionResult, "UNKNOWN");
  assert.ok(unmapped.notes.some((note) => note.includes("no verified meaning")));
  assert.equal(rollupTransaction(parseTransactionOutcome({ statusName: "FINALIZED", txExecutionResult: 2 })).status, "EXECUTION_FAILURE");
});

test("MAJORITY_AGREE is not treated as an execution error", () => {
  const outcome = parseTransactionOutcome({ status: 7, result: 6 });
  assert.equal(outcome.consensusResult, "MAJORITY_AGREE");
  assert.equal(outcome.executionResult, "UNKNOWN");
  assert.notEqual(rollupTransaction(outcome).status, "EXECUTION_FAILURE");
});

test("a non-leader quorum receipt is not the execution result", () => {
  const onlyValidator = {
    statusName: "FINALIZED",
    result_name: "MAJORITY_AGREE",
    consensus_data: {
      leader_receipt: [
        {
          mode: "validator",
          vote: "idle",
          execution_result: "ERROR",
          result: { status: "contract_error" },
          genvm_result: { error_code: "CONSENSUS_VALIDATOR_QUORUM_REACHED", stderr: "Validator execution cancelled after quorum" },
        },
      ],
    },
  };
  const outcome = parseTransactionOutcome(onlyValidator);
  assert.equal(outcome.executionResult, "UNKNOWN");
  assert.equal(outcome.contradictions.length, 0);
});

test("leader failure is execution failure even when consensus agrees", () => {
  const outcome = parseTransactionOutcome({
    statusName: "FINALIZED",
    result_name: "MAJORITY_AGREE",
    consensus_data: {
      leader_receipt: [{ mode: "leader", execution_result: "ERROR", result: { status: "contract_error" } }],
    },
  });
  assert.equal(outcome.executionResult, "FAILURE");
  assert.equal(outcome.contradictions.length, 0);
  assert.equal(rollupTransaction(outcome).status, "EXECUTION_FAILURE");
});

test("contradictory execution evidence is reported", () => {
  const outcome = parseTransactionOutcome({
    statusName: "FINALIZED",
    status: 5,
    result_name: "MAJORITY_AGREE",
    result: 7,
    txExecutionResult: 2,
    consensus_data: {
      leader_receipt: [{ mode: "leader", execution_result: "SUCCESS", result: { status: "return" } }],
    },
  });
  assert.ok(outcome.contradictions.some((item) => item.includes("protocol")));
  assert.ok(outcome.contradictions.some((item) => item.includes("consensus")));
  assert.ok(outcome.contradictions.some((item) => item.includes("txExecutionResult")));
  assert.equal(outcome.executionResult, "UNKNOWN");
  assert.equal(rollupTransaction(outcome).status, "EXECUTION_UNKNOWN");
});

test("pending protocol keeps polling", () => {
  const rollup = rollupTransaction(parseTransactionOutcome({ statusName: "PENDING", txExecutionResult: null }));
  assert.equal(rollup.action, "pending");
  assert.equal(rollup.status, "PENDING_NETWORK");
});

test("an in-progress leader return does not contradict a provisional consensus code", () => {
  const outcome = parseTransactionOutcome({
    statusName: "COMMITTING",
    status: 3,
    result: 5,
    consensus_data: {
      leader_receipt: [{ mode: "leader", execution_result: "SUCCESS", result: { status: "return" } }],
    },
  });
  assert.equal(outcome.protocolStatus, "COMMITTING");
  assert.equal(outcome.consensusResult, "UNKNOWN");
  assert.equal(outcome.executionResult, "SUCCESS");
  assert.deepEqual(outcome.contradictions, []);
  assert.equal(rollupTransaction(outcome).action, "pending");
});

test("accepted success continues toward finality", () => {
  const rollup = rollupTransaction(parseTransactionOutcome({
    statusName: "ACCEPTED",
    result_name: "MAJORITY_AGREE",
    txExecutionResult: 1,
  }));
  assert.equal(rollup.action, "watch");
  assert.equal(rollup.status, "ACCEPTED");
});
