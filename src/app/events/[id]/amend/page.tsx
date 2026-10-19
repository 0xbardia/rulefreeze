"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicConfig } from "@/lib/config";
import { executeContractWrite, fetchEvent, fetchRuleVersion, getInjectedProvider } from "@/lib/contract-adapter";
import { mockFetchEvent, mockFetchRuleVersion, mockProposeAmendment } from "@/lib/mock-adapter";
import { DiffViewer } from "@/components/DiffViewer";
import { saveAmendmentDraft, getAmendmentDraft, deleteAmendmentDraft } from "@/lib/idb";
import { trackTransaction } from "@/lib/tx-controller";
import { EventRecord, IntendedScope, RuleVersion } from "@/lib/types";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const demo = localStorage.getItem("rf_demo_mode") === "true";
    setIsDemo(demo);

    getPublicConfig().then(async (cfg) => {
      setContractAddress(cfg.contractAddress);
      try {
        let ev: EventRecord;
        let ver: RuleVersion;
        if (demo || !cfg.contractAddress || eventId.startsWith("demo-")) {
          ev = await mockFetchEvent(eventId);
          ver = await mockFetchRuleVersion(ev.active_version_id);
        } else {
          ev = await fetchEvent(cfg.contractAddress, eventId, cfg.rpcUrl);
          ver = await fetchRuleVersion(cfg.contractAddress, ev.active_version_id, cfg.rpcUrl);
        }
        setEvent(ev);
        setActiveVersion(ver);
        setProposedRules(ver.rule_text);

        // Check if there's a draft in IndexedDB
        const draft = await getAmendmentDraft(`amend_draft_${eventId}`);
        if (draft) {
          if (draft.proposed_rules) setProposedRules(draft.proposed_rules);
          if (draft.explanation) setExplanation(draft.explanation);
          if (draft.intended_scope) setIntendedScope(draft.intended_scope);
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
        updatedAt: Date.now(),
      });
      alert("Amendment draft saved locally in IndexedDB.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proposedRules.trim()) {
      setError("Proposed rules text is required.");
      return;
    }
    if (!explanation.trim()) {
      setError("Explanation for this amendment is required.");
      return;
    }
    if (activeVersion && proposedRules.trim() === activeVersion.rule_text.trim()) {
      setError("Proposed rules must differ from the registered base rules.");
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
        setError("Wallet connection required to propose amendment on-chain.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const txHash = await executeContractWrite(
        provider,
        contractAddress,
        activeAccount,
        "propose_amendment",
        [eventId, activeVersion?.id || "", proposedRules, explanation, intendedScope]
      );

      trackTransaction(
        txHash,
        "propose_amendment",
        `Proposing amendment for ${event?.name || eventId}`,
        contractAddress,
        61999,
        activeAccount
      );

      await deleteAmendmentDraft(`amend_draft_${eventId}`);
      router.push(`/events/${eventId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading active rules for {eventId}...</div>;
  }

  if (error && !event) {
    return (
      <div className="rf-banner rf-banner-warning">
        <div>Error loading event: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Propose Rule Amendment</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Event: <strong>{event?.name}</strong> • Base Active Version: <span className="rf-mono">{activeVersion?.id}</span>
        </p>
      </div>

      {error && (
        <div className="rf-banner rf-banner-warning">
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Intended Scope */}
        <div className="rf-card">
          <h2 className="rf-card-title" style={{ marginBottom: "8px" }}>Declared Intended Applicability Scope *</h2>
          <p className="rf-card-subtitle" style={{ marginBottom: "12px" }}>
            State whether this amendment applies retroactively to existing participants or prospective future submissions only.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="scope"
                value="CURRENT_PARTICIPANTS"
                checked={intendedScope === "CURRENT_PARTICIPANTS"}
                onChange={() => setIntendedScope("CURRENT_PARTICIPANTS")}
              />
              <span>Current & Existing Participants (Immediate / Retroactive Effect)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="scope"
                value="FUTURE_ONLY"
                checked={intendedScope === "FUTURE_ONLY"}
                onChange={() => setIntendedScope("FUTURE_ONLY")}
              />
              <span>Future Submissions Only (Prospective)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="scope"
                value="UNSPECIFIED"
                checked={intendedScope === "UNSPECIFIED"}
                onChange={() => setIntendedScope("UNSPECIFIED")}
              />
              <span>Unspecified</span>
            </label>
          </div>
        </div>

        {/* Explanation */}
        <div className="rf-card">
          <h2 className="rf-card-title" style={{ marginBottom: "8px" }}>Organizer Amendment Explanation *</h2>
          <p className="rf-card-subtitle" style={{ marginBottom: "12px" }}>
            Explain why this rule change or clarification is being proposed.
          </p>
          <textarea
            className="rf-textarea"
            style={{ minHeight: "80px" }}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="e.g. Adding explicit timezone to Friday deadline to prevent submission confusion."
            required
          />
        </div>

        {/* Proposed Full Rules Text */}
        <div className="rf-card">
          <h2 className="rf-card-title" style={{ marginBottom: "8px" }}>Amended Full Rules Text *</h2>
          <p className="rf-card-subtitle" style={{ marginBottom: "12px" }}>
            Edit the complete rule text. Do not provide a partial patch; RuleFreeze stores the full canonical text for each version.
          </p>
          <textarea
            className="rf-textarea rf-code-editor"
            style={{ minHeight: "220px" }}
            value={proposedRules}
            onChange={(e) => setProposedRules(e.target.value)}
            required
          />
        </div>

        {/* Textual Diff Preview */}
        {activeVersion && (
          <div className="rf-card">
            <h2 className="rf-card-title" style={{ marginBottom: "12px" }}>Textual Changes Preview</h2>
            <DiffViewer
              oldText={activeVersion.rule_text}
              newText={proposedRules}
              oldTitle={`Base: ${activeVersion.id}`}
              newTitle="Proposed Changes"
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
