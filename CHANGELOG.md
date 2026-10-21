# Changelog

All notable changes to the RuleFreeze project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] - 2026-10-20

### Added
- **Intelligent Contract v1.0.1 (`contracts/main.py`):**
  - Schema Version 2 with evaluation policy `rulefreeze-eval-v1.1`.
  - Direct JSON dictionary support for GenVM `gl.nondet.exec_prompt(..., response_format="json")`.
  - Deterministic citation grounding check against active rule baseline.
  - On-chain stale base rejection for amendment activation.
- **Frontend Application (`rulefreeze`):**
  - Next.js 16 App Router interface for baseline registration, amendment proposals, and review desk.
  - `/api/public-config`: Sanitized public configuration endpoint exposing allowlisted runtime parameters.
  - `/api/health`: Diagnostic endpoint reporting application version, contract configuration, and RPC reachability.
  - Responsive mobile styling for viewports down to 390px without horizontal overflow.
  - Dual-mode operation: Live Studionet on-chain mode and synthetic demonstration fixtures labeled `[DEMO]`.
- **Test Suites:**
  - Direct VM Python tests (`tests/test_contract_direct.py`, `tests/test_semantic_corpus.py`).
  - Node.js test runner suites for client IDB migrations, config validation, and transaction result parsing.
  - GitHub Actions CI workflow for automated linting, typechecking, tests, and production build verification.

### Fixed
- Fixed v1.0.0 contract parsing defect where `str(raw)` single-quoted Python dict representations caused JSON decode failures across validator consensus.
- Distinguish processing errors from semantic `REVIEW_NEEDED` verdicts.
- Fixed amendment cards layout wrapping on narrow mobile screens.

---

## [1.0.0-contract] - 2026-10-19 (Historical / Deprecated)

### Added
- Initial RuleFreeze contract prototype deployed to `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` (Schema 1, Policy `rulefreeze-eval-v1.0`).
