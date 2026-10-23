# RuleFreeze Frontend Redesign Specification & Architecture

## 1. Executive Summary & Design System

The RuleFreeze frontend has undergone a complete architectural redesign and UX rebuild. The previous generic dark-mode developer shell has been replaced with an authoritative, high-craft editorial review workbench designed for organizers, bounty managers, and competition participants.

### Visual Character & Tone
- **Aesthetic Direction:** Editorial legal workbench, institutional rigor, quiet authority.
- **Surface Palette:** Warm parchment canvas (`#fcfbf9`), crisp card sheets (`#ffffff`), and subtle document insets (`#f6f5f0`).
- **Ink & Contrast:** Deep ink primary typography (`#14171a`, 16.5:1 contrast ratio against canvas), slate secondary ink (`#3d434a`), and muted notation ink (`#646b74`).
- **Primary Brand & Action Accent:** Authoritative maritime navy (`#0d2847`) for identity, paired with disciplined cobalt (`#0b57d0`, hover `#0842a0`) for primary actions.
- **Semantic Status Architecture (WCAG AAA/AA Compliant):**
  - *No Material Change / Safe:* Emerald tone (`#065f46` on `#ecfdf3`, border `#a7f3d0`).
  - *Outcome Changed / Warning / Review Needed:* Amber tone (`#92400e` on `#fffbeb`, border `#fde68a`).
  - *Material Change / Disqualified / Severe:* Crimson tone (`#991b1b` on `#fef2f2`, border `#fecaca`).
  - *Neutral / On-Chain Metadata:* Slate tone (`#334155` on `#f1f5f9`, border `#cbd5e1`).
  - *Brand Tag:* Cobalt tone (`#0d2847` on `#eff4fa`, border `#c8daf0`).

### Typography Stack
- **Sans-Serif (Interface):** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Serif / Editorial (Documentation & Rules):** `"Charter", "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif`
- **Monospace (Hashes, Code, Probes, Timestamps):** `ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`

---

## 2. Component System Architecture

### A. Masthead Navigation (`Header.tsx`)
- Displays clean brand identity: `RuleFreeze` with monospaced `REGISTRY` pill.
- Navigation links (`Registry`, `Register Rules`, `Methodology`, `Diagnostics`) with active-route detection.
- Contextual network status pill: displays `Studionet` (chain 61999) when wallet is connected, or warns if on an unsupported chain.
- Discrete demo mode toggle pill: clearly separates synthetic demonstration fixtures from live on-chain reads.
- Non-intrusive wallet connection pill showing truncated active address (`0x...`).

### B. Purpose-Built Diff Viewer (`DiffViewer.tsx`)
- Rebuilt from scratch with line numbering, syntactic highlighting, and character diff statistics (`+N / -N chars`).
- Toggleable side-by-side split view and stacked vertical view.
- Responsive design: automatically falls back to single-column stacked view on screens below 840px.

### C. Non-Intrusive Transaction Progress (`TxProgressBanner.tsx`)
- Dignified progress indicator tracking on-chain write lifecycle across protocol broadcast, consensus agreement, and deterministic execution.
- Clear status badges and auto-dismissal after finality.

### D. Interactive Impact Simulator (`InteractiveSimulator.tsx`)
- Client-side interactive comparison widget embedded directly into the landing page.
- Allows visitors to compare a harmless wording clarification vs an outcome-altering deliverable requirement.
- Evaluates participant scenario probes in real time with zero wallet connection or network writes required.

### E. Comprehensive Editorial Footer (`Footer.tsx`)
- Complete institutional governance disclaimer: distinguishes on-chain registry truth from real-world event administration.
- Clear attribution, deployed application version (`1.0.0`), contract version properties, and verified repository references.

---

## 3. Route-by-Route Structural & UX Transformations

### 1. Landing Page (`/`)
- **Hero:** Focused benefit proposition: *"When a clarification changes who qualifies, make the change visible."*
- **Call-to-Action:** Direct primary CTA (*"Start a rule registry"*) paired with high-intent secondary CTA (*"See an example review →"*).
- **Product Specimen Preview:** Authoritative side-by-side comparison specimen displaying registered rule text, proposed revision, participant probe facts, and the resulting outcome reversal with contract gating alert.
- **Interactive Simulator:** Hands-on tabbed simulator demonstrating how scenario probing differentiates syntactic changes from substantive qualification shifts.
- **Concrete 4-Stage Workflow:** Visual step-by-step breakdown: *Register Baseline* → *Propose Amendment* → *Assess Impact* → *Decide & Activate*.
- **Target Beneficiaries:** Dedicated sections for Hackathon Organizers, Bounty & Grant Managers, and Competing Participants.
- **Trust & Honest Limitations:** Unambiguous explanation of scenario-bounded evaluation, cryptographic content hashing, and the GenLayer Studionet environment.

