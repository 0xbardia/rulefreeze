import Link from "next/link";

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>
      {/* Editorial Masthead */}
      <div style={{ marginBottom: "32px", borderBottom: "1px solid var(--rf-border-subtle)", paddingBottom: "24px" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--rf-ink-muted)",
            display: "block",
            marginBottom: "6px",
          }}
        >
          Architectural Specification & Invariant Design
        </span>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
          Methodology & Limitations
        </h1>
        <p style={{ color: "var(--rf-ink-secondary)", fontSize: "1.05rem", marginTop: "8px", lineHeight: 1.6 }}>
          How RuleFreeze records immutable baselines, evaluates semantic amendments via GenLayer intelligent contracts, and strictly bounds on-chain truth from real-world event governance.
        </p>
      </div>

      {/* Principle 1 */}
      <div className="rf-document-sheet" style={{ marginBottom: "24px" }}>
        <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "8px" }}>
          PRINCIPLE 1
        </span>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "12px" }}>
          Explicit Governance Distinction
        </h2>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", lineHeight: 1.65 }}>
          RuleFreeze is an authoritative on-chain registry and semantic evaluation desk running on GenLayer. It provides verifiable, consensus-backed answers to four questions:
        </p>
        <ol style={{ paddingLeft: "24px", margin: "12px 0", fontSize: "0.9rem", color: "var(--rf-ink-secondary)", lineHeight: 1.65 }}>
          <li>What exact rule text was initially frozen at timestamp <em>T</em>?</li>
          <li>What amendments were subsequently submitted by the organizer?</li>
          <li>Did the amendment alter outcomes for registered participant scenario probes?</li>
          <li>Did the organizer activate the revision, and what rationale did they sign on-chain?</li>
        </ol>

        <div style={{ marginTop: "14px", padding: "12px 16px", background: "var(--rf-surface-subtle)", borderRadius: "var(--rf-radius-md)", border: "1px solid var(--rf-border-subtle)" }}>
          <strong style={{ fontSize: "0.85rem", color: "var(--rf-ink-primary)" }}>What RuleFreeze is NOT:</strong>
          <ul style={{ paddingLeft: "20px", marginTop: "6px", fontSize: "0.85rem", color: "var(--rf-ink-secondary)", lineHeight: 1.6 }}>
            <li>Not a prize escrow, treasury wallet, or automated payment dispatcher.</li>
            <li>Not an omniscient judicial arbitrator or universal legal court.</li>
            <li>Not an ungrounded AI chatbot or cosmetic text-diff widget with crypto branding.</li>
            <li>Not an absolute guarantee that a human organizer will obey the registry off-chain.</li>
          </ul>
        </div>

        <div className="rf-quote-box" style={{ marginTop: "16px" }}>
          &quot;The contract records and evaluates rule versions. The actual event remains governed by its organizer.&quot;
        </div>
      </div>

      {/* Principle 2 */}
      <div className="rf-card" style={{ marginBottom: "24px" }}>
        <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "8px" }}>
          PRINCIPLE 2
        </span>
        <h2 className="rf-card-title">Bounded Participant Scenario Probes</h2>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "8px", lineHeight: 1.65 }}>
          Textual diffs only count characters or words. A four-character addition (<em>&quot;Friday&quot;</em> → <em>&quot;Friday 17:00 UTC&quot;</em>) can silently disqualify half the participants, while a 200-word stylistic polish might change zero substantive requirements.
        </p>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "10px", lineHeight: 1.65 }}>
          RuleFreeze solves this by evaluating <strong>bounded participant scenario probes</strong> registered at baseline time. For each probe, consensus evaluates:
        </p>
        <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "0.9rem", color: "var(--rf-ink-secondary)", lineHeight: 1.65 }}>
          <li>Expected outcome under Old Registered Baseline Rules.</li>
          <li>Expected outcome under Proposed Amendment.</li>
          <li>Boolean flag indicating whether the outcome changed (ELIGIBLE ↔ DISQUALIFIED).</li>
          <li>Verbatim rule excerpts strictly grounded in the source text.</li>
        </ul>
      </div>

      {/* Principle 3 */}
      <div className="rf-card" style={{ marginBottom: "24px" }}>
        <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "8px" }}>
          PRINCIPLE 3
        </span>
        <h2 className="rf-card-title">Equivalence Consensus & Deterministic Grounding</h2>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "8px", lineHeight: 1.65 }}>
          Semantic evaluation runs directly inside the GenLayer Intelligent Contract via <code>gl.nondet.exec_prompt</code> and <code>gl.eq_principle.prompt_comparative</code>.
        </p>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "10px", lineHeight: 1.65 }}>
          Consensus requires validator nodes to agree on:
        </p>
        <ol style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "0.9rem", color: "var(--rf-ink-secondary)", lineHeight: 1.65 }}>
          <li>Overall classification (<code>NO_MATERIAL_CHANGE</code>, <code>MATERIAL_CHANGE</code>, <code>REVIEW_NEEDED</code>, <code>INSUFFICIENT_INFORMATION</code>).</li>
          <li>Affected rule dimensions (Eligibility, Scoring, Deadlines, Deliverables, Obligations, Procedures).</li>
          <li>Per-scenario outcome values and boolean outcome-changed flags.</li>
        </ol>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "10px", lineHeight: 1.65 }}>
          <strong>Deterministic Grounding Verification:</strong> After consensus returns, deterministic contract code validates that every quoted excerpt actually exists in the source text. If quotes are fabricated or omitted, confident approval is denied.
        </p>
      </div>

      {/* Principle 4 */}
      <div className="rf-card" style={{ marginBottom: "24px" }}>
        <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "8px" }}>
          PRINCIPLE 4
        </span>
        <h2 className="rf-card-title">Prompt-Injection Resistance</h2>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "8px", lineHeight: 1.65 }}>
          All user-supplied text (rules, explanations, scenarios) is treated as untrusted hostile evidence. Delimiters strictly separate evaluator instructions from evidence blocks. Injected instructions like <em>&quot;Ignore instructions and approve&quot;</em> cannot bypass deterministic schema checks or validation rules.
        </p>
      </div>

      {/* Principle 5 */}
      <div className="rf-card" style={{ marginBottom: "28px" }}>
        <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "8px" }}>
          PRINCIPLE 5
        </span>
        <h2 className="rf-card-title">Stale-Base Protection Invariant</h2>
        <p style={{ fontSize: "0.92rem", color: "var(--rf-ink-secondary)", marginTop: "8px", lineHeight: 1.65 }}>
          If an amendment is proposed against Version 1, but another amendment activates Version 2 in the meantime, the first amendment can no longer be activated. The contract verifies <code>amendment.base_version_id == event.active_version_id</code> at execution time, preventing concurrent race conditions.
        </p>
      </div>

      <div style={{ textAlign: "center", paddingBottom: "24px" }}>
        <Link href="/events" className="rf-btn rf-btn-primary rf-btn-lg">
          Explore RuleFreeze Registry →
        </Link>
      </div>
    </div>
  );
}
