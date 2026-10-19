import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: "40px 0 32px", textAlign: "center" }}>
        <div style={{ display: "inline-block", marginBottom: "12px" }}>
          <span className="rf-badge rf-badge-brand">GenLayer Intelligent Contract Registry</span>
        </div>
        <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "16px" }}>
          Understand when a rule clarification <br />
          <span style={{ color: "var(--color-warning)" }}>changes the rules.</span>
        </h1>
        <p style={{ maxWidth: "680px", margin: "0 auto 24px", color: "var(--text-secondary)", fontSize: "1.05rem" }}>
          RuleFreeze is an immutable rule-version registry and semantic amendment review desk for hackathons, bounties, and developer competitions.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/events" className="rf-btn rf-btn-primary">
            Explore Rule Registry
          </Link>
          <Link href="/events/new" className="rf-btn rf-btn-secondary">
            Register Event Baseline
          </Link>
          <Link href="/methodology" className="rf-btn rf-btn-secondary">
            Review Methodology
          </Link>
        </div>
      </section>

      {/* Product Governance Notice Banner */}
      <div className="rf-banner rf-banner-info">
        <div>
          <strong>Explicit Governance Distinction:</strong> The RuleFreeze intelligent contract records and evaluates rule texts and scenario probes on-chain. The actual event remains governed by its human organizer. RuleFreeze does not escrow prizes, enforce legal arbitration, or guarantee organizer compliance outside this registry.
        </div>
      </div>

      {/* V1 Differentiator Example Card */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <span className="rf-badge rf-badge-neutral" style={{ marginBottom: "6px" }}>
              V1 Core Differentiator
            </span>
            <h2 className="rf-card-title">Bounded Scenario Probing Across Rule Versions</h2>
            <p className="rf-card-subtitle">
              Textual diffs only highlight changed characters. RuleFreeze runs identical participant situations against old and new rules to expose subtle outcome reversals.
            </p>
          </div>
          <span className="rf-badge rf-badge-danger">Outcome Reversal Detected</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginTop: "16px" }}>
          <div style={{ background: "var(--bg-subtle)", padding: "16px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
              Old Registered Baseline (v1)
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", marginTop: "8px", color: "var(--text-secondary)" }}>
              &quot;Public repository with open-source license and test suite required.&quot;
            </div>
            <div style={{ marginTop: "14px", padding: "8px 12px", background: "var(--bg-surface)", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Scenario: Solo builder submits backend repo without hosted website</div>
              <div style={{ fontWeight: 600, color: "var(--color-safe)", marginTop: "2px" }}>Outcome: ELIGIBLE</div>
            </div>
          </div>

          <div style={{ background: "var(--bg-subtle)", padding: "16px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
              Proposed Amendment (Advertised as &quot;Clarification&quot;)
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", marginTop: "8px", color: "var(--text-secondary)" }}>
              &quot;Public repository plus live hosted frontend URL required.&quot;
            </div>
            <div style={{ marginTop: "14px", padding: "8px 12px", background: "var(--bg-surface)", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Scenario: Solo builder submits backend repo without hosted website</div>
              <div style={{ fontWeight: 600, color: "var(--color-danger)", marginTop: "2px" }}>Outcome: DISQUALIFIED / DEFICIENT</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "16px", padding: "12px", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "6px" }}>
          <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--color-warning)" }}>
            GenLayer Intelligent Assessment Verdict: MATERIAL_CHANGE
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Dimensions changed: DELIVERABLES. Contract invariant prevents organizer from silently activating this as an &quot;ACCEPTED_CLARIFICATION&quot; without explicit public acknowledgement.
          </div>
        </div>
      </div>

      {/* Feature Trio */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "24px" }}>
        <div className="rf-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "8px" }}>1. Immutable Baseline Registration</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Organizers record initial competition rules and scenario probes on GenLayer Studionet with deterministic content hashing. Text cannot be silently replaced or rewritten.
          </p>
        </div>

        <div className="rf-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "8px" }}>2. Semantic Assessment Engine</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Intelligent contracts test proposed amendments against participant scenarios using equivalence consensus and prompt-injection-resistant quote validation.
          </p>
        </div>

        <div className="rf-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "8px" }}>3. Invariant Activation Policy</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            Organizers cannot claim a material alteration is harmless. Material changes require explicit public rationale. Stale amendments against superseded bases are rejected.
          </p>
        </div>
      </div>
    </div>
  );
}
