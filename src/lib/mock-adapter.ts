// RuleFreeze Mock / Demo Adapter
// Separated fixture corpus and in-memory engine. Every record explicitly labeled [DEMO].

import type {
  AmendmentRecord,
  AssessmentRecord,
  ContractPolicy,
  EventRecord,
  EventSummary,
  IntendedScope,
  OrganizerDecisionType,
  ParticipantScenario,
  RuleVersion,
} from "./types.ts";

export const DEMO_POLICY: ContractPolicy = {
  contract_version: "1.0.0-demo",
  schema_version: 1,
  evaluation_policy_version: "rulefreeze-eval-v1.0-demo",
  policy_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  policy_document: "RuleFreeze Demo Policy: All demonstration fixtures are synthetic simulations.",
  valid_classifications: [
    "NO_MATERIAL_CHANGE",
    "MATERIAL_CHANGE",
    "REVIEW_NEEDED",
    "INSUFFICIENT_INFORMATION",
  ],
  valid_dimensions: [
    "ELIGIBILITY",
    "SCORING",
    "DEADLINES",
    "DELIVERABLES",
    "OBLIGATIONS",
    "PROCEDURES",
    "DEFINITIONS",
    "OTHER",
  ],
  valid_scopes: ["FUTURE_ONLY", "CURRENT_PARTICIPANTS", "UNSPECIFIED"],
  valid_decisions: [
    "ACCEPTED_CLARIFICATION",
    "PROSPECTIVE_REVISION",
    "ACKNOWLEDGED_MATERIAL_CHANGE",
    "DECLINED",
  ],
};

const INITIAL_DEMO_EVENTS: Record<string, EventRecord> = {
  "demo-ev-1": {
    id: "demo-ev-1",
    organizer: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    name: "[DEMO] GenLayer Winter Hackathon 2026",
    description: "Official global hackathon for intelligent contract development.",
    event_url: "https://demo.hackathon.genlayer.com",
    declared_start: "2026-11-01T00:00:00Z",
    declared_deadline: "2026-11-15T23:59:59Z",
    created_at: 1762000000,
    active_version_id: "demo-ver-1",
    version_ids: ["demo-ver-1"],
    amendment_ids: ["demo-amend-1", "demo-amend-2"],
  },
  "demo-ev-2": {
    id: "demo-ev-2",
    organizer: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    name: "[DEMO] AI Safety & Bounded Oracles Bounty",
    description: "Developer bounty for verifiable AI consensus and prompt injection immunity.",
    event_url: "https://demo.bounties.genlayer.com/ai-safety",
    declared_start: "2026-10-15T12:00:00Z",
    declared_deadline: "2026-11-30T18:00:00Z",
    created_at: 1760500000,
    active_version_id: "demo-ver-3",
    version_ids: ["demo-ver-3"],
    amendment_ids: ["demo-amend-3"],
  },
};

const INITIAL_DEMO_VERSIONS: Record<string, RuleVersion> = {
  "demo-ver-1": {
    id: "demo-ver-1",
    event_id: "demo-ev-1",
    version_number: 1,
    rule_text: `1. Eligibility: Open to all builders worldwide. Teams up to 4 members. One entry per participant; multiple wallets do not create additional participant identities.
2. Deliverables: Public repository with open source license and verifiable test suite.
3. Deadlines: Final submissions due Friday Nov 15 before 23:59 UTC.
4. Scoring: Functionality (70%), Architecture & Security (30%).`,
    content_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    scenarios: [
      {
        id: "SC-1",
        title: "Team of 4 submitting GitHub repo",
        situation: "Team of 4 submits repository on Friday at 20:00 UTC.",
        question: "Is the submission eligible and timely?",
        dimension: "ELIGIBILITY",
      },
      {
        id: "SC-2",
        title: "Single builder using two wallet addresses",
        situation: "A developer submits two separate entries using two wallet keys.",
        question: "Can both submissions be counted?",
        dimension: "ELIGIBILITY",
      },
      {
        id: "SC-3",
        title: "Submission without live web frontend",
        situation: "Developer provides public repository and test suite without a hosted website URL.",
        question: "Does deliverable satisfy baseline rules?",
        dimension: "DELIVERABLES",
      },
    ],
    created_at: 1762000000,
    creator: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    parent_version_id: null,
    notice: "[DEMO] Registration time is synthetic simulation time.",
  },
  "demo-ver-3": {
    id: "demo-ver-3",
    event_id: "demo-ev-2",
    version_number: 1,
    rule_text: "1. Must submit before deadline.\n2. Projects must be open source under MIT.",
    content_hash: "f0e1d2c3b4a596877890123456789abcdef0123456789abcdef0123456789abc",
    scenarios: [
      {
        id: "SC-1",
        title: "Closed-source demo",
        situation: "Participant submits binary without source code.",
        question: "Is submission eligible?",
        dimension: "OBLIGATIONS",
      },
    ],
    created_at: 1760500000,
    creator: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    parent_version_id: null,
    notice: "[DEMO] Registration time is synthetic simulation time.",
  },
};

