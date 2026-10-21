# RuleFreeze QA closeout

**Date:** 2026-10-20  
**Network:** GenLayer Studionet, chain 61999 / `0xf22f`  
**No new on-chain writes were made for this closeout.**

## Scoped acceptance

Core RuleFreeze workflow verified on GenLayer Studionet using the dedicated real MetaMask QA account: registration, nonmaterial/material assessment, explicit organizer decisions, and public state/history readback.

Outside that claim: personal-wallet and other-browser compatibility, Vercel deployment, live on-chain stale-base rejection, broad prompt-injection robustness, universal semantic correctness, and any independent or official security certification.

## Version domains

The application version and the contract version are different domains.

`package.json` is the application source of truth. `src/lib/release.ts` re-exports that version. `/api/health` returns it as `appVersion` and `version`. The footer says “RuleFreeze application 1.0.0” and states that the contract version is not the application version.

The previous footer text “RuleFreeze v1.0.1” was the contract version presented as the product version. The package was not stale at 1.0.0. It was a different domain, and the footer had copied the contract number. The package was not bumped to 1.0.1.

| Domain | Value | Where it lives |
|---|---|---|
| appVersion | 1.0.0 | `package.json` |
| contractVersion | 1.0.1 | deployed `get_policy` / `contracts/main.py` |
| schemaVersion | 2 | deployed contract |
| evaluationPolicyVersion | rulefreeze-eval-v1.1 | deployed contract |

The deployed contract was not modified for this metadata correction.

## Build and tests

Recorded after the footer and health change.

| Check | Result | Time |
|---|---|---|
| Contract, parser, corpus, direct VM, evidence preservation | 32 passed. Pytest cleared `/tmp/rulefreeze-gltest-artifacts` only | 15.73s |
| Node tests, including IndexedDB migration | 32 passed, 0 failed | 10.22s |
| `npm run lint` (`tsc --noEmit` and `scripts/lint-rulefreeze.mjs`) | passed | 20.94s |
| Explicit `tsc --noEmit` | passed | 13.62s |
| `npm run build` | passed. Final build id `qdhkBOkyQJvv1zIRIlbA1` was replaced by the mobile-layout rebuild recorded below | 41.28s, then 37.73s, then 44.39s |

`scripts/lint-rulefreeze.mjs` is not comprehensive lint. It checks four contract prohibitions (`eval`, `literal_eval`, `str(raw)`, single-quote replacement), that `exec_prompt` is returned directly, the contract version pins, that writes are not retried and use `value: 0n`, that gltest artifacts are `/tmp/rulefreeze-gltest-artifacts`, and that `evidence/SENTINEL` exists. TypeScript coverage is `tsc --noEmit`, which is a typecheck, not a style linter. The repo has no ESLint binary.

Evidence after pytest: `evidence/SENTINEL` still reads `rulefreeze-evidence-sentinel`. `evidence/historical/live-qa-campaign.json` and the 1.0.1 campaign files remained.

## Contract and event

| Item | Value |
|---|---|
| Current contract | `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826` |
| Historical contract | `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` |
| Source SHA-256 | `f3b8b9ef09dd21755435e2bc55b5d0db84af5b93348c6655ea7ee9d520cc8177` |
| Event | `ev-1` on the current contract only |
| Active version | `ver-3` |
| amend-1 | accepted clarification |
| amend-3 | acknowledged material change |
| amend-4 | declined |
| amend-2 | pending assessment against a stale base |

Active rules do not contain `Ignore previous instructions`.

## Execution versus consensus

Every current-campaign transaction below was read again with `eth_getTransactionByHash`. `execution_result` is the leader receipt field. `MAJORITY_AGREE` is consensus and is not used as the execution result.

