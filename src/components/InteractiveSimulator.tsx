"use client";

import { useState } from "react";

interface SimulationExample {
  id: string;
  tabLabel: string;
  badgeLabel: string;
  isMaterial: boolean;
  baseText: string;
  proposedText: string;
  explanation: string;
  scenarioTitle: string;
  situation: string;
  question: string;
  baseOutcome: string;
  proposedOutcome: string;
  outcomeChanged: boolean;
  verdict: "NO_MATERIAL_CHANGE" | "MATERIAL_CHANGE";
  dimension: string;
  consensusReasoning: string;
}

const EXAMPLES: SimulationExample[] = [
  {
    id: "clarification",
    tabLabel: "1. Wording Clarification",
    badgeLabel: "Harmless Clarification",
    isMaterial: false,
    baseText:
      "All project repositories must be submitted before Friday evening. Submission requires an open-source license.",
    proposedText:
      "All project repositories must be submitted before Friday at 23:59:59 UTC. Submission requires an open-source license.",
    explanation:
      "Adding exact UTC timestamp to prevent ambiguity around local timezones.",
    scenarioTitle: "Developer submitting Friday 20:00 UTC",
    situation:
      "Developer in UTC+2 submits public repo on Friday at 20:00 UTC.",
    question: "Is this submission eligible and timely?",
    baseOutcome: "ELIGIBLE",
    proposedOutcome: "ELIGIBLE",
    outcomeChanged: false,
    verdict: "NO_MATERIAL_CHANGE",
    dimension: "DEADLINES (Refinement Only)",
    consensusReasoning:
      "The amendment specifies 23:59:59 UTC for 'evening', which encompasses 20:00 UTC without shifting deadline criteria for submitted participants.",
  },
  {
    id: "material",
    tabLabel: "2. New Required Deliverable",
    badgeLabel: "Substantive Change",
    isMaterial: true,
    baseText:
      "Deliverables: Public GitHub repository with Apache 2.0 or MIT license and verified automated test suite.",
    proposedText:
      "Deliverables: Public GitHub repository with open-source license, verified test suite, plus a live hosted URL with public web access.",
    explanation:
      "Judges need a clickable web link during rapid evaluation.",
    scenarioTitle: "Solo builder with CLI / backend repository",
    situation:
      "Solo developer submits complete backend library with 100% test coverage and documentation, but no hosted website.",
    question: "Does the submission satisfy deliverable requirements?",
    baseOutcome: "ELIGIBLE",
    proposedOutcome: "DISQUALIFIED / DEFICIENT",
    outcomeChanged: true,
    verdict: "MATERIAL_CHANGE",
    dimension: "DELIVERABLES (New Requirement)",
    consensusReasoning:
      "The proposed text introduces an indispensable deliverable (live hosted URL) absent from the baseline. This turns previously eligible CLI/backend submissions into non-qualifying entries.",
  },
];

