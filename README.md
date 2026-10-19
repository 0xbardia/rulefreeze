# RuleFreeze

> **"Understand when a rule clarification changes the rules."**

RuleFreeze is a public rule-version registry and semantic amendment review desk for hackathons, developer bounties, and small competitions built on GenLayer intelligent contracts.

---

## 1. Product Overview

In developer hackathons and grant programs, organizers frequently issue late updates, FAQ additions, or Discord clarifications. Often, organizers view these as harmless elaborations, while participants find their submissions retroactively disqualified or disadvantaged.

Traditional character diff viewers only show what letters changed; they cannot determine whether participant criteria shifted. Generic LLM chatbots produce unstructured, unverified, and non-authoritative prose.

**RuleFreeze introduces bounded participant scenario probing:**
1. **Immutable Baseline Registration:** The organizer registers initial rules and a set of explicit participant scenarios (e.g. team size, late submission, missing live URL).
2. **Semantic Amendment Review:** When an amendment is proposed, GenLayer intelligent contracts execute equivalence consensus across validators.
3. **Outcome Comparison & Grounding:** Validators compare old vs new outcomes for every scenario, quote verbatim rule excerpts, and categorize the overall effect (`NO_MATERIAL_CHANGE`, `MATERIAL_CHANGE`, `REVIEW_NEEDED`, `INSUFFICIENT_INFORMATION`).
4. **Invariant Activation Policy:** Organizers cannot silently activate a material alteration as a clarification. If material changes exist, the contract enforces an explicit public acknowledgement and rationale.

### What RuleFreeze Is Not
- **Not a generic AI chatbot.**
- **Not a text-diff viewer with a blockchain badge.**
- **Not a universal legal arbitrator or court.**
- **Not a prize escrow or payment application.**
- **Not a guarantee that an organizer will honor rules in real life.**
- **Not a system claiming AI consensus is infallible.**

*The contract records and evaluates rule versions. The actual event remains governed by its organizer.*

---

## 2. Repository Structure

```
X/
├── contracts/
│   ├── main.py                    # Canonical GenLayer intelligent contract (deploy to Studio)
│   └── ...
├── docs/
│   ├── ARCHITECTURE.md            # System architecture & component boundaries
│   ├── PRODUCT_SPEC.md            # Product model, state invariants, user flows
│   ├── GENLAYER_INTEGRATION.md    # Verified GenLayer APIs, consensus & SDK decision log
│   ├── CONTRACT_INTERFACE.md      # Read/write method signatures and serialization formats
│   ├── STUDIO_DEPLOYMENT.md       # Step-by-step GenLayer Studio deployment instructions
│   ├── SECURITY.md                # Security rules, prompt injection defense, validations
│   ├── THREAT_MODEL.md            # Threat vectors, attacker profiles, mitigation matrix
│   ├── QA_REPORT.md               # Test evidence, mock vs live matrix, verification results
│   ├── DEPLOYMENT.md              # Production deployment (Linux/PM2 & Vercel)
│   ├── LIMITATIONS.md             # Boundaries, assumptions, non-guarantees
│   └── ROADMAP.md                 # Credible v1 pilot roadmap
├── src/
│   ├── app/                       # Next.js App Router pages and API routes
│   │   ├── api/health/            # Liveness, RPC connectivity & contract diagnostics
│   │   ├── api/public-config/     # Validated allowlisted public config bridge
│   │   ├── events/                # Event registry & new event wizard
│   │   ├── methodology/           # Evaluation philosophy & technical limits
│   │   └── diagnostics/           # Configuration, wallet, and storage inspector
│   ├── lib/                       # Types, config, SDK contract adapter, mock adapter, IDB
│   └── components/                # UI components (Header, Footer, DiffViewer, TxProgress)
├── tests/                         # Pytest contract tests, semantic corpus, Node unit tests & Playwright
├── screenshots/                   # QA browser screenshots and audit report
├── ecosystem.config.cjs           # PM2 configuration for Linux production server
└── package.json                   # Dependencies and npm scripts
```

---

## 3. Quickstart & Local Development

### Prerequisites
- Node.js 22 LTS
- Python 3.12+ (for running offline contract Direct VM tests)
- Chromium browser (for Playwright E2E verification)

### Installation
```bash
cd X
npm install
```

### Running Tests
```bash
# Run GenLayer Direct VM contract tests & Section 11 semantic corpus
npm run test:contract

# Run TypeScript / Node unit tests (config & mock adapter state machine)
npm run test:ts

# Run Real Chromium E2E tests
node tests/playwright_e2e.mjs
```

### Starting Development Server
```bash
npm run dev
```

### Production Build & PM2
```bash
npm run build
pm2 start ecosystem.config.cjs
```

---

## 4. Canonical Contract & Manual Studio Deployment

The authoritative GenLayer intelligent contract lives at:
`X/contracts/main.py`

- **SHA-256 Checksum:** `42cc031d0ba76e704e0b67c2df366139104e860fc41c71d79df082738d0e0396`
- **Constructor Arguments:** None (`__init__()` zero-argument)
- **Deployment Platform:** [https://studio.genlayer.com](https://studio.genlayer.com)
- **Network:** GenLayer Studionet (Chain ID: `61999`, RPC: `https://studio.genlayer.com/api`)

Detailed instructions: See `docs/STUDIO_DEPLOYMENT.md`.

---

## 5. Public Configuration

RuleFreeze uses a validated public configuration bridge:
- `PUBLIC_CONTRACT_ADDRESS`: The deployed contract 0x address.
- `PUBLIC_GENLAYER_RPC_URL`: `https://studio.genlayer.com/api`
- `PUBLIC_GENLAYER_CHAIN_ID`: `61999`

When `PUBLIC_CONTRACT_ADDRESS` is unconfigured, the application operates in safe setup mode, serving interactive demonstration fixtures labeled `[DEMO]` and providing diagnostics instructions without generating failed RPC calls.

---

## 6. License
Apache-2.0
