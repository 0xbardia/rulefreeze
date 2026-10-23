# RuleFreeze

> **"Understand when a rule clarification changes the rules."**

RuleFreeze is a public rule-version registry and semantic amendment review desk for hackathons, developer bounties, and competitive events built on GenLayer intelligent contracts.

---

## 1. Product Overview

In developer hackathons and competitive bounty programs, organizers frequently issue rule updates, FAQ additions, or Discord clarifications. Organizers often view these as harmless elaborations, while participants may discover their submissions retroactively disqualified or disadvantaged.

### Textual Diff versus Semantic Assessment
Traditional character or unified diff viewers show *what characters changed*. They cannot determine whether participant criteria, deadlines, or scoring rubrics shifted in effect. Generic LLM chatbots produce unstructured, unverified, and non-authoritative prose.

**RuleFreeze introduces bounded participant scenario probing:**
1. **Immutable Baseline Registration:** The organizer registers initial rules along with explicit participant scenarios (e.g. team size, late submission, missing live URL).
2. **Semantic Amendment Review:** When an amendment is proposed, GenLayer intelligent contracts execute equivalence consensus across validators.
3. **Outcome Comparison & Citation Grounding:** Validators compare old vs new outcomes for every scenario, quote verbatim rule excerpts, and categorize the overall effect (`NO_MATERIAL_CHANGE`, `MATERIAL_CHANGE`, `REVIEW_NEEDED`, `INSUFFICIENT_INFORMATION`).
4. **Invariant Activation Policy:** Organizers cannot silently activate a material alteration as a clarification. If material changes exist, the contract enforces an explicit public acknowledgement and rationale.

### Who It Serves
- **Organizers:** Provides a verifiable, audit-trailed workflow to announce rule clarifications with provable semantic neutrality.
- **Participants:** Offers transparent visibility into rule version history and confidence that amendments do not alter operative evaluation criteria mid-competition.

### What RuleFreeze Is Not
- **Not a generic AI chatbot.**
- **Not a character-diff viewer with a blockchain badge.**
- **Not a universal legal arbitrator or court.**
- **Not a prize escrow or payment application.**
- **Not a guarantee that an organizer will honor rules in real life.**
- **Not a system claiming AI consensus is infallible.**

*The contract records and evaluates rule versions. The actual event remains governed by its organizer.*

---

## 2. Version Domain Separation

RuleFreeze strictly differentiates between application version and smart contract version:

| Domain | Version | Authority | Description |
|---|---|---|---|
| Application Version | `1.1.0` | `package.json` / `/api/health` | Next.js user interface, API routes, and client adapters |
| Contract Version | `1.0.1` | `contracts/main.py` / `get_policy()` | Intelligent contract deployed on GenLayer Studionet |
| Schema Version | `2` | Deployed contract | Internal serialization structure for event records |
| Evaluation Policy | `rulefreeze-eval-v1.1` | Deployed contract | Canonical validator evaluation prompts and rules |

---

## 3. Current Deployments and Status

- **Network:** GenLayer Studionet (Test Environment)
- **Chain ID:** `61999` (`0xf22f`)
- **RPC Endpoint:** `https://studio.genlayer.com/api`
- **Active Intelligent Contract:** `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826`
- **Deployment Transaction:** `0xed921c7720ba1c5bbf0d603a49d225f60100e654bf6a1018ede9792f311fef5f`
- **Contract Source Checksum (SHA-256):** `f3b8b9ef09dd21755435e2bc55b5d0db84af5b93348c6655ea7ee9d520cc8177`
- **Current Public Application Deployment:** `https://rulefreeze.bydx.fun`
- **Historical Contract (v1.0.0, Deprecated):** `0xC8a83C62da126891aB8F60e6D5E171480aE91c23`

*Note: GenLayer Studionet is an experimental testnet. Transactions require zero native gas fee (`gasPrice: 0x0`).*

---

## 4. Requirements & Installation

### Requirements
- **Node.js:** 22 LTS (`v22.x`)
- **Python:** 3.12+ (for Direct VM contract tests)
- **Git**

### Clean Installation
```bash
git clone https://github.com/0xbardia/rulefreeze.git
cd rulefreeze

# Install Node dependencies
npm ci

# Install Python test dependencies
pip install -r requirements-test.txt
```

