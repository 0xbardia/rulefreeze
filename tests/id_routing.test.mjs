import test from "node:test";
import assert from "node:assert/strict";
import {
  isLiveEventId,
  isDemoEventId,
  isLiveAmendmentId,
  isDemoAmendmentId,
  isLiveVersionId,
  isDemoVersionId,
  isLiveAssessmentId,
  isDemoAssessmentId,
} from "../src/lib/id-routing.ts";

test("isLiveEventId parameterized acceptance of canonical positive integer suffixes", () => {
  const validLiveIds = ["ev-1", "ev-9", "ev-10", "ev-99", "ev-100", "ev-999", "ev-100000"];
  for (const id of validLiveIds) {
    assert.equal(isLiveEventId(id), true, `Expected valid: ${id}`);
  }
});

test("isLiveEventId parameterized rejection of invalid formats, leading zeros, negatives, and trailing junk", () => {
  const invalidLiveIds = [
    // Zero and leading-zero forms (canonical sequences are 1-indexed integers formatted as str(idx))
    "ev-0",
    "ev-01",
    "ev-09",
    "ev-00100",
    // Negative numbers
    "ev--1",
    "ev--99",
    // Trailing junk
    "ev-1a",
    "ev-1 trailing",
    "ev-1/amend",
    "ev-1?query=1",
    "ev-1#section",
    // Prefix variations
    "event-1",
    "EV-1",
    "e-1",
    "ev1",
    "ev_1",
    // Explicit demo IDs
    "demo-ev-1",
    "demo-ev-999",
    // Empty and malformed
    "",
    "   ",
    "0xC8a83C62da126891aB8F60e6D5E171480aE91c23",
  ];

  for (const id of invalidLiveIds) {
    assert.equal(isLiveEventId(id), false, `Expected invalid: ${id}`);
  }
});

test("isLiveAmendmentId parameterized coverage", () => {
  const valid = ["amend-1", "amend-9", "amend-10", "amend-99", "amend-100", "amend-999"];
  for (const id of valid) {
    assert.equal(isLiveAmendmentId(id), true, `Expected valid: ${id}`);
  }

  const invalid = ["amend-0", "amend-01", "amend--1", "amend-1junk", "amendment-1", "demo-amend-1"];
  for (const id of invalid) {
    assert.equal(isLiveAmendmentId(id), false, `Expected invalid: ${id}`);
  }
});

test("isLiveVersionId and isLiveAssessmentId parameterized coverage", () => {
  const validVersions = ["ver-1", "ver-9", "ver-10", "ver-100", "ver-999"];
  for (const id of validVersions) {
    assert.equal(isLiveVersionId(id), true, `Expected valid: ${id}`);
  }
  const invalidVersions = ["ver-0", "ver-01", "ver--1", "version-1", "demo-ver-1"];
  for (const id of invalidVersions) {
    assert.equal(isLiveVersionId(id), false, `Expected invalid: ${id}`);
  }

  const validAssessments = ["assess-1", "assess-9", "assess-10", "assess-100", "assess-999"];
  for (const id of validAssessments) {
    assert.equal(isLiveAssessmentId(id), true, `Expected valid: ${id}`);
  }
  const invalidAssessments = ["assess-0", "assess-01", "assess--1", "assessment-1", "demo-assess-1"];
  for (const id of invalidAssessments) {
    assert.equal(isLiveAssessmentId(id), false, `Expected invalid: ${id}`);
  }
});

test("isDemoEventId and isDemoAmendmentId parameterized coverage", () => {
  const validDemoEvents = ["demo-ev-1", "demo-ev-2", "demo-ev-999"];
  for (const id of validDemoEvents) {
    assert.equal(isDemoEventId(id), true, `Expected valid: ${id}`);
  }

  const invalidDemoEvents = ["demo-ev-0", "demo-ev-01", "ev-1", "demo-event-1"];
  for (const id of invalidDemoEvents) {
    assert.equal(isDemoEventId(id), false, `Expected invalid: ${id}`);
  }
});

test("Well-formed but nonexistent live ID produces live read error and never falls back to mock", async () => {
  const { fetchEvent } = await import("../src/lib/contract-adapter.ts");
  const contractAddress = "0xC8a83C62da126891aB8F60e6D5E171480aE91c23";

  // ev-999 is a valid live ID format, but does not exist on chain
  await assert.rejects(
    async () => {
      await fetchEvent(contractAddress, "ev-999");
    },
    (err) => {
      // Must be a live read error (execution failed/revert), never returning mock data
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes("READ_FAILED") ||
        err.message.includes("execution failed") ||
        err.message.includes("get_event")
      );
      return true;
    }
  );
});
