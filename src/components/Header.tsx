"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPublicConfig } from "@/lib/config";
import { getInjectedProvider } from "@/lib/contract-adapter";

export function Header() {
  const [account, setAccount] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check demo mode from localStorage
    const savedDemo = localStorage.getItem("rf_demo_mode");
    if (savedDemo === "true") setIsDemo(true);

    getPublicConfig().then((cfg) => {
      setIsConfigured(cfg.isConfigured);
    });

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

      if (provider.on) {
        provider.on("accountsChanged", (...args: unknown[]) => {
          const accs = args[0] as string[];
          if (accs && accs.length > 0 && accs[0]) {
            setAccount(accs[0]);
          } else {
            setAccount(null);
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

  return (
    <header className="rf-header">
      <div className="rf-container rf-header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "16px 24px", flexWrap: "wrap", minWidth: 0 }}>
          <Link href="/" className="rf-brand">
            RuleFreeze
            <span className="rf-brand-tag">Registry</span>
          </Link>

          <nav className="rf-nav-links" aria-label="Main Navigation">
            <Link href="/events" className="rf-nav-link">
              Events
            </Link>
            <Link href="/events/new" className="rf-nav-link">
              Register Baseline
            </Link>
            <Link href="/methodology" className="rf-nav-link">
              Methodology
            </Link>
            <Link href="/diagnostics" className="rf-nav-link">
              Diagnostics
            </Link>
          </nav>
        </div>

        <div className="rf-header-actions">
          <button
            type="button"
            onClick={toggleDemo}
            className={`rf-btn rf-btn-sm ${isDemo ? "rf-btn-primary" : "rf-btn-secondary"}`}
            title="Toggle between Live On-Chain mode and synthetic Demonstration fixtures"
          >
            {isDemo ? "Demo Fixtures Active" : "Demo Mode"}
          </button>

          {account ? (
            <span
              className="rf-badge rf-badge-neutral rf-mono"
              title={`Connected: ${account}`}
            >
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
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
