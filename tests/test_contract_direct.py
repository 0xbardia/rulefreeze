from __future__ import annotations

import json
import pytest

CONTRACT = "contracts/main.py"

SAMPLE_SCENARIOS = json.dumps([
    {
        "id": "SC-1",
        "title": "Solo builder submitting public repo",
        "situation": "Participant works alone and provides a public GitHub repo.",
        "question": "Is the submission eligible?",
        "dimension": "ELIGIBILITY"
    },
    {
        "id": "SC-2",
        "title": "Team of 6 participants",
        "situation": "Team consists of 6 developers.",
        "question": "Does team size exceed limit?",
        "dimension": "ELIGIBILITY"
    }
])


def test_deploy_and_policy(direct_deploy):
    c = direct_deploy(CONTRACT)
    pol_raw = c.get_policy()
    policy = json.loads(pol_raw)
    assert policy["contract_version"] == "1.0.0"
    assert policy["schema_version"] == 1
    assert "NO_MATERIAL_CHANGE" in policy["valid_classifications"]
    assert "MATERIAL_CHANGE" in policy["valid_classifications"]
    assert "ELIGIBILITY" in policy["valid_dimensions"]
    assert len(policy["policy_hash"]) == 64
    assert c.get_event_count() == 0


def test_register_event_and_immutability(direct_deploy, direct_vm):
    c = direct_deploy(CONTRACT)
    rules_v1 = "1. Must submit a public repository.\n2. Teams allowed up to 4 members."
    event_id = c.register_event(
        "GenLayer Winter Hackathon",
        "Official hackathon for intelligent contracts",
        "https://genlayer.com/hackathon",
        "2026-11-01T00:00:00Z",
        "2026-11-15T23:59:59Z",
        rules_v1,
        SAMPLE_SCENARIOS
    )
    assert event_id == "ev-1"
    assert c.get_event_count() == 1

    ev = json.loads(c.get_event("ev-1"))
    assert ev["id"] == "ev-1"
    assert ev["name"] == "GenLayer Winter Hackathon"
    assert ev["active_version_id"] == "ver-1"
    assert len(ev["version_ids"]) == 1

    v1 = json.loads(c.get_rule_version("ver-1"))
    assert v1["id"] == "ver-1"
    assert v1["version_number"] == 1
    assert v1["rule_text"] == rules_v1
    assert len(v1["content_hash"]) == 64
    assert len(v1["scenarios"]) == 2
    assert "Registration time is on-chain recording time" in v1["notice"]


def test_propose_amendment_authorization(direct_deploy, direct_vm):
    c = direct_deploy(CONTRACT)
    c.register_event(
        "Bounty A",
        "Test bounty",
        "",
        "",
        "",
        "Rules: Original baseline text.",
        SAMPLE_SCENARIOS
    )

    # Change VM sender to another address
    original_sender = direct_vm.sender
    direct_vm.sender = b"\x11" * 20

    with pytest.raises(Exception) as excinfo:
        c.propose_amendment(
            "ev-1",
            "ver-1",
            "Rules: Malicious unauthorized amendment.",
            "Unauthorized attempt",
            "FUTURE_ONLY"
        )
    assert "UNAUTHORIZED_CALLER" in str(excinfo.value)

    # Restore sender
    direct_vm.sender = original_sender


def test_propose_amendment_stale_base_and_no_change(direct_deploy, direct_vm):
    c = direct_deploy(CONTRACT)
    initial_text = "Rules: Clean baseline."
    c.register_event("Event B", "", "", "", "", initial_text, SAMPLE_SCENARIOS)

    # Rejects identical content
    with pytest.raises(Exception) as excinfo:
        c.propose_amendment("ev-1", "ver-1", initial_text, "No change", "FUTURE_ONLY")
    assert "NO_TEXT_CHANGE" in str(excinfo.value)

    # Rejects non-existent / stale base version
    with pytest.raises(Exception) as excinfo:
        c.propose_amendment("ev-1", "ver-999", "Rules: Different.", "Attempt", "FUTURE_ONLY")
    assert "STALE_BASE_VERSION" in str(excinfo.value)


