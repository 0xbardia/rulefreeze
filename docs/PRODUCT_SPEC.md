# Product Specification — RuleFreeze

## 1. Vision & Problem Statement

"Understand when a rule clarification changes the rules."

During developer competitions, hackathons, and bounties, organizers often publish updates styled as "minor clarifications" or "FAQ updates". However, small phrasing tweaks often alter eligibility, shift scoring rubrics, or create unexpected deliverable requirements that harm participants.

RuleFreeze provides an authoritative public registry and semantic amendment review desk where:
- Registered rule baselines are cryptographically hashed and immutable.
- Organizers define concrete participant scenario probes.
- Amendments are evaluated by GenLayer consensus comparing old vs new outcomes for the exact same participant situations.
- Organizers cannot activate material changes under the guise of harmless clarifications.

---

## 2. Core Entities & Data Model

### A. Event
- `id`: Sequential identifier (e.g. `ev-1`).
- `organizer`: Verified caller address derived from `gl.message.sender_address`.
- `name`: Clean competition title (max 120 chars).
- `description`: Challenge summary (max 600 chars).
- `event_url`: Optional public contest link (max 300 chars).
- `declared_start`: Declared starting timestamp/date string.
- `declared_deadline`: Declared submission deadline string.
- `created_at`: Block/transaction timestamp of registration.
- `active_version_id`: Pointer to current active `RuleVersion` ID.
- `version_ids`: Append-only list of all version IDs in history.
- `amendment_ids`: Append-only list of all proposed amendments.

### B. Rule Version
- `id`: Sequential version identifier (e.g. `ver-1`).
- `event_id`: Reference to parent event.
- `version_number`: Integer starting at 1.
- `rule_text`: Full authoritative text of rules (max 24,000 chars).
- `content_hash`: SHA-256 of normalized text.
- `scenarios`: Bounded array of participant scenario probes (1 to 12).
- `creator`: Address that authored/activated this version.
- `parent_version_id`: Previous version ID (null for version 1).
- `activation_decision`: Decision record that activated this version (if version > 1).
- `notice`: Explicit statement that registration timestamp proves on-chain recording time, not prior existence.

### C. Participant Scenario Probe
- `id`: Stable identifier (e.g. `SC-1`).
- `title`: Short scenario title (max 120 chars).
- `situation`: Concrete factual situation of participant (max 800 chars).
- `question`: Precise question to evaluate (max 800 chars).
- `dimension`: One of `ELIGIBILITY`, `SCORING`, `DEADLINES`, `DELIVERABLES`, `OBLIGATIONS`, `PROCEDURES`, `DEFINITIONS`, `OTHER`.

### D. Proposed Amendment
- `id`: Sequential identifier (e.g. `amend-1`).
- `event_id`: Parent event ID.
- `base_version_id`: The active version against which proposal was authored.
- `base_hash`: Content hash of base version.
- `proposed_rules`: Full updated rules text.
- `proposed_hash`: Content hash of proposed rules.
- `explanation`: Reason for proposal (max 2,000 chars).
- `intended_scope`: `FUTURE_ONLY`, `CURRENT_PARTICIPANTS`, or `UNSPECIFIED`.
- `status`: `PENDING_ASSESSMENT`, `ASSESSED`, `ACTIVATED`, or `DECLINED`.
- `assessment_ids`: Append-only list of semantic assessment IDs.
- `decision`: Organizer decision record (if decided).

### E. Semantic Assessment
- `id`: Sequential identifier (e.g. `assess-1`).
- `amendment_id`: Reference to evaluated amendment.
- `base_version_id`: Base version ID.
- `base_hash` / `proposed_hash`: Verified content hashes.
- `schema_version`: Schema version (1).
- `policy_version`: Evaluation policy identifier (`rulefreeze-eval-v1.0`).
- `overall_classification`: `NO_MATERIAL_CHANGE`, `MATERIAL_CHANGE`, `REVIEW_NEEDED`, or `INSUFFICIENT_INFORMATION`.
- `changed_dimensions`: Array of affected dimensions.
- `scenarios`: Per-scenario evaluation:
  - `old_outcome`: Outcome under old rules.
  - `new_outcome`: Outcome under proposed rules.
  - `outcome_changed`: Boolean flag.
  - `rule_references`: Verbatim quotation citations from rule text.
  - `explanation`: Scenario-level rationale.
  - `missing_facts`: Missing information noted.
- `reasoning`: Overall consensus reasoning.
- `uncertainty`: Noted ambiguities or retroactive risks.
- `grounding_verified`: Deterministic check confirming quoted citations exist in source text.
- `assessed_at`: Evaluation timestamp.

### F. Organizer Decision
- `type`: `ACCEPTED_CLARIFICATION`, `ACKNOWLEDGED_MATERIAL_CHANGE`, `PROSPECTIVE_REVISION`, or `DECLINED`.
- `rationale`: Public rationale explaining decision (min 15 chars, max 1,200 chars).
- `decided_by`: Verified organizer address.
- `decided_at`: Timestamp.

---

## 3. State Invariants

1. **Text Immutability:** Once registered, rule text cannot be modified or deleted.
2. **Deterministic Sequence:** Identifiers (`ev-N`, `ver-N`, `amend-N`, `assess-N`) are strictly sequential.
3. **Organizer Exclusivity:** Only the event organizer can propose amendments and record activation decisions.
4. **Stale Base Rejection:** An amendment can only be activated if its `base_version_id` matches the event's `active_version_id`. If another amendment was activated in the interim, the transaction reverts with `STALE_BASE_VERSION`.
5. **No Silent Whitewashing:** If an assessment finds `MATERIAL_CHANGE` or `REVIEW_NEEDED`, the contract strictly rejects `ACCEPTED_CLARIFICATION`. The organizer must use `ACKNOWLEDGED_MATERIAL_CHANGE` or `PROSPECTIVE_REVISION` with explicit public rationale.
6. **No Self-Identical Amendments:** Proposing an amendment whose content hash is identical to base rules is rejected with `NO_TEXT_CHANGE`.
7. **Local Draft Isolation:** Deleting a draft in IndexedDB has zero effect on on-chain records.
