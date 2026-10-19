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
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const demo = localStorage.getItem("rf_demo_mode") === "true";
    setIsDemo(demo);

    getPublicConfig().then(async (cfg) => {
      try {
        if (isDemoEventId(eventId)) {
          // Explicit demo event ID
          setIsDemo(true);
          const ev = await mockFetchEvent(eventId);
          const vers = await mockFetchEventVersions(eventId);
          const amends = await mockFetchEventAmendments(eventId);
          setEvent(ev);
          setVersions(vers);
          setAmendments(amends);
          const act = vers.find((v) => v.id === ev.active_version_id) || vers[0] || null;
          setActiveVersion(act);
        } else if (isLiveEventId(eventId)) {
          // Explicit live on-chain event ID
          if (demo) {
            throw new Error(`Event "${eventId}" is a live on-chain ID, but Demo Mode is active. Switch off Demo Mode in the header.`);
          }
          if (!cfg.contractAddress) {
            throw new Error("Contract address is not configured. Cannot read live on-chain event.");
          }
          setIsDemo(false);
          const ev = await fetchEvent(cfg.contractAddress, eventId, cfg.rpcUrl);
          const vers = await fetchEventVersions(cfg.contractAddress, eventId, cfg.rpcUrl);
          const amends = await fetchEventAmendments(cfg.contractAddress, eventId, cfg.rpcUrl);
          setEvent(ev);
          setVersions(vers);
          setAmendments(amends);
          const act = vers.find((v) => v.id === ev.active_version_id) || vers[0] || null;
          setActiveVersion(act);
        } else {
          throw new Error(`Invalid event ID format "${eventId}". Expected "ev-<number>" for live events or "demo-ev-<number>" for demo fixtures.`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    });
  }, [eventId]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading event details...</div>;
  }

  if (error || !event) {
    return (
      <div className="rf-banner rf-banner-warning">
        <div>Error loading event {eventId}: {error || "Event not found"}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="rf-badge rf-badge-brand rf-mono">{event.id}</span>
            <span className="rf-badge rf-badge-safe">Active Rule Version: {event.active_version_id}</span>
            {event.name.includes("[DEMO]") && <span className="rf-badge rf-badge-neutral">DEMO FIXTURE</span>}
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>{event.name}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "700px", marginTop: "4px" }}>
            {event.description}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link href={`/events/${event.id}/amend`} className="rf-btn rf-btn-primary">
            + Propose Rule Amendment
          </Link>
        </div>
      </div>

      {/* Metadata Overview Card */}
      <div className="rf-card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", fontSize: "0.85rem" }}>
          <div>
            <div style={{ color: "var(--text-muted)" }}>Organizer Address</div>
            <div className="rf-mono" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {event.organizer}
            </div>
          </div>
          {event.event_url && (
            <div>
              <div style={{ color: "var(--text-muted)" }}>Public URL</div>
              <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                {event.event_url}
              </a>
            </div>
          )}
          {event.declared_deadline && (
            <div>
              <div style={{ color: "var(--text-muted)" }}>Submission Deadline</div>
              <div style={{ fontWeight: 600 }}>{event.declared_deadline}</div>
            </div>
          )}
          <div>
            <div style={{ color: "var(--text-muted)" }}>Registered On-Chain</div>
            <div>{new Date(event.created_at * 1000).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Active Rule Version Card */}
      {activeVersion && (
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-safe" style={{ marginBottom: "6px" }}>
                Current Active Rules (Version {activeVersion.version_number})
              </span>
              <h2 className="rf-card-title">Authoritative Registered Rules</h2>
              <div className="rf-hash" style={{ marginTop: "4px" }}>
                SHA-256 Hash: {activeVersion.content_hash}
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "16px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.88rem",
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              maxHeight: "350px",
              overflowY: "auto",
            }}
          >
            {activeVersion.rule_text}
          </div>

          <div style={{ marginTop: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "10px" }}>
              Registered Participant Scenario Probes ({activeVersion.scenarios.length})
            </h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {activeVersion.scenarios.map((sc) => (
                <div key={sc.id} className="rf-scenario-card" style={{ padding: "10px 14px", margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{sc.title}</strong>
                    <span className="rf-badge rf-badge-neutral">{sc.dimension}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Situation: {sc.situation}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Question: {sc.question}
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
            <h2 className="rf-card-title">Proposed & Historical Amendments ({amendments.length})</h2>
            <p className="rf-card-subtitle">
              Semantic reviews, participant impact assessments, and organizer decisions.
            </p>
          </div>
        </div>

        {amendments.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "12px 0" }}>
            No amendments have been proposed for this event yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {amendments.map((am) => (
              <div
                key={am.id}
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <Link
                      href={`/events/${event.id}/amendments/${am.id}`}
                      style={{ fontWeight: 600, fontSize: "1rem" }}
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
                    <span className="rf-badge rf-badge-neutral">Scope: {am.intended_scope}</span>
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                    {am.explanation}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Proposed against base: <span className="rf-mono">{am.base_version_id}</span> •{" "}
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

      {/* Version Timeline */}
      <div className="rf-card">
        <h2 className="rf-card-title" style={{ marginBottom: "12px" }}>Version Lineage Timeline</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          {versions.map((ver) => (
            <div
              key={ver.id}
              style={{
                borderLeft: ver.id === event.active_version_id ? "3px solid var(--color-safe)" : "3px solid var(--border-subtle)",
                paddingLeft: "12px",
                paddingTop: "2px",
                paddingBottom: "2px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong>Version {ver.version_number} ({ver.id})</strong>
                {ver.id === event.active_version_id && (
                  <span className="rf-badge rf-badge-safe">ACTIVE</span>
                )}
                {ver.parent_version_id && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Parent: {ver.parent_version_id}
                  </span>
                )}
              </div>
              <div className="rf-hash" style={{ marginTop: "2px" }}>Hash: {ver.content_hash}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Recorded: {new Date(ver.created_at * 1000).toLocaleString()} • Creator: {ver.creator.slice(0, 8)}...
              </div>
              {ver.activation_decision && (
                <div style={{ marginTop: "6px", fontSize: "0.85rem", color: "var(--text-secondary)", background: "var(--bg-subtle)", padding: "6px 10px", borderRadius: "4px" }}>
                  <strong>Activation Decision:</strong> {ver.activation_decision.type} — &quot;{ver.activation_decision.rationale}&quot;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
