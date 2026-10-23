"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicConfig } from "@/lib/config";
import { fetchEvents } from "@/lib/contract-adapter";
import { mockFetchEvents } from "@/lib/mock-adapter";
import { EventSummary } from "@/lib/types";

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const demoActive = localStorage.getItem("rf_demo_mode") === "true";
    setIsDemo(demoActive);

    const cfg = await getPublicConfig();
    setContractAddress(cfg.contractAddress);

    if (demoActive || !cfg.contractAddress) {
      try {
        const res = await mockFetchEvents(0, 50);
        setEvents(res.events);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetchEvents(cfg.contractAddress, 0, 50, cfg.rpcUrl);
      setEvents(res.events);
    } catch (err: unknown) {
      setError(
        `Failed to read events from deployed contract: ${
          err instanceof Error ? err.message : String(err)
        }. You can activate Demo Mode in the header to inspect offline demonstration fixtures.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleMode = () => loadData();
    window.addEventListener("rf_mode_changed", handleMode);
    return () => window.removeEventListener("rf_mode_changed", handleMode);
  }, []);

  const filtered = events.filter(
    (ev) =>
      ev.name.toLowerCase().includes(search.toLowerCase()) ||
      ev.description.toLowerCase().includes(search.toLowerCase()) ||
      ev.organizer.toLowerCase().includes(search.toLowerCase()) ||
      ev.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--rf-border-subtle)",
          paddingBottom: "20px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--rf-ink-muted)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Authoritative On-Chain Ledger
          </span>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Public Event Registry
          </h1>
          <p style={{ color: "var(--rf-ink-secondary)", fontSize: "0.95rem", marginTop: "4px" }}>
            Browse registered competition rule sets, immutable baseline hashes, and semantic amendment histories.
          </p>
        </div>

        <div>
          <Link href="/events/new" className="rf-btn rf-btn-primary">
            + Register Event Baseline
          </Link>
        </div>
      </div>

      {/* Mode Notices */}
      {!contractAddress && !isDemo && (
        <div className="rf-banner rf-banner-warning">
          <div>
            <strong>Configuration Notice:</strong> No contract address is currently configured in your environment. RuleFreeze is showing synthetic demonstration fixtures so you can test the workbench.
          </div>
        </div>
      )}

      {isDemo && (
        <div className="rf-banner rf-banner-info">
          <div>
            <strong>Demonstration Fixtures Active:</strong> All listed events are labeled [DEMO] and simulate state in browser memory.
          </div>
        </div>
      )}

      {/* Search Bar & Scope Indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ flex: "1 1 320px", maxWidth: "480px" }}>
          <input
            type="text"
            className="rf-input"
            placeholder="Filter by name, ID (e.g. ev-1), description, or organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filter events"
          />
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--rf-ink-muted)" }}>
          {loading ? (
            "Reading registry..."
          ) : (
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{events.length}</strong> loaded events
            </span>
          )}
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: "grid", gap: "16px" }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rf-card"
              style={{
                marginBottom: 0,
                opacity: 0.6,
                background: "var(--rf-surface-subtle)",
              }}
            >
              <div style={{ height: "24px", width: "40%", background: "var(--rf-border-subtle)", borderRadius: "4px", marginBottom: "10px" }} />
              <div style={{ height: "16px", width: "80%", background: "var(--rf-border-subtle)", borderRadius: "4px", marginBottom: "16px" }} />
              <div style={{ height: "14px", width: "60%", background: "var(--rf-border-subtle)", borderRadius: "4px" }} />
            </div>
          ))}
        </div>
      )}

      {/* Error Callout */}
      {error && (
        <div className="rf-banner rf-banner-warning">
          <div style={{ flex: 1 }}>{error}</div>
          <button
            type="button"
            onClick={loadData}
            className="rf-btn rf-btn-secondary rf-btn-sm"
          >
            Retry Read
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div
          className="rf-card"
          style={{
            textAlign: "center",
            padding: "56px 24px",
            background: "var(--rf-surface)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--rf-surface-subtle)",
              border: "1px solid var(--rf-border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--rf-ink-muted)",
              fontSize: "1.2rem",
            }}
          >
            §
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>
            {search ? "No matching events found" : "No registered events found"}
          </h2>
          <p style={{ color: "var(--rf-ink-secondary)", fontSize: "0.92rem", maxWidth: "460px", margin: "0 auto 20px" }}>
            {search
              ? `No registered events matched "${search}". Try adjusting your query.`
              : "Be the first competition organizer to freeze an authoritative rule baseline on GenLayer Studionet."}
          </p>
          {search ? (
            <button
              type="button"
              className="rf-btn rf-btn-secondary"
              onClick={() => setSearch("")}
            >
              Clear Search Filter
            </button>
          ) : (
            <Link href="/events/new" className="rf-btn rf-btn-primary">
              Register Event Baseline
            </Link>
          )}
        </div>
      )}

      {/* Events Registry List */}
      {!loading && (
        <div style={{ display: "grid", gap: "16px" }}>
          {filtered.map((ev) => (
            <div key={ev.id} className="rf-card" style={{ marginBottom: 0 }}>
              <div className="rf-card-header">
                <div style={{ flex: "1 1 300px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="rf-badge rf-badge-brand rf-mono">{ev.id}</span>
                    <span className="rf-badge rf-badge-safe rf-mono">
                      Active: {ev.active_version_id}
                    </span>
                    {ev.name.includes("[DEMO]") ? (
                      <span className="rf-badge rf-badge-neutral">DEMO FIXTURE</span>
                    ) : (
                      <span className="rf-badge rf-badge-safe">ON-CHAIN VERIFIED</span>
                    )}
                  </div>

                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                    <Link
                      href={`/events/${ev.id}`}
                      style={{ color: "var(--rf-ink-primary)", textDecoration: "none" }}
                    >
                      {ev.name}
                    </Link>
                  </h2>

                  <p
                    style={{
                      color: "var(--rf-ink-secondary)",
                      fontSize: "0.9rem",
                      marginTop: "6px",
                      overflowWrap: "anywhere",
                      lineHeight: 1.5,
                    }}
                  >
                    {ev.description || "No description provided."}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <Link
                    href={`/events/${ev.id}`}
                    className="rf-btn rf-btn-secondary rf-btn-sm"
                  >
                    Open Workbench →
                  </Link>
                </div>
              </div>

              {/* Event Metadata Row */}
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  fontSize: "0.82rem",
                  color: "var(--rf-ink-muted)",
                  borderTop: "1px solid var(--rf-border-subtle)",
                  paddingTop: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  Organizer:{" "}
                  <span className="rf-mono" style={{ color: "var(--rf-ink-primary)", fontWeight: 600 }}>
                    {ev.organizer.slice(0, 8)}…{ev.organizer.slice(-6)}
                  </span>
                </div>
                <div>
                  Versions: <strong style={{ color: "var(--rf-ink-primary)" }}>{ev.version_count}</strong>
                </div>
                <div>
                  Amendments:{" "}
                  <strong style={{ color: "var(--rf-ink-primary)" }}>{ev.amendment_count}</strong>
                </div>
                {ev.declared_deadline && (
                  <div>
                    Deadline: <strong style={{ color: "var(--rf-ink-primary)" }}>{ev.declared_deadline}</strong>
                  </div>
                )}
                <div>
                  Created: {new Date(ev.created_at * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
