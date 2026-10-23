"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPublicConfig } from "@/lib/config";
import { executeContractWrite, getInjectedProvider } from "@/lib/contract-adapter";
import { mockRegisterEvent } from "@/lib/mock-adapter";
import {
  saveEventDraft,
  getEventDraft,
  deleteEventDraft,
  getTxRecord,
  recordMatchesContract,
} from "@/lib/idb";
import { trackTransaction, subscribeTxUpdates } from "@/lib/tx-controller";
import { reconcileEventRegistration } from "@/lib/reconciliation";
import type { EventDraft, ParticipantScenario, RuleDimension } from "@/lib/types";
import { SYNTHETIC_QA_FIXTURE } from "@/lib/fixtures";

export default function NewEventPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [declaredStart, setDeclaredStart] = useState("");
  const [declaredDeadline, setDeclaredDeadline] = useState("");
  const [initialRules, setInitialRules] = useState(
    "1. Eligibility: Open to all builders worldwide. Teams up to 4 members.\n2. Deliverables: Public repository with open source license and verifiable test suite.\n3. Deadlines: Final submissions due Friday before 23:59 UTC.\n4. Scoring: Functionality (70%), Architecture (30%)."
  );
  const [scenarios, setScenarios] = useState<ParticipantScenario[]>([
    {
      id: "SC-1",
      title: "Team of 4 submitting GitHub repo",
      situation: "Team of 4 submits repository before Friday deadline.",
      question: "Is the submission eligible and timely?",
      dimension: "ELIGIBILITY",
    },
    {
      id: "SC-2",
      title: "Solo builder with no hosted website",
      situation: "Developer submits complete GitHub repo with tests, but no live URL.",
      question: "Does deliverable satisfy baseline rules?",
      dimension: "DELIVERABLES",
    },
  ]);

  const [isDemo, setIsDemo] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [provisionalNotice, setProvisionalNotice] = useState<string | null>(null);
  const [draftSavedNotice, setDraftSavedNotice] = useState(false);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);
  const [showPreSubmitModal, setShowPreSubmitModal] = useState(false);

  useEffect(() => {
    setIsDemo(localStorage.getItem("rf_demo_mode") === "true");
    getPublicConfig().then(async (cfg) => {
      setContractAddress(cfg.contractAddress);
      const draft = await getEventDraft("active_draft").catch(() => null);
      if (!draft || !recordMatchesContract(draft, cfg.contractAddress)) return;
      setName(draft.name || "");
      setDescription(draft.description || "");
      setEventUrl(draft.event_url || "");
      setDeclaredStart(draft.declared_start || "");
      setDeclaredDeadline(draft.declared_deadline || "");
      if (draft.initial_rules) setInitialRules(draft.initial_rules);
      if (draft.scenarios && draft.scenarios.length > 0) setScenarios(draft.scenarios);

      if (draft.pendingTxHash) {
        const tx = await getTxRecord(draft.pendingTxHash).catch(() => null);
        if (
          tx &&
          ["SUBMITTED", "PENDING_NETWORK", "ACCEPTED", "EXECUTION_UNKNOWN"].includes(tx.status)
        ) {
          setProvisionalNotice(
            `Active transaction detected (${tx.txHash.slice(0, 14)}... • status: ${tx.status}). Resuming tracking...`
          );
          if (cfg.contractAddress) {
            trackTransaction(
              tx.txHash,
              "register_event",
              `Registering ${draft.name}`,
              cfg.contractAddress,
              61999,
              draft.account
            ).catch(() => {});
          }
        }
      }
    }).catch(() => {});

    const provider = getInjectedProvider();
    if (provider) {
      provider.request({ method: "eth_accounts" }).then((accs) => {
        const a = accs as string[];
        if (a && a[0]) setAccount(a[0]);
      }).catch(() => {});
    }
  }, []);

  const saveDraftLocally = async () => {
    try {
      await saveEventDraft({
        id: "active_draft",
        name,
        description,
        event_url: eventUrl,
        declared_start: declaredStart,
        declared_deadline: declaredDeadline,
        initial_rules: initialRules,
        scenarios,
        account: account || "anonymous",
        contractAddress: contractAddress || undefined,
        updatedAt: Date.now(),
      });
      setDraftSavedNotice(true);
      setTimeout(() => setDraftSavedNotice(false), 3000);
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
  };

  const applySyntheticQA = async () => {
    setName(SYNTHETIC_QA_FIXTURE.name);
    setDescription(SYNTHETIC_QA_FIXTURE.description);
    setEventUrl(SYNTHETIC_QA_FIXTURE.eventUrl);
    setDeclaredStart(SYNTHETIC_QA_FIXTURE.declaredStart);
    setDeclaredDeadline(SYNTHETIC_QA_FIXTURE.declaredDeadline);
    setInitialRules(SYNTHETIC_QA_FIXTURE.initialRules);
    setScenarios(SYNTHETIC_QA_FIXTURE.scenarios);
    setShowConfirmOverwrite(false);
    setError(null);

    try {
      await saveEventDraft({
        id: "active_draft",
        name: SYNTHETIC_QA_FIXTURE.name,
        description: SYNTHETIC_QA_FIXTURE.description,
        event_url: SYNTHETIC_QA_FIXTURE.eventUrl,
        declared_start: SYNTHETIC_QA_FIXTURE.declaredStart,
        declared_deadline: SYNTHETIC_QA_FIXTURE.declaredDeadline,
        initial_rules: SYNTHETIC_QA_FIXTURE.initialRules,
        scenarios: SYNTHETIC_QA_FIXTURE.scenarios,
        account: account || "anonymous",
        contractAddress: contractAddress || undefined,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn("Draft persistence notice:", e);
    }
  };

  const loadSyntheticQA = () => {
    const isDirty = name.trim().length > 0 || description.trim().length > 0;
    if (isDirty) {
      setShowConfirmOverwrite(true);
      return;
    }
    applySyntheticQA();
  };

  const addScenario = () => {
    const nextIdx = scenarios.length + 1;
    setScenarios([
      ...scenarios,
      {
        id: `SC-${nextIdx}`,
        title: `Scenario Probe ${nextIdx}`,
        situation: "",
        question: "",
        dimension: "ELIGIBILITY",
      },
    ]);
  };

  const updateScenario = (idx: number, patch: Partial<ParticipantScenario>) => {
    const next = [...scenarios];
    const current = next[idx];
    if (current) {
      next[idx] = { ...current, ...patch };
      setScenarios(next);
    }
  };

  const removeScenario = (idx: number) => {
    if (scenarios.length <= 1) {
      alert("At least one participant scenario probe is required.");
      return;
    }
    setScenarios(scenarios.filter((_, i) => i !== idx));
  };

  const handleTriggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Competition name is required.");
      return;
    }
    if (!initialRules.trim()) {
      setError("Initial rules text is required.");
      return;
    }
    if (scenarios.length === 0) {
      setError("At least one scenario probe is required.");
      return;
    }

    // Open review confirmation before irreversible write
    setShowPreSubmitModal(true);
  };

  const executeRegistration = async () => {
    if (submittingRef.current) return;

    // Check for unresolved in-flight transaction on this draft before emitting write
    const existingDraft = await getEventDraft("active_draft").catch(() => null);
    if (existingDraft?.pendingTxHash) {
      const existingTx = await getTxRecord(existingDraft.pendingTxHash).catch(() => null);
      if (
        existingTx &&
        ["SUBMITTED", "PENDING_NETWORK", "ACCEPTED", "EXECUTION_UNKNOWN"].includes(
          existingTx.status
        )
      ) {
        setError(
          `Unresolved transaction in progress (${existingTx.txHash.slice(0, 14)}... • status: ${existingTx.status}). Manual reconciliation required before re-submitting.`
        );
        setShowPreSubmitModal(false);
        // Resume tracking existing transaction rather than emitting a second write
        if (contractAddress) {
          trackTransaction(
            existingTx.txHash,
            "register_event",
            `Registering ${name}`,
            contractAddress,
            61999,
            account || existingTx.account
          ).catch(() => {});
        }
        return;
      }
    }

    submittingRef.current = true;
    setShowPreSubmitModal(false);
    setSubmitting(true);
    setError(null);
    setProvisionalNotice(null);

    // Demonstration Mode path
    if (isDemo || !contractAddress) {
      try {
        const dummyAccount = account || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
        const newEventId = await mockRegisterEvent(
          dummyAccount,
          name,
          description,
          eventUrl,
          declaredStart,
          declaredDeadline,
          initialRules,
          scenarios
        );
        await deleteEventDraft("active_draft");
        router.push(`/events/${newEventId}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
      return;
    }

    // Live On-Chain GenLayer path
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No Web3 wallet detected. Please connect MetaMask or switch to Demo Mode.");
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    let activeAccount = account;
    if (!activeAccount) {
      try {
        const accs = (await provider.request({ method: "eth_requestAccounts" })) as string[];
        if (accs && accs[0]) {
          activeAccount = accs[0];
          setAccount(activeAccount);
        } else {
          throw new Error("No accounts available");
        }
      } catch {
        setError("Wallet connection required to submit on-chain registration.");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
    }

    const draftPayload: EventDraft = {
      id: "active_draft",
      name,
      description,
      event_url: eventUrl,
      declared_start: declaredStart,
      declared_deadline: declaredDeadline,
      initial_rules: initialRules,
      scenarios,
      account: activeAccount,
      contractAddress,
      updatedAt: Date.now(),
    };

    try {
      const scenariosJson = JSON.stringify(scenarios);
      const txHash = await executeContractWrite(
        provider,
        contractAddress,
        activeAccount,
        "register_event",
        [name, description, eventUrl, declaredStart, declaredDeadline, initialRules, scenariosJson]
      );

      // Record pending transaction on draft immediately to prevent duplicate submissions
      draftPayload.pendingTxHash = txHash;
      await saveEventDraft(draftPayload);

      // Listen for provisional consensus transition immediately
      const unsub = subscribeTxUpdates((rec) => {
        if (rec.txHash === txHash && rec.status === "ACCEPTED") {
          setProvisionalNotice(
            `Transaction accepted by validators on consensus. Awaiting finality before draft cleanup (protocol: ${rec.protocolStatus || "ACCEPTED"}, consensus: ${rec.consensusResult || "MAJORITY_AGREE"}, execution: ${rec.executionResult || "SUCCESS"}).`
          );
        }
      });

      let txRecord: typeof draftPayload & any;
      try {
        txRecord = await trackTransaction(
          txHash,
          "register_event",
          `Registering ${name}`,
          contractAddress,
          61999,
          activeAccount
        );
      } finally {
        unsub();
      }

      // Handle ACCEPTED provisional success: preserve draft, notify user, do not delete draft
      if (txRecord.status === "ACCEPTED") {
        setProvisionalNotice(
          `Transaction accepted by validators on consensus. Awaiting finality before draft cleanup (protocol: ${txRecord.protocolStatus || "ACCEPTED"}, consensus: ${txRecord.consensusResult || "MAJORITY_AGREE"}, execution: ${txRecord.executionResult || "SUCCESS"}).`
        );
        return;
      }

      // Explicit 3-gate reconciliation: Finality verified + Execution SUCCESS + Readback matched
      const reconciliation = await reconcileEventRegistration(
        txRecord,
        draftPayload,
        contractAddress
      );

      if (!reconciliation.canCleanup) {
        setError(
          `Reconciliation gate failed: ${reconciliation.error}. Draft preserved for recovery. (protocol: ${reconciliation.protocolStatus}, consensus: ${reconciliation.consensusResult}, execution: ${reconciliation.executionResult})`
        );
        return;
      }

      // All 3 reconciliation gates passed: clean up draft and navigate
      await deleteEventDraft("active_draft");
      router.push("/events");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: "14px", fontSize: "0.85rem" }}>
        <Link href="/events" style={{ color: "var(--rf-ink-muted)" }}>
          ← Back to Registry
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
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
          Immutable On-Chain Anchor
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Register Event Baseline
        </h1>
        <p style={{ color: "var(--rf-ink-secondary)", fontSize: "0.95rem", marginTop: "4px" }}>
          Freeze the authoritative initial rule set and scenario probes on GenLayer Studionet.
        </p>

        {/* Synthetic QA Fixture Loader Card */}
        <div
          style={{
            marginTop: "18px",
            background: "var(--rf-surface-subtle)",
            border: "1px solid var(--rf-border-default)",
            borderRadius: "var(--rf-radius-md)",
            padding: "14px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--rf-ink-primary)" }}>
                Synthetic QA Fixture (Section 8 Standard Baseline)
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                Populates form with clean, non-sensitive competition rules and 3 structured participant probes.
              </div>
            </div>

            {!showConfirmOverwrite && (
              <button
                type="button"
                onClick={loadSyntheticQA}
                id="btn-load-synthetic-qa"
                className="rf-btn rf-btn-secondary rf-btn-sm"
              >
                Load synthetic QA example
              </button>
            )}
          </div>

          {showConfirmOverwrite && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--rf-border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "0.82rem", color: "var(--rf-warning-text)", fontWeight: 600 }}>
                Current form has unsaved edits. Overwrite with official Section 8 fixture?
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={applySyntheticQA}
                  id="btn-confirm-overwrite-qa"
                  className="rf-btn rf-btn-primary rf-btn-sm"
                >
                  Yes, Overwrite
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmOverwrite(false)}
                  className="rf-btn rf-btn-secondary rf-btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {draftSavedNotice && (
        <div className="rf-banner rf-banner-safe" style={{ padding: "10px 14px", fontSize: "0.85rem" }}>
          Draft successfully saved locally in browser IndexedDB.
        </div>
      )}

      {provisionalNotice && (
        <div className="rf-banner rf-banner-info">
          <div style={{ flex: 1 }}>{provisionalNotice}</div>
        </div>
      )}

      {error && (
        <div className="rf-banner rf-banner-warning">
          <div style={{ flex: 1 }}>{error}</div>
        </div>
      )}

      <form onSubmit={handleTriggerSubmit}>
        {/* Step 1: Event Identity & Metadata */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SECTION 1
              </span>
              <h2 className="rf-card-title">Competition Identity & Scope</h2>
              <p className="rf-card-subtitle">
                Basic identifiers for your hackathon, grant round, or developer bounty.
              </p>
            </div>
          </div>

          <div className="rf-form-group">
            <label className="rf-label" htmlFor="event-name">Competition Name *</label>
            <input
              id="event-name"
              type="text"
              className="rf-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Autonomous Agents Hackathon Fall 2026"
              required
            />
          </div>

          <div className="rf-form-group">
            <label className="rf-label" htmlFor="event-desc">Public Description</label>
            <textarea
              id="event-desc"
              className="rf-textarea"
              style={{ minHeight: "84px" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the challenge, prizes, and organizers..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <div className="rf-form-group">
              <label className="rf-label" htmlFor="event-url">Public Event / Website URL</label>
              <input
                id="event-url"
                type="url"
                className="rf-input"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="rf-form-group">
              <label className="rf-label" htmlFor="event-deadline">Declared Submission Deadline</label>
              <input
                id="event-deadline"
                type="text"
                className="rf-input"
                value={declaredDeadline}
                onChange={(e) => setDeclaredDeadline(e.target.value)}
                placeholder="e.g. 2026-11-15T23:59:59Z"
              />
              <div className="rf-help">ISO 8601 UTC timestamp recommended.</div>
            </div>
          </div>
        </div>

        {/* Step 2: Baseline Rules Text */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SECTION 2
              </span>
              <h2 className="rf-card-title">Full Baseline Rules Text *</h2>
              <p className="rf-card-subtitle">
                Enter the complete initial competition rules. This text will be cryptographically hashed (SHA-256) and permanently stored on GenLayer.
              </p>
            </div>
            <span className="rf-badge rf-badge-neutral rf-mono" style={{ fontSize: "0.72rem" }}>
              {initialRules.length} characters • {initialRules.split("\n").length} lines
            </span>
          </div>

          <div className="rf-form-group">
            <label className="sr-only" htmlFor="initial-rules">Initial Rules Text</label>
            <textarea
              id="initial-rules"
              className="rf-textarea rf-code-editor"
              style={{ minHeight: "220px", fontSize: "0.9rem" }}
              value={initialRules}
              onChange={(e) => setInitialRules(e.target.value)}
              required
            />
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "var(--rf-surface-subtle)",
              borderRadius: "var(--rf-radius-sm)",
              border: "1px solid var(--rf-border-subtle)",
              fontSize: "0.8rem",
              color: "var(--rf-ink-muted)",
              lineHeight: 1.5,
            }}
          >
            <strong>Immutability Notice:</strong> Once registered, baseline rule text cannot be deleted or secretly replaced. Future revisions must be submitted as public amendments evaluated against this baseline.
          </div>
        </div>

        {/* Step 3: Scenario Probes */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SECTION 3
              </span>
              <h2 className="rf-card-title">Bounded Participant Scenario Probes *</h2>
              <p className="rf-card-subtitle">
                Define concrete test situations (e.g. team size, late submission, missing artifact). The intelligent contract tests future amendments against these exact probes.
              </p>
            </div>

            <button
              type="button"
              className="rf-btn rf-btn-secondary rf-btn-sm"
              onClick={addScenario}
            >
              + Add Scenario Probe
            </button>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {scenarios.map((sc, idx) => (
              <div key={sc.id || idx} className="rf-scenario-card">
                <div className="rf-scenario-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="rf-badge rf-badge-neutral rf-mono">{sc.id}</span>
                    <strong style={{ fontSize: "0.92rem" }}>{sc.title || `Probe ${idx + 1}`}</strong>
                  </div>

                  <button
                    type="button"
                    className="rf-btn rf-btn-danger rf-btn-sm"
                    onClick={() => removeScenario(idx)}
                    title="Remove scenario"
                  >
                    Remove
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label className="rf-label" style={{ fontSize: "0.8rem" }} htmlFor={`sc-title-${idx}`}>
                      Probe Label / Title
                    </label>
                    <input
                      id={`sc-title-${idx}`}
                      type="text"
                      className="rf-input"
                      value={sc.title}
                      onChange={(e) => updateScenario(idx, { title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="rf-label" style={{ fontSize: "0.8rem" }} htmlFor={`sc-dim-${idx}`}>
                      Affected Dimension
                    </label>
                    <select
                      id={`sc-dim-${idx}`}
                      className="rf-select"
                      value={sc.dimension}
                      onChange={(e) =>
                        updateScenario(idx, { dimension: e.target.value as RuleDimension })
                      }
                    >
                      <option value="ELIGIBILITY">ELIGIBILITY</option>
                      <option value="SCORING">SCORING</option>
                      <option value="DEADLINES">DEADLINES</option>
                      <option value="DELIVERABLES">DELIVERABLES</option>
                      <option value="OBLIGATIONS">OBLIGATIONS</option>
                      <option value="PROCEDURES">PROCEDURES</option>
                      <option value="DEFINITIONS">DEFINITIONS</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label className="rf-label" style={{ fontSize: "0.8rem" }} htmlFor={`sc-sit-${idx}`}>
                    Participant Situation (Factual Premise)
                  </label>
                  <input
                    id={`sc-sit-${idx}`}
                    type="text"
                    className="rf-input"
                    value={sc.situation}
                    onChange={(e) => updateScenario(idx, { situation: e.target.value })}
                    placeholder="e.g. Solo developer submitting a Rust CLI repo on Friday at 20:00 UTC."
                  />
                </div>

                <div>
                  <label className="rf-label" style={{ fontSize: "0.8rem" }} htmlFor={`sc-q-${idx}`}>
                    Explicit Question to Assess
                  </label>
                  <input
                    id={`sc-q-${idx}`}
                    type="text"
                    className="rf-input"
                    value={sc.question}
                    onChange={(e) => updateScenario(idx, { question: e.target.value })}
                    placeholder="e.g. Is this submission eligible and timely?"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <button
            type="button"
            className="rf-btn rf-btn-secondary"
            onClick={saveDraftLocally}
          >
            Save Draft in Browser
          </button>

          <button
            type="submit"
            className="rf-btn rf-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Registering on GenLayer..." : "Review & Submit Baseline"}
          </button>
        </div>
      </form>

      {/* Pre-Submission Review Modal */}
      {showPreSubmitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(18, 21, 24, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="rf-card"
            style={{
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              marginBottom: 0,
              boxShadow: "var(--rf-shadow-elevated)",
            }}
          >
            <h2 id="modal-title" style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}>
              Confirm Baseline Registration
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", marginBottom: "16px" }}>
              Please review the following details before executing this public on-chain transaction:
            </p>

            <div
              style={{
                background: "var(--rf-surface-subtle)",
                padding: "14px",
                borderRadius: "var(--rf-radius-md)",
                fontSize: "0.85rem",
                display: "grid",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <div>
                <strong>Event Name:</strong> {name}
              </div>
              <div>
                <strong>Rules Length:</strong> {initialRules.length} characters ({initialRules.split("\n").length} lines)
              </div>
              <div>
                <strong>Scenario Probes:</strong> {scenarios.length} registered probes
              </div>
              <div>
                <strong>Network Target:</strong> {isDemo ? "Local Demonstration Fixture" : "GenLayer Studionet (Chain 61999)"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="rf-btn rf-btn-secondary"
                onClick={() => setShowPreSubmitModal(false)}
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                className="rf-btn rf-btn-primary"
                onClick={executeRegistration}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Confirm & Write to GenLayer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
