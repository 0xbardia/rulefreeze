# Contributing to RuleFreeze

Thank you for your interest in contributing to RuleFreeze. This document outlines the development workflow, testing standards, and contribution guidelines.

---

## 1. Prerequisites and Setup

- **Node.js:** Node.js 22 LTS (recommended: `v22.x`)
- **npm:** npm 10+
- **Python:** Python 3.12+ (for Direct VM contract tests)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/0xbardia/rulefreeze.git
cd rulefreeze

# Install Node dependencies
npm ci

# Set up Python virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-test.txt
```

---

## 2. Local Configuration

Copy the example environment configuration:

```bash
cp .env.example .env.local
```

- In development mode without a configured contract address, RuleFreeze runs in demonstration mode with mock fixtures labeled `[DEMO]`.
- To connect to a live GenLayer Studionet contract, provide `PUBLIC_CONTRACT_ADDRESS`.

---

## 3. Running the Test Suite

All contributions must pass all test gates:

```bash
# Run all tests (contract Direct VM + TypeScript/Node)
npm test

# Run type checking
npm run typecheck

# Run domain constraint linter
npm run lint

# Run Next.js production build
npm run build
```

---

## 4. Architecture and Contract Invariants

When modifying RuleFreeze, preserve the following architectural boundaries:
- **Contract is authoritative:** UI never invents or mutates state without smart contract verification.
- **Contract source checksum:** `contracts/main.py` is hash-frozen for specific releases. Do not alter contract logic without coordination and re-deployment documentation.
- **No unrequested writes:** Do not introduce background writes or unprompted transactions. Writes must be explicit user actions with zero native value.
- **Sanitized public surface:** Never commit private keys, wallet mnemonics, API tokens, or server configuration files.

---

## 5. Submitting Changes

1. Create a feature branch (`git checkout -b feature/your-feature-name`).
2. Implement your changes with accompanying tests.
3. Ensure all test commands (`npm test`, `npm run lint`, `npm run build`) pass cleanly.
4. Open a pull request against the `master` branch with a clear summary of changes and test evidence.
