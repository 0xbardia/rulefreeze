# System Architecture — RuleFreeze

## 1. System Topology

```
+-------------------------------------------------------------------------+
|                              Browser Client                             |
|                                                                         |
|  +--------------------+   +---------------------+   +----------------+  |
|  | Next.js App Router |   | TxController (Sync) |   | IndexedDB      |  |
|  | React 19 Frontend  |<->| Polling & Backoff   |<->| - EventDrafts  |  |
|  +--------------------+   +---------------------+   | - AmendDrafts  |  |
|            |                         |              | - TxRecords    |  |
|            v                         v              +----------------+  |
|  +----------------------------------------------+                       |
|  | Contract Adapter (genlayer-js / EIP-1193)    |                       |
|  +----------------------------------------------+                       |
+--------------------|-----------------------------------|----------------+
                     |                                   |
         HTTP Reads  |  Writes via Injected              | Public Config
         (readContract)|  Wallet (writeContract)          | & Health
                     |                                   v
                     v                    +-------------------------------+
+-------------------------------------+   | Next.js Server Routes         |
| GenLayer Studionet RPC Endpoint     |   | - /api/public-config          |
| https://studio.genlayer.com/api     |   | - /api/health                 |
| Chain ID: 61999 (0xf22f)            |   +-------------------------------+
+-------------------------------------+
                     |
                     v
+-------------------------------------------------------------------------+
|                  GenLayer Intelligent Contract VM                       |
|                  contracts/main.py (RuleFreeze)                         |
|                                                                         |
|  - Storage: TreeMap[str, str], DynArray[str]                            |
|  - Invariants: Immutability, Stale-base rejection, Organizer auth       |
|  - Nondet: gl.nondet.exec_prompt (LLM semantic evaluation)              |
|  - Consensus: gl.eq_principle.prompt_comparative                        |
|  - Post-Consensus: Deterministic quote grounding & schema enforcement   |
+-------------------------------------------------------------------------+
```

---

## 2. Component Responsibilities

### A. GenLayer Intelligent Contract (`contracts/main.py`)
- Authoritative single source of truth for all registered events, rule versions, proposed amendments, semantic assessments, and organizer decisions.
- Deterministic state machine:
  - Enforces caller permissions (`gl.message.sender_address`).
  - Hashing of normalized rule texts using SHA-256.
  - Generates sequential IDs (`ev-1`, `ver-1`, `amend-1`, `assess-1`).
  - Rejects proposals with no textual changes.
  - Rejects activations of stale base versions.
  - Rejects `ACCEPTED_CLARIFICATION` if semantic consensus found `MATERIAL_CHANGE` or `REVIEW_NEEDED`.
- Non-deterministic semantic evaluation:
  - Encapsulates prompt generation with strict prompt injection boundaries.
  - Invokes `gl.nondet.exec_prompt` with structured JSON format.
  - Validates comparative equivalence across validators via `gl.eq_principle.prompt_comparative`.
  - Deterministically verifies that citations exist verbatim in source text.

### B. Frontend (`src/app/`, `src/components/`)
- Pure client-side Next.js App Router application.
- Supports both Live on-chain execution (via `genlayer-js` and browser wallet) and isolated Demo Mode fixtures (`[DEMO]`).
- Visual design: Calm, restrained rules workbench with neutral surfaces, accessible contrast, and clear typography.
- Mobile and desktop responsive layouts.
- Side-by-side and stacked textual diff viewer.
- Real-time transaction tracking banner.

### C. Client Storage: IndexedDB (`src/lib/idb.ts`)
- Stores:
  - Unregistered event drafts.
  - Unsubmitted amendment drafts.
  - Recoverable transaction tracking records.
- Versioned schema (v2) with automated migration.
- Clean separation: Local draft deletion never modifies or deletes on-chain records.
- Corrupt data handling without crashing application.

### D. Server Routes (`src/app/api/`)
- Thin same-origin routes for public configuration and liveness diagnostics only:
  - `/api/public-config`: Allowlisted bridge exposing validated `contractAddress`, `rpcUrl`, and `chainId`. Never dumps environment wholesale.
  - `/api/health`: Provides liveness, configuration status, and bounded RPC latency check.
- Stateless, zero database requirement, zero private key dependency; fully compatible with Vercel and PM2 Linux servers.

---

## 3. Deployment Targets

1. **Linux Server with PM2:**
   - Production build running under PM2 (`rulefreeze-web`).
   - Bound to `0.0.0.0:48820`.
2. **Vercel:**
   - Zero filesystem dependency.
   - Standard Next.js serverless functions for `/api/*`.
   - Framework-compatible environment handling.
