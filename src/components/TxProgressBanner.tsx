"use client";

import { useEffect, useState } from "react";
import { listPendingTxRecords } from "@/lib/idb";
import { subscribeTxUpdates } from "@/lib/tx-controller";
import { ChainTxRecord } from "@/lib/types";

export function TxProgressBanner() {
  const [pendingTxs, setPendingTxs] = useState<ChainTxRecord[]>([]);

  useEffect(() => {
    // Initial fetch from IndexedDB
    listPendingTxRecords().then(setPendingTxs).catch(() => {});

    // Subscribe to live controller updates
    const unsubscribe = subscribeTxUpdates((record) => {
      setPendingTxs((prev) => {
        const idx = prev.findIndex((t) => t.txHash === record.txHash);
        if (record.status === "FINALIZED" || record.status === "EXECUTION_FAILURE" || record.status === "TIMEOUT") {
          // Keep showing for 8 seconds after resolution, then remove
          setTimeout(() => {
            setPendingTxs((p) => p.filter((t) => t.txHash !== record.txHash));
          }, 8000);
        }
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = record;
          return next;
        }
        return [record, ...prev];
      });
    });

    return () => unsubscribe();
  }, []);

  if (pendingTxs.length === 0) return null;

  return (
    <div style={{ marginBottom: "16px" }}>
      {pendingTxs.map((tx) => (
        <div
          key={tx.txHash}
          className={`rf-banner ${
            tx.status === "FINALIZED"
              ? "rf-banner-safe"
              : tx.status === "EXECUTION_FAILURE" || tx.status === "TIMEOUT"
              ? "rf-banner-warning"
              : "rf-banner-info"
          }`}
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              Transaction {tx.method} ({tx.status})
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Hash: <span className="rf-mono">{tx.txHash.slice(0, 14)}...{tx.txHash.slice(-10)}</span>
              {tx.argsSummary && ` • ${tx.argsSummary}`}
            </div>
            {tx.error && (
              <div style={{ color: "var(--color-danger)", fontSize: "0.82rem", marginTop: "4px" }}>
                Notice: {tx.error}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              className={`rf-badge ${
                tx.status === "FINALIZED"
                  ? "rf-badge-safe"
                  : tx.status === "EXECUTION_FAILURE" || tx.status === "TIMEOUT"
                  ? "rf-badge-danger"
                  : "rf-badge-brand"
              }`}
            >
              {tx.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