const INITIAL_DEMO_AMENDMENTS: Record<string, AmendmentRecord> = {
  "demo-amend-1": {
    id: "demo-amend-1",
    event_id: "demo-ev-1",
    base_version_id: "demo-ver-1",
    base_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    proposed_rules: `1. Eligibility: Open to all builders worldwide. Teams up to 4 members. Clarification: A person using two wallets still has only one entry.
2. Deliverables: Public repository with open source license and verifiable test suite.
3. Deadlines: Final submissions due Friday Nov 15 before 23:59 UTC.
4. Scoring: Functionality (70%), Architecture & Security (30%).`,
    proposed_hash: "b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
    explanation: "Explicitly clarify that multiple wallet addresses controlled by one person cannot submit multiple independent entries.",
    intended_scope: "CURRENT_PARTICIPANTS",
    created_at: 1762100000,
    proposer: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    status: "ASSESSED",
    assessment_ids: ["demo-assess-1"],
    decision: null,
  },
  "demo-amend-2": {
    id: "demo-amend-2",
    event_id: "demo-ev-1",
    base_version_id: "demo-ver-1",
    base_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    proposed_rules: `1. Eligibility: Open to all builders worldwide. Teams up to 4 members.
2. Deliverables: Public repository plus live hosted frontend URL required.
3. Deadlines: Final submissions due Friday Nov 15 before 23:59 UTC.
4. Scoring: Functionality (40%), Design & UI (60%).`,
    proposed_hash: "c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012",
    explanation: "Require live hosted frontend deployment and re-weight scoring towards UI and visual polish.",
    intended_scope: "CURRENT_PARTICIPANTS",
    created_at: 1762200000,
    proposer: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    status: "ASSESSED",
    assessment_ids: ["demo-assess-2"],
    decision: null,
  },
  "demo-amend-3": {
    id: "demo-amend-3",
    event_id: "demo-ev-2",
    base_version_id: "demo-ver-3",
    base_hash: "f0e1d2c3b4a596877890123456789abcdef0123456789abcdef0123456789abc",
    proposed_rules: "1. Must submit by Friday at 17:00 UTC.\n2. Projects must be open source under MIT.",
    proposed_hash: "d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123",
    explanation: "Add explicit 17:00 UTC cutoff to Friday submission deadline.",
    intended_scope: "CURRENT_PARTICIPANTS",
    created_at: 1760600000,
    proposer: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    status: "ASSESSED",
    assessment_ids: ["demo-assess-3"],
    decision: null,
  },
};

