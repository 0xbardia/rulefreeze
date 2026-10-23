"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPublicConfig } from "@/lib/config";
import { executeContractWrite, fetchEvent, fetchRuleVersion, getInjectedProvider } from "@/lib/contract-adapter";
import { mockFetchEvent, mockFetchRuleVersion, mockProposeAmendment } from "@/lib/mock-adapter";
import { DiffViewer } from "@/components/DiffViewer";
import { saveAmendmentDraft, getAmendmentDraft, deleteAmendmentDraft, getTxRecord, recordMatchesContract } from "@/lib/idb";
import { isDemoEventId, isLiveEventId } from "@/lib/id-routing";
import { trackTransaction, subscribeTxUpdates } from "@/lib/tx-controller";
import { reconcileAmendmentProposal } from "@/lib/reconciliation";
import { AmendmentDraft, EventRecord, IntendedScope, RuleVersion } from "@/lib/types";

export default function ProposeAmendmentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [activeVersion, setActiveVersion] = useState<RuleVersion | null>(null);
  const [proposedRules, setProposedRules] = useState("");
  const [explanation, setExplanation] = useState("");
  const [intendedScope, setIntendedScope] = useState<IntendedScope>("CURRENT_PARTICIPANTS");

  const [isDemo, setIsDemo] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [provisionalNotice, setProvisionalNotice] = useState<string | null>(null);
  const [draftSavedNotice, setDraftSavedNotice] = useState(false);

  useEffect(() => {
    const demo = localStorage.getItem("rf_demo_mode") === "true";
    setIsDemo(demo);

    getPublicConfig().then(async (cfg) => {
      setContractAddress(cfg.contractAddress);
      try {
        let ev: EventRecord;
        let ver: RuleVersion;
        if (isDemoEventId(eventId)) {
          setIsDemo(true);
          ev = await mockFetchEvent(eventId);
          ver = await mockFetchRuleVersion(ev.active_version_id);
        } else if (isLiveEventId(eventId)) {
          if (demo) {
            throw new Error(`Event "${eventId}" is a live on-chain ID, but Demo Mode is active. Switch off Demo Mode in the header.`);
          }
          if (!cfg.contractAddress) {
            throw new Error("Contract address is not configured. Cannot propose amendment for live event.");
          }
          setIsDemo(false);
          ev = await fetchEvent(cfg.contractAddress, eventId, cfg.rpcUrl);
          ver = await fetchRuleVersion(cfg.contractAddress, ev.active_version_id, cfg.rpcUrl);
        } else {
          throw new Error(`Invalid event ID format "${eventId}". Expected "ev-<number>" or "demo-ev-<number>".`);
        }
        setEvent(ev);
        setActiveVersion(ver);
        setProposedRules(ver.rule_text);

        // Check if there's a draft in IndexedDB
        const draft = await getAmendmentDraft(`amend_draft_${eventId}`);
        if (draft && recordMatchesContract(draft, cfg.contractAddress)) {
          if (draft.proposed_rules) setProposedRules(draft.proposed_rules);
          if (draft.explanation) setExplanation(draft.explanation);
          if (draft.intended_scope) setIntendedScope(draft.intended_scope);

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
                  "propose_amendment",
                  `Proposing amendment for ${ev.name}`,
                  cfg.contractAddress,
                  61999,
                  draft.account,
                  eventId
                ).catch(() => {});
              }
            }
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    });

    const provider = getInjectedProvider();
    if (provider) {
      provider.request({ method: "eth_accounts" }).then((accs) => {
        const a = accs as string[];
        if (a && a[0]) setAccount(a[0]);
      }).catch(() => {});
    }
  }, [eventId]);

  const saveDraftLocally = async () => {
    if (!event || !activeVersion) return;
    try {
      await saveAmendmentDraft({
        id: `amend_draft_${eventId}`,
        event_id: eventId,
        base_version_id: activeVersion.id,
        proposed_rules: proposedRules,
        explanation,
        intended_scope: intendedScope,
        account: account || "anonymous",
        contractAddress: contractAddress || undefined,
        updatedAt: Date.now(),
      });
      setDraftSavedNotice(true);
      setTimeout(() => setDraftSavedNotice(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for unresolved in-flight transaction on this draft before emitting write
    const existingDraft = await getAmendmentDraft(`amend_draft_${eventId}`).catch(() => null);
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
        if (contractAddress) {
          trackTransaction(
            existingTx.txHash,
            "propose_amendment",
            `Proposing amendment for ${event?.name || eventId}`,
            contractAddress,
            61999,
            account || existingTx.account,
            eventId
          ).catch(() => {});
        }
        return;
      }
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setProvisionalNotice(null);

    if (!proposedRules.trim()) {
      setError("Proposed rules text is required.");
      submittingRef.current = false;
      return;
    }
    if (!explanation.trim()) {
      setError("Explanation for this amendment is required.");
      submittingRef.current = false;
      return;
    }
    if (activeVersion && proposedRules.trim() === activeVersion.rule_text.trim()) {
      setError("Proposed rules must differ from the registered base rules.");
      submittingRef.current = false;
      return;
    }

    setSubmitting(true);

    // Demo Mode path
    if (isDemo || !contractAddress) {
      try {
        const dummyAccount = account || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
        const newAmendId = await mockProposeAmendment(
          dummyAccount,
          eventId,
          activeVersion?.id || "demo-ver-1",
          proposedRules,
          explanation,
          intendedScope
        );
        await deleteAmendmentDraft(`amend_draft_${eventId}`);
        router.push(`/events/${eventId}/amendments/${newAmendId}`);
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
        setError("Wallet connection required to propose amendment on-chain.");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
    }

    const draftPayload: AmendmentDraft = {
      id: `amend_draft_${eventId}`,
      event_id: eventId,
      base_version_id: activeVersion?.id || "",
      proposed_rules: proposedRules,
      explanation,
      intended_scope: intendedScope,
      account: activeAccount,
      contractAddress,
      updatedAt: Date.now(),
    };

    try {
      const txHash = await executeContractWrite(
        provider,
        contractAddress,
        activeAccount,
        "propose_amendment",
        [eventId, activeVersion?.id || "", proposedRules, explanation, intendedScope]
      );

      // Record pending transaction on draft immediately
      draftPayload.pendingTxHash = txHash;
      await saveAmendmentDraft(draftPayload);

      // Listen for provisional consensus transition immediately
      const unsub = subscribeTxUpdates((rec) => {
        if (rec.txHash === txHash && rec.status === "ACCEPTED") {
          setProvisionalNotice(
            `Transaction accepted by validators on consensus. Awaiting finality before draft cleanup (protocol: ${rec.protocolStatus || "ACCEPTED"}, consensus: ${rec.consensusResult || "MAJORITY_AGREE"}, execution: ${rec.executionResult || "SUCCESS"}).`
          );
        }
      });

      let txRecord: any;
      try {
        txRecord = await trackTransaction(
          txHash,
          "propose_amendment",
          `Proposing amendment for ${event?.name || eventId}`,
          contractAddress,
          61999,
          activeAccount,
          eventId
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
      const reconciliation = await reconcileAmendmentProposal(
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
      await deleteAmendmentDraft(`amend_draft_${eventId}`);
      router.push(`/events/${eventId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "56px 20px", textAlign: "center", color: "var(--rf-ink-muted)" }}>
        Loading active rules for {eventId}...
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="rf-banner rf-banner-warning">
        <div style={{ flex: 1 }}>Error loading event: {error}</div>
        <Link href={`/events/${eventId}`} className="rf-btn rf-btn-secondary rf-btn-sm">
          Return to Event
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "920px", margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
        <Link href="/events" style={{ color: "var(--rf-ink-muted)" }}>
          Registry
        </Link>
        <span style={{ color: "var(--rf-ink-subtle)" }}>/</span>
        <Link href={`/events/${eventId}`} style={{ color: "var(--rf-ink-muted)" }}>
          {event?.name || eventId}
        </Link>
        <span style={{ color: "var(--rf-ink-subtle)" }}>/</span>
        <span style={{ color: "var(--rf-ink-secondary)" }}>Propose Amendment</span>
      </div>

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
          Rule Revision Proposal
        </span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Propose Rule Amendment
        </h1>
        <p style={{ color: "var(--rf-ink-secondary)", fontSize: "0.95rem", marginTop: "4px" }}>
          Event: <strong>{event?.name}</strong> • Base Active Version:{" "}
          <span className="rf-badge rf-badge-brand rf-mono">{activeVersion?.id}</span>
        </p>
      </div>

      {draftSavedNotice && (
        <div className="rf-banner rf-banner-safe" style={{ padding: "10px 14px", fontSize: "0.85rem" }}>
          Amendment draft saved locally in browser IndexedDB.
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

      <form onSubmit={handleSubmit}>
        {/* Intended Applicability Scope */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SECTION 1
              </span>
              <h2 className="rf-card-title">Declared Applicability Scope *</h2>
              <p className="rf-card-subtitle">
                Explicitly declare whether this revision alters criteria for existing competitors or applies only prospectively.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "var(--rf-radius-md)",
                border: "1px solid",
                borderColor:
                  intendedScope === "CURRENT_PARTICIPANTS"
                    ? "var(--rf-accent)"
                    : "var(--rf-border-default)",
                background:
                  intendedScope === "CURRENT_PARTICIPANTS"
                    ? "var(--rf-brand-subtle)"
                    : "var(--rf-surface)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="scope"
                value="CURRENT_PARTICIPANTS"
                checked={intendedScope === "CURRENT_PARTICIPANTS"}
                onChange={() => setIntendedScope("CURRENT_PARTICIPANTS")}
                style={{ marginTop: "3px" }}
              />
              <div>
                <strong style={{ color: "var(--rf-ink-primary)", fontSize: "0.92rem" }}>
                  Current & Existing Participants (Immediate / Retroactive Effect)
                </strong>
                <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                  Applies directly to all current submissions. Any outcome shift will be evaluated across registered participant probes.
                </div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "var(--rf-radius-md)",
                border: "1px solid",
                borderColor:
                  intendedScope === "FUTURE_ONLY"
                    ? "var(--rf-accent)"
                    : "var(--rf-border-default)",
                background:
                  intendedScope === "FUTURE_ONLY"
                    ? "var(--rf-brand-subtle)"
                    : "var(--rf-surface)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="scope"
                value="FUTURE_ONLY"
                checked={intendedScope === "FUTURE_ONLY"}
                onChange={() => setIntendedScope("FUTURE_ONLY")}
                style={{ marginTop: "3px" }}
              />
              <div>
                <strong style={{ color: "var(--rf-ink-primary)", fontSize: "0.92rem" }}>
                  Future Submissions Only (Prospective)
                </strong>
                <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                  Grandfathers existing participants; applies strictly to submissions made after this activation.
                </div>
              </div>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "var(--rf-radius-md)",
                border: "1px solid",
                borderColor:
                  intendedScope === "UNSPECIFIED"
                    ? "var(--rf-accent)"
                    : "var(--rf-border-default)",
                background:
                  intendedScope === "UNSPECIFIED"
                    ? "var(--rf-brand-subtle)"
                    : "var(--rf-surface)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="scope"
                value="UNSPECIFIED"
                checked={intendedScope === "UNSPECIFIED"}
                onChange={() => setIntendedScope("UNSPECIFIED")}
                style={{ marginTop: "3px" }}
              />
              <div>
                <strong style={{ color: "var(--rf-ink-primary)", fontSize: "0.92rem" }}>
                  Unspecified Applicability
                </strong>
                <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                  Scope is not formally restricted. Validators will evaluate impact across all participant probes.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Organizer Explanation */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SECTION 2
              </span>
              <h2 className="rf-card-title">Organizer Explanation & Context *</h2>
              <p className="rf-card-subtitle">
                State why this change is being made and what problem it resolves.
              </p>
            </div>
          </div>

          <div className="rf-form-group">
            <label className="sr-only" htmlFor="amend-explanation">Organizer Amendment Explanation</label>
            <textarea
              id="amend-explanation"
              className="rf-textarea"
              style={{ minHeight: "90px" }}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="e.g. Adding explicit timezone to Friday deadline to prevent submission confusion."
              required
            />
          </div>
        </div>

        {/* Proposed Full Rules Text */}
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-neutral rf-mono" style={{ marginBottom: "6px" }}>
                SECTION 3
              </span>
              <h2 className="rf-card-title">Amended Full Rules Text *</h2>
              <p className="rf-card-subtitle">
                Provide the complete revised rule text. RuleFreeze maintains the complete canonical text for every version.
              </p>
            </div>
            <span className="rf-badge rf-badge-neutral rf-mono" style={{ fontSize: "0.72rem" }}>
              {proposedRules.length} chars
            </span>
          </div>

          <div className="rf-form-group">
            <label className="sr-only" htmlFor="amend-proposed-rules">Amended Full Rules Text</label>
            <textarea
              id="amend-proposed-rules"
              className="rf-textarea rf-code-editor"
              style={{ minHeight: "240px", fontSize: "0.9rem" }}
              value={proposedRules}
              onChange={(e) => setProposedRules(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Textual Changes Diff Preview */}
        {activeVersion && (
          <div className="rf-card">
            <div className="rf-card-header">
              <div>
                <h2 className="rf-card-title">Textual Changes Preview</h2>
                <p className="rf-card-subtitle">
                  Syntactic line comparison between active base and proposed revision.
                </p>
              </div>
            </div>

            <DiffViewer
              oldText={activeVersion.rule_text}
              newText={proposedRules}
              oldTitle={`Active Base (${activeVersion.id})`}
              newTitle="Proposed Revision"
            />
          </div>
        )}

        {/* Form Actions */}
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
            {submitting ? "Submitting Proposal..." : "Submit Amendment Proposal"}
          </button>
        </div>
      </form>
    </div>
  );
}