### 2. Public Event Registry (`/events`)
- Replaced undifferentiated cards with a structured, high-density ledger.
- Scope-aware search bar: explicitly communicates loaded record scope (*"Showing N of N loaded events"*).
- Each item communicates canonical ID (`ev-1`, `demo-ev-1`), active rule version (`v1`, `v2`), organizer identifier, version/amendment counts, declared deadline, and timestamp.
- Verified live on-chain badges vs demonstration fixture badges.
- Content-matching skeleton loaders and robust empty states.

### 3. Event Baseline Registration Flow (`/events/new`)
- Divided into three structured document sections: *Competition Identity*, *Full Baseline Rules Text*, and *Bounded Participant Scenario Probes*.
- Real-time character and line metrics for rule text.
- Comprehensive Scenario Probes Builder: explicitly breaks each test probe into *Title*, *Affected Dimension* (Eligibility, Scoring, Deadlines, Deliverables, etc.), *Participant Situation*, and *Explicit Question to Assess*.
- Section 8 Synthetic QA Fixture Loader with unsaved-change overwrite protection.
- Client-side IndexedDB draft persistence with visual status feedback.
- Pre-submission review modal providing a summary checklist before initiating on-chain transactions.

### 4. Event Detail Screen (`/events/[id]`)
- Editorial document sheet displaying authoritative registered active rules text with one-click SHA-256 hash copying.
- Registered scenario probes list showing the baseline conditions that all future amendments will be tested against.
- Proposed and historical amendments list with semantic status chips (`ACTIVATED`, `DECLINED`, `ASSESSED`, `PENDING_ASSESSMENT`).
- Version lineage timeline with visual branch connectors, creator addresses, content hashes, and public activation decision rationales.

### 5. Amendment Proposal Flow (`/events/[id]/amend`)
- Contextual breadcrumbs linking back to event registry.
- Declared Intended Applicability Scope selector: clear radio card choices for *Current Participants (Immediate/Retroactive)*, *Future Submissions Only (Prospective)*, and *Unspecified*.
- Mandatory organizer explanation input.
- Full amended rules text editor with character counter.
- Live side-by-side textual diff preview against the active base version.
- IndexedDB draft saving.

### 6. Assessment Review Desk (`/events/[id]/amendments/[amendmentId]`)
- **Strict 5-Step Information Hierarchy:**
  1. *What Changed:* Authoritative semantic verdict header (`NO_MATERIAL_CHANGE`, `MATERIAL_CHANGE`, `REVIEW_NEEDED`, `PROCESSING_FAILURE`, `UNGROUNDED`).
  2. *Impact Dimensions:* Consensus reasoning, affected rule dimensions, and citation grounding verification status.
  3. *Participant Scenario Comparisons:* Concrete probe cards displaying outcome under base rules vs outcome under amendment, with explicit outcome reversal highlights (`Outcome Changed` vs `Outcome Unchanged`). Grounded rule excerpts are quoted directly from the source text.
  4. *Textual Diff Comparison:* Detailed line-by-line DiffViewer.
  5. *Organizer Decision Control Panel:* Invariant-enforced radio controls. If an amendment contains a material change, the `ACCEPTED_CLARIFICATION` option is strictly disabled with a red warning badge. Mandatory public decision rationale (minimum 15 characters).
  6. *Progressive Disclosure:* Expandable technical drawer for hashes, IDs, and consensus metadata.

### 7. Methodology & Architecture (`/methodology`)
- Comprehensive whitepaper-grade layout documenting the 5 architectural pillars:
  1. Explicit Governance Distinction (registry vs event).
  2. Bounded Participant Scenario Probing.
  3. Equivalence Consensus & Deterministic Citation Grounding.
  4. Prompt-Injection Resistance.
  5. Stale-Base Protection Invariants.

### 8. System Diagnostics (`/diagnostics`)
- Live environment probe verifying allowlisted public configuration (`PUBLIC_CONTRACT_ADDRESS`, `PUBLIC_GENLAYER_RPC_URL`, `PUBLIC_GENLAYER_CHAIN_ID`).
- Real-time `/api/health` status and RPC latency probe.
- EIP-1193 browser wallet connectivity inspector.
- Authoritative live contract policy readback.
- IndexedDB storage inspector with one-click local draft clearing and transaction history monitoring.

---

## 4. Responsive & Mobile Engineering

- **Viewports Validated:** 360px, 390px, 768px, 1280px, 1440px.
- **Horizontal Overflow Policy:** Page-level horizontal overflow is strictly eliminated (`0` overflow defects across all routes). Layouts adapt naturally without using global `overflow-x: hidden` hacks.
- **Mobile Optimizations:**
  - Multi-column grids smoothly collapse to single-column stacked cards.
  - Interactive simulator tabs support fluid horizontal touch-scrolling.
  - Long cryptographic hashes and addresses feature `overflow-wrap: anywhere` and `word-break: break-all`.
  - Buttons and interactive touch targets maintain a minimum comfortable hit area (≥44px height).