const INITIAL_DEMO_ASSESSMENTS: Record<string, AssessmentRecord> = {
  "demo-assess-1": {
    id: "demo-assess-1",
    amendment_id: "demo-amend-1",
    event_id: "demo-ev-1",
    base_version_id: "demo-ver-1",
    base_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    proposed_hash: "b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
    schema_version: 1,
    policy_version: "rulefreeze-eval-v1.0-demo",
    overall_classification: "NO_MATERIAL_CHANGE",
    changed_dimensions: [],
    scenarios: [
      {
        scenario_id: "SC-1",
        old_outcome: "ELIGIBLE",
        new_outcome: "ELIGIBLE",
        outcome_changed: false,
        rule_references: ["Teams up to 4 members."],
        explanation: "Team size limit unchanged.",
        missing_facts: "",
      },
      {
        scenario_id: "SC-2",
        old_outcome: "ONE_ENTRY_ONLY",
        new_outcome: "ONE_ENTRY_ONLY",
        outcome_changed: false,
        rule_references: [
          "One entry per participant; multiple wallets do not create additional participant identities.",
          "A person using two wallets still has only one entry.",
        ],
        explanation: "Old rule explicitly stated multiple wallets do not multiply identity; amendment is a direct paraphrase.",
        missing_facts: "",
      },
      {
        scenario_id: "SC-3",
        old_outcome: "DELIVERABLE_SATISFIED",
        new_outcome: "DELIVERABLE_SATISFIED",
        outcome_changed: false,
        rule_references: ["Public repository with open source license"],
        explanation: "Deliverables requirements identical.",
        missing_facts: "",
      },
    ],
    reasoning: "The proposed amendment paraphrases the existing one-entry rule. No rights, criteria, deadlines, or scoring altered.",
    uncertainty: "None identified. Verbatim rule support confirmed.",
    grounding_verified: true,
    assessed_at: 1762100050,
  },
  "demo-assess-2": {
    id: "demo-assess-2",
    amendment_id: "demo-amend-2",
    event_id: "demo-ev-1",
    base_version_id: "demo-ver-1",
    base_hash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    proposed_hash: "c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012",
    schema_version: 1,
    policy_version: "rulefreeze-eval-v1.0-demo",
    overall_classification: "MATERIAL_CHANGE",
    changed_dimensions: ["DELIVERABLES", "SCORING"],
    scenarios: [
      {
        scenario_id: "SC-1",
        old_outcome: "ELIGIBLE",
        new_outcome: "REQUIRES_FRONTEND",
        outcome_changed: true,
        rule_references: ["live hosted frontend URL required"],
        explanation: "A team that only planned a CLI or backend tool must now build and host a web frontend.",
        missing_facts: "",
      },
      {
        scenario_id: "SC-2",
        old_outcome: "ONE_ENTRY_ONLY",
        new_outcome: "ONE_ENTRY_ONLY",
        outcome_changed: false,
        rule_references: ["One entry per participant"],
        explanation: "Wallet identity limits unchanged.",
        missing_facts: "",
      },
      {
        scenario_id: "SC-3",
        old_outcome: "SATISFIED",
        new_outcome: "DISQUALIFIED_OR_DEFICIENT",
        outcome_changed: true,
        rule_references: ["Public repository plus live hosted frontend URL required."],
        explanation: "Under Old Rules, a public repo satisfied deliverables. Under New Rules, failure to provide live frontend fails required deliverables.",
        missing_facts: "",
      },
    ],
    reasoning: "Material change identified on two dimensions: (1) Deliverables added a mandatory live frontend; (2) Scoring shifted from Functionality (70%) to Design (60%).",
    uncertainty: "Ongoing participants without UI engineering skills face immediate disadvantage.",
    grounding_verified: true,
    assessed_at: 1762200050,
  },
  "demo-assess-3": {
    id: "demo-assess-3",
    amendment_id: "demo-amend-3",
    event_id: "demo-ev-2",
    base_version_id: "demo-ver-3",
    base_hash: "f0e1d2c3b4a596877890123456789abcdef0123456789abcdef0123456789abc",
    proposed_hash: "d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123",
    schema_version: 1,
    policy_version: "rulefreeze-eval-v1.0-demo",
    overall_classification: "REVIEW_NEEDED",
    changed_dimensions: ["DEADLINES"],
    scenarios: [
      {
        scenario_id: "SC-1",
        old_outcome: "UNDETERMINED_DEADLINE",
        new_outcome: "STRICT_1700_UTC",
        outcome_changed: true,
        rule_references: ["Submit by Friday at 17:00 UTC."],
        explanation: "The original rule had no hour/timezone specified. Adding 17:00 UTC may cut off builders in Asian or American timezones who expected until midnight.",
        missing_facts: "Original organizer intention on time-of-day cutoff was unstated.",
      },
    ],
    reasoning: "Adding an exact hour to an un-anchored day deadline is ambiguous and can disenfranchise participants working until end of day.",
    uncertainty: "Substantive deadline shortening depending on participant local timezone.",
    grounding_verified: true,
    assessed_at: 1760600050,
  },
};

// In-memory demo state copy
let demoEvents: Record<string, EventRecord> = { ...INITIAL_DEMO_EVENTS };
let demoVersions: Record<string, RuleVersion> = { ...INITIAL_DEMO_VERSIONS };
let demoAmendments: Record<string, AmendmentRecord> = { ...INITIAL_DEMO_AMENDMENTS };
let demoAssessments: Record<string, AssessmentRecord> = { ...INITIAL_DEMO_ASSESSMENTS };

export async function mockFetchPolicy(): Promise<ContractPolicy> {
  return DEMO_POLICY;
}

export async function mockFetchEventCount(): Promise<number> {
  return Object.keys(demoEvents).length;
}

