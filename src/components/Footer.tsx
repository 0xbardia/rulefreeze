import Link from "next/link";
import { APP_VERSION } from "@/lib/release";

export function Footer() {
  return (
    <footer className="rf-footer">
      <div className="rf-container rf-footer-inner">
        <div>
          <strong>RuleFreeze</strong> application {APP_VERSION}. Public Rule-Version Registry & Semantic Amendment Review Desk.
          <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Contract version, schema, and evaluation policy are properties of the deployed contract. They are not this application version.
          </div>
          <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <strong>Governance Notice:</strong> RuleFreeze records and evaluates rule versions on GenLayer.
            The actual event remains governed by its organizer. Registration does not constitute proof that rules existed prior to recording time.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
          <Link href="/methodology">Methodology & Limitations</Link>
          <Link href="/diagnostics">Diagnostics</Link>
          <a
            href="https://github.com/0xbardia/rulefreeze"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
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
