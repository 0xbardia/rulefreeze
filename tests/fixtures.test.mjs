import test from "node:test";
import assert from "node:assert/strict";
import { SYNTHETIC_QA_FIXTURE } from "../src/lib/fixtures.ts";

test("SYNTHETIC_QA_FIXTURE matches Section 8 specification", () => {
  assert.equal(SYNTHETIC_QA_FIXTURE.name, "RuleFreeze Live QA — run-20261019");
  assert.ok(SYNTHETIC_QA_FIXTURE.initialRules.includes("One entry per person"));
  assert.ok(SYNTHETIC_QA_FIXTURE.initialRules.includes("70%"));
  assert.ok(SYNTHETIC_QA_FIXTURE.initialRules.includes("30%"));
  assert.ok(SYNTHETIC_QA_FIXTURE.initialRules.includes("23:59 UTC"));

  assert.equal(SYNTHETIC_QA_FIXTURE.scenarios.length, 3);
  const [scA, scB, scC] = SYNTHETIC_QA_FIXTURE.scenarios;

  assert.equal(scA.id, "SC-A");
  assert.ok(scA.title.includes("no hosted frontend"));
  assert.equal(scA.dimension, "DELIVERABLES");

  assert.equal(scB.id, "SC-B");
  assert.ok(scB.title.includes("hosted frontend"));
  assert.equal(scB.dimension, "DELIVERABLES");

  assert.equal(scC.id, "SC-C");
  assert.ok(scC.title.includes("two wallets"));
  assert.equal(scC.dimension, "ELIGIBILITY");
});