export async function mockFetchEvents(
  offset = 0,
  limit = 20
): Promise<{ total: number; offset: number; limit: number; events: EventSummary[] }> {
  const allEvents = Object.values(demoEvents);
  const total = allEvents.length;
  const paged = allEvents.slice(offset, offset + limit).map((ev) => ({
    id: ev.id,
    name: ev.name,
    description: ev.description,
    organizer: ev.organizer,
    active_version_id: ev.active_version_id,
    version_count: ev.version_ids.length,
    amendment_count: ev.amendment_ids.length,
    created_at: ev.created_at,
    declared_deadline: ev.declared_deadline,
  }));
  return { total, offset, limit, events: paged };
}

export async function mockFetchEvent(eventId: string): Promise<EventRecord> {
  const ev = demoEvents[eventId];
  if (!ev) throw new Error(`[DEMO] Event ${eventId} not found`);
  return ev;
}

export async function mockFetchRuleVersion(versionId: string): Promise<RuleVersion> {
  const v = demoVersions[versionId];
  if (!v) throw new Error(`[DEMO] RuleVersion ${versionId} not found`);
  return v;
}

export async function mockFetchEventVersions(eventId: string): Promise<RuleVersion[]> {
  const ev = await mockFetchEvent(eventId);
  return ev.version_ids.map((id) => demoVersions[id]).filter(Boolean) as RuleVersion[];
}

export async function mockFetchAmendment(amendmentId: string): Promise<AmendmentRecord> {
  const a = demoAmendments[amendmentId];
  if (!a) throw new Error(`[DEMO] Amendment ${amendmentId} not found`);
  return a;
}

export async function mockFetchEventAmendments(eventId: string): Promise<AmendmentRecord[]> {
  const ev = await mockFetchEvent(eventId);
  return ev.amendment_ids.map((id) => demoAmendments[id]).filter(Boolean) as AmendmentRecord[];
}

export async function mockFetchAssessment(assessmentId: string): Promise<AssessmentRecord> {
  const assess = demoAssessments[assessmentId];
  if (!assess) throw new Error(`[DEMO] Assessment ${assessmentId} not found`);
  return assess;
}

export async function mockRegisterEvent(
  account: string,
  name: string,
  description: string,
  event_url: string,
  declared_start: string,
  declared_deadline: string,
  initial_rules: string,
  scenarios: ParticipantScenario[]
): Promise<string> {
  const nextIdx = Object.keys(demoEvents).length + 1;
  const eventId = `demo-ev-${nextIdx}`;
  const versionId = `demo-ver-${nextIdx * 2}`;

  const v1: RuleVersion = {
    id: versionId,
    event_id: eventId,
    version_number: 1,
    rule_text: initial_rules,
    content_hash: `demo-hash-${Date.now()}`,
    scenarios,
    created_at: Math.floor(Date.now() / 1000),
    creator: account,
    parent_version_id: null,
    notice: "[DEMO] Synthetic event baseline.",
  };
  demoVersions[versionId] = v1;

  const ev: EventRecord = {
    id: eventId,
    organizer: account,
    name: name.startsWith("[DEMO]") ? name : `[DEMO] ${name}`,
    description,
    event_url,
    declared_start,
    declared_deadline,
    created_at: Math.floor(Date.now() / 1000),
    active_version_id: versionId,
    version_ids: [versionId],
    amendment_ids: [],
  };
  demoEvents[eventId] = ev;

  return eventId;
}

export async function mockProposeAmendment(
  account: string,
  eventId: string,
  baseVersionId: string,
  proposedRules: string,
  explanation: string,
  scope: IntendedScope
): Promise<string> {
  const ev = demoEvents[eventId];
  if (!ev) throw new Error("[DEMO] Event not found");
  if (ev.active_version_id !== baseVersionId) {
    throw new Error(`[DEMO] STALE_BASE_VERSION: Base ${baseVersionId} is not active ${ev.active_version_id}`);
  }

  const nextIdx = Object.keys(demoAmendments).length + 1;
  const amendId = `demo-amend-${nextIdx}`;

  const amend: AmendmentRecord = {
    id: amendId,
    event_id: eventId,
    base_version_id: baseVersionId,
    base_hash: "demo-base-hash",
    proposed_rules: proposedRules,
    proposed_hash: `demo-prop-hash-${Date.now()}`,
    explanation,
    intended_scope: scope,
    created_at: Math.floor(Date.now() / 1000),
    proposer: account,
    status: "PENDING_ASSESSMENT",
    assessment_ids: [],
    decision: null,
  };
  demoAmendments[amendId] = amend;
  ev.amendment_ids.push(amendId);
  return amendId;
}

