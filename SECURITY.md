# Security Policy

## Supported Versions

| Version Domain | Supported Version | Status |
|---|---|---|
| Application (`package.json`) | 1.0.0 | Active |
| Contract (`contracts/main.py`) | 1.0.1 | Active on Studionet |
| Contract (Historical) | 1.0.0 | Deprecated |

---

## Reporting a Vulnerability

Security issues should be reported privately to prevent exposure to potential exploits before a fix is available.

- **Reporting Channel:** Please report vulnerabilities through GitHub Private Vulnerability Reporting at:
  [https://github.com/0xbardia/rulefreeze/security/advisories/new](https://github.com/0xbardia/rulefreeze/security/advisories/new)
- Do **not** disclose potential security vulnerabilities publicly via GitHub issues or public forums.
- When reporting, please provide:
  1. Description of the vulnerability.
  2. Steps to reproduce or proof-of-concept.
  3. Affected component (contract, frontend, API route).
  4. Suggested remediation if available.

---

## Security Model Highlights

1. **Authorization & Access Control:** Organizer actions (`propose_amendment`, `decide_amendment`) enforce strict msg.sender authentication on-chain.
2. **Prompt Injection Mitigation:** All candidate rules, amendments, and questions are treated as untrusted evidence delimited inside explicit boundary blocks.
3. **Citation Grounding:** Citations and references must match verbatim text in source rules; missing citations invalidate autonomous `NO_MATERIAL_CHANGE` approvals.
4. **Stale Base Protection:** Amendments evaluated against an outdated base version are blocked from activation on-chain.
5. **No Secret Storage:** The frontend bundle and API routes store zero private keys, API secrets, or sensitive credentials.
