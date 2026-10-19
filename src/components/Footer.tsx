import Link from "next/link";

export function Footer() {
  return (
    <footer className="rf-footer">
      <div className="rf-container rf-footer-inner">
        <div>
          <strong>RuleFreeze v1.0.0</strong> — Public Rule-Version Registry & Semantic Amendment Review Desk.
          <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <strong>Governance Notice:</strong> RuleFreeze records and evaluates rule versions on GenLayer.
            The actual event remains governed by its organizer. Registration does not constitute proof that rules existed prior to recording time.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
          <Link href="/methodology">Methodology & Limitations</Link>
          <Link href="/diagnostics">Diagnostics</Link>
          <a
            href="https://studio.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GenLayer Studio
          </a>
        </div>
      </div>
    </footer>
  );
}
