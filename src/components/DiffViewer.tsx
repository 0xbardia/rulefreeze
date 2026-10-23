"use client";

import { useState } from "react";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldTitle?: string;
  newTitle?: string;
}

export function DiffViewer({
  oldText,
  newText,
  oldTitle = "Registered Active Rules",
  newTitle = "Proposed Amendment",
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");

  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const isDifferent = oldText.trim() !== newText.trim();
  const charDiff = newText.length - oldText.length;

  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--rf-ink-secondary)" }}>
          <span>Textual Comparison</span>
          <span className="rf-badge rf-badge-neutral rf-mono" style={{ fontSize: "0.72rem" }}>
            {charDiff > 0 ? `+${charDiff} chars` : `${charDiff} chars`}
          </span>
          {!isDifferent && (
            <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.72rem" }}>
              Identical Text
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={`rf-btn rf-btn-sm ${viewMode === "split" ? "rf-btn-secondary" : ""}`}
            style={{ fontWeight: viewMode === "split" ? 700 : 500 }}
            onClick={() => setViewMode("split")}
          >
            Side-by-Side
          </button>
          <button
            type="button"
            className={`rf-btn rf-btn-sm ${viewMode === "unified" ? "rf-btn-secondary" : ""}`}
            style={{ fontWeight: viewMode === "unified" ? 700 : 500 }}
            onClick={() => setViewMode("unified")}
          >
            Stacked View
          </button>
        </div>
      </div>

      {viewMode === "split" ? (
        <div className="rf-diff-container">
          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">
              <span>{oldTitle}</span>
              <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.68rem" }}>
                {oldLines.length} lines
              </span>
            </div>
            <div className="rf-diff-text" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {oldLines.map((line, idx) => {
                const lineChanged = !newLines.includes(line);
                return (
                  <div
                    key={`old-${idx}`}
                    style={{
                      display: "flex",
                      gap: "10px",
                      padding: "1px 4px",
                      backgroundColor: lineChanged ? "var(--rf-danger-bg)" : "transparent",
                      borderRadius: "2px",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--rf-ink-muted)",
                        width: "28px",
                        textAlign: "right",
                        userSelect: "none",
                        fontSize: "0.78rem",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{line || " "}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">
              <span>{newTitle}</span>
              <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.68rem" }}>
                {newLines.length} lines
              </span>
            </div>
            <div className="rf-diff-text" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {newLines.map((line, idx) => {
                const lineChanged = !oldLines.includes(line);
                return (
                  <div
                    key={`new-${idx}`}
                    style={{
                      display: "flex",
                      gap: "10px",
                      padding: "1px 4px",
                      backgroundColor: lineChanged ? "var(--rf-safe-bg)" : "transparent",
                      borderRadius: "2px",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--rf-ink-muted)",
                        width: "28px",
                        textAlign: "right",
                        userSelect: "none",
                        fontSize: "0.78rem",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ flex: 1, whiteSpace: "pre-wrap" }}>{line || " "}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rf-diff-container" style={{ gridTemplateColumns: "1fr" }}>
          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">
              <span>{oldTitle} (Baseline)</span>
              <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.68rem" }}>
                {oldLines.length} lines
              </span>
            </div>
            <div className="rf-diff-text" style={{ maxHeight: "250px", overflowY: "auto" }}>
              {oldText}
            </div>
          </div>
          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">
              <span>{newTitle} (Proposed Changes)</span>
              <span className="rf-badge rf-badge-neutral" style={{ fontSize: "0.68rem" }}>
                {newLines.length} lines
              </span>
            </div>
            <div className="rf-diff-text" style={{ maxHeight: "250px", overflowY: "auto" }}>
              {newText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
