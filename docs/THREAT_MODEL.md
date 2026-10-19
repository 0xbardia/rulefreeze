# Threat Model — RuleFreeze

## 1. Assets & Invariants to Protect

1. **Rule Baseline Integrity:** Once registered, rule text must never be silently mutated or deleted.
2. **Amendment Lineage:** Every active rule version must trace back to the initial baseline through an unbroken chain of organizer decisions.
3. **Assessment Accuracy & Neutrality:** An organizer must not be able to coerce the evaluation engine into labeling a material change as a harmless clarification.
4. **Denial of Service Resistance:** Oversized payloads or adversarial inputs must not crash the node or contract storage.

---

## 2. Attacker Profiles & Attack Vectors

| Threat Vector | Attacker Profile | Goal | Mitigation in RuleFreeze |
|---|---|---|---|
| **Prompt Injection in Rules** | Malicious Organizer | Force `NO_MATERIAL_CHANGE` on a restrictive rule amendment | Instructions separated from evidence with delimiter fences; deterministic post-consensus schema validation; verbatim quote verification. |
| **Fake Citation Injection** | Adversarial Submitter | Fabricate non-existent clauses to justify an outcome | Post-consensus parser checks that all `rule_references` exist verbatim in rule text. Quotation failure downgrades verdict to `REVIEW_NEEDED`. |
| **Organizer Impersonation** | Malicious Third Party | Propose or activate rogue amendments for another event | Caller address derived strictly from `gl.message.sender_address` and verified against `event.organizer`. |
| **Stale Base Activation Race** | Concurrent Tabs / Replay | Activate outdated amendment after active version advanced | Invariant check `amendment.base_version_id == event.active_version_id` strictly enforced at decision execution time. |
| **Silent Clarification Whitewash** | Deceptive Organizer | Activate a material revision with `ACCEPTED_CLARIFICATION` | Contract rejects `ACCEPTED_CLARIFICATION` if assessment is `MATERIAL_CHANGE` or `REVIEW_NEEDED`. Requires explicit `ACKNOWLEDGED_MATERIAL_CHANGE` with rationale. |
| **Storage Overflow DoS** | Malicious Proposer | Exhaust contract slot memory with megabytes of text | Strict bounds enforced on all strings before writing (`MAX_RULES = 24000`, `MAX_STORED_PACKET = 64000`). |
| **Frontend Secret Leakage** | External Observer | Extract API keys or private keys from client bundle | Core product requires zero API keys or backend signers; wallet signs client-side; allowlisted config bridge only. |
| **XSS Injection via Rule Text** | Malicious Participant | Execute scripts in viewing organizers' browsers | Pure React text interpolation without raw HTML injection; `nosniff` and CSP headers active. |

---

## 3. Residual Risks & Non-Mitigated Boundaries

1. **Real-World Enforcement:** RuleFreeze cannot force an organizer to honor registered rules in the physical world or pay out prizes. This boundary is made explicit across the UI and documentation.
2. **LLM Consensus Non-Determinism:** While comparative equivalence consensus ensures validator agreement, extreme model ambiguity is labeled `REVIEW_NEEDED` rather than pretending absolute certainty.