def test_amendment_lifecycle_and_activation(direct_deploy, direct_vm):
    c = direct_deploy(CONTRACT)
    c.register_event(
        "Event C",
        "Testing activation",
        "",
        "",
        "",
        "Rules: Submit repo before Friday.",
        SAMPLE_SCENARIOS
    )

    amend_id = c.propose_amendment(
        "ev-1",
        "ver-1",
        "Rules: Submit public repo before Friday at 23:59 UTC.",
        "Clarifying deadline timezone",
        "CURRENT_PARTICIPANTS"
    )
    assert amend_id == "amend-1"

    amend = json.loads(c.get_amendment(amend_id))
    assert amend["status"] == "PENDING_ASSESSMENT"

    # Mock assessment directly in contract storage for deterministic state machine testing
    c.assessments["assess-1"] = json.dumps({
        "id": "assess-1",
        "amendment_id": "amend-1",
        "event_id": "ev-1",
        "base_version_id": "ver-1",
        "base_hash": amend["base_hash"],
        "proposed_hash": amend["proposed_hash"],
        "schema_version": 1,
        "policy_version": "rulefreeze-eval-v1.0",
        "overall_classification": "NO_MATERIAL_CHANGE",
        "changed_dimensions": ["DEADLINES"],
        "scenarios": [],
        "reasoning": "Clarified explicit UTC timezone matching implied intent.",
        "uncertainty": "",
        "grounding_verified": True,
        "assessed_at": 1700000000
    })
    amend["status"] = "ASSESSED"
    amend["assessment_ids"] = ["assess-1"]
    c.amendments["amend-1"] = json.dumps(amend)

    # Activation as ACCEPTED_CLARIFICATION succeeds when NO_MATERIAL_CHANGE
    c.decide_amendment("amend-1", "ACCEPTED_CLARIFICATION", "Approved after review.")

    # Verify event state updated
    ev = json.loads(c.get_event("ev-1"))
    assert ev["active_version_id"] == "ver-2"
    assert len(ev["version_ids"]) == 2

    # Verify new active version
    v2 = json.loads(c.get_rule_version("ver-2"))
    assert v2["id"] == "ver-2"
    assert v2["version_number"] == 2
    assert v2["parent_version_id"] == "ver-1"
    assert "23:59 UTC" in v2["rule_text"]


def test_cannot_accept_material_change_as_clarification(direct_deploy, direct_vm):
    c = direct_deploy(CONTRACT)
    c.register_event("Event D", "", "", "", "", "Rules: Anyone can participate.", SAMPLE_SCENARIOS)

    amend_id = c.propose_amendment(
        "ev-1",
        "ver-1",
        "Rules: Only enterprise teams can participate.",
        "Restrict to enterprise",
        "FUTURE_ONLY"
    )

    # Store MATERIAL_CHANGE assessment
    c.assessments["assess-1"] = json.dumps({
        "id": "assess-1",
        "amendment_id": amend_id,
        "event_id": "ev-1",
        "base_version_id": "ver-1",
        "base_hash": "abc",
        "proposed_hash": "def",
        "schema_version": 1,
        "policy_version": "rulefreeze-eval-v1.0",
        "overall_classification": "MATERIAL_CHANGE",
        "changed_dimensions": ["ELIGIBILITY"],
        "scenarios": [],
        "reasoning": "Restricts eligibility to enterprise.",
        "uncertainty": "",
        "grounding_verified": True,
        "assessed_at": 1700000000
    })
    amend = json.loads(c.get_amendment(amend_id))
    amend["status"] = "ASSESSED"
    amend["assessment_ids"] = ["assess-1"]
    c.amendments[amend_id] = json.dumps(amend)

    # Attempting ACCEPTED_CLARIFICATION must be REJECTED by contract!
    with pytest.raises(Exception) as excinfo:
        c.decide_amendment(amend_id, "ACCEPTED_CLARIFICATION", "Trying to pass off as clarification")
    assert "CANNOT_ACCEPT_AS_CLARIFICATION" in str(excinfo.value)

    # But ACKNOWLEDGED_MATERIAL_CHANGE with rationale succeeds
    c.decide_amendment(
        amend_id,
        "ACKNOWLEDGED_MATERIAL_CHANGE",
        "We explicitly acknowledge this restricts eligibility to enterprise sponsors."
    )
    amend_after = json.loads(c.get_amendment(amend_id))
    assert amend_after["status"] == "ACTIVATED"
    assert amend_after["decision"]["type"] == "ACKNOWLEDGED_MATERIAL_CHANGE"
