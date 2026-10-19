# RuleFreeze Live Verification Ledger

**Last Updated:** 2026-10-19T14:25:00Z  
**Application Root:** `/root/X`  
**PM2 Process:** `rulefreeze-web` (ID 17, Port 48820)  
**Target Network:** GenLayer Studionet (Chain ID: 61999 / `0xf22f`)  
**Studio RPC:** `https://studio.genlayer.com/api`  
**Canonical Contract:** `/root/X/contracts/main.py`  
**Contract Checksum (SHA-256):** `42cc031d0ba76e704e0b67c2df366139104e860fc41c71d79df082738d0e0396`  
**Constructor Arguments:** None (`__init__()` has 0 arguments)  
**Deployed Contract Address:** `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`  
**Deployment Transaction:** `0x6483f0dbd636be740bcbb9e64ee0780bbd4dad5078f4597f7e3e8ba5aa9f1bb7`  
**Explorer URL:** `https://explorer-studio.genlayer.com/address/0xC8a83C62da126891aB8F60e6D5E171480aE91c23`  

---

## Acceptance Matrix

| # | Milestone | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Canonical Studio deployment source verified | PASS | `/root/X/contracts/main.py` verified; SHA-256 `42cc031d...0396`; 18 pytest tests pass |
| 2 | Manual Studio deployment completed | PASS | Deployed via Studio UI; Tx `0x6483f0dbd636be740bcbb9e64ee0780bbd4dad5078f4597f7e3e8ba5aa9f1bb7` |
| 3 | Deployment/source association documented | PASS | Source SHA-256 matches `main.py` deployed in Studio; zero constructor args |
| 4 | Real contract address configured | PASS | `PUBLIC_CONTRACT_ADDRESS=0xC8a83C62da126891aB8F60e6D5E171480aE91c23` in `.env` and `ecosystem.config.cjs` |
| 5 | Correct network confirmed | PASS | Studio RPC `0xf22f` (61999) verified responsive via JSON-RPC |
| 6 | Live adapter active | PASS | `/api/public-config` returns `isConfigured: true`, `isLiveReady: true`, real contract address |
| 7 | Critical live reads verified | PASS | Direct reads from `0xC8a83C62...`: `get_policy()` returns valid policy json (hash `aa4d3e...`), `get_event_count()` returns 0 |
| 8 | Actual wallet approval/signing observed | WAITING_FOR_APPROVAL | Headless automated browser lacks injected user Web3 wallet extension; requires user wallet approval via localhost port-forward |
| 9 | Frontend baseline registration finalized successfully | WAITING_FOR_APPROVAL | Pre-populated draft in IndexedDB on `/events/new`; awaiting wallet approval |
| 10 | Frontend amendment proposal finalized successfully | NOT_RUN | Follows milestone 9 |
| 11 | Live semantic assessment finalized successfully | NOT_RUN | Follows milestone 10 |
| 12 | Assessment stored and grounded against correct versions | NOT_RUN | Follows milestone 11 |
| 13 | Assessment does not automatically activate rules | PASS | Contract invariant verified in `test_amendment_lifecycle_and_activation` |
| 14 | Organizer decision/activation verified | NOT_RUN | Follows milestone 12 |
| 15 | Material change acknowledgement behavior verified | PASS | Contract invariant verified in `test_cannot_accept_material_change_as_clarification`; frontend reviewed |
| 16 | Active version/history verified after refresh | NOT_RUN | Follows milestone 14 |
| 17 | Disconnected public browsing verified | NOT_RUN | To be verified after live event creation |
| 18 | Pending/recovery behavior verified with environment labeled | PASS | IndexedDB sync + `tx-controller` tested; Playwright audit confirmed 0 console errors |
| 19 | Relevant security/regression checks passed | PASS | 18 contract tests pass; 7 TS unit tests pass; TypeScript typecheck 0 errors |
| 20 | Final production build/browser checks passed | PASS | Next.js production build succeeded; Playwright 9-route desktop/mobile check passed; Chromium in-browser fetch verification to Studio RPC passed |

---

## In-Browser RPC Verification Evidence

Tested via headless Google Chrome against `http://127.0.0.1:48820/diagnostics` and `https://studio.genlayer.com/api`:
- In-browser evaluation returned: `{"ok": true, "data": {"jsonrpc": "2.0", "result": "0xf22f", "id": 1}}`
- In-browser authoritative contract reads returned:
  - Contract Version: 1.0.0
  - Policy Hash: `aa4d3e39dfa23ac718b5937158c73a85022acee2cb3a7d808a09ce7f233854f5`
  - Registered Events Count: 0
- Fetch executed without unhandled errors or CSP/header exceptions.

---

## Machine-Readable Checkpoint

Saved to `/root/X/artifacts/live-verification-checkpoint.json`.
