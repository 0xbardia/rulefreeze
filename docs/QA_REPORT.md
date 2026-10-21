# RuleFreeze Comprehensive QA Report & Verification Evidence

**Document Version:** 3.0.0 historical, with a 1.0.1 closeout appended  
**Timestamp:** 2026-10-20T00:15:09Z for sections 1–7. Closeout: 2026-10-20.

Sections 1–7 are the historical 1.0.0 campaign on `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`. Their FAIL and NOT_RUN rows stay FAIL and NOT_RUN. The corrected deployment is section 8 and `docs/QA_CLOSEOUT.md`.  
**Application Root:** `/root/X`  
**PM2 Process:** `rulefreeze-web` (ID 17, Port 48820)  
**Target Network:** GenLayer Studionet (Chain ID: 61999 / `0xf22f`)  
**Studio RPC:** `https://studio.genlayer.com/api`  
**Canonical Contract:** `/root/X/contracts/main.py`  
**Contract SHA-256:** `42cc031d0ba76e704e0b67c2df366139104e860fc41c71d79df082738d0e0396`  
**Deployed Address:** `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`  
**Deployment Transaction:** `0x6483f0dbd636be740bcbb9e64ee0780bbd4dad5078f4597f7e3e8ba5aa9f1bb7`  
**Deployment protocol status:** `FINALIZED` on tx `0x6483f0dbd636be740bcbb9e64ee0780bbd4dad5078f4597f7e3e8ba5aa9f1bb7`. An earlier draft of this report stopped at provisional `ACCEPTED`.  
**Campaign:** `run-20261019-live-qa`. Active rules remain `ver-1`.  

---

## 1. Executive Summary & Acceptance Level

| Milestone Level | Status | Details |
|---|---|---|
| **PASS_LOCAL** | **PASS** | 2026-10-20 retest: 20 contract pytest tests passed. 26 TypeScript tests passed, including 11 result-parser tests. Production `next build` typecheck passed. No project lint script exists, so lint is **NOT_RUN**. |
| **PASS_STUDIO_NETWORK** | **PASS** | Canonical contract remains `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`. Live reads return `ev-1`, active `ver-1`, and amendments `amend-1`, `amend-2`, and `amend-3`. |
| **PASS_QA_WALLET_E2E** | **PASS** | Disposable QA MetaMask signed the registration and seven later writes. This is not a personal-wallet result. |
| **SEMANTIC_LABELS** | **FAIL** | All three live assessments stored `REVIEW_NEEDED` / `MALFORMED_MODEL_OUTPUT`. The evaluator was not retuned and the contract was not redeployed. |
| **PROJECT_QA_ACCEPTED** | **NOT ACCEPTED** | Write path, result parsing, and inactive-amendment safeguards passed for this synthetic event. Semantic classification of the authorized payloads did not. This is not a certification. |

---

## 2. Defect & Remediation Log

| Defect ID | Severity | Area | Root Cause | Remediation Applied | Verification / Evidence |
|---|---|---|---|---|---|
| **DEF-01** | P0 | RPC Polling | Studio RPC drops unattributed requests leading to polling timeouts. | Patched `fetch` in `contract-adapter.ts` and `tx-controller.ts` with browser-like `Referer: https://studio.genlayer.com/contracts` and `User-Agent`. | Verified in Chromium devtools: in-browser call returned `0xf22f` without exceptions. |
| **DEF-02** | P0 | Serialization | Viem rejects non-checksummed addresses during calldata encoding. | Added Viem `getAddress()` normalization on both `contractAddress` and `accountAddress` before invoking SDK writes. | Tested against lowercase test addresses; valid EIP-55 output confirmed. |
| **DEF-03** | P1 | Cross-Browser | Headless browser IndexedDB draft is isolated from user's external browser. | Created `src/lib/fixtures.ts` and added an explicit "Load synthetic QA example" UI button on `/events/new` with overwrite confirmation. | Verified via `tests/synthetic_load.test.mjs` (Playwright clicked button, verified fields loaded). |
| **DEF-04** | P1 | Spec Alignment | Ambiguous "Friday before 23:59 UTC" contradicted declared ISO deadline. | Replaced rule text with exact statement: `"Final submissions must be submitted no later than 2026-11-15 at 23:59:59 UTC."` | Tested in `tests/fixtures.test.mjs`; exact match confirmed. |
| **DEF-05** | P1 | Spec Alignment | SC-C inferred multi-submissions merely from wallet ownership. | Updated SC-C situation to: `"One person submits one entry through wallet A and a second entry through wallet B."` and question to `"Is this person's second entry allowed?"` | Tested in `tests/fixtures.test.mjs`; exact match confirmed. |
| **DEF-06** | P1 | Navigation | When contract address configured, `/events/demo-ev-1` attempted live RPC queries for demo fixture IDs. | Updated page routing logic in `src/app/events/[id]/page.tsx`, `amend/page.tsx`, and `amendments/[amendmentId]/page.tsx` to route `demo-*` IDs to mock adapter. | Verified with `tests/playwright_e2e.mjs`: all 9 routes pass with 0 console errors. |
| **DEF-07** | P0 | Transaction result parsing | Studio omits `txExecutionResult`. An in-progress `NO_MAJORITY` code was treated as a contradiction with leader SUCCESS and stopped polling. | `src/lib/tx-result.ts` separates protocol, consensus, and execution. Undecided numeric consensus is provisional. Contradictions are explicit. The controller reconciles the original hash instead of resubmitting. | `tests/tx_result.test.mjs` (11) passed. Assessment `0x2a9752ae…` later read back FINALIZED / MAJORITY_AGREE / SUCCESS and was not submitted twice. |
| **DEF-08** | P1 | Mobile layout | The header, the long registry title beside `ev-1`, and the diagnostics address row forced horizontal overflow at 390px. | Header and those rows wrap. Scenario cards also show `SC-A`, `SC-B`, and `SC-C`. | Chromium 390px recheck: registry and event pages fit. Diagnostics `scrollWidth` was 390 after the address rendered. |

