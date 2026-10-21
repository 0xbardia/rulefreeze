# RuleFreeze Public QA Summary

**Date:** 2026-10-20  
**Network:** GenLayer Studionet (Chain ID: 61999 / `0xf22f`, RPC: `https://studio.genlayer.com/api`)  
**Status:** Scoped Live Campaign Verified (No new on-chain writes performed for release packaging)

---

## 1. Verified Deployments and Identifiers

| Component | Identifier / Address | Details |
|---|---|---|
| Current Contract | `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826` | Contract 1.0.1, Schema 2, Policy `rulefreeze-eval-v1.1` |
| Current Deployment Tx | `0xed921c7720ba1c5bbf0d603a49d225f60100e654bf6a1018ede9792f311fef5f` | Status: `0x1` (SUCCESS), Protocol: FINALIZED, Consensus: MAJORITY_AGREE |
| Contract Source SHA-256 | `f3b8b9ef09dd21755435e2bc55b5d0db84af5b93348c6655ea7ee9d520cc8177` | Canonical file: `contracts/main.py` |
| Historical Contract | `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` | Contract 1.0.0, Schema 1, Policy `rulefreeze-eval-v1.0` (deprecated) |
| Active Live Event | `ev-1` | Active version: `ver-3` |
| Application Version | `1.0.0` | Sourced from `package.json` and reported via `/api/health` |

---

## 2. Version Domain Separation

RuleFreeze strictly differentiates between application version and smart contract version:
- **Application Version (`1.0.0`):** Managed in `package.json`, exported by `src/lib/release.ts`, returned by `/api/health`.
- **Contract Version (`1.0.1`):** Deployed on-chain, returned by `get_policy()`, defined in `contracts/main.py`.
- **Schema Version (`2`):** On-chain record format version.
- **Evaluation Policy Version (`rulefreeze-eval-v1.1`):** Validator prompt and evaluation rules version.

---

## 3. Verified Live Event Lifecycle (ev-1)

All transactions executed on GenLayer Studionet and independently verified via `eth_getTransactionByHash` / `eth_getTransactionReceipt`:

| Sequence | Action | Transaction Hash | Consensus | Leader Execution | Return |
|---|---|---|---|---|---|
| 1 | Contract Deployment | `0xed921c7720ba1c5bbf0d603a49d225f60100e654bf6a1018ede9792f311fef5f` | MAJORITY_AGREE | SUCCESS | Contract address |
| 2 | Register Baseline (`ev-1`) | `0x82b92b098d8cbc40336f6f07442bd953443efd4d7f1e633e38fc15f910c759b7` | MAJORITY_AGREE | SUCCESS | `ev-1` (`ver-1`) |
| 3 | Propose `amend-1` | `0xcea19fa9a6b0d1da8b9a448ec67ab784df8d4ba044c12625af10156602528c58` | MAJORITY_AGREE | SUCCESS | `amend-1` |
| 4 | Assess `assess-1` | `0xcdcfb01addbcae6b2de587c114e7b36a283b5c37d3bbdeaecb4547b827d593b0` | MAJORITY_AGREE | SUCCESS | `assess-1` (`NO_MATERIAL_CHANGE`) |
| 5 | Propose `amend-2` | `0x517a183e7d6c98a99ac7e306e1c705092601f9b47f29cd88afa9596ab4890040` | MAJORITY_AGREE | SUCCESS | `amend-2` |
| 6 | Decide `amend-1` (Accept) | `0x6466008f4ccee702719350858a4ecfc8eab203f3fd5c93981976bf80d7d0c419` | MAJORITY_AGREE | SUCCESS | None (activates `ver-2`) |
| 7 | Propose `amend-3` | `0xa00b9514783680d9b1fca2d7e9429b19c091fb48310bf96a1a22509644d587cb` | MAJORITY_AGREE | SUCCESS | `amend-3` |
| 8 | Assess `assess-2` | `0x3c256db4d53b108283f21ac30fcdbf454af10a6877a61bf7f54729b4b270dbbe` | MAJORITY_AGREE | SUCCESS | `assess-2` (`MATERIAL_CHANGE`) |
| 9 | Decide `amend-3` (Acknowledge) | `0xc0d1a685ad53085b3204e9f71561444d4f3148039c9b6ed7655a9b0776ca4027` | MAJORITY_AGREE | SUCCESS | None (activates `ver-3`) |
| 10 | Propose `amend-4` | `0x795f728b4d1ec7921ec72f1736740eb7acc7f313afd849c315120861945f4769` | MAJORITY_AGREE | SUCCESS | `amend-4` |
| 11 | Assess `assess-3` | `0xee5ae5207f38173ee818ebbfbd4161ea7974b9b3ad56b9ce4e310fb30cc4935d` | MAJORITY_AGREE | SUCCESS | `assess-3` (`NO_MATERIAL_CHANGE`) |
| 12 | Decide `amend-4` (Decline) | `0x8c8df1b078f44983915f12b0ed5de1f3e3b22bcd39300c21b01d032af2530f76` | MAJORITY_AGREE | SUCCESS | None (`DECLINED`) |

---

## 4. Root Cause and Historical Failure Analysis

In contract version 1.0.0 (`0xC8a83C62da126891aB8F60e6D5E171480aE91c23`), assessments failed with `Expecting property name enclosed in double quotes: line 1 column 2`.
- **Root Cause:** The GenVM stdlib `gl.nondet.exec_prompt(..., response_format="json")` returns a Python `dict`. The v1.0.0 contract executed `str(raw)`, converting the dictionary to Python's single-quoted representation. Parsing that string with `json.loads` failed deterministically across all validators.
- **Resolution (v1.0.1):** Returned `exec_prompt` output directly without `str()` wrapping, allowing native JSON object passing into validator consensus verification. Processing failures are distinguished from completed semantic verdicts.

---

## 5. Scope of Verified Acceptance

- **Verified:** Core RuleFreeze workflow on GenLayer Studionet (registration, nonmaterial/material assessments, explicit organizer acknowledgements, decline flows, and readback).
- **Verified:** Stale-base prevention in UI and unit tests (`amend-2` cannot activate over `ver-3`).
- **Verified:** Clean separation of protocol status, consensus result (`MAJORITY_AGREE`), and leader execution result (`SUCCESS`).
- **Not Verified / Excluded:** Universal semantic accuracy, broad prompt-injection robustness, personal wallet extensions beyond tested MetaMask setup, and third-party security audits.
