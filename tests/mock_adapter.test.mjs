import test from "node:test";
import assert from "node:assert/strict";
import {
  mockFetchEvents,
  mockFetchEvent,
  mockFetchRuleVersion,
  mockFetchAmendment,
  mockFetchAssessment,
  mockRegisterEvent,
  mockProposeAmendment,
  mockAssessAmendment,
  mockDecideAmendment,
} from "../src/lib/mock-adapter.ts";

test("MockAdapter initial state contains pre-loaded Section 11 demo fixtures", async () => {
  const eventsRes = await mockFetchEvents();
  assert.ok(eventsRes.total >= 2);
  const ev1 = await mockFetchEvent("demo-ev-1");
  assert.equal(ev1.name.includes("[DEMO]"), true);
  assert.equal(ev1.active_version_id, "demo-ver-1");

  const v1 = await mockFetchRuleVersion("demo-ver-1");
  assert.equal(v1.version_number, 1);
  assert.ok(v1.scenarios.length >= 2);

  const amend1 = await mockFetchAmendment("demo-amend-1");
  assert.equal(amend1.status, "ASSESSED");

  const assess1 = await mockFetchAssessment("demo-assess-1");
  assert.equal(assess1.overall_classification, "NO_MATERIAL_CHANGE");

  const assess2 = await mockFetchAssessment("demo-assess-2");
  assert.equal(assess2.overall_classification, "MATERIAL_CHANGE");
  assert.ok(assess2.changed_dimensions.includes("DELIVERABLES"));
});

test("MockAdapter registerEvent creates new version and event with [DEMO] labeling", async () => {
  const newId = await mockRegisterEvent(
    "0x1111111111111111111111111111111111111111",
    "Security Audit Contest",
    "Find bugs in smart contracts",
    "https://example.com/audit",
    "2026-11-01",
    "2026-11-20",
    "1. Submit valid vulnerability report.",
    [
      {
        id: "SC-1",
        title: "High severity finding",
        situation: "User submits high severity exploit.",
        question: "Is finding eligible?",
        dimension: "ELIGIBILITY",
      },
    ]
  );

  const ev = await mockFetchEvent(newId);
  assert.equal(ev.name.startsWith("[DEMO]"), true);
  const ver = await mockFetchRuleVersion(ev.active_version_id);
  assert.equal(ver.version_number, 1);
  assert.equal(ver.scenarios.length, 1);
});

test("MockAdapter proposeAmendment validates active base and rejects stale base", async () => {
  const ev = await mockFetchEvent("demo-ev-1");
  // Propose against non-active base version should reject
  await assert.rejects(
    async () => {
      await mockProposeAmendment(
        ev.organizer,
        ev.id,
        "demo-ver-non-existent",
        "New rules text",
        "Test proposal",
        "FUTURE_ONLY"
      );
    },
    /STALE_BASE_VERSION/
  );
});

test("MockAdapter disallows ACCEPTED_CLARIFICATION for material changes", async () => {
  // demo-amend-2 has assessment demo-assess-2 which is MATERIAL_CHANGE
  const amend = await mockFetchAmendment("demo-amend-2");
  const ev = await mockFetchEvent(amend.event_id);

  await assert.rejects(
    async () => {
      await mockDecideAmendment(
        ev.organizer,
        "demo-amend-2",
        "ACCEPTED_CLARIFICATION",
        "Trying to slip through without acknowledging"
      );
    },
    /CANNOT_ACCEPT_AS_CLARIFICATION/
  );

  // But ACKNOWLEDGED_MATERIAL_CHANGE succeeds
  await mockDecideAmendment(
    ev.organizer,
    "demo-amend-2",
    "ACKNOWLEDGED_MATERIAL_CHANGE",
    "We explicitly acknowledge the deliverable now requires live frontend."
  );

  const updatedAmend = await mockFetchAmendment("demo-amend-2");
  assert.equal(updatedAmend.status, "ACTIVATED");
  assert.equal(updatedAmend.decision?.type, "ACKNOWLEDGED_MATERIAL_CHANGE");

  // Verify event active version advanced
  const updatedEv = await mockFetchEvent(amend.event_id);
  assert.notEqual(updatedEv.active_version_id, "demo-ver-1");
});
