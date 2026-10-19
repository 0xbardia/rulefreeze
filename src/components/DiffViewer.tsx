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

  // Simple line-by-line diff representation
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Textual Diff (Exact source comparison separate from semantic evaluation)
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={`rf-btn rf-btn-sm ${viewMode === "split" ? "rf-btn-secondary" : ""}`}
            onClick={() => setViewMode("split")}
          >
            Split View
          </button>
          <button
            type="button"
            className={`rf-btn rf-btn-sm ${viewMode === "unified" ? "rf-btn-secondary" : ""}`}
            onClick={() => setViewMode("unified")}
          >
            Stacked View
          </button>
        </div>
      </div>

      {viewMode === "split" ? (
        <div className="rf-diff-container">
          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">{oldTitle}</div>
            <div className="rf-diff-text">
              {oldLines.map((line, idx) => (
                <div key={`old-${idx}`} style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--text-muted)", width: "24px", userSelect: "none" }}>
                    {idx + 1}
                  </span>
                  <span>{line || " "}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">{newTitle}</div>
            <div className="rf-diff-text">
              {newLines.map((line, idx) => (
                <div key={`new-${idx}`} style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--text-muted)", width: "24px", userSelect: "none" }}>
                    {idx + 1}
                  </span>
                  <span>{line || " "}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rf-diff-container" style={{ gridTemplateColumns: "1fr" }}>
          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">{oldTitle} (Old Baseline)</div>
            <div className="rf-diff-text" style={{ maxHeight: "250px", overflowY: "auto" }}>
              {oldText}
            </div>
          </div>
          <div className="rf-diff-pane">
            <div className="rf-diff-pane-header">{newTitle} (Proposed Changes)</div>
            <div className="rf-diff-text" style={{ maxHeight: "250px", overflowY: "auto" }}>
              {newText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