---

## 3. Live Transaction & Deployment Record

| Action | Environment | Hash / Identifier | Sender / Origin | Target Contract | Protocol Status | Execution Result | State Verification |
|---|---|---|---|---|---|---|---|
| **Deploy Contract** | LIVE_STUDIO_NETWORK | `0x6483f0dbd636be740bcbb9e64ee0780bbd4dad5078f4597f7e3e8ba5aa9f1bb7` | Studio deployment account | `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` | `FINALIZED` | `SUCCESS` | `artifacts/deployment-evidence.json` is missing after a gltest artifact wipe. The hash and address remain in this ledger. |
| **register_event** | QA wallet | `0xae9f63ec15b18b7029fb7fca527abbd2d67d550235a8362ef90773e85db2dd7e` | `0x40d7eca78017697c1916819f48850a7f739b6beb` | Inner RuleFreeze; outer consensus `0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575` | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | Created `ev-1` / `ver-1`. Value 0. |
| **propose amend-1** | QA wallet | `0x7ede4f445fd22a913fbd5e8e50336783b6c00ef19e61cc350f6fe22676ef72be` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | Future-only article change. Active rules unchanged. |
| **assess amend-1** | QA wallet | `0x2a9752aeb6ba58c8713439bafe0fb343ad173277007175d980745a139531985a` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | `assess-1` stored. Amendment stayed `ASSESSED`. |
| **propose amend-2** | QA wallet | `0xe55551c8e6678b2ca13e67bcf6c154bf4637a844f1411ad76386727f7970453c` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | Mandatory hosted frontend. Not activated. |
| **assess amend-2** | QA wallet | `0xbaa1f6238a4f39f929f274d0ac9336ed37400f628fb77851d0136605fe00f67a` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | `assess-2` stored. No decision. |
| **propose amend-3** | QA wallet | `0xde9fc6128c9a4b085db249a8d12cd49ea35c8ab67f3723637249539aa742437b` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | Injection probe. |
| **assess amend-3** | QA wallet | `0x017b0ee5faddd35e6b26563e7991b6940376fa0925da41ed30e16fa98b00ec03` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | `assess-3` stored. |
| **decline amend-3** | QA wallet | `0x3c83636118b5b3934549ffbd8a95ea1e10effb2532b9ee5cd6df73aea98e61b1` | same QA account | same wrapper | `FINALIZED` / `MAJORITY_AGREE` | `SUCCESS` | Decision `DECLINED`. Active version still `ver-1`. |

---

## 4. Authoritative Contract Readback Evidence

Direct query executed against `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` on GenLayer Studionet RPC:

```json
{
  "get_policy": {
    "contract_version": "1.0.0",
    "schema_version": 1,
    "evaluation_policy_version": "rulefreeze-eval-v1.0",
    "policy_hash": "aa4d3e39dfa23ac718b5937158c73a85022acee2cb3a7d808a09ce7f233854f5",
    "policy_document": "rulefreeze-policy-v1.0: Classifications: NO_MATERIAL_CHANGE, MATERIAL_CHANGE, REVIEW_NEEDED, INSUFFICIENT_INFORMATION. Dimensions: ELIGIBILITY, SCORING, DEADLINES, DELIVERABLES, OBLIGATIONS, PROCEDURES, DEFINITIONS, OTHER. Scopes: FUTURE_ONLY, CURRENT_PARTICIPANTS, UNSPECIFIED. Decisions: ACCEPTED_CLARIFICATION, PROSPECTIVE_REVISION, ACKNOWLEDGED_MATERIAL_CHANGE, DECLINED. Rules: Text immutable; scenario probes bounded; material changes require explicit organizer acknowledgement; stale base amendments cannot activate.",
    "valid_classifications": [
      "INSUFFICIENT_INFORMATION",
      "MATERIAL_CHANGE",
      "NO_MATERIAL_CHANGE",
      "REVIEW_NEEDED"
    ],
    "valid_dimensions": [
      "DEADLINES",
      "DEFINITIONS",
      "DELIVERABLES",
      "ELIGIBILITY",
      "OBLIGATIONS",
      "OTHER",
      "PROCEDURES",
      "SCORING"
    ],
    "valid_scopes": [
      "CURRENT_PARTICIPANTS",
      "FUTURE_ONLY",
      "UNSPECIFIED"
    ],
    "valid_decisions": [
      "ACCEPTED_CLARIFICATION",
      "ACKNOWLEDGED_MATERIAL_CHANGE",
      "DECLINED",
      "PROSPECTIVE_REVISION"
    ]
  },
  "get_event_count": 0,
  "get_events_offset_0_limit_10": {
    "total": 0,
    "offset": 0,
    "limit": 10,
    "events": []
  }
}
```

