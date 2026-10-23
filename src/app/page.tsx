import Link from "next/link";
import { InteractiveSimulator } from "@/components/InteractiveSimulator";

export default function HomePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "56px", width: "100%" }}>
      {/* Editorial Hero Section */}
      <section style={{ padding: "36px 0 12px" }}>
        <div style={{ maxWidth: "840px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <span className="rf-badge rf-badge-brand rf-mono">
              GenLayer Studionet • Chain 61999
            </span>
            <span className="rf-badge rf-badge-neutral">
              v1.0.1 Deployed
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.75rem, 4.5vw, 3.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--rf-brand)",
              marginBottom: "18px",
              wordBreak: "break-word",
            }}
          >
            Understand when a rule clarification <br />
            <span style={{ color: "var(--rf-accent)" }}>changes who qualifies.</span>
          </h1>

          <p
            style={{
              fontSize: "1.12rem",
              lineHeight: 1.6,
              color: "var(--rf-ink-secondary)",
              maxWidth: "720px",
              marginBottom: "28px",
            }}
          >
            Compare proposed rule changes against the same participant scenarios, see which outcomes change, and keep the organizer&apos;s decision on record.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/events/new" className="rf-btn rf-btn-primary rf-btn-lg">
              Start a rule registry
            </Link>
            <Link
              href="/events/demo-ev-1/amendments/demo-amend-2"
              className="rf-btn rf-btn-secondary rf-btn-lg"
            >
              See an example review →
            </Link>
          </div>
        </div>
      </section>

      {/* Purpose-Built Product Preview Specimen (Not a generic screenshot) */}
      <section>
        <div className="rf-document-sheet">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid var(--rf-border-default)",
              paddingBottom: "14px",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SPECIMEN • AMENDMENT REVIEW DESK
              </span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--rf-ink-primary)" }}>
                Authoritative Semantic Comparison Specimen
              </h2>
            </div>
            <span className="rf-badge rf-badge-danger" style={{ fontSize: "0.82rem", padding: "5px 12px" }}>
              MATERIAL_CHANGE DETECTED
            </span>
          </div>

          <div
            style={{
              display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {/* Original Requirement */}
            <div
              style={{
                background: "var(--rf-surface-subtle)",
                padding: "16px",
                borderRadius: "var(--rf-radius-md)",
                border: "1px solid var(--rf-border-subtle)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--rf-ink-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                Original Registered Requirement (v1)
              </div>
              <div
                className="rf-mono"
                style={{
                  fontSize: "0.88rem",
                  marginTop: "8px",
                  color: "var(--rf-ink-primary)",
                  lineHeight: 1.5,
                }}
              >
                &quot;Public repository with open-source license and verifiable test suite.&quot;
              </div>
            </div>

            {/* Proposed Requirement */}
            <div
              style={{
                background: "var(--rf-surface-subtle)",
                padding: "16px",
                borderRadius: "var(--rf-radius-md)",
                border: "1px solid var(--rf-border-subtle)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--rf-ink-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                Proposed Revision (Advertised as &quot;Clarification&quot;)
              </div>
              <div
                className="rf-mono"
                style={{
                  fontSize: "0.88rem",
                  marginTop: "8px",
                  color: "var(--rf-ink-primary)",
                  lineHeight: 1.5,
                }}
              >
                &quot;Public repository plus live hosted frontend URL required.&quot;
              </div>
            </div>
          </div>

          {/* Participant Scenario Probe */}
          <div
            className="rf-scenario-card"
            style={{
              backgroundColor: "var(--rf-surface-subtle)",
              borderColor: "var(--rf-border-default)",
              marginBottom: "16px",
            }}
          >
            <div className="rf-scenario-header">
              <div>
                <span style={{ fontSize: "0.74rem", textTransform: "uppercase", color: "var(--rf-ink-muted)", fontWeight: 700 }}>
                  Tested Participant Scenario Probe
                </span>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>
                  Solo builder submits complete backend repo without a hosted website
                </strong>
              </div>
              <span className="rf-badge rf-badge-warning">Deliverables Dimension</span>
            </div>

            <div className="rf-scenario-outcomes">
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--rf-ink-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Outcome under Baseline Rules
                </div>
                <div style={{ fontWeight: 700, color: "var(--rf-safe-text)", marginTop: "2px" }}>
                  ELIGIBLE
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--rf-ink-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Outcome under Proposed Rules
                </div>
                <div style={{ fontWeight: 700, color: "var(--rf-danger-text)", marginTop: "2px" }}>
                  DISQUALIFIED / DEFICIENT
                </div>
              </div>
            </div>
          </div>

          {/* Consensus Invariant Callout */}
          <div
            style={{
              padding: "14px 16px",
              background: "var(--rf-warning-bg)",
              border: "1px solid var(--rf-warning-border)",
              borderRadius: "var(--rf-radius-md)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--rf-warning-text)" }}>
              Intelligent Contract Invariant Gated
            </div>
            <div style={{ fontSize: "0.84rem", color: "var(--rf-ink-secondary)", marginTop: "3px", lineHeight: 1.5 }}>
              Because scenario probing proved an outcome reversal, GenLayer consensus classified this as <strong>MATERIAL_CHANGE</strong>. The contract explicitly blocks the organizer from activating this revision as an &quot;ACCEPTED_CLARIFICATION&quot; without public acknowledgement.
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Explanation Section */}
      <section>
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 24px" }}>
          <span className="rf-badge rf-badge-brand" style={{ marginBottom: "8px" }}>
            Hands-On Comparison
          </span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Compare Wording vs Deliverable Changes
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--rf-ink-secondary)", marginTop: "6px" }}>
            Explore how the assessment engine differentiates harmless syntactic clarifications from destructive eligibility shifts.
          </p>
        </div>

        <InteractiveSimulator />
      </section>

      {/* Workflow Section: Register -> Propose -> Assess -> Decide */}
      <section>
        <div style={{ marginBottom: "28px" }}>
          <span className="rf-badge rf-badge-brand" style={{ marginBottom: "8px" }}>
            Step-by-Step Architecture
          </span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            How RuleFreeze Operates
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--rf-ink-secondary)", marginTop: "4px" }}>
            Four concrete stages protecting both organizers and competitors.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "20px",
          }}
        >
          <div className="rf-card" style={{ marginBottom: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--rf-brand-subtle)",
                border: "1px solid var(--rf-brand-border)",
                color: "var(--rf-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.9rem",
                marginBottom: "14px",
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              Register Baseline
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.55 }}>
              Organizers freeze initial competition rules alongside concrete participant scenario probes on GenLayer. Every text receives an immutable cryptographic content hash.
            </p>
          </div>

          <div className="rf-card" style={{ marginBottom: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--rf-brand-subtle)",
                border: "1px solid var(--rf-brand-border)",
                color: "var(--rf-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.9rem",
                marginBottom: "14px",
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              Propose Amendment
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.55 }}>
              When rules require modification, organizers submit the full amended text with an explanation and declared applicability scope (Immediate vs Prospective only).
            </p>
          </div>

          <div className="rf-card" style={{ marginBottom: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--rf-brand-subtle)",
                border: "1px solid var(--rf-brand-border)",
                color: "var(--rf-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.9rem",
                marginBottom: "14px",
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              Assess Impact
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.55 }}>
              GenLayer intelligent contract executes equivalence consensus, re-evaluating each registered scenario probe and enforcing exact quotation grounding against the rule text.
            </p>
          </div>

          <div className="rf-card" style={{ marginBottom: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--rf-brand-subtle)",
                border: "1px solid var(--rf-brand-border)",
                color: "var(--rf-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.9rem",
                marginBottom: "14px",
              }}
            >
              4
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              Decide & Activate
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.55 }}>
              The organizer records a public rationale transaction. Invariant enforcement prevents claiming a material change is a minor clarification, preserving fair competition.
            </p>
          </div>
        </div>
      </section>

      {/* Who It Helps Section */}
      <section>
        <div style={{ marginBottom: "28px" }}>
          <span className="rf-badge rf-badge-brand" style={{ marginBottom: "8px" }}>
            Target Beneficiaries
          </span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Who Needs RuleFreeze
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--rf-ink-secondary)", marginTop: "4px" }}>
            Designed for high-stakes decentralized hackathons, grant rounds, and public developer competitions.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "20px",
          }}
        >
          <div className="rf-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "10px", color: "var(--rf-brand)" }}>
              Hackathon Organizers
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.6 }}>
              Avoid post-deadline accusations of shifting goalposts or favoritism. Give your sponsors and participants verified proof that judging criteria remained fair throughout the competition.
            </p>
          </div>

          <div className="rf-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "10px", color: "var(--rf-brand)" }}>
              Bounty & Grant Managers
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.6 }}>
              Eliminate ambiguity in deliverable requirements. When milestone scopes need mid-flight updates, generate verifiable consensus reviews before disbursing treasury funds.
            </p>
          </div>

          <div className="rf-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "10px", color: "var(--rf-brand)" }}>
              Competing Participants
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.6 }}>
              Know exactly what was modified before investing days of engineering. Check whether a Discord announcement changed who qualifies before submitting your final repository.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Limitations Section */}
      <section>
        <div className="rf-card" style={{ borderLeft: "4px solid var(--rf-brand)" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "12px" }}>
            Trust Architecture & Honest Limitations
          </h2>
          <div style={{ display: "grid", gap: "12px", fontSize: "0.88rem", color: "var(--rf-ink-secondary)", lineHeight: 1.6 }}>
            <p>
              <strong>On-Chain Registry vs Real-World Event:</strong> RuleFreeze records rule texts, evaluates scenario probes, and tracks activation decisions on GenLayer. The actual event remains governed by its human organizer. RuleFreeze does not hold prize escrow or guarantee compliance outside this registry.
            </p>
            <p>
              <strong>Scenario-Bounded Evaluation:</strong> Equivalence consensus is strictly executed across the registered participant scenario probes. It proves outcome shifts for those specific cases, but does not claim omniscience over unspecified hypothetical situations.
            </p>
            <p>
              <strong>GenLayer Studionet Environment:</strong> The contract is deployed to GenLayer Studionet (chain 61999). Writes require zero gas tokens, and consensus results are validated by independent validator LLM nodes.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section style={{ textAlign: "center", padding: "20px 0 32px" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: "12px" }}>
          Ready to freeze your event rules?
        </h2>
        <p style={{ fontSize: "1rem", color: "var(--rf-ink-secondary)", maxWidth: "560px", margin: "0 auto 20px" }}>
          Create an immutable baseline in minutes. Protect your competition from rule ambiguity and dispute chaos.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/events/new" className="rf-btn rf-btn-primary rf-btn-lg">
            Register Event Baseline
          </Link>
          <Link href="/events" className="rf-btn rf-btn-secondary rf-btn-lg">
            Browse Registered Events
          </Link>
        </div>
      </section>
    </div>
  );
}
