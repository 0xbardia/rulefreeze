# System Boundaries & Limitations — RuleFreeze

## 1. What RuleFreeze Guarantees

1. **Rule Text Immutability:** Once registered on GenLayer, a rule version's text cannot be modified, deleted, or secretly overwritten.
2. **Transparent Amendment History:** All proposed amendments, validator consensus verdicts, and organizer activation decisions are recorded in an append-only timeline.
3. **Scenario-Grounded Evaluation:** Amendments are evaluated against explicit, immutable participant scenarios, and quotations are deterministically verified against source text.
4. **Stale Base Immunity:** Concurrent or stale amendments proposed against superseded rule baselines cannot be activated.
5. **No Silent Whitewashing:** Organizers cannot activate a material alteration under the label of an `ACCEPTED_CLARIFICATION`.

---

## 2. What RuleFreeze Does NOT Guarantee

1. **Real-World Event Governance:**
   RuleFreeze evaluates rules on-chain. It does not control the physical hackathon venue, Discord server, or organizer email. If an organizer decides to ignore registered rules outside the platform, RuleFreeze provides transparent evidence of the violation, but cannot physically compel compliance.
2. **Prize Escrow / Payouts:**
   RuleFreeze is a rule registry and semantic review desk, not a prize treasury or smart contract escrow.
3. **Universal Legal Arbitration:**
   RuleFreeze is designed for developer hackathons and small competitions. It does not replace formal legal contracts, court proceedings, or commercial arbitration.
4. **Historical Existence Proof Before Registration:**
   The block timestamp proves only when the rules were recorded on GenLayer. It does not prove that rules existed or were communicated to participants prior to that moment.
5. **Universal Equivalence Beyond Tested Scenarios:**
   A verdict of `NO_MATERIAL_CHANGE` means the tested scenario probes and rule requirements are consistent. It does not mathematically prove universal equivalence across every imaginable unstated participant fact pattern.
6. **Infallible Semantic Consensus:**
   Intelligent contracts use equivalence consensus across multiple independent LLM validators. In edge cases with extreme human ambiguity, RuleFreeze outputs `REVIEW_NEEDED` rather than claiming artificial certainty.
