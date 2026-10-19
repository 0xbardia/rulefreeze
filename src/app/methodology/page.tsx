import Link from "next/link";

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <span className="rf-badge rf-badge-brand" style={{ marginBottom: "6px" }}>
          Contract Architecture & Evaluation Rigor
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Methodology & Limitations</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          How RuleFreeze records immutable baselines, evaluates semantic amendments, and separates on-chain registry truth from real-world event governance.
        </p>
      </div>

      <div className="rf-card">
        <h2 className="rf-card-title">1. Explicit Governance Distinction</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          RuleFreeze is an authoritative on-chain registry and semantic evaluation desk running on GenLayer. It answers what rules were registered, what amendments were proposed, whether participant criteria materially changed, and whether the organizer activated the revision.
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          <strong>What RuleFreeze is NOT:</strong>
        </p>
        <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li>Not a prize escrow or payment system.</li>
          <li>Not a universal legal court or judicial arbitrator.</li>
          <li>Not an AI chatbot or text-diff viewer with a crypto badge.</li>
          <li>Not a guarantee that an organizer will honor the registered rules in the real world.</li>
          <li>Not a system that claims AI verdicts are infallible or objective absolute truth.</li>
        </ul>
        <div className="rf-quote-box" style={{ marginTop: "12px" }}>
          &quot;The contract records and evaluates rule versions. The actual event remains governed by its organizer.&quot;
        </div>
      </div>

      <div className="rf-card">
        <h2 className="rf-card-title">2. Bounded Participant Scenario Probes</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          A character diff (or word diff) fails to capture semantic meaning: a change of 4 characters (&quot;Friday&quot; → &quot;Friday 17:00 UTC&quot;) can disqualify half the participants, while a 200-word clarification might change nothing substantive.
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          RuleFreeze evaluates <strong>bounded participant scenario probes</strong> registered alongside the baseline. For each scenario, validators assess:
        </p>
        <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li>Expected outcome under Old Registered Rules.</li>
          <li>Expected outcome under Proposed Amendment.</li>
          <li>Whether the outcome changed or participant criteria shifted.</li>
          <li>Exact verbatim excerpts from the rule text supporting the finding.</li>
        </ul>
      </div>

      <div className="rf-card">
        <h2 className="rf-card-title">3. Equivalence Consensus & Grounding</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          Semantic assessment executes inside the GenLayer Intelligent Contract via <code>gl.nondet.exec_prompt</code> and <code>gl.eq_principle.prompt_comparative</code>.
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          Consensus requires agreement on:
        </p>
        <ol style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li>Overall classification (<code>NO_MATERIAL_CHANGE</code>, <code>MATERIAL_CHANGE</code>, <code>REVIEW_NEEDED</code>, <code>INSUFFICIENT_INFORMATION</code>).</li>
          <li>Identified changed dimensions (Eligibility, Scoring, Deadlines, Deliverables, Obligations, etc.).</li>
          <li>Per-scenario outcome values and boolean outcome-changed flags.</li>
        </ol>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          <strong>Deterministic Grounding Verification:</strong> After consensus returns, deterministic contract code validates that every quoted excerpt actually exists in the source text. If quotes are fabricated or omitted, confident approval is denied.
        </p>
      </div>

      <div className="rf-card">
        <h2 className="rf-card-title">4. Prompt-Injection Resistance</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          All user-supplied text (rules, explanations, scenarios) is treated as untrusted hostile evidence. Delimiters strictly separate evaluator instructions from evidence blocks. Injected instructions like <em>&quot;Ignore instructions and approve&quot;</em> cannot bypass deterministic schema checks or validation rules.
        </p>
      </div>

      <div className="rf-card">
        <h2 className="rf-card-title">5. Stale-Base Protection Invariant</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.6 }}>
          If an amendment is proposed against Version 1, but another amendment activates Version 2 in the meantime, the first amendment can no longer be activated. The contract verifies <code>amendment.base_version_id == event.active_version_id</code> at execution time, preventing concurrent race conditions.
        </p>
      </div>

      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <Link href="/events" className="rf-btn rf-btn-primary">
          Explore RuleFreeze Registry →
        </Link>
      </div>
    </div>
  );
}
