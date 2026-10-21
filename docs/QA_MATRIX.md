# RuleFreeze Executable QA Matrix

**Target Network:** GenLayer Studionet (Chain ID: 61999 / `0xf22f`)  
**Studio RPC:** `https://studio.genlayer.com/api`  
**Canonical Contract:** `/root/X/contracts/main.py` (SHA-256: `42cc031d0ba76e704e0b67c2df366139104e860fc41c71d79df082738d0e0396`)  
**Deployed Address:** `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`  
**Deployment Transaction:** `0x6483f0dbd636be740bcbb9e64ee0780bbd4dad5078f4597f7e3e8ba5aa9f1bb7`  
**Deployment protocol status (later read):** `FINALIZED`. The earlier matrix header recorded provisional `ACCEPTED` before that read.  
**Campaign ledger:** `docs/live-qa-campaign.json` (`run-20261019-live-qa`). That file is the source of truth for the historical 1.0.0 campaign. The header address above is that historical deployment. Do not read its FAIL rows as the 1.0.1 result. The 1.0.1 closeout supplement is at the end of this file.  

---

## Environment Legend
- `LOCAL_UNIT`: Node.js unit / assertion test runner
- `DIRECT_VM`: GenLayer Pytest runner (`genlayer_test`) against Python GenVM
- `MOCK_INTEGRATION`: Browser mock adapter simulating state in memory
- `LIVE_STUDIO_NETWORK`: Real RPC queries / transactions to GenLayer Studionet (`0xC8a83C...`)
- `BROWSER_MOCK_WALLET`: Headless Chromium with mock provider or unit simulation
- `BROWSER_REAL_WALLET`: Interactive browser session with user-approved extension (MetaMask/Rabby)
- `PRODUCTION_RUNTIME`: PM2 Next.js process (`rulefreeze-web` on port 48820)

---

## QA Matrix

