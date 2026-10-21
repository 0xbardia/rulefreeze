"use client";

import { useEffect, useState } from "react";
import { getPublicConfig, isValidContractAddress } from "@/lib/config";
import {
  fetchContractPolicy,
  fetchEventCount,
  getInjectedProvider,
} from "@/lib/contract-adapter";
import {
  listAllTxRecords,
  listEventDrafts,
  listAmendmentDrafts,
  deleteEventDraft,
  deleteAmendmentDraft,
} from "@/lib/idb";
import {
  ChainTxRecord,
  ContractPolicy,
  EventDraft,
  AmendmentDraft,
  PublicConfigResponse,
} from "@/lib/types";

export default function DiagnosticsPage() {
  const [config, setConfig] = useState<PublicConfigResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<unknown>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);

  const [livePolicy, setLivePolicy] = useState<ContractPolicy | null>(null);
  const [liveEventCount, setLiveEventCount] = useState<number | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const [eventDrafts, setEventDrafts] = useState<EventDraft[]>([]);
  const [amendmentDrafts, setAmendmentDrafts] = useState<AmendmentDraft[]>([]);
  const [txHistory, setTxHistory] = useState<ChainTxRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setReadError(null);

    const cfg = await getPublicConfig(true);
    setConfig(cfg);

    // Fetch /api/health
    try {
      const hRes = await fetch("/api/health");
      const hData = await hRes.json();
      setHealthStatus(hData);
    } catch (e) {
      setHealthStatus({ error: String(e) });
    }

    // Inspect wallet
    const provider = getInjectedProvider();
    if (provider) {
      try {
        const accs = (await provider.request({ method: "eth_accounts" })) as string[];
        if (accs && accs[0]) setAccount(accs[0]);
        const cidHex = (await provider.request({ method: "eth_chainId" })) as string;
        if (cidHex) {
          const dec = cidHex.startsWith("0x") ? parseInt(cidHex, 16) : Number(cidHex);
          setWalletChainId(dec);
        }
      } catch (e) {
        console.error("Wallet inspect error:", e);
      }
    }

    // Read live contract if configured
    if (cfg.contractAddress && isValidContractAddress(cfg.contractAddress)) {
      try {
        const pol = await fetchContractPolicy(cfg.contractAddress, cfg.rpcUrl);
        const count = await fetchEventCount(cfg.contractAddress, cfg.rpcUrl);
        setLivePolicy(pol);
        setLiveEventCount(count);
      } catch (err: unknown) {
        setReadError(err instanceof Error ? err.message : String(err));
      }
    }

    // Read IndexedDB
    try {
      const ed = await listEventDrafts();
      const ad = await listAmendmentDrafts();
      const txs = await listAllTxRecords();
      setEventDrafts(ed);
      setAmendmentDrafts(ad);
      setTxHistory(txs);
    } catch (e) {
      console.error("IDB read error:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const clearDraft = async (id: string, type: "event" | "amendment") => {
    if (type === "event") {
      await deleteEventDraft(id);
    } else {
      await deleteAmendmentDraft(id);
    }
    refresh();
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>System Diagnostics & Setup</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Verify contract configuration, network connectivity, and browser storage state.
          </p>
        </div>
        <button type="button" onClick={refresh} className="rf-btn rf-btn-secondary rf-btn-sm">
          Refresh Checks
        </button>
      </div>

      {/* Contract Configuration Status Card */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <h2 className="rf-card-title">1. Public Configuration Status</h2>
            <p className="rf-card-subtitle">
              Allowlisted environment variables served by <code>/api/public-config</code>
            </p>
          </div>
          <span className={`rf-badge ${config?.isConfigured ? "rf-badge-safe" : "rf-badge-warning"}`}>
            {config?.isConfigured ? "CONFIGURED (LIVE)" : "SETUP MODE (UNCONFIGURED)"}
          </span>
        </div>

        <div style={{ display: "grid", gap: "10px", fontSize: "0.88rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>PUBLIC_CONTRACT_ADDRESS:</span>
            <span className="rf-mono" style={{ color: config?.contractAddress ? "var(--color-safe)" : "var(--color-warning)" }}>
              {config?.contractAddress || "None (Not configured)"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>PUBLIC_GENLAYER_RPC_URL:</span>
            <span className="rf-mono">{config?.rpcUrl || "Loading..."}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>PUBLIC_GENLAYER_CHAIN_ID:</span>
            <span className="rf-mono">{config?.chainId} (0x{config?.chainId.toString(16)})</span>
          </div>
        </div>

        {!config?.isConfigured && (
          <div style={{ marginTop: "16px", padding: "12px", background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "4px" }}>
              Action Required to Enable Live Writes:
            </div>
            <ol style={{ paddingLeft: "20px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <li>Open GenLayer Studio at <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer">https://studio.genlayer.com</a>.</li>
              <li>Create a new contract, paste the contents of <code>X/contracts/main.py</code>, and compile.</li>
              <li>Deploy with zero constructor arguments.</li>
              <li>Set <code>PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress</code> in your environment.</li>
              <li>Restart or reload the application to start on-chain execution.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Backend Health Diagnostics */}
      <div className="rf-card">
        <h2 className="rf-card-title" style={{ marginBottom: "8px" }}>2. Backend Health Probe (/api/health)</h2>
        <pre
          className="rf-mono"
          style={{
            background: "var(--bg-primary)",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "0.82rem",
            overflowX: "auto",
            color: "var(--text-secondary)",
          }}
        >
          {JSON.stringify(healthStatus, null, 2)}
        </pre>
      </div>

      {/* Browser Wallet Connectivity */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <h2 className="rf-card-title">3. Browser Wallet Connectivity</h2>
            <p className="rf-card-subtitle">EIP-1193 window.ethereum inspection</p>
          </div>
          <span className={`rf-badge ${account ? "rf-badge-safe" : "rf-badge-neutral"}`}>
            {account ? "CONNECTED" : "NOT CONNECTED"}
          </span>
        </div>

        <div style={{ display: "grid", gap: "10px", fontSize: "0.88rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>Active Account:</span>
            <span className="rf-mono">{account || "None (Click 'Connect Wallet' in header)"}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>
            <span style={{ color: "var(--text-muted)" }}>Wallet Chain ID:</span>
            <span className="rf-mono">
              {walletChainId !== null ? `${walletChainId} ${walletChainId === 61999 ? "✓ (GenLayer Studionet)" : "✗ (Wrong network)"}` : "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Live Contract Reads (if configured) */}
      {config?.isConfigured && (
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <h2 className="rf-card-title">4. Authoritative Contract Reads</h2>
              <p className="rf-card-subtitle">Real query executed directly against GenLayer Studionet</p>
            </div>
          </div>

          {readError ? (
            <div className="rf-banner rf-banner-warning">
              <div>Contract Read Error: {readError}</div>
            </div>
          ) : livePolicy ? (
            <div style={{ fontSize: "0.88rem", display: "grid", gap: "8px" }}>
              <div>Contract Version: <strong>{livePolicy.contract_version}</strong></div>
              <div>Policy Hash: <span className="rf-hash">{livePolicy.policy_hash}</span></div>
              <div>Registered Events Count: <strong>{liveEventCount}</strong></div>
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Querying contract...</div>
          )}
        </div>
      )}

      {/* IndexedDB Local Storage Inspector */}
      <div className="rf-card">
        <h2 className="rf-card-title" style={{ marginBottom: "8px" }}>5. Browser IndexedDB Storage (RuleFreezeDB)</h2>
        <p className="rf-card-subtitle" style={{ marginBottom: "16px" }}>
          Unregistered local drafts and transaction tracking cache.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "6px" }}>
              Event Drafts ({eventDrafts.length})
            </h3>
            {eventDrafts.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No local event drafts saved.</div>
            ) : (
              eventDrafts.map((d) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-subtle)", padding: "8px 12px", borderRadius: "4px", marginBottom: "6px" }}>
                  <div>
                    <strong>{d.name || "(Untitled Draft)"}</strong>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Updated: {new Date(d.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button type="button" onClick={() => clearDraft(d.id, "event")} className="rf-btn rf-btn-danger rf-btn-sm">
                    Delete Local Draft
                  </button>
                </div>
              ))
            )}
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "6px" }}>
              Amendment Drafts ({amendmentDrafts.length})
            </h3>
            {amendmentDrafts.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No local amendment drafts saved.</div>
            ) : (
              amendmentDrafts.map((d) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-subtle)", padding: "8px 12px", borderRadius: "4px", marginBottom: "6px" }}>
                  <div>
                    <strong>Event: {d.event_id}</strong>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Updated: {new Date(d.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button type="button" onClick={() => clearDraft(d.id, "amendment")} className="rf-btn rf-btn-danger rf-btn-sm">
                    Delete Local Draft
                  </button>
                </div>
              ))
            )}
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "6px" }}>
              Recent Transactions Tracked ({txHistory.length})
            </h3>
            {txHistory.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No transactions tracked yet.</div>
            ) : (
              txHistory.slice(0, 5).map((tx) => (
                <div key={tx.txHash} style={{ background: "var(--bg-subtle)", padding: "8px 12px", borderRadius: "4px", marginBottom: "6px", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="rf-mono">{tx.txHash.slice(0, 16)}...</span>
                    <span className="rf-badge rf-badge-neutral">{tx.status}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                    {tx.method} • {new Date(tx.submittedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