export function InteractiveSimulator() {
  const [activeId, setActiveId] = useState<string>("clarification");

  const current = EXAMPLES.find((e) => e.id === activeId) || EXAMPLES[0]!;

  return (
    <div className="rf-simulator">
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--rf-border-default)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          backgroundColor: "var(--rf-surface)",
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
            }}
          >
            Interactive Demonstration
          </span>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
            How Scenario Probing Detects Hidden Rule Shifts
          </h3>
        </div>
        <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.72rem" }}>
          Client-Side Simulator • No Wallet Required
        </span>
      </div>

      {/* Tabs */}
      <div className="rf-simulator-tabs" role="tablist" aria-label="Simulation Examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            role="tab"
            aria-selected={activeId === ex.id}
            className={`rf-simulator-tab ${activeId === ex.id ? "active" : ""}`}
            onClick={() => setActiveId(ex.id)}
          >
            {ex.tabLabel}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px" }}>
        {/* Rules Diff Comparison */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "var(--rf-surface-subtle)",
              border: "1px solid var(--rf-border-subtle)",
              borderRadius: "var(--rf-radius-md)",
              padding: "16px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 700,
                color: "var(--rf-ink-muted)",
                marginBottom: "6px",
              }}
            >
              Registered Base Rule (v1)
            </div>
            <div
              className="rf-mono"
              style={{
                fontSize: "0.86rem",
                color: "var(--rf-ink-primary)",
                lineHeight: 1.5,
                background: "var(--rf-surface)",
                padding: "10px 12px",
                borderRadius: "var(--rf-radius-sm)",
                border: "1px solid var(--rf-border-default)",
              }}
            >
              &quot;{current.baseText}&quot;
            </div>
          </div>

          <div
            style={{
              background: "var(--rf-surface-subtle)",
              border: "1px solid var(--rf-border-subtle)",
              borderRadius: "var(--rf-radius-md)",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 700,
                  color: "var(--rf-ink-muted)",
                }}
              >
                Proposed Amendment (v2)
              </div>
              <span
                className={`rf-badge ${
                  current.isMaterial ? "rf-badge-danger" : "rf-badge-safe"
                }`}
                style={{ fontSize: "0.7rem" }}
              >
                {current.badgeLabel}
              </span>
            </div>
            <div
              className="rf-mono"
              style={{
                fontSize: "0.86rem",
                color: "var(--rf-ink-primary)",
                lineHeight: 1.5,
                background: "var(--rf-surface)",
                padding: "10px 12px",
                borderRadius: "var(--rf-radius-sm)",
                border: "1px solid var(--rf-border-default)",
              }}
            >
              &quot;{current.proposedText}&quot;
            </div>
          </div>
        </div>

        {/* Participant Probe Outcome Evaluation */}
        <div
          className="rf-scenario-card"
          style={{
            borderLeft: current.outcomeChanged
              ? "4px solid var(--rf-danger-solid)"
              : "4px solid var(--rf-safe-solid)",
          }}
        >
          <div className="rf-scenario-header">
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--rf-ink-muted)",
                  textTransform: "uppercase",
                }}
              >
                Participant Scenario Probe:
              </span>
              <strong style={{ display: "block", fontSize: "0.95rem", color: "var(--rf-ink-primary)" }}>
                {current.scenarioTitle}
              </strong>
            </div>
            <span
              className={`rf-badge ${
                current.outcomeChanged ? "rf-badge-danger" : "rf-badge-safe"
              }`}
            >
              {current.outcomeChanged ? "Outcome Changed" : "Outcome Unchanged"}
            </span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--rf-ink-secondary)", margin: "4px 0 10px" }}>
            <strong>Facts:</strong> {current.situation}
          </p>

          <div className="rf-scenario-outcomes">
            <div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--rf-ink-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Outcome under Baseline (v1)
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--rf-safe-text)",
                  marginTop: "2px",
                  fontSize: "0.92rem",
                }}
              >
                {current.baseOutcome}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--rf-ink-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Outcome under Amendment (v2)
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: current.outcomeChanged
                    ? "var(--rf-danger-text)"
                    : "var(--rf-safe-text)",
                  marginTop: "2px",
                  fontSize: "0.92rem",
                }}
              >
                {current.proposedOutcome}
              </div>
            </div>
          </div>

          {/* Verdict Box */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: current.isMaterial ? "var(--rf-warning-bg)" : "var(--rf-safe-bg)",
              border: `1px solid ${
                current.isMaterial ? "var(--rf-warning-border)" : "var(--rf-safe-border)"
              }`,
              borderRadius: "var(--rf-radius-sm)",
              marginTop: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  color: current.isMaterial ? "var(--rf-warning-text)" : "var(--rf-safe-text)",
                }}
              >
                GenLayer Semantic Verdict: {current.verdict}
              </span>
              <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.7rem" }}>
                Scope: {current.dimension}
              </span>
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--rf-ink-secondary)",
                marginTop: "4px",
                lineHeight: 1.45,
              }}
            >
              {current.consensusReasoning}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