That JSON is the pre-registration read. After the campaign, `get_event_count` is 1 and the active version is `ver-1`.

---

## 5. Browser & Regression Test Summary

- **Earlier local run:** 18 contract tests and 9 TypeScript tests. Superseded by the 2026-10-20 retest below.
- **2026-10-20 contract tests:** 20 passed (`tests/`, including assess replay and stale-base decision). The run cleared `./artifacts`; the directory was restored from backup.
- **2026-10-20 TypeScript tests:** 26 passed (`tests/*.test.mjs`), including ID routing, fixtures, and the result parser.
- **2026-10-20 disconnected Chromium:** public routes on the restarted production server, desktop 1280 and mobile 390, no wallet extension. Hydration errors: none. Studio reads during the burst logged transient CORS/`Failed to fetch` console errors; the pages rendered after the rate limit cleared. No horizontal overflow on the rechecked routes.
- **Playwright Full Route Audit (`tests/playwright_e2e.mjs`):**
  1. `/` (Landing desktop 1440x900) — PASS
  2. `/events` (Registry desktop 1440x900, "No registered events found") — PASS
  3. `/events/new` (Registration wizard & synthetic loader) — PASS
  4. `/events/demo-ev-1` (Event detail desktop) — PASS
  5. `/events/demo-ev-1/amend` (Propose amendment view) — PASS
  6. `/events/demo-ev-1/amendments/demo-amend-2` (Review desk with MATERIAL_CHANGE badge) — PASS
  7. `/methodology` (Documentation desktop) — PASS
  8. `/diagnostics` (Setup & live reads diagnostics) — PASS
  9. `/` (Mobile 360x800 viewport) — PASS
  10. `/events/demo-ev-1/amendments/demo-amend-2` (Mobile 360x800 review desk) — PASS
  - **Console Errors:** 0
  - **Unhandled Promise Rejections:** 0
  - **Hydration Mismatches:** 0

---

## 6. Financial & Settlement Applicability

- **Contract Analysis:** `contracts/main.py` functions strictly as a rule version registry and amendment evaluation desk. It contains zero token balances, zero payment escrow, zero deposit pools, and zero reward distributions.
- **Assessment:** Financial transfer tests are **NOT_APPLICABLE**.
- **Frontend Value Setting:** Verified in `src/lib/contract-adapter.ts:262` that all consensus writes pass `value: 0n` explicitly.

---

## 7. Campaign outcome and remaining limits

The registration blocker in older copies of this report is closed. Do not register `ev-1` again.

The standing campaign submitted 7 of 15 allowed transactions and 3 of 4 allowed proposals. Every confirmation had value 0. MetaMask showed the label `Network fee` and no numeric amount, so this report does not call the fee zero. No spending approval was displayed. Outer destination was the Studionet consensus contract. The decoded inner recipient was the RuleFreeze contract.

`amend-1` and `amend-2` remain `ASSESSED` with no decision. `amend-3` is `DECLINED`. Active text is still the baseline, including `70% of scoring` and an optional hosted frontend.

The contract parser stores `REVIEW_NEEDED` when the model output is not JSON. The stored reasoning on all three assessments is: `Model output was not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)`. Changing that parser requires a redeploy, which this campaign does not authorize.

Local Direct VM cases for the typo, the mandatory frontend, and prompt injection still pass in `tests/test_semantic_corpus.py`. Those local results are not the live labels.

There is no SQL migration suite. Client IndexedDB is described by `src/lib/idb.ts`. A dedicated recovery drill was **NOT_RUN**. Personal-wallet testing and Vercel deployment were **NOT_RUN**.

`pytest tests/` prints `Clearing artifacts directory: artifacts` and deletes that directory. Campaign evidence was restored after the 2026-10-20 run. Keep authoritative copies in `docs/`.

---

## 8. Closeout on contract 1.0.1

This section does not change sections 1–7.

The 1.0.0 live assessments remain malformed-output failures. The reconstructed deployment file is still reconstructed. The 1.0.1 campaign is a separate event on `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826`.

Scoped acceptance, build identity, and the transaction ledger are in `docs/QA_CLOSEOUT.md`. IndexedDB migration tests now exist and passed in the closeout run. That does not rewrite the “recovery drill NOT_RUN” sentence above, which described the 1.0.0 report. Personal-wallet testing and Vercel deployment remain **NOT_RUN**. Live on-chain stale-base rejection remains **NOT_RUN**.