| Step | Transaction | Protocol | Consensus | Leader execution | Return |
|---|---|---|---|---|---|
| Deploy | `0xed921c7720ba1c5bbf0d603a49d225f60100e654bf6a1018ede9792f311fef5f` | FINALIZED | MAJORITY_AGREE | SUCCESS | empty |
| Register `ev-1` | `0x82b92b098d8cbc40336f6f07442bd953443efd4d7f1e633e38fc15f910c759b7` | FINALIZED | MAJORITY_AGREE | SUCCESS | `ev-1` |
| Propose `amend-1` | `0xcea19fa9a6b0d1da8b9a448ec67ab784df8d4ba044c12625af10156602528c58` | FINALIZED | MAJORITY_AGREE | SUCCESS | `amend-1` |
| Assess `assess-1` | `0xcdcfb01addbcae6b2de587c114e7b36a283b5c37d3bbdeaecb4547b827d593b0` | FINALIZED | MAJORITY_AGREE | SUCCESS | `assess-1` |
| Propose `amend-2` | `0x517a183e7d6c98a99ac7e306e1c705092601f9b47f29cd88afa9596ab4890040` | FINALIZED | MAJORITY_AGREE | SUCCESS | `amend-2` |
| Decide `amend-1` | `0x6466008f4ccee702719350858a4ecfc8eab203f3fd5c93981976bf80d7d0c419` | FINALIZED | MAJORITY_AGREE | SUCCESS | empty |
| Propose `amend-3` | `0xa00b9514783680d9b1fca2d7e9429b19c091fb48310bf96a1a22509644d587cb` | FINALIZED | MAJORITY_AGREE | SUCCESS | `amend-3` |
| Assess `assess-2` | `0x3c256db4d53b108283f21ac30fcdbf454af10a6877a61bf7f54729b4b270dbbe` | FINALIZED | MAJORITY_AGREE | SUCCESS | `assess-2` |
| Decide `amend-3` | `0xc0d1a685ad53085b3204e9f71561444d4f3148039c9b6ed7655a9b0776ca4027` | FINALIZED | MAJORITY_AGREE | SUCCESS | empty |
| Propose `amend-4` | `0x795f728b4d1ec7921ec72f1736740eb7acc7f313afd849c315120861945f4769` | FINALIZED | MAJORITY_AGREE | SUCCESS | `amend-4` |
| Assess `assess-3` | `0xee5ae5207f38173ee818ebbfbd4161ea7974b9b3ad56b9ce4e310fb30cc4935d` | FINALIZED | MAJORITY_AGREE | SUCCESS | `assess-3` |
| Decline `amend-4` | `0x8c8df1b078f44983915f12b0ed5de1f3e3b22bcd39300c21b01d032af2530f76` | FINALIZED | MAJORITY_AGREE | SUCCESS | empty |

Sender on each row is `0x40D7ECA78017697c1916819F48850A7f739b6beb`. Value is 0. Receipt status is `0x1`. `effectiveGasPrice` is `0x0`. The indexed recipient is the current contract. Wallet requests used the consensus wrapper `0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575`.

## Case B attempts that did not land

Preserved in `evidence/live-20261020-case-b-decision-attempts.json`. The successful file was overwritten by the landed transaction, so the failures are a separate record.

1. Wallet confirm was shown and Confirm was clicked. `eth_sendRawTransaction` returned `Request is being rate limited`. No hash was returned. This is a rate limit, not a CORS error. Writes are not retried.
2. The page captured a zero-value transaction to the consensus wrapper, and the script never found the Confirm control, so it did not click Confirm.
3. The included decision is nonce 16, immediately after assessment nonce 15.

An unchanged nonce shows that this RPC view had not included another transaction. It is not universal proof that a raw transaction never left the machine. No hash exists for attempts 1 or 2. Nothing was resubmitted during closeout.

## Security classification

Injection-bearing input processed successfully; this individual case does not discriminate between instruction-following and independent classification.

Structured processing succeeded. Grounding succeeded. The explanation treated the injected sentence as non-operative. The requested label `NO_MATERIAL_CHANGE` is also a defensible classification of an otherwise unchanged rule set. This is not a comprehensive prompt-injection result.

Stale base:

