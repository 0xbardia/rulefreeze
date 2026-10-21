// RuleFreeze Core Domain & Transaction Types

export type IntendedScope = "FUTURE_ONLY" | "CURRENT_PARTICIPANTS" | "UNSPECIFIED";

export type OverallClassification =
  | "NO_MATERIAL_CHANGE"
  | "MATERIAL_CHANGE"
  | "REVIEW_NEEDED"
  | "INSUFFICIENT_INFORMATION";

export type RuleDimension =
  | "ELIGIBILITY"
  | "SCORING"
  | "DEADLINES"
  | "DELIVERABLES"
  | "OBLIGATIONS"
  | "PROCEDURES"
  | "DEFINITIONS"
  | "OTHER";

export type OrganizerDecisionType =
  | "ACCEPTED_CLARIFICATION"
  | "PROSPECTIVE_REVISION"
  | "ACKNOWLEDGED_MATERIAL_CHANGE"
  | "DECLINED";

export interface ParticipantScenario {
  id: string;
  title: string;
  situation: string;
  question: string;
  dimension: RuleDimension;
}

export interface ScenarioAssessmentResult {
  scenario_id: string;
  old_outcome: string;
  new_outcome: string;
  outcome_changed: boolean;
  rule_references: string[];
  explanation: string;
  missing_facts: string;
}

export interface AssessmentRecord {
  id: string;
  amendment_id: string;
  event_id: string;
  base_version_id: string;
  base_hash: string;
  proposed_hash: string;
  schema_version: number;
  policy_version: string;
  result_kind?: "SEMANTIC" | "PROCESSING_FAILURE";
  failure_stage?: string;
  overall_classification: OverallClassification | "";
  changed_dimensions: RuleDimension[];
  scenarios: ScenarioAssessmentResult[];
  reasoning: string;
  uncertainty: string;
  grounding_verified: boolean;
  assessed_at: number;
}

export interface OrganizerDecisionRecord {
  type: OrganizerDecisionType;
  rationale: string;
  decided_by: string;
  decided_at: number;
  assessment_id: string;
  assessment_classification: OverallClassification;
}

export interface RuleVersion {
  id: string;
  event_id: string;
  version_number: number;
  rule_text: string;
  content_hash: string;
  scenarios: ParticipantScenario[];
  created_at: number;
  creator: string;
  parent_version_id: string | null;
  activation_decision?: OrganizerDecisionRecord;
  notice: string;
}

export type AmendmentStatus =
  | "PENDING_ASSESSMENT"
  | "ASSESSED"
  | "ACTIVATED"
  | "DECLINED";

export interface AmendmentRecord {
  id: string;
  event_id: string;
  base_version_id: string;
  base_hash: string;
  proposed_rules: string;
  proposed_hash: string;
  explanation: string;
  intended_scope: IntendedScope;
  created_at: number;
  proposer: string;
  status: AmendmentStatus;
  assessment_ids: string[];
  decision?: OrganizerDecisionRecord | null;
  activated_version_id?: string;
}

export interface EventRecord {
  id: string;
  organizer: string;
  name: string;
  description: string;
  event_url?: string;
  declared_start?: string;
  declared_deadline?: string;
  created_at: number;
  active_version_id: string;
  version_ids: string[];
  amendment_ids: string[];
}

export interface EventSummary {
  id: string;
  name: string;
  description: string;
  organizer: string;
  active_version_id: string;
  version_count: number;
  amendment_count: number;
  created_at: number;
  declared_deadline?: string;
}

export interface ContractPolicy {
  contract_version: string;
  schema_version: number;
  evaluation_policy_version: string;
  policy_hash: string;
  policy_document: string;
  valid_classifications: OverallClassification[];
  valid_dimensions: RuleDimension[];
  valid_scopes: IntendedScope[];
  valid_decisions: OrganizerDecisionType[];
}

// --------------------------------------------------------------------------------------
// Transaction Lifecycle Types
// --------------------------------------------------------------------------------------

export type ChainTxStatus =
  | "IDLE"
  | "AWAITING_WALLET"
  | "USER_REJECTED"
  | "SUBMITTED"
  | "PENDING_NETWORK"
  | "ACCEPTED"
  | "FINALIZED"
  | "EXECUTION_FAILURE"
  | "EXECUTION_UNKNOWN"
  | "CONSENSUS_DISAGREEMENT"
  | "TIMEOUT"
  | "RPC_UNAVAILABLE";

export interface ChainTxRecord {
  txHash: string;
  method: string;
  argsSummary: string;
  status: ChainTxStatus;
  submittedAt: number;
  confirmedAt?: number;
  error?: string;
  protocolStatus?: string;
  consensusResult?: string;
  executionResult?: "SUCCESS" | "FAILURE" | "UNKNOWN";
  executionContradictions?: string[];
  validatorVotes?: string[];
  entityId?: string;
  contractAddress: string;
  chainId: number;
  account: string;
}

// --------------------------------------------------------------------------------------
// IndexedDB Local Draft Types
// --------------------------------------------------------------------------------------

export interface EventDraft {
  id: string; // local draft UUID
  name: string;
  description: string;
  event_url: string;
  declared_start: string;
  declared_deadline: string;
  initial_rules: string;
  scenarios: ParticipantScenario[];
  account: string;
  contractAddress?: string;
  updatedAt: number;
}

export interface AmendmentDraft {
  id: string; // local draft UUID
  event_id: string;
  base_version_id: string;
  proposed_rules: string;
  explanation: string;
  intended_scope: IntendedScope;
  account: string;
  contractAddress?: string;
  updatedAt: number;
}

export interface PublicConfigResponse {
  contractAddress: string | null;
  rpcUrl: string;
  chainId: number;
  isConfigured: boolean;
  isLiveReady: boolean;
  networkName: string;
}
