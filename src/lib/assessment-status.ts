import type { AssessmentRecord, OrganizerDecisionType } from "./types.ts";

const PROCESSING_STAGES = new Set(["OUTPUT_FORMAT", "SCHEMA", "PROVIDER", "EMPTY", "TYPE"]);

export type AssessmentView =
  | { kind: "processing"; stage: string; detail: string }
  | { kind: "grounding"; classification: string }
  | { kind: "semantic"; classification: string };

export function viewAssessment(assessment: AssessmentRecord): AssessmentView {
  const stage = assessment.failure_stage || "";
  const malformed =
    assessment.uncertainty === "MALFORMED_MODEL_OUTPUT" ||
    (assessment.reasoning || "").startsWith("Model output was not valid JSON");
  if (
    assessment.result_kind === "PROCESSING_FAILURE" ||
    malformed ||
    PROCESSING_STAGES.has(stage)
  ) {
    return {
      kind: "processing",
      stage: stage || "OUTPUT_FORMAT",
      detail: assessment.reasoning || assessment.uncertainty || "Assessment processing failed.",
    };
  }
  if (stage === "GROUNDING" || assessment.grounding_verified === false) {
    return { kind: "grounding", classification: assessment.overall_classification || "UNGROUNDED" };
  }
  return { kind: "semantic", classification: assessment.overall_classification };
}

export function canSubmitDecision(
  assessment: AssessmentRecord | null,
  decision: OrganizerDecisionType
): boolean {
  if (decision === "DECLINED") return true;
  if (!assessment) return false;
  const view = viewAssessment(assessment);
  if (view.kind !== "semantic") return false;
  if (decision === "ACCEPTED_CLARIFICATION") return view.classification === "NO_MATERIAL_CHANGE";
  if (decision === "ACKNOWLEDGED_MATERIAL_CHANGE" || decision === "PROSPECTIVE_REVISION") {
    return view.classification === "MATERIAL_CHANGE" || view.classification === "REVIEW_NEEDED" || view.classification === "INSUFFICIENT_INFORMATION";
  }
  return false;
}
