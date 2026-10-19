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
      // Use demo adapter
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

    // Live contract query
    try {
      const res = await fetchEvents(cfg.contractAddress, 0, 50, cfg.rpcUrl);
      setEvents(res.events);
    } catch (err: unknown) {
      setError(
        `Failed to read events from deployed contract: ${err instanceof Error ? err.message : String(err)}. You can activate Demo Mode to inspect offline demonstration fixtures.`
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
      ev.organizer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Public Event Registry</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Browse registered competition rule sets, active versions, and amendment histories.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/events/new" className="rf-btn rf-btn-primary">
            + Register Event Baseline
          </Link>
        </div>
      </div>

      {!contractAddress && !isDemo && (
        <div className="rf-banner rf-banner-warning">
          <div>
            <strong>Contract Deployment Gate:</strong> No contract address is currently configured in your environment. RuleFreeze is showing synthetic demonstration fixtures so you can test the UI and workflows. Deploy <code>X/contracts/main.py</code> via <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer">GenLayer Studio</a> and configure <code>PUBLIC_CONTRACT_ADDRESS</code> to enable live on-chain reads and writes.
          </div>
        </div>
      )}

      {isDemo && (
        <div className="rf-banner rf-banner-info">
          <div>
            <strong>Demonstration Fixtures Active:</strong> All listed items are labeled [DEMO] and simulate state in local memory.
          </div>
        </div>
      )}

      <div className="rf-form-group" style={{ maxWidth: "400px" }}>
        <input
          type="text"
          className="rf-input"
          placeholder="Search by event name, description, or organizer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading registered events from GenLayer...
        </div>
      )}

      {error && (
        <div className="rf-banner rf-banner-warning">
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rf-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h3 style={{ marginBottom: "8px" }}>No registered events found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
            Be the first organizer to freeze an immutable rule baseline for your competition.
          </p>
          <Link href="/events/new" className="rf-btn rf-btn-primary">
            Register Event Baseline
          </Link>
        </div>
      )}

      {!loading && (
        <div style={{ display: "grid", gap: "16px" }}>
          {filtered.map((ev) => (
            <div key={ev.id} className="rf-card" style={{ marginBottom: 0 }}>
              <div className="rf-card-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                      <Link href={`/events/${ev.id}`}>{ev.name}</Link>
                    </h2>
                    {ev.name.includes("[DEMO]") && (
                      <span className="rf-badge rf-badge-neutral">DEMO FIXTURE</span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{ev.description}</p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className="rf-badge rf-badge-brand rf-mono">{ev.active_version_id}</span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  Organizer:{" "}
                  <span className="rf-mono" style={{ color: "var(--text-secondary)" }}>
                    {ev.organizer.slice(0, 8)}...{ev.organizer.slice(-6)}
                  </span>
                </div>
                <div>Versions Recorded: <strong>{ev.version_count}</strong></div>
                <div>Amendments: <strong>{ev.amendment_count}</strong></div>
                {ev.declared_deadline && (
                  <div>Declared Deadline: <strong>{ev.declared_deadline}</strong></div>
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
