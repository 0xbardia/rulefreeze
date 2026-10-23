"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getPublicConfig } from "@/lib/config";
import { fetchEvent, fetchEventAmendments, fetchEventVersions } from "@/lib/contract-adapter";
import { mockFetchEvent, mockFetchEventVersions, mockFetchEventAmendments } from "@/lib/mock-adapter";
import { isDemoEventId, isLiveEventId } from "@/lib/id-routing";
import { AmendmentRecord, EventRecord, RuleVersion } from "@/lib/types";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [versions, setVersions] = useState<RuleVersion[]>([]);
  const [amendments, setAmendments] = useState<AmendmentRecord[]>([]);
  const [activeVersion, setActiveVersion] = useState<RuleVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    const demo = localStorage.getItem("rf_demo_mode") === "true";

    getPublicConfig().then(async (cfg) => {
      try {
        if (isDemoEventId(eventId)) {
          const ev = await mockFetchEvent(eventId);
          const vers = await mockFetchEventVersions(eventId);
          const amends = await mockFetchEventAmendments(eventId);
          setEvent(ev);
          setVersions(vers);
          setAmendments(amends);
          const act = vers.find((v) => v.id === ev.active_version_id) || vers[0] || null;
          setActiveVersion(act);
        } else if (isLiveEventId(eventId)) {
          if (demo) {
            throw new Error(
              `Event "${eventId}" is a live on-chain ID, but Demo Mode is active. Switch off Demo Mode in the header.`
            );
          }
          if (!cfg.contractAddress) {
            throw new Error("Contract address is not configured. Cannot read live on-chain event.");
          }
          const ev = await fetchEvent(cfg.contractAddress, eventId, cfg.rpcUrl);
          const vers = await fetchEventVersions(cfg.contractAddress, eventId, cfg.rpcUrl);
          const amends = await fetchEventAmendments(cfg.contractAddress, eventId, cfg.rpcUrl);
          setEvent(ev);
          setVersions(vers);
          setAmendments(amends);
          const act = vers.find((v) => v.id === ev.active_version_id) || vers[0] || null;
          setActiveVersion(act);
        } else {
          throw new Error(
            `Invalid event ID format "${eventId}". Expected "ev-<number>" or "demo-ev-<number>".`
          );
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    });
  }, [eventId]);

  const copyHash = (hash: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "56px 20px", textAlign: "center", color: "var(--rf-ink-muted)" }}>
        Reading event details from GenLayer...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rf-banner rf-banner-warning">
        <div style={{ flex: 1 }}>Error loading event {eventId}: {error || "Event not found"}</div>
        <Link href="/events" className="rf-btn rf-btn-secondary rf-btn-sm">
          Return to Registry
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
        <Link href="/events" style={{ color: "var(--rf-ink-muted)" }}>
          Registry
        </Link>
        <span style={{ color: "var(--rf-ink-subtle)" }}>/</span>
        <span className="rf-mono" style={{ color: "var(--rf-ink-secondary)" }}>
          {event.id}
        </span>
      </div>

      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--rf-border-subtle)",
          paddingBottom: "20px",
        }}
      >
        <div style={{ flex: "1 1 400px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span className="rf-badge rf-badge-brand rf-mono">{event.id}</span>
            <span className="rf-badge rf-badge-safe rf-mono">
              Active: {event.active_version_id}
            </span>
            {event.name.includes("[DEMO]") ? (
              <span className="rf-badge rf-badge-neutral">DEMO FIXTURE</span>
            ) : (
              <span className="rf-badge rf-badge-safe">ON-CHAIN VERIFIED</span>
            )}
          </div>

          <h1 style={{ fontSize: "2.1rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
            {event.name}
          </h1>

          <p
            style={{
              color: "var(--rf-ink-secondary)",
              fontSize: "0.98rem",
              maxWidth: "760px",
              marginTop: "6px",
              overflowWrap: "anywhere",
              lineHeight: 1.55,
            }}
          >
            {event.description || "No description provided."}
          </p>
        </div>

        <div>
          <Link href={`/events/${event.id}/amend`} className="rf-btn rf-btn-primary">
            + Propose Rule Amendment
          </Link>
        </div>
      </div>

      {/* Metadata Overview Card */}
      <div className="rf-card" style={{ padding: "18px 24px", marginBottom: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            fontSize: "0.85rem",
          }}
        >
          <div>
            <div style={{ color: "var(--rf-ink-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
              Organizer Address
            </div>
            <div className="rf-mono" style={{ color: "var(--rf-ink-primary)", fontWeight: 600, marginTop: "3px" }}>
              {event.organizer}
            </div>
          </div>

          {event.event_url && (
            <div>
              <div style={{ color: "var(--rf-ink-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                Public URL
              </div>
              <div style={{ marginTop: "3px" }}>
                <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                  {event.event_url} ↗
                </a>
              </div>
            </div>
          )}

          {event.declared_deadline && (
            <div>
              <div style={{ color: "var(--rf-ink-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                Submission Deadline
              </div>
              <div style={{ fontWeight: 600, marginTop: "3px", color: "var(--rf-ink-primary)" }}>
                {event.declared_deadline}
              </div>
            </div>
          )}

          <div>
            <div style={{ color: "var(--rf-ink-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
              Registered On-Chain
            </div>
            <div style={{ marginTop: "3px", color: "var(--rf-ink-primary)" }}>
              {new Date(event.created_at * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Active Rule Version (Editorial Document Sheet) */}
      {activeVersion && (
        <div className="rf-document-sheet" style={{ marginBottom: "24px" }}>
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-safe rf-mono" style={{ marginBottom: "6px" }}>
                Active Rules • Version {activeVersion.version_number} ({activeVersion.id})
              </span>
              <h2 className="rf-card-title">Authoritative Registered Rules</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "6px",
                  flexWrap: "wrap",
                  maxWidth: "100%",
                }}
              >
                <span className="rf-hash" style={{ maxWidth: "100%" }}>SHA-256: {activeVersion.content_hash}</span>
                <button
                  type="button"
                  onClick={() => copyHash(activeVersion.content_hash)}
                  className="rf-btn rf-btn-secondary rf-btn-sm"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                >
                  {copiedHash ? "Copied!" : "Copy Hash"}
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--rf-surface-subtle)",
              border: "1px solid var(--rf-border-default)",
              borderRadius: "var(--rf-radius-md)",
              padding: "20px",
              fontFamily: "var(--rf-font-mono)",
              fontSize: "0.88rem",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              maxHeight: "380px",
              overflowY: "auto",
              color: "var(--rf-ink-primary)",
            }}
          >
            {activeVersion.rule_text}
          </div>

          {/* Scenario Probes Section */}
          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--rf-border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                Registered Participant Scenario Probes ({activeVersion.scenarios.length})
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--rf-ink-muted)" }}>
                Evaluated deterministically against all future amendments
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {activeVersion.scenarios.map((sc) => (
                <div key={sc.id} className="rf-scenario-card" style={{ padding: "12px 16px", margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="rf-badge rf-badge-neutral rf-mono">{sc.id}</span>
                      <strong style={{ fontSize: "0.92rem" }}>{sc.title}</strong>
                    </div>
                    <span className="rf-badge rf-badge-neutral">{sc.dimension}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--rf-ink-secondary)", marginTop: "6px" }}>
                    <strong>Situation:</strong> {sc.situation}
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                    <strong>Question:</strong> {sc.question}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Amendments List */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <h2 className="rf-card-title">
              Proposed & Historical Amendments ({amendments.length})
            </h2>
            <p className="rf-card-subtitle">
              Intelligent reviews, participant scenario evaluations, and organizer activation decisions.
            </p>
          </div>
        </div>

        {amendments.length === 0 ? (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              background: "var(--rf-surface-subtle)",
              borderRadius: "var(--rf-radius-md)",
              border: "1px solid var(--rf-border-subtle)",
              color: "var(--rf-ink-muted)",
              fontSize: "0.9rem",
            }}
          >
            No amendments have been proposed for this event yet.
            <div style={{ marginTop: "10px" }}>
              <Link href={`/events/${event.id}/amend`} className="rf-btn rf-btn-secondary rf-btn-sm">
                Propose the first amendment →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {amendments.map((am) => (
              <div
                key={am.id}
                style={{
                  background: "var(--rf-surface-subtle)",
                  border: "1px solid var(--rf-border-default)",
                  borderRadius: "var(--rf-radius-md)",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <Link
                      href={`/events/${event.id}/amendments/${am.id}`}
                      style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--rf-brand)" }}
                    >
                      {am.id}
                    </Link>
                    <span
                      className={`rf-badge ${
                        am.status === "ACTIVATED"
                          ? "rf-badge-safe"
                          : am.status === "DECLINED"
                          ? "rf-badge-danger"
                          : am.status === "ASSESSED"
                          ? "rf-badge-warning"
                          : "rf-badge-neutral"
                      }`}
                    >
                      {am.status}
                    </span>
                    <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.72rem" }}>
                      Scope: {am.intended_scope}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", overflowWrap: "anywhere" }}>
                    {am.explanation}
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--rf-ink-muted)", marginTop: "4px" }}>
                    Base version: <span className="rf-mono">{am.base_version_id}</span> •{" "}
                    {new Date(am.created_at * 1000).toLocaleString()}
                  </div>
                </div>

                <div>
                  <Link
                    href={`/events/${event.id}/amendments/${am.id}`}
                    className="rf-btn rf-btn-secondary rf-btn-sm"
                  >
                    Open Review Desk →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Version Lineage Timeline */}
      <div className="rf-card">
        <h2 className="rf-card-title" style={{ marginBottom: "14px" }}>
          Version Lineage Timeline
        </h2>
        <div style={{ display: "grid", gap: "14px" }}>
          {versions.map((ver) => (
            <div
              key={ver.id}
              style={{
                borderLeft:
                  ver.id === event.active_version_id
                    ? "3px solid var(--rf-safe-solid)"
                    : "3px solid var(--rf-border-strong)",
                paddingLeft: "16px",
                paddingTop: "4px",
                paddingBottom: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.95rem" }}>
                  Version {ver.version_number} ({ver.id})
                </strong>
                {ver.id === event.active_version_id && (
                  <span className="rf-badge rf-badge-safe">ACTIVE BASELINE</span>
                )}
                {ver.parent_version_id && (
                  <span style={{ fontSize: "0.8rem", color: "var(--rf-ink-muted)" }}>
                    Parent: <span className="rf-mono">{ver.parent_version_id}</span>
                  </span>
                )}
              </div>
              <div className="rf-hash" style={{ marginTop: "3px" }}>
                SHA-256: {ver.content_hash}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                Recorded: {new Date(ver.created_at * 1000).toLocaleString()} • Creator:{" "}
                <span className="rf-mono">{ver.creator.slice(0, 8)}…</span>
              </div>
              {ver.activation_decision && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.85rem",
                    color: "var(--rf-ink-secondary)",
                    background: "var(--rf-surface-subtle)",
                    border: "1px solid var(--rf-border-subtle)",
                    padding: "8px 12px",
                    borderRadius: "var(--rf-radius-sm)",
                  }}
                >
                  <strong>Activation Decision:</strong> {ver.activation_decision.type} — &quot;
                  {ver.activation_decision.rationale}&quot;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