### Local Startup
```bash
# Copy example environment configuration
cp .env.example .env.local

# Run Next.js development server
npm run dev

# Or build and start production server locally
npm run build
npm run start
```

---

## 5. Configuration Bridge

RuleFreeze uses a validated public configuration bridge (`src/app/api/public-config/route.ts`). Only allowlisted parameters are served to the browser:

```env
# Deployed contract address (0x... 40 hex chars)
PUBLIC_CONTRACT_ADDRESS=0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826

# GenLayer Studionet RPC endpoint
PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api

# GenLayer Studionet Chain ID
PUBLIC_GENLAYER_CHAIN_ID=61999

# Server Port and Host
PORT=48820
HOST=0.0.0.0
NODE_ENV=production
```

When `PUBLIC_CONTRACT_ADDRESS` is empty or unset, the application automatically enters Demonstration Mode, presenting synthetic evaluation fixtures marked `[DEMO]` without triggering live RPC calls.

---

## 6. Connecting or Deploying Contracts

### Connecting to an Existing Compatible Contract
To connect this interface to another deployed RuleFreeze contract:
1. Update `PUBLIC_CONTRACT_ADDRESS` in `.env.local` with the new contract address.
2. Ensure the contract implements Schema 2 / Contract 1.0.1 (`get_policy()`, `get_event()`, `propose_amendment()`, `decide_amendment()`).
3. Restart or rebuild the application.

### Deploying a Separate Contract
1. Navigate to GenLayer Studio: [https://studio.genlayer.com](https://studio.genlayer.com).
2. Connect your browser wallet (configured for Studionet, Chain ID 61999).
3. Create a new contract and paste the contents of `contracts/main.py`.
4. Verify the source SHA-256 matches:
   `f3b8b9ef09dd21755435e2bc55b5d0db84af5b93348c6655ea7ee9d520cc8177`
5. Deploy without constructor arguments (`__init__()` zero-argument).
6. Copy the deployed contract address into your `.env.local`.
7. See `docs/STUDIO_DEPLOYMENT.md` for full step-by-step guidance.

---

## 7. Testing Strategy

RuleFreeze includes separate offline tests and live verification suites:

### Offline Tests (Deterministic, no chain required)
```bash
# Run GenLayer Direct VM contract tests & semantic corpus
npm run test:contract

# Run Node.js & IndexedDB unit tests
npm run test:ts

# Run all offline test suites
npm test

# Run type checking and domain constraint linter
npm run typecheck
npm run lint
```

### Live Tests (Requires Studionet RPC)
Live verification transactions are recorded in `docs/PUBLIC_QA_SUMMARY.md` and `docs/QA_CLOSEOUT.md`.
Live tests exercise genuine validator consensus on Studionet. Live writes are never executed during automated CI.

---

## 8. Known Limitations

1. **Non-Arbitration:** RuleFreeze provides automated semantic equivalence analysis based on validator consensus. It is not legal advice and does not substitute for event organizers' dispute resolution.
2. **Studionet Dependency:** Read latency and availability depend on the GenLayer Studionet RPC. Temporary validator delays or rate limits may occur.
3. **Citation Grounding:** Citations require exact verbatim substring matching against the active rule text. Paraphrased references cannot satisfy automated approval checks.
4. **Stale Base Rejection:** Amendments proposed against version N cannot activate if another amendment activates version N+1 in the interim.

---

## 9. Documentation Directory

- `docs/ARCHITECTURE.md`: Component boundaries and data flow.
- `docs/CONTRACT_INTERFACE.md`: Contract methods and JSON structures.
- `docs/GENLAYER_INTEGRATION.md`: Consensus mechanisms and SDK decisions.
- `docs/STUDIO_DEPLOYMENT.md`: Manual deployment walk-through.
- `docs/PUBLIC_QA_SUMMARY.md`: Public evidence summary for the v1.0.1 campaign.
- `docs/QA_CLOSEOUT.md`: Detailed QA closeout and execution ledger.
- `docs/LIMITATIONS.md`: Boundaries and operational limits.
- `docs/ROADMAP.md`: Proposed future enhancements.

---

## 10. License

Licensed under the [Apache License, Version 2.0](LICENSE) (Apache-2.0).
Copyright 2026 RuleFreeze contributors. See `SECURITY.md` for vulnerability reporting guidelines.
