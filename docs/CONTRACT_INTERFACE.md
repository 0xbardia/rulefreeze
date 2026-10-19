# Contract Interface — RuleFreeze

Contract file: `X/contracts/main.py`
Dependency Header: `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`

---

## 1. Public Read Views (`@gl.public.view`)

### `get_policy() -> str`
- **Args:** None
- **Returns:** JSON string containing:
  - `contract_version`: String (`1.0.0`)
  - `schema_version`: Int (`1`)
  - `evaluation_policy_version`: String (`rulefreeze-eval-v1.0`)
  - `policy_hash`: SHA-256 hex string
  - `policy_document`: Full policy text
  - `valid_classifications`: List of 4 strings
  - `valid_dimensions`: List of 8 strings
  - `valid_scopes`: List of 3 strings
  - `valid_decisions`: List of 4 strings

### `get_event_count() -> int`
- **Args:** None
- **Returns:** Total number of events registered on-chain.

### `get_event(event_id: str) -> str`
- **Args:** `event_id` (e.g. `"ev-1"`)
- **Returns:** JSON serialized `EventRecord`.
- **Raises:** `EVENT_NOT_FOUND` if ID does not exist.

### `get_events(offset: int, limit: int) -> str`
- **Args:** `offset` (int >= 0), `limit` (int between 1 and 50)
- **Returns:** JSON string with `{"total": int, "offset": int, "limit": int, "events": [...]}` summary projections.

### `get_rule_version(version_id: str) -> str`
- **Args:** `version_id` (e.g. `"ver-1"`)
- **Returns:** JSON serialized `RuleVersion`.
- **Raises:** `VERSION_NOT_FOUND` if ID does not exist.

### `get_event_versions(event_id: str) -> str`
- **Args:** `event_id` (e.g. `"ev-1"`)
- **Returns:** JSON array of all `RuleVersion` objects recorded for the event.

### `get_amendment(amendment_id: str) -> str`
- **Args:** `amendment_id` (e.g. `"amend-1"`)
- **Returns:** JSON serialized `AmendmentRecord`.
- **Raises:** `AMENDMENT_NOT_FOUND` if ID does not exist.

### `get_event_amendments(event_id: str) -> str`
- **Args:** `event_id` (e.g. `"ev-1"`)
- **Returns:** JSON array of all `AmendmentRecord` objects proposed for the event.

### `get_assessment(assessment_id: str) -> str`
- **Args:** `assessment_id` (e.g. `"assess-1"`)
- **Returns:** JSON serialized `AssessmentRecord`.
- **Raises:** `ASSESSMENT_NOT_FOUND` if ID does not exist.

---

## 2. Public Write Methods (`@gl.public.write`)

### `register_event(...) -> str`
```python
def register_event(
    name: str,
    description: str,
    event_url: str,
    declared_start: str,
    declared_deadline: str,
    initial_rules: str,
    scenarios_json: str
) -> str
```
- **Caller:** Any address (becomes organizer of the event).
- **Behavior:**
  - Cleans and normalizes all fields.
  - Validates `scenarios_json` (1 to 12 scenario objects).
  - Computes SHA-256 hash of normalized initial rules.
  - Creates Version 1 as initial active version.
  - Allocates sequential `ev-N` and returns `event_id`.

### `propose_amendment(...) -> str`
```python
def propose_amendment(
    event_id: str,
    base_version_id: str,
    proposed_rules: str,
    explanation: str,
    intended_scope: str
) -> str
```
- **Caller:** Must match `event.organizer`.
- **Behavior:**
  - Verifies `caller == event.organizer` (`UNAUTHORIZED_CALLER`).
  - Verifies `base_version_id == event.active_version_id` (`STALE_BASE_VERSION`).
  - Verifies proposed rules differ from base rules (`NO_TEXT_CHANGE`).
  - Validates `intended_scope` (`FUTURE_ONLY`, `CURRENT_PARTICIPANTS`, `UNSPECIFIED`).
  - Allocates sequential `amend-N` and returns `amendment_id`.

### `assess_amendment(...) -> str`
```python
def assess_amendment(amendment_id: str) -> str
```
- **Caller:** Any public participant or organizer.
- **Behavior:**
  - Loads amendment, base version rules, and immutable scenarios.
  - Replay protection: Returns existing assessment if already evaluated.
  - Hoists prompt and executes `gl.nondet.exec_prompt`.
  - Runs `gl.eq_principle.prompt_comparative` equivalence consensus.
  - Deterministically validates schema and verifies that cited excerpts exist verbatim in source text.
  - Saves `AssessmentRecord` and marks amendment status as `ASSESSED`.
  - Returns `assessment_id`.

### `decide_amendment(...) -> None`
```python
def decide_amendment(amendment_id: str, decision: str, rationale: str) -> None
```
- **Caller:** Must match `event.organizer`.
- **Behavior:**
  - Verifies `caller == event.organizer`.
  - Verifies amendment's base version is STILL currently active (`STALE_BASE_VERSION`).
  - Verifies amendment status is `ASSESSED`.
  - Validates `decision` in `{"ACCEPTED_CLARIFICATION", "ACKNOWLEDGED_MATERIAL_CHANGE", "PROSPECTIVE_REVISION", "DECLINED"}`.
  - Enforces minimum rationale length (>= 15 chars).
  - Invariant: Rejects `ACCEPTED_CLARIFICATION` if assessment is `MATERIAL_CHANGE` or `REVIEW_NEEDED`.
  - If activating: Creates Version N+1 with proposed text and activates it.
  - If declining: Sets amendment status to `DECLINED`.
