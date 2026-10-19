"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicConfig } from "@/lib/config";
import { executeContractWrite, getInjectedProvider } from "@/lib/contract-adapter";
import { mockRegisterEvent } from "@/lib/mock-adapter";
import { saveEventDraft, getEventDraft, deleteEventDraft } from "@/lib/idb";
import { trackTransaction } from "@/lib/tx-controller";
import { ParticipantScenario, RuleDimension } from "@/lib/types";
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
  const [error, setError] = useState<string | null>(null);
  const [draftSavedNotice, setDraftSavedNotice] = useState(false);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);

  useEffect(() => {
    setIsDemo(localStorage.getItem("rf_demo_mode") === "true");
    getPublicConfig().then((cfg) => {
      setContractAddress(cfg.contractAddress);
    });

    const provider = getInjectedProvider();
    if (provider) {
      provider.request({ method: "eth_accounts" }).then((accs) => {
        const a = accs as string[];
        if (a && a[0]) setAccount(a[0]);
      }).catch(() => {});
    }

    // Try restoring draft from IndexedDB
    getEventDraft("active_draft").then((draft) => {
      if (draft) {
        setName(draft.name || "");
        setDescription(draft.description || "");
        setEventUrl(draft.event_url || "");
        setDeclaredStart(draft.declared_start || "");
        setDeclaredDeadline(draft.declared_deadline || "");
        if (draft.initial_rules) setInitialRules(draft.initial_rules);
        if (draft.scenarios && draft.scenarios.length > 0) setScenarios(draft.scenarios);
      }
    }).catch(() => {});
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
        updatedAt: Date.now(),
      });
      setDraftSavedNotice(true);
      setTimeout(() => setDraftSavedNotice(false), 3000);
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
  };

  const applySyntheticQA = () => {
    setName(SYNTHETIC_QA_FIXTURE.name);
    setDescription(SYNTHETIC_QA_FIXTURE.description);
    setEventUrl(SYNTHETIC_QA_FIXTURE.eventUrl);
    setDeclaredStart(SYNTHETIC_QA_FIXTURE.declaredStart);
    setDeclaredDeadline(SYNTHETIC_QA_FIXTURE.declaredDeadline);
    setInitialRules(SYNTHETIC_QA_FIXTURE.initialRules);
    setScenarios(SYNTHETIC_QA_FIXTURE.scenarios);
    setShowConfirmOverwrite(false);
    setError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Event name is required.");
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

    setSubmitting(true);

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
        setSubmitting(false);
      }
      return;
    }

    // Live On-Chain GenLayer path
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No Web3 wallet detected. Please connect MetaMask or switch to Demo Mode.");
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
        setSubmitting(false);
        return;
      }
    }

    try {
      const scenariosJson = JSON.stringify(scenarios);
      const txHash = await executeContractWrite(
        provider,
        contractAddress,
        activeAccount,
        "register_event",
        [name, description, eventUrl, declaredStart, declaredDeadline, initialRules, scenariosJson]
      );

      // Track transaction until confirmed
      trackTransaction(
        txHash,
        "register_event",
        `Registering ${name}`,
        contractAddress,
        61999,
        activeAccount
      );

      await deleteEventDraft("active_draft");
      router.push("/events");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Register Event Baseline</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
          Freeze the initial rule set and participant scenario probes on GenLayer Studionet.
        </p>

        <div
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
            padding: "10px 14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Synthetic QA Fixture (Section 8)</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Loads clean, non-sensitive public test baseline and 3 scenario probes.
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
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "0.82rem", color: "var(--color-warning)" }}>
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
        <div className="rf-banner rf-banner-safe" style={{ padding: "8px 12px", fontSize: "0.85rem" }}>
          Draft saved locally in IndexedDB.
        </div>
      )}

      {error && (
        <div className="rf-banner rf-banner-warning">
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Event Details */}
        <div className="rf-card">
          <h2 className="rf-card-title" style={{ marginBottom: "16px" }}>1. Event Identity & Metadata</h2>
          <div className="rf-form-group">
            <label className="rf-label">Competition Name *</label>
            <input
              type="text"
              className="rf-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Autonomous Agents Hackathon Fall 2026"
              required
            />
          </div>

          <div className="rf-form-group">
            <label className="rf-label">Description</label>
            <textarea
              className="rf-textarea"
              style={{ minHeight: "80px" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the challenge, prizes, and organizers..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="rf-form-group">
              <label className="rf-label">Public Event URL</label>
              <input
                type="url"
                className="rf-input"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="rf-form-group">
              <label className="rf-label">Declared Submission Deadline</label>
              <input
                type="text"
                className="rf-input"
                value={declaredDeadline}
                onChange={(e) => setDeclaredDeadline(e.target.value)}
                placeholder="e.g. 2026-11-15T23:59:59Z"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Initial Rules */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <h2 className="rf-card-title">2. Full Baseline Rules Text *</h2>
              <p className="rf-card-subtitle">
                Enter the exact initial rules text. Once registered, this text is cryptographically hashed and cannot be deleted or secretly replaced.
              </p>
            </div>
          </div>

          <div className="rf-form-group">
            <textarea
              className="rf-textarea rf-code-editor"
              style={{ minHeight: "180px" }}
              value={initialRules}
              onChange={(e) => setInitialRules(e.target.value)}
              required
            />
          </div>
          <div className="rf-help">
            Notice: Registration time is recorded on-chain, but does not prove the rules were authored before that timestamp.
          </div>
        </div>

        {/* Step 3: Bounded Participant Scenarios */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <h2 className="rf-card-title">3. Bounded Participant Scenarios Probes *</h2>
              <p className="rf-card-subtitle">
                Define concrete test situations (e.g. team size, late submission, repo structure). RuleFreeze will test every future amendment against these exact cases.
              </p>
            </div>
            <button
              type="button"
              className="rf-btn rf-btn-secondary rf-btn-sm"
              onClick={addScenario}
            >
              + Add Scenario
            </button>
          </div>

          {scenarios.map((sc, idx) => (
            <div key={sc.id || idx} className="rf-scenario-card">
              <div className="rf-scenario-header">
                <span className="rf-badge rf-badge-neutral rf-mono">{sc.id}</span>
                <button
                  type="button"
                  className="rf-btn rf-btn-danger rf-btn-sm"
                  onClick={() => removeScenario(idx)}
                  title="Remove scenario"
                >
                  Remove
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "10px" }}>
                <div>
                  <label className="rf-label" style={{ fontSize: "0.8rem" }}>Scenario Title</label>
                  <input
                    type="text"
                    className="rf-input"
                    value={sc.title}
                    onChange={(e) => updateScenario(idx, { title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="rf-label" style={{ fontSize: "0.8rem" }}>Dimension</label>
                  <select
                    className="rf-select"
                    value={sc.dimension}
                    onChange={(e) => updateScenario(idx, { dimension: e.target.value as RuleDimension })}
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

              <div style={{ marginBottom: "10px" }}>
                <label className="rf-label" style={{ fontSize: "0.8rem" }}>Situation / Participant Facts</label>
                <input
                  type="text"
                  className="rf-input"
                  value={sc.situation}
                  onChange={(e) => updateScenario(idx, { situation: e.target.value })}
                  placeholder="e.g. Solo developer submitting a Rust CLI repo on Friday at 20:00 UTC."
                />
              </div>

              <div>
                <label className="rf-label" style={{ fontSize: "0.8rem" }}>Explicit Question to Assess</label>
                <input
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

        {/* Action Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
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
            {submitting ? "Registering on GenLayer..." : "Submit Baseline Registration"}
          </button>
        </div>
      </form>
    </div>
  );
}