- Live UI prevention: **PASS**. `amend-2` shows the stale-base banner and no decision button.
- Local contract rejection: **PASS**. `test_decide_rejects_stale_base` raises `STALE_BASE_VERSION` and leaves the stale amendment `ASSESSED`.
- Live on-chain stale-base rejection: **NOT_RUN**.

## Follow-up, not authorized now

1. When a future write is authorized, propose against the then-active version, activate a different amendment, and submit the stale decision through the UI. Expect `STALE_BASE_VERSION`. The current UI hides that button, so the live chain path needs a build that still offers the transaction or an explicit contract call. Do not bypass the UI just to obtain the error.
2. Run injection cases whose requested label is not independently defensible from the rule diff.
3. Personal-wallet and Vercel checks remain out of scope.

## Evidence

- Campaign ledger: `evidence/live-20261020-reconciled-ledger.json`
- Per-transaction chain files: `evidence/live-20261020-*-chain.json`
- Deployment execution: `evidence/deploy-1.0.1-reconciliation.json`
- Mapping: `evidence/deployment-mapping.json`
- UI bodies: `evidence/live-20261020-case-*-body.txt` and event bodies
- Historical 1.0.0 campaign: `evidence/historical/`
- Reconstructed, not original, deployment artifact: `evidence/reconstructed/deployment-0x6483f0db.json`
- Root cause: `docs/SEMANTIC_ROOT_CAUSE.md`

## Browser

A fresh Chromium profile, with no wallet extension, loaded the registry, `ev-1`, the four amendment pages, and diagnostics.

Desktop showed `ver-3`, `amend-1` activated with `NO_MATERIAL_CHANGE`, `amend-3` activated with the material acknowledgement, `amend-4` declined with the injection sentence only in the proposal, and `amend-2` pending with the stale-base banner. No `[DEMO]` fixture text appeared. Refresh of `ev-1` still showed `ver-3`. Diagnostics showed contract version `1.0.1`. A separate read-only `get_policy` returned contract `1.0.1`, schema `2`, and policy `rulefreeze-eval-v1.1`.

One mobile load of `ev-1` ended in `Failed to read get_event(): ... Failed to fetch` after the browser console reported that `https://studio.genlayer.com/api` had no `Access-Control-Allow-Origin` header (`net::ERR_FAILED`, no HTTP status). A direct POST with `Origin: http://127.0.0.1:48820` and a browser user agent returned HTTP 200, `access-control-allow-origin: http://127.0.0.1:48820`, and `x-ratelimit-remaining: 293` of 300. A POST without a user agent returned HTTP 403 `error code: 1010` and no CORS header. The failed browser call is therefore not relabeled as rate limiting, and the successful direct call is not proof that every browser failure is a missing CORS configuration. The error page did not fall back to demo data. A later load of the same URL returned HTTP 200 and rendered `ver-3`. Reads retry at most four times. Writes are not retried.

The Case B decision broadcast that returned `Request is being rate limited` remains a write rate-limit error, separate from these reads.

Amendment history cards overflowed a 390px viewport. The running build wraps those rows. The stale-base banner is now limited to amendments that have no decision, so activated `amend-1` and `amend-3` no longer show it. `amend-2` still does.

## Process

PM2 app `rulefreeze-web`, id 17, pid 958330, cwd `/root/X`, script `next start -H 0.0.0.0 -p 48820`, restarted 2026-10-20 after the final build. Final Next build id `39mU46aH3Pd5y3-kDwIbr`. A 390px reload of `/events/ev-1` on that process fit the viewport (`scrollWidth` 390), showed `ver-3`, and did not show the injection sentence or `[DEMO]`. `/api/health` returns application version `1.0.0` and contract `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826`. `/api/public-config` returns chain 61999 and `isLiveReady: true`.

Source SHA-256 of `contracts/main.py`: `f3b8b9ef09dd21755435e2bc55b5d0db84af5b93348c6655ea7ee9d520cc8177`.

Next.js warned that it ignored a `package-lock.json` in `/root` because that file is outside the `/root/X` repository. The project lockfile is `/root/X/package-lock.json`. The application version there remains `1.0.0`. No dependency was added.
