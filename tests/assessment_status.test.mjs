import test from "node:test";
import assert from "node:assert/strict";
import { canSubmitDecision, viewAssessment } from "../src/lib/assessment-status.ts";

const semantic = {
  overall_classification: "NO_MATERIAL_CHANGE",
  changed_dimensions: [],
  scenarios: [],
  reasoning: "Article insertion only.",
  uncertainty: "",
  grounding_verified: true,
  result_kind: "SEMANTIC",
  failure_stage: "",
};

test("processing failure is not a semantic REVIEW_NEEDED", () => {
  const view = viewAssessment({
    ...semantic,
    overall_classification: "",
    result_kind: "PROCESSING_FAILURE",
    failure_stage: "OUTPUT_FORMAT",
    reasoning: "Expecting property name enclosed in double quotes: line 1 column 2",
    grounding_verified: false,
  });
  assert.equal(view.kind, "processing");
  assert.equal(view.stage, "OUTPUT_FORMAT");
  assert.equal(canSubmitDecision({
    ...semantic,
    overall_classification: "",
    result_kind: "PROCESSING_FAILURE",
    failure_stage: "OUTPUT_FORMAT",
    grounding_verified: false,
  }, "ACCEPTED_CLARIFICATION"), false);
  assert.equal(canSubmitDecision({
    ...semantic,
    overall_classification: "",
    result_kind: "PROCESSING_FAILURE",
    failure_stage: "OUTPUT_FORMAT",
    grounding_verified: false,
  }, "DECLINED"), true);
});

test("historical malformed records stay processing failures", () => {
  const view = viewAssessment({
    ...semantic,
    overall_classification: "REVIEW_NEEDED",
    uncertainty: "MALFORMED_MODEL_OUTPUT",
    reasoning: "Model output was not valid JSON: Expecting property name",
    grounding_verified: false,
  });
  assert.equal(view.kind, "processing");
  assert.equal(canSubmitDecision({
    ...semantic,
    overall_classification: "REVIEW_NEEDED",
    uncertainty: "MALFORMED_MODEL_OUTPUT",
    reasoning: "Model output was not valid JSON: Expecting property name",
    grounding_verified: false,
  }, "PROSPECTIVE_REVISION"), false);
});

test("grounding failure blocks activation and allows decline", () => {
  const record = {
    ...semantic,
    overall_classification: "REVIEW_NEEDED",
    failure_stage: "GROUNDING",
    grounding_verified: false,
    result_kind: "SEMANTIC",
  };
  assert.equal(viewAssessment(record).kind, "grounding");
  assert.equal(canSubmitDecision(record, "ACKNOWLEDGED_MATERIAL_CHANGE"), false);
  assert.equal(canSubmitDecision(record, "DECLINED"), true);
});

test("semantic permissions follow classification", () => {
  assert.equal(canSubmitDecision(semantic, "ACCEPTED_CLARIFICATION"), true);
  assert.equal(canSubmitDecision(semantic, "ACKNOWLEDGED_MATERIAL_CHANGE"), false);
  const material = { ...semantic, overall_classification: "MATERIAL_CHANGE" };
  assert.equal(canSubmitDecision(material, "ACCEPTED_CLARIFICATION"), false);
  assert.equal(canSubmitDecision(material, "PROSPECTIVE_REVISION"), true);
  assert.equal(canSubmitDecision(material, "ACKNOWLEDGED_MATERIAL_CHANGE"), true);
});
