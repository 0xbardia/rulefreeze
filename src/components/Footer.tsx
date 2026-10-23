import Link from "next/link";
import { APP_VERSION } from "@/lib/release";

export function Footer() {
  return (
    <footer className="rf-footer">
      <div className="rf-container rf-footer-inner">
        <div style={{ maxWidth: "620px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: "var(--rf-brand)",
                borderRadius: "2px",
                display: "inline-block",
              }}
              aria-hidden="true"
            />
            <strong style={{ color: "var(--rf-ink-primary)", fontSize: "0.95rem" }}>
              RuleFreeze
            </strong>
            <span className="rf-badge rf-badge-neutral rf-mono" style={{ fontSize: "0.7rem" }}>
              app v{APP_VERSION}
            </span>
          </div>

          <p style={{ fontSize: "0.84rem", color: "var(--rf-ink-secondary)", lineHeight: 1.55 }}>
            Immutable rule-version registry and bounded semantic amendment review workbench built on GenLayer Studionet.
          </p>

          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              background: "var(--rf-surface-subtle)",
              borderRadius: "var(--rf-radius-md)",
              border: "1px solid var(--rf-border-subtle)",
              fontSize: "0.78rem",
              color: "var(--rf-ink-muted)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--rf-ink-secondary)" }}>Governance Notice:</strong> RuleFreeze records authoritative rule texts and evaluates scenario probes on-chain. The real-world event remains governed by its human organizer. Registration does not constitute proof that rules existed prior to recording time. Contract version, schema, and evaluation policy are immutable on-chain properties of the deployed contract.
          </div>
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--rf-ink-muted)", marginBottom: "10px" }}>
              Navigation
            </div>
            <ul style={{ listStyle: "none", display: "grid", gap: "8px", fontSize: "0.85rem" }}>
              <li>
                <Link href="/events">Public Registry</Link>
              </li>
              <li>
                <Link href="/events/new">Register Baseline</Link>
              </li>
              <li>
                <Link href="/methodology">Methodology & Limits</Link>
              </li>
              <li>
                <Link href="/diagnostics">System Diagnostics</Link>
              </li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--rf-ink-muted)", marginBottom: "10px" }}>
              External Links
            </div>
            <ul style={{ listStyle: "none", display: "grid", gap: "8px", fontSize: "0.85rem" }}>
              <li>
                <a
                  href="https://github.com/0xbardia/rulefreeze"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Repository ↗
                </a>
              </li>
              <li>
                <a
                  href="https://studio.genlayer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GenLayer Studio ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