| Test ID | Category | Sev | Requirement | Environment | Preconditions | Execution Method | Expected Result | Observed Result | Status | Contract / Tx / IDs | Evidence Ref | Retest Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **DEP-01** | Cat 1: Deployment | P0 | Deploy canonical source with zero constructor args | LIVE_STUDIO_NETWORK | Studio browser session open | Click "Deploy main.py" in Studio UI | Contract deployed, 20-byte address generated | Deployed at `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` | **PASS** | Tx `0x6483f0dbd...` | Studio trace & Explorer | PASS |
| **DEP-02** | Cat 1: Deployment | P0 | Verify target network chain ID | LIVE_STUDIO_NETWORK | RPC accessible | JSON-RPC `eth_chainId` | Returns `0xf22f` (61999) | `0xf22f` returned (latency ~540ms) | **PASS** | Studionet | `eth_chainId` call | PASS |
| **DEP-03** | Cat 1: Deployment | P0 | Distinguish ACCEPTED from FINALIZED | LIVE_STUDIO_NETWORK | Deployment submitted | Studio consensus rounds monitoring | Proposing -> Committing -> Revealing -> Accepted | Observed status ACCEPTED; finality pending | **PASS** | Tx `0x6483f0dbd...` | Studio consensus log | PASS |
| **DEP-04** | Cat 1: Deployment | P0 | Verify public read: `get_policy()` | LIVE_STUDIO_NETWORK | Contract deployed | `readContract({ functionName: 'get_policy' })` | JSON policy with valid classifications & dimensions | Valid JSON, `contract_version: 1.0.0`, policy hash `aa4d3e...` | **PASS** | `0xC8a83C...` | JSON readback | PASS |
| **DEP-05** | Cat 1: Deployment | P0 | Verify public read: `get_event_count()` | LIVE_STUDIO_NETWORK | Contract deployed | `readContract({ functionName: 'get_event_count' })` | Returns integer 0 | Returns `0` | **PASS** | `0xC8a83C...` | JSON readback | PASS |
| **DEP-06** | Cat 1: Deployment | P0 | Verify public read: `get_events(0, 10)` | LIVE_STUDIO_NETWORK | Contract deployed | `readContract({ functionName: 'get_events', args: [0, 10] })` | Returns `{ total: 0, offset: 0, limit: 10, events: [] }` | Exactly matched expected JSON | **PASS** | `0xC8a83C...` | JSON readback | PASS |
| **DEP-07** | Cat 1: Deployment | P1 | Verify error on non-existent record query | LIVE_STUDIO_NETWORK | Contract deployed | `readContract({ functionName: 'get_event', args: ['nonexistent'] })` | Reverts with execution failed | Reverts with `execution failed: Missing or invalid parameters` | **PASS** | `0xC8a83C...` | RPC Revert Log | PASS |
| **CFG-01** | Cat 1: Configuration | P0 | Allowlisted public configuration bridge | PRODUCTION_RUNTIME | Server online | `GET /api/public-config` | JSON with contract address, RPC, chain ID | Returned `0xC8a83C...`, `61999`, `isConfigured: true` | **PASS** | Process 17 | `curl /api/public-config` | PASS |
| **CFG-02** | Cat 1: Configuration | P0 | Server health probe endpoint | PRODUCTION_RUNTIME | Server online | `GET /api/health` | Returns status ok with live RPC reachability | Status ok, latency 546ms, contract configured | **PASS** | Process 17 | `curl /api/health` | PASS |
| **CFG-03** | Cat 1: Configuration | P0 | Address format validation in config | LOCAL_UNIT | Node test runner | `isValidContractAddress` unit tests | Accepts 20-byte hex; rejects 0x0, short, malformed | All 3 test cases passed | **PASS** | In-tree TS | `tests/config.test.mjs` | PASS |
| **WAL-01** | Cat 2: Wallet | P0 | Detect browser wallet availability | BROWSER_MOCK_WALLET | Headless Chrome | Check `window.ethereum` | Returns false in headless daemon | Correctly classified `BLOCKED_WALLET_SESSION` | **PASS** | Client environment | Chromium diagnostics check | PASS |
| **WAL-02** | Cat 2: Wallet | P0 | EIP-55 address normalization before write | LOCAL_UNIT | Viem in adapter | `getAddress(rawAddress)` | Normalizes lowercase to mixed-case Keccak checksum | Normalized `0x7e1add...` to `0x7e1Add...` | **PASS** | Client adapter | `src/lib/contract-adapter.ts` | PASS |
| **WAL-03** | Cat 2: Wallet | P0 | User rejection handling (error 4001) | MOCK_INTEGRATION | Adapter test | Simulate user rejection in provider request | Throws `USER_REJECTED`, no stuck spinner | Threw `USER_REJECTED` error clean | **PASS** | Client adapter | `src/lib/contract-adapter.ts` | PASS |
| **WAL-04** | Cat 2: Wallet | P0 | Wrong network prompt / chain switch | MOCK_INTEGRATION | Adapter test | Chain ID not 61999 | Dispatches `wallet_switchEthereumChain` to 0xf22f | Correctly requests chain switch / add chain | **PASS** | Client adapter | `assertStudionetChain` | PASS |
| **WAL-05** | Cat 2: Wallet | P0 | Genuine QA-wallet signature for authorized writes | BROWSER_REAL_WALLET | Isolated MetaMask 13.53.0, Studionet | Confirm only after decoding the consensus wrapper | Value 0, inner recipient is the RuleFreeze contract, protocol finality checked separately from execution | QA operator signed registration plus 7 campaign writes. Each confirmation showed the label `Network fee` with no amount. Personal wallet was not used | **PASS** | QA `0x40d7eca7...` | `docs/live-qa-campaign.json` | PASS for this QA wallet. Personal wallet **NOT_RUN** |
| **LIF-01** | Cat 3: Lifecycle | P0 | Transaction submission to IndexedDB sync | LOCAL_UNIT | IDB test harness | `trackTransaction` call | Stores status `SUBMITTED`, notifies UI | Persisted into `tx_records` in `RuleFreezeDB` | **PASS** | In-tree IDB | `src/lib/tx-controller.ts` | PASS |
| **LIF-02** | Cat 3: Lifecycle | P0 | Studio RPC attribution headers on polling | BROWSER_MOCK_WALLET | In-browser fetch | Fetch to `studio.genlayer.com` in Chrome | Headers `Referer` & `User-Agent` included | Verified via in-browser evaluation returning 0xf22f | **PASS** | Chrome 151 | Puppeteer probe | PASS |
| **LIF-03** | Cat 3: Lifecycle | P0 | Separate protocol, consensus, and execution | LOCAL_UNIT | Redacted Studio registration plus synthetic receipts | `parseTransactionOutcome` / `rollupTransaction` | Missing `txExecutionResult` is UNKNOWN. SDK code 1 is SUCCESS and code 2 is FAILURE. Code 0 is NOT_VOTED, not success. A validator quorum-termination receipt is ignored. Provisional `NO_MAJORITY` while the protocol is undecided does not contradict leader SUCCESS | 11 parser tests passed in the 26-test TS run on 2026-10-20 | **PASS** | `src/lib/tx-result.ts` | `tests/tx_result.test.mjs`, `tests/fixtures/studio-registration-redacted.json` | PASS. The old “any non-zero code is EXECUTION_FAILURE” rule was wrong and is retired |
| **LIF-04** | Cat 3: Lifecycle | P0 | Timeout safeguard (do not auto-resubmit) | LOCAL_UNIT | Controller timeout | Exceeds max retries without finality | Marks status `TIMEOUT`, notifies "Do not re-submit" | Banner warning displayed, no duplicate write | **PASS** | Controller logic | `src/lib/tx-controller.ts` | PASS |
| **INT-01** | Cat 4: Semantic | P0 | Semantic prompt fences & prompt injection | DIRECT_VM | Python GenVM | Run Case 8 (Prompt injection inside rules text) | Untrusted instructions ignored; classified objectively | Classified `MATERIAL_CHANGE` ignoring prompt override | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 8 | PASS |
| **INT-02** | Cat 4: Semantic | P0 | Typographical amendment classification | DIRECT_VM | Python GenVM | Run Case 1 (typo correction) | Verdict `NO_MATERIAL_CHANGE`, dimension unchanged | Classified `NO_MATERIAL_CHANGE`, 0 outcome changes | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 1 | PASS |
| **INT-03** | Cat 4: Semantic | P0 | Mandatory deliverable addition | DIRECT_VM | Python GenVM | Run Case 3 (hosted frontend required) | Verdict `MATERIAL_CHANGE`, SC-A outcome changed | Classified `MATERIAL_CHANGE`, DELIVERABLES changed | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 3 | PASS |
| **INT-04** | Cat 4: Semantic | P0 | Non-grounded quote downgrade | DIRECT_VM | Python GenVM | Case 11 (fictitious rule quotation) | Citation check fails -> downgraded to `REVIEW_NEEDED` | Invariant enforced in `_parse_and_verify_decision` | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 11 | PASS |
| **INT-05** | Cat 4: Semantic | P0 | Assessment alone does NOT activate proposal | DIRECT_VM | Python GenVM | Inspect amendment status after `assess_amendment` | Status is `ASSESSED`, event active version unchanged | Verified active version remains `ver-1` | **PASS** | GenVM Pytest | `test_amendment_lifecycle` | PASS |
| **STA-01** | Cat 5: State | P0 | Baseline immutability & content hash | DIRECT_VM | Python GenVM | `register_event` creates Version 1 | `content_hash` sha256 computed, text immutable | Verified sha256 hash length 64, rule text fixed | **PASS** | GenVM Pytest | `test_contract_direct.py` | PASS |
| **STA-02** | Cat 5: State | P0 | Rejection of identical amendment text | DIRECT_VM | Python GenVM | Propose identical text to base rules | Reverts with `NO_TEXT_CHANGE` | Reverted with `NO_TEXT_CHANGE` | **PASS** | GenVM Pytest | `test_contract_direct.py` | PASS |
| **STA-03** | Cat 5: State | P0 | Rejection of stale base version | DIRECT_VM | Python GenVM | Propose amendment against old version | Reverts with `STALE_BASE_VERSION` | Reverted with `STALE_BASE_VERSION` | **PASS** | GenVM Pytest | `test_contract_direct.py` | PASS |
| **STA-04** | Cat 5: State | P0 | Rejection of clarification on material change | DIRECT_VM | Python GenVM | Decide `ACCEPTED_CLARIFICATION` on `MATERIAL_CHANGE` | Reverts with `CANNOT_ACCEPT_AS_CLARIFICATION` | Reverted with `CANNOT_ACCEPT_AS_CLARIFICATION` | **PASS** | GenVM Pytest | `test_cannot_accept_material...` | PASS |
| **ADV-01** | Cat 6: Adversarial | P1 | Contradictory amendment clauses | DIRECT_VM | Python GenVM | Run Case 7 (conflicting eligibility rules) | Verdict `REVIEW_NEEDED` with uncertainty flagged | Flagged `REVIEW_NEEDED` with conflicting rationale | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 7 | PASS |
| **ADV-02** | Cat 6: Adversarial | P1 | Missing participant facts | DIRECT_VM | Python GenVM | Run Case 9 (unknown investor accreditation) | Scenario evaluated as `UNDETERMINED` | Output recorded `UNDETERMINED` | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 9 | PASS |
| **ADV-03** | Cat 6: Adversarial | P1 | Bidi unicode and whitespace normalization | DIRECT_VM | Python GenVM | Run Case 11 (bidi characters) | Normalizes to clean text; same content hash | Unicode normalized; no invisible divergence | **PASS** | GenVM Pytest | `test_semantic_corpus.py` Case 11 | PASS |
| **FIN-01** | Cat 7: Financial | P1 | Value transfer / escrow in contract | CODE_REVIEW | Canonical `main.py` | Inspect all methods for token balance/escrow | Contract has no token transfers or balances | Marked **NOT_APPLICABLE** (Pure registry desk) | **NOT_APPLICABLE** | `contracts/main.py` | Contract code review | PASS |
| **FIN-02** | Cat 7: Financial | P1 | Frontend transaction value | CODE_REVIEW | Frontend adapter | Inspect `executeContractWrite` value parameter | Sends `value: 0n` unconditionally | Verified `value: 0n` in writeContract call | **PASS** | Client adapter | `src/lib/contract-adapter.ts:262` | PASS |
| **SEC-01** | Cat 8: Security | P0 | Caller-derived organizer identity | DIRECT_VM | Python GenVM | Non-organizer caller attempts `propose_amendment` | Reverts with `UNAUTHORIZED_CALLER` | Reverted with `UNAUTHORIZED_CALLER` | **PASS** | GenVM Pytest | `test_contract_direct.py` | PASS |
| **SEC-02** | Cat 8: Security | P0 | Non-organizer decision attempt | DIRECT_VM | Python GenVM | Non-organizer caller attempts `decide_amendment` | Reverts with `UNAUTHORIZED_CALLER` | Reverted with `UNAUTHORIZED_CALLER` | **PASS** | GenVM Pytest | `test_contract_direct.py` | PASS |
| **SEC-03** | Cat 8: Security | P0 | Prevent XSS in rule text and model outputs | CODE_REVIEW | React render tree | Inspect rule text and assessment rendering | React JSX escapes string bodies; no `dangerouslySetInnerHTML` | No unescaped HTML interpolation in repo | **PASS** | React App Router | Source audit | PASS |
| **SEC-04** | Cat 8: Security | P0 | No secrets in client bundles or public API | BROWSER_MOCK_WALLET | Public config & bundle | Grep client JS chunks for private keys / secrets | 0 private keys, 0 secrets exposed | No private credentials in client assets | **PASS** | Next.js output | Static bundle search | PASS |
| **FRO-01** | Cat 9: Frontend | P1 | Explicit "Load synthetic QA example" fixture | BROWSER_MOCK_WALLET | Chrome on `/events/new` | Click `#btn-load-synthetic-qa` | Populates deadline, 3 scenarios without auto-submit | Form populated; deadline matches metadata | **PASS** | Process 17 | `tests/synthetic_load.test.mjs` | PASS |
| **FRO-02** | Cat 9: Frontend | P1 | Overwrite confirmation for dirty form | BROWSER_MOCK_WALLET | Chrome on `/events/new` | Type custom title, then click load QA | In-page banner prompts "Yes, Overwrite" / "Cancel" | Protected against accidental loss | **PASS** | Process 17 | Manual browser probe | PASS |
| **FRO-03** | Cat 9: Frontend | P1 | Public Event Registry disconnected browsing | BROWSER_MOCK_WALLET | Chromium, no extension | Visit `/events` with no wallet | Live registry renders without a wallet | 2026-10-20: `ev-1` card, canonical id, and `/events/ev-1` link render with Demo Mode off. The pre-registration empty state is historical | **PASS** | `ev-1` | This session’s Chromium check | PASS |
| **FRO-04** | Cat 9: Frontend | P1 | Diagnostics page live reads | BROWSER_MOCK_WALLET | Chrome on `/diagnostics` | Visit `/diagnostics` | Shows `CONFIGURED (LIVE)`, policy hash, 0 count | Confirmed live contract data rendered | **PASS** | Process 17 | Playwright test | PASS |
| **FRO-05** | Cat 9: Frontend | P1 | Mobile 360px layout & responsiveness | BROWSER_MOCK_WALLET | Chrome 360x800 viewport | Visit `/`, `/events`, `/diagnostics` | No horizontal overflow, readable typography | Tested clean on 360px viewport | **PASS** | Process 17 | `tests/playwright_e2e.mjs` | PASS |
| **REL-01** | Cat 10: Reliability | P1 | IndexedDB v2 schema migration & indexes | LOCAL_UNIT | Browser DB runtime | Inspect `RuleFreezeDB` store indexes | Stores `event_drafts`, `amendment_drafts`, `tx_records` | Created clean with indexes `by_account`, `by_entity` | **PASS** | IDB layer | `src/lib/idb.ts` | PASS |
| **REL-02** | Cat 10: Reliability | P1 | PM2 restart persistence | PRODUCTION_RUNTIME | PM2 cluster | `pm2 restart rulefreeze-web --update-env` | Service restarts, recovers port 48820, healthy | Restarted onto the 2026-10-20 production build. `GET /api/health` returned 200 | **PASS** | Process 17 | PM2 restart plus health probe | PASS |

