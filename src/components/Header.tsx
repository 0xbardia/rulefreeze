"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPublicConfig } from "@/lib/config";
import { getInjectedProvider } from "@/lib/contract-adapter";

export function Header() {
  const pathname = usePathname();
  const [account, setAccount] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    // Check demo mode from localStorage
    const savedDemo = localStorage.getItem("rf_demo_mode");
    if (savedDemo === "true") setIsDemo(true);

    getPublicConfig().catch(() => {});

    const provider = getInjectedProvider();
    if (provider) {
      provider
        .request({ method: "eth_accounts" })
        .then((accs) => {
          const accounts = accs as string[];
          if (accounts && accounts.length > 0 && accounts[0]) {
            setAccount(accounts[0]);
          }
        })
        .catch(() => {});

      provider
        .request({ method: "eth_chainId" })
        .then((cId) => {
          const hex = cId as string;
          if (hex) {
            const dec = hex.startsWith("0x") ? parseInt(hex, 16) : Number(hex);
            setChainId(dec);
          }
        })
        .catch(() => {});

      if (provider.on) {
        provider.on("accountsChanged", (...args: unknown[]) => {
          const accs = args[0] as string[];
          if (accs && accs.length > 0 && accs[0]) {
            setAccount(accs[0]);
          } else {
            setAccount(null);
          }
        });

        provider.on("chainChanged", (...args: unknown[]) => {
          const cId = args[0] as string;
          if (cId) {
            const dec = cId.startsWith("0x") ? parseInt(cId, 16) : Number(cId);
            setChainId(dec);
          }
        });
      }
    }
  }, []);

  const toggleDemo = () => {
    const next = !isDemo;
    setIsDemo(next);
    localStorage.setItem("rf_demo_mode", String(next));
    window.dispatchEvent(new Event("rf_mode_changed"));
  };

  const connectWallet = async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      alert("No Ethereum browser wallet found. Please install MetaMask, Rabby, or a Web3 provider.");
      return;
    }
    try {
      const accs = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (accs && accs.length > 0 && accs[0]) {
        setAccount(accs[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Wallet connection failed:", msg);
    }
  };

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="rf-header">
      <div className="rf-container rf-header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "16px 28px", flexWrap: "wrap", minWidth: 0 }}>
          <Link href="/" className="rf-brand" aria-label="RuleFreeze Home">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "var(--rf-brand)",
                  borderRadius: "2px",
                  display: "inline-block",
                }}
                aria-hidden="true"
              />
              RuleFreeze
            </span>
            <span className="rf-brand-tag">Registry</span>
          </Link>

          <nav className="rf-nav-links" aria-label="Main Navigation">
            <Link
              href="/events"
              className={`rf-nav-link ${isActive("/events") && !isActive("/events/new") ? "active" : ""}`}
            >
              Registry
            </Link>
            <Link
              href="/events/new"
              className={`rf-nav-link ${isActive("/events/new") ? "active" : ""}`}
            >
              Register Rules
            </Link>
            <Link
              href="/methodology"
              className={`rf-nav-link ${isActive("/methodology") ? "active" : ""}`}
            >
              Methodology
            </Link>
            <Link
              href="/diagnostics"
              className={`rf-nav-link ${isActive("/diagnostics") ? "active" : ""}`}
            >
              Diagnostics
            </Link>
          </nav>
        </div>

        <div className="rf-header-actions">
          {/* Demo toggle pill */}
          <button
            type="button"
            onClick={toggleDemo}
            className={`rf-badge ${isDemo ? "rf-badge-brand" : "rf-badge-neutral"}`}
            style={{ cursor: "pointer", border: isDemo ? "1px solid var(--rf-accent)" : "1px solid var(--rf-border-default)", padding: "4px 10px" }}
            title="Toggle between Live On-Chain mode and synthetic Demonstration fixtures"
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isDemo ? "var(--rf-accent)" : "var(--rf-ink-muted)",
                display: "inline-block",
              }}
              aria-hidden="true"
            />
            {isDemo ? "Demo Mode Active" : "Live Mode"}
          </button>

          {/* Wallet / Network Status */}
          {account ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {chainId !== null && (
                <span
                  className={`rf-badge ${chainId === 61999 ? "rf-badge-safe" : "rf-badge-warning"}`}
                  title={chainId === 61999 ? "Connected to GenLayer Studionet (61999)" : `Wrong network: chain ${chainId}. Switch to 61999.`}
                >
                  {chainId === 61999 ? "Studionet" : `Chain ${chainId}`}
                </span>
              )}
              <span
                className="rf-badge rf-badge-neutral rf-mono"
                title={`Connected Account: ${account}`}
              >
                {account.slice(0, 6)}…{account.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={connectWallet}
              className="rf-btn rf-btn-secondary rf-btn-sm"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