export async function mockAssessAmendment(amendmentId: string): Promise<string> {
  const amend = demoAmendments[amendmentId];
  if (!amend) throw new Error("[DEMO] Amendment not found");

  const nextIdx = Object.keys(demoAssessments).length + 1;
  const assessId = `demo-assess-${nextIdx}`;

  // Heuristic mock evaluation for interactive demonstration
  const isTyposOnly = amend.explanation.toLowerCase().includes("typo") || amend.explanation.toLowerCase().includes("clarif");
  const overall = isTyposOnly ? "NO_MATERIAL_CHANGE" : "MATERIAL_CHANGE";

  const assessment: AssessmentRecord = {
    id: assessId,
    amendment_id: amendmentId,
    event_id: amend.event_id,
    base_version_id: amend.base_version_id,
    base_hash: amend.base_hash,
    proposed_hash: amend.proposed_hash,
    schema_version: 1,
    policy_version: "rulefreeze-eval-v1.0-demo",
    overall_classification: overall,
    changed_dimensions: isTyposOnly ? [] : ["DELIVERABLES", "OBLIGATIONS"],
    scenarios: [
      {
        scenario_id: "SC-1",
        old_outcome: "ELIGIBLE",
        new_outcome: isTyposOnly ? "ELIGIBLE" : "CONDITIONAL",
        outcome_changed: !isTyposOnly,
        rule_references: [amend.proposed_rules.slice(0, 80)],
        explanation: "[DEMO] Synthetic scenario evaluation.",
        missing_facts: "",
      },
    ],
    reasoning: `[DEMO] Evaluated amendment: ${overall}.`,
    uncertainty: isTyposOnly ? "None" : "[DEMO] Notice: Material changes detected.",
    grounding_verified: true,
    assessed_at: Math.floor(Date.now() / 1000),
  };

  demoAssessments[assessId] = assessment;
  amend.status = "ASSESSED";
  amend.assessment_ids.push(assessId);
  return assessId;
}

export async function mockDecideAmendment(
  account: string,
  amendmentId: string,
  decision: OrganizerDecisionType,
  rationale: string
): Promise<void> {
  const amend = demoAmendments[amendmentId];
  if (!amend) throw new Error("[DEMO] Amendment not found");
  const ev = demoEvents[amend.event_id];
  if (!ev) throw new Error("[DEMO] Event not found");

  if (ev.active_version_id !== amend.base_version_id) {
    throw new Error(`[DEMO] STALE_BASE_VERSION: Base ${amend.base_version_id} is no longer active.`);
  }

  const latestAssessId = amend.assessment_ids[amend.assessment_ids.length - 1];
  const assessment = latestAssessId ? demoAssessments[latestAssessId] : null;

  if (decision === "ACCEPTED_CLARIFICATION") {
    if (assessment && assessment.overall_classification !== "NO_MATERIAL_CHANGE") {
      throw new Error(
        `[DEMO] CANNOT_ACCEPT_AS_CLARIFICATION: Assessment is ${assessment.overall_classification}. Use ACKNOWLEDGED_MATERIAL_CHANGE with rationale.`
      );
    }
  }

  const decisionRecord = {
    type: decision,
    rationale,
    decided_by: account,
    decided_at: Math.floor(Date.now() / 1000),
    assessment_id: latestAssessId || "",
    assessment_classification: assessment?.overall_classification || "NO_MATERIAL_CHANGE",
  };
  amend.decision = decisionRecord;

  if (decision === "DECLINED") {
    amend.status = "DECLINED";
    return;
  }

  // Activate: create Version N+1
  const baseVer = demoVersions[amend.base_version_id];
  const nextVerNum = (baseVer?.version_number || 1) + 1;
  const newVerId = `demo-ver-${Date.now()}`;

  demoVersions[newVerId] = {
    id: newVerId,
    event_id: ev.id,
    version_number: nextVerNum,
    rule_text: amend.proposed_rules,
    content_hash: amend.proposed_hash,
    scenarios: baseVer?.scenarios || [],
    created_at: Math.floor(Date.now() / 1000),
    creator: account,
    parent_version_id: amend.base_version_id,
    activation_decision: decisionRecord,
    notice: "[DEMO] Activated amendment in demonstration mode.",
  };

  ev.active_version_id = newVerId;
  ev.version_ids.push(newVerId);
  amend.status = "ACTIVATED";
  amend.activated_version_id = newVerId;
}
