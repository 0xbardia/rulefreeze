# Changelog

All notable changes to the RuleFreeze project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.0] - 2026-10-23

### Changed
- **Application Workbench Redesign (Contract v1.0.1 Unchanged):**
  - **Editorial Landing Page & Simulator:** Redesigned landing experience with interactive scenario simulator demonstrating non-material clarification vs material rule divergence without blockchain writes.
  - **Registry Redesign:** Enhanced event list and detail views with explicit status indicators, version tags, and structured governance timelines.
  - **Authoring Interfaces:** Improved baseline registration and amendment authoring forms with synchronous pre-submit review modals, validation indicators, and draft persistence.
  - **Assessment Review Hierarchy:** Clear visual hierarchy across consensus outcomes, leader execution status, citations, and organizer action triggers.
  - **Responsive & Accessibility Improvements:** Enhanced semantic HTML landmarks, ARIA dialogs, focus trapping, high-contrast states, and mobile layout support down to 360px viewport widths.

### Added
- **Transaction Recovery & Lifecycle Reconciliation Engine (`src/lib/reconciliation.ts`):**
  - **3-Gate Draft Cleanup:** Enforces three verified gates (`finalityVerified`, `executionVerified`, `readbackVerified`) before deleting local drafts from IndexedDB.
  - **Persistent Pending-Transaction Protection:** `pendingTxHash` tracked across browser tick and session boundaries to resume tracking and block duplicate submissions even after UI `submittingRef` resets.
  - **Draft Retention Across Adverse Outcomes:** Automatic draft retention on provisional (`ACCEPTED`), failed, unknown, or timed-out outcomes; never deletes draft without verified final state and matching readback.
  - **Strict Evidence Separation:** Decouples protocol polling state, consensus outcome (`MAJORITY_AGREE`, `NEGATIVE_CONSENSUS`), leader execution result, and reconciliation status into distinct structured evidence fields.

### Quality Assurance & Verification
- **Test Suite Results:**
  - 32/32 Python contract & direct GenVM unit tests (`npm run test:contract`).
  - 50/50 Node.js unit and browser regression tests passing with running local test server (`npm run test:ts`), with graceful offline skipping for headless CI runners.
  - TypeScript strict typecheck clean (`npm run typecheck`).
  - Domain constraints linter clean (`npm run lint`).
  - Optimized Next.js production build verified.
- **Evidence Boundary:**
  - Form argument checks and lifecycle tests verified via deterministic EIP-1193 write interception and RPC route mocking.
  - No new live blockchain transactions were submitted during this application release.
  - Historical genuine MetaMask / GenLayer Studionet evidence preserved under `evidence/`.

### Known Limitations
- **GenLayer Studionet Dependency:** Read and write availability depends on the public GenLayer Studionet test network RPC (`https://studio.genlayer.com/api`).
- **Bounded Semantic Evaluation:** LLM consensus operates under bounded non-deterministic validation against contract policy `rulefreeze-eval-v1.1`.
- **No Certification Claim:** No comprehensive prompt injection immunity or formalized security certification is claimed.

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