## Live campaign supplement (`run-20261019-live-qa`)

These rows are the current on-chain campaign. They do not replace the local Direct VM corpus.

| Test ID | Requirement | Environment | Result | Status |
|---|---|---|---|---|
| **LIVE-01** | Register `ev-1` / `ver-1` once | QA wallet | Tx `0xae9f63ec15b18b7029fb7fca527abbd2d67d550235a8362ef90773e85db2dd7e`. Protocol FINALIZED, consensus MAJORITY_AGREE, execution SUCCESS, return `ev-1`. Not resubmitted | **PASS** |
| **LIVE-02** | Nonmaterial `FUTURE_ONLY` proposal | QA wallet | Tx `0x7ede4f445fd22a913fbd5e8e50336783b6c00ef19e61cc350f6fe22676ef72be`. Amendment `amend-1`. Active rules stayed on `ver-1` | **PASS** |
| **LIVE-03** | Live assessment of `amend-1` | QA wallet | Tx `0x2a9752aeb6ba58c8713439bafe0fb343ad173277007175d980745a139531985a`. Stored `assess-1` as `REVIEW_NEEDED` / `MALFORMED_MODEL_OUTPUT`. Did not activate | **FAIL** for the semantic label. **PASS** for the safeguard that left it inactive |
| **LIVE-04** | Material deliverable proposal and assessment | QA wallet | Proposal `0xe55551c8e6678b2ca13e67bcf6c154bf4637a844f1411ad76386727f7970453c` (`amend-2`). Assessment `0xbaa1f6238a4f39f929f274d0ac9336ed37400f628fb77851d0136605fe00f67a` (`assess-2`), same malformed result. No acknowledgement and no activation | **FAIL** for material detection on this payload. **PASS** for no automatic activation |
| **LIVE-05** | Prompt injection kept inactive | QA wallet | `amend-3` assessed as malformed, then declined by `0x3c83636118b5b3934549ffbd8a95ea1e10effb2532b9ee5cd6df73aea98e61b1`. Status `DECLINED`. Active version still `ver-1` | **PASS** for non-activation. Semantic scoring of the injection sentence was **BLOCKED** by the same JSON failure |
| **LIVE-06** | Refresh during pending and hidden duplicate assess | QA wallet UI | Refresh showed `amend-1` with Demo Mode off. The assess button is hidden once an assessment exists | **PASS** |
| **LIVE-07** | Live stale-base banner | QA wallet UI | Not reached. No decision changed the active version, so the base never went stale | **NOT_RUN** |
| **LIVE-08** | Disconnected public history, desktop and 390px | Chromium, no wallet | Registry, event, and amendment pages rendered the canonical ids and decisions. No hydration error. Mobile header, registry title, and diagnostics rows wrap | **PASS** |
| **LIVE-09** | Personal wallet and Vercel | — | Not performed | **NOT_RUN** |

