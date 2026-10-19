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

test("isLiveEventId validates canonical live contract event format", () => {
  assert.equal(isLiveEventId("ev-1"), true);
  assert.equal(isLiveEventId("ev-42"), true);
  assert.equal(isLiveEventId("ev-99999"), true);

  // Invalid cases
  assert.equal(isLiveEventId("ev-0"), false); // sequence is 1-indexed
  assert.equal(isLiveEventId("demo-ev-1"), false);
  assert.equal(isLiveEventId("event-1"), false);
  assert.equal(isLiveEventId("ev-abc"), false);
  assert.equal(isLiveEventId("0xC8a83C62..."), false);
  assert.equal(isLiveEventId(""), false);
});

test("isDemoEventId validates explicit demo fixture format", () => {
  assert.equal(isDemoEventId("demo-ev-1"), true);
  assert.equal(isDemoEventId("demo-ev-2"), true);

  // Invalid cases
  assert.equal(isDemoEventId("ev-1"), false);
  assert.equal(isDemoEventId("demo-1"), false);
  assert.equal(isDemoEventId("demo-ev-0"), false);
});

test("isLiveAmendmentId validates live amendment format", () => {
  assert.equal(isLiveAmendmentId("amend-1"), true);
  assert.equal(isLiveAmendmentId("amend-10"), true);

  assert.equal(isLiveAmendmentId("demo-amend-1"), false);
  assert.equal(isLiveAmendmentId("amend-0"), false);
  assert.equal(isLiveAmendmentId("amendment-1"), false);
});

test("isDemoAmendmentId validates demo amendment format", () => {
  assert.equal(isDemoAmendmentId("demo-amend-1"), true);
  assert.equal(isDemoAmendmentId("demo-amend-2"), true);

  assert.equal(isDemoAmendmentId("amend-1"), false);
  assert.equal(isDemoAmendmentId("demo-amend-0"), false);
});

test("isLiveVersionId and isLiveAssessmentId validate canonical formats", () => {
  assert.equal(isLiveVersionId("ver-1"), true);
  assert.equal(isLiveVersionId("ver-2"), true);
  assert.equal(isLiveVersionId("demo-ver-1"), false);

  assert.equal(isLiveAssessmentId("assess-1"), true);
  assert.equal(isLiveAssessmentId("assess-2"), true);
  assert.equal(isLiveAssessmentId("demo-assess-1"), false);
});