## Closeout supplement (contract 1.0.1, 2026-10-20)

Contract `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826`. These rows do not replace the historical supplement above.

| Test ID | Requirement | Environment | Result | Status |
|---|---|---|---|---|
| **RF101-01** | Register one event on the corrected deployment | QA wallet | `0x82b92b09…` FINALIZED, MAJORITY_AGREE, leader `execution_result` SUCCESS, return `ev-1` | **PASS** transport and state |
| **RF101-02** | Nonmaterial assessment and explicit activation | QA wallet | `amend-1` / `assess-1` semantic `NO_MATERIAL_CHANGE`, then `ACCEPTED_CLARIFICATION` to `ver-2` | **PASS** |
| **RF101-03** | Material assessment and acknowledgement | QA wallet | `amend-3` / `assess-2` semantic `MATERIAL_CHANGE`. SC-A outcome changed. Activated `ver-3` with `ACKNOWLEDGED_MATERIAL_CHANGE` | **PASS** |
| **RF101-04** | Injection-bearing proposal | QA wallet | `amend-4` processed and grounded. Declined. Active rules omit the injected sentence. This case does not discriminate instruction-following from independent classification | **PASS** processing and decline. Not a robustness claim |
| **RF101-05** | Stale base | UI plus local VM | Live UI blocked `amend-2` with the stale-base banner. `test_decide_rejects_stale_base` passes locally. Live on-chain rejection | UI **PASS**. Local contract **PASS**. Live chain **NOT_RUN** |
| **RF101-06** | Evidence survives pytest | Local | Closeout pytest cleared `/tmp/rulefreeze-gltest-artifacts` only. `evidence/SENTINEL` and the campaign files remained | **PASS** |
| **RF101-07** | IndexedDB v2 to v3 migration | `tests/idb_migration.test.mjs` | Passed in the 32-test Node run | **PASS** |
| **RF101-08** | Historical 1.0.0 semantic labels | Prior campaign | Still `MALFORMED_MODEL_OUTPUT` | **FAIL**, unchanged |
