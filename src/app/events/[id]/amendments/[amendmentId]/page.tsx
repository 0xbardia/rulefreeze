"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getPublicConfig } from "@/lib/config";
import {
  executeContractWrite,
  fetchAmendment,
  fetchAssessment,
  fetchEvent,
  fetchRuleVersion,
  getInjectedProvider,
} from "@/lib/contract-adapter";
import {
  mockAssessAmendment,
  mockDecideAmendment,
  mockFetchAmendment,
  mockFetchAssessment,
  mockFetchEvent,
  mockFetchRuleVersion,
} from "@/lib/mock-adapter";
import { DiffViewer } from "@/components/DiffViewer";
import { trackTransaction } from "@/lib/tx-controller";
import {
  AmendmentRecord,
  AssessmentRecord,
  EventRecord,
  OrganizerDecisionType,
  RuleVersion,
} from "@/lib/types";

export default function AmendmentReviewPage({
  params,
}: {
  params: Promise<{ id: string; amendmentId: string }>;
}) {
  const resolvedParams = use(params);
  const { id: eventId, amendmentId } = resolvedParams;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [baseVersion, setBaseVersion] = useState<RuleVersion | null>(null);
  const [amendment, setAmendment] = useState<AmendmentRecord | null>(null);
  const [assessment, setAssessment] = useState<AssessmentRecord | null>(null);

  const [decisionType, setDecisionType] = useState<OrganizerDecisionType>("ACCEPTED_CLARIFICATION");
  const [decisionRationale, setDecisionRationale] = useState("");

  const [isDemo, setIsDemo] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const demo = localStorage.getItem("rf_demo_mode") === "true";
    setIsDemo(demo);

    const cfg = await getPublicConfig();
    setContractAddress(cfg.contractAddress);

    try {
      let ev: EventRecord;
      let am: AmendmentRecord;
      let baseV: RuleVersion;
      let assess: AssessmentRecord | null = null;

      if (demo || !cfg.contractAddress) {
        ev = await mockFetchEvent(eventId);
        am = await mockFetchAmendment(amendmentId);
        baseV = await mockFetchRuleVersion(am.base_version_id);
        if (am.assessment_ids.length > 0) {
          assess = await mockFetchAssessment(am.assessment_ids[am.assessment_ids.length - 1]!);
        }
      } else {
        ev = await fetchEvent(cfg.contractAddress, eventId, cfg.rpcUrl);
        am = await fetchAmendment(cfg.contractAddress, amendmentId, cfg.rpcUrl);
        baseV = await fetchRuleVersion(cfg.contractAddress, am.base_version_id, cfg.rpcUrl);
        if (am.assessment_ids.length > 0) {
          assess = await fetchAssessment(
            cfg.contractAddress,
            am.assessment_ids[am.assessment_ids.length - 1]!,
            cfg.rpcUrl
          );
        }
      }

      setEvent(ev);
      setAmendment(am);
      setBaseVersion(baseV);
      setAssessment(assess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const provider = getInjectedProvider();
    if (provider) {
      provider
        .request({ method: "eth_accounts" })
        .then((accs) => {
          const a = accs as string[];
          if (a && a[0]) setAccount(a[0]);
        })
        .catch(() => {});
    }
  }, [eventId, amendmentId]);

  const copyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRunAssessment = async () => {
    if (!amendment) return;
    setActionPending(true);
    setError(null);

    // Demo Mode path
    if (isDemo || !contractAddress) {
      try {
        await mockAssessAmendment(amendmentId);
        await loadData();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setActionPending(false);
      }
      return;
    }

    // Live On-Chain GenLayer path
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No Web3 wallet detected. Please connect MetaMask or switch to Demo Mode.");
      setActionPending(false);
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
        setError("Wallet connection required to run semantic assessment.");
        setActionPending(false);
        return;
      }
    }

    try {
      const txHash = await executeContractWrite(
        provider,
        contractAddress,
        activeAccount,
        "assess_amendment",
        [amendmentId]
      );

      trackTransaction(
        txHash,
        "assess_amendment",
        `Assessing amendment ${amendmentId}`,
        contractAddress,
        61999,
        activeAccount
      );

      // Reload after brief interval
      setTimeout(loadData, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendment || !event) return;
    setError(null);

    if (decisionType !== "DECLINED" && decisionRationale.trim().length < 15) {
      setError("Decision rationale must be at least 15 characters.");
      return;
    }

    if (decisionType === "ACCEPTED_CLARIFICATION") {
      if (
        assessment &&
        (assessment.overall_classification === "MATERIAL_CHANGE" ||
          assessment.overall_classification === "REVIEW_NEEDED")
      ) {
        setError(
          `Cannot accept as clarification: Assessment found ${assessment.overall_classification}. You must use Acknowledged Material Change or Prospective Revision.`
        );
        return;
      }
    }

    setActionPending(true);

    // Demo Mode path
    if (isDemo || !contractAddress) {
      try {
        await mockDecideAmendment(
          account || event.organizer,
          amendmentId,
          decisionType,
          decisionRationale
        );
        await loadData();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setActionPending(false);
      }
      return;
    }

    // Live On-Chain GenLayer path
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No Web3 wallet detected. Please connect MetaMask.");
      setActionPending(false);
      return;
    }

    let activeAccount = account;
    if (!activeAccount) {
      try {
        const accs = (await provider.request({ method: "eth_requestAccounts" })) as string[];
        if (accs && accs[0]) {
          activeAccount = accs[0];
          setAccount(activeAccount);
        }
      } catch {
        setError("Wallet connection required.");
        setActionPending(false);
        return;
      }
    }

    try {
      const txHash = await executeContractWrite(
        provider,
        contractAddress,
        activeAccount!,
        "decide_amendment",
        [amendmentId, decisionType, decisionRationale]
      );

      trackTransaction(
        txHash,
        "decide_amendment",
        `Deciding amendment ${amendmentId}: ${decisionType}`,
        contractAddress,
        61999,
        activeAccount!
      );

      setTimeout(loadData, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading amendment review desk...</div>;
  }

  if (error && !amendment) {
    return (
      <div className="rf-banner rf-banner-warning">
        <div>Error loading amendment {amendmentId}: {error}</div>
      </div>
    );
  }

  if (!amendment || !event || !baseVersion) return null;

  const isStaleBase = event.active_version_id !== amendment.base_version_id;
  const isOrganizer = account && account.toLowerCase() === event.organizer.toLowerCase();

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Link href={`/events/${event.id}`}>← {event.name}</Link>
            <span className="rf-badge rf-badge-brand rf-mono">{amendment.id}</span>
            <span
              className={`rf-badge ${
                amendment.status === "ACTIVATED"
                  ? "rf-badge-safe"
                  : amendment.status === "DECLINED"
                  ? "rf-badge-danger"
                  : amendment.status === "ASSESSED"
                  ? "rf-badge-warning"
                  : "rf-badge-neutral"
              }`}
            >
              {amendment.status}
            </span>
            <span className="rf-badge rf-badge-neutral">Scope: {amendment.intended_scope}</span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Amendment Review Desk</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "800px", marginTop: "4px" }}>
            {amendment.explanation}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={copyLink} className="rf-btn rf-btn-secondary rf-btn-sm">
            {copied ? "Link Copied!" : "Share Review Desk"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rf-banner rf-banner-warning">
          <div>{error}</div>
        </div>
      )}

      {/* Stale Base Warning */}
      {isStaleBase && (
        <div className="rf-banner rf-banner-warning">
          <div>
            <strong>Stale Base Version Detected:</strong> This amendment was proposed against{" "}
            <code>{amendment.base_version_id}</code>, but the active version is currently{" "}
            <code>{event.active_version_id}</code>. RuleFreeze invariants forbid activating amendments against superseded rule baselines. A new proposal must be filed against the active version.
          </div>
        </div>
      )}

      {/* Organizer Decision Display (if finalized) */}
      {amendment.decision && (
        <div
          className={`rf-banner ${
            amendment.decision.type === "ACCEPTED_CLARIFICATION" || amendment.decision.type === "ACKNOWLEDGED_MATERIAL_CHANGE" || amendment.decision.type === "PROSPECTIVE_REVISION"
              ? "rf-banner-safe"
              : "rf-banner-warning"
          }`}
          style={{ flexDirection: "column", gap: "4px" }}
        >
          <div style={{ fontWeight: 600 }}>
            Organizer Decision: {amendment.decision.type}
          </div>
          <div style={{ fontSize: "0.88rem" }}>
            Rationale: &quot;{amendment.decision.rationale}&quot;
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Decided by: <span className="rf-mono">{amendment.decision.decided_by}</span> on{" "}
            {new Date(amendment.decision.decided_at * 1000).toLocaleString()}
          </div>
        </div>
      )}

      {/* Semantic Assessment Section */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <span className="rf-badge rf-badge-brand" style={{ marginBottom: "6px" }}>
              GenLayer Intelligent Assessment
            </span>
            <h2 className="rf-card-title">Equivalence Consensus & Participant Impact</h2>
          </div>

          {!assessment && amendment.status === "PENDING_ASSESSMENT" && (
            <button
              type="button"
              className="rf-btn rf-btn-primary"
              onClick={handleRunAssessment}
              disabled={actionPending}
            >
              {actionPending ? "Executing Semantic Consensus..." : "Run Intelligent Assessment"}
            </button>
          )}
        </div>

        {assessment ? (
          <div>
            {/* Verdict Box */}
            <div
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Overall Semantic Verdict
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      className={`rf-badge ${
                        assessment.overall_classification === "NO_MATERIAL_CHANGE"
                          ? "rf-badge-safe"
                          : assessment.overall_classification === "MATERIAL_CHANGE"
                          ? "rf-badge-danger"
                          : "rf-badge-warning"
                      }`}
                      style={{ fontSize: "0.95rem", padding: "6px 12px" }}
                    >
                      {assessment.overall_classification}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Affected Dimensions
                  </span>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                    {assessment.changed_dimensions.length === 0 ? (
                      <span className="rf-badge rf-badge-safe">None (Harmless)</span>
                    ) : (
                      assessment.changed_dimensions.map((dim) => (
                        <span key={dim} className="rf-badge rf-badge-warning">
                          {dim}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Citation Grounding
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`rf-badge ${assessment.grounding_verified ? "rf-badge-safe" : "rf-badge-danger"}`}>
                      {assessment.grounding_verified ? "Quotes Grounded in Rules" : "Quotation Verification Failed"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Consensus Reasoning:</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {assessment.reasoning}
                </div>
                {assessment.uncertainty && (
                  <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "var(--color-warning)" }}>
                    <strong>Uncertainty / Missing Facts:</strong> {assessment.uncertainty}
                  </div>
                )}
              </div>
            </div>

            {/* Scenario Comparisons */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "12px" }}>
              Participant Scenario Probes ({assessment.scenarios.length})
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Comparing how the exact same participant situation evaluates under registered Base Rules vs Proposed Amendment.
            </p>

            <div style={{ display: "grid", gap: "12px" }}>
              {assessment.scenarios.map((sc) => {
                const baseSc = baseVersion.scenarios.find((s) => s.id === sc.scenario_id);
                return (
                  <div key={sc.scenario_id} className="rf-scenario-card">
                    <div className="rf-scenario-header">
                      <div>
                        <strong>{baseSc?.title || sc.scenario_id}</strong>
                        {baseSc?.dimension && (
                          <span className="rf-badge rf-badge-neutral" style={{ marginLeft: "8px" }}>
                            {baseSc.dimension}
                          </span>
                        )}
                      </div>
                      <span className={`rf-badge ${sc.outcome_changed ? "rf-badge-danger" : "rf-badge-safe"}`}>
                        {sc.outcome_changed ? "Outcome Changed" : "Outcome Unchanged"}
                      </span>
                    </div>

                    {baseSc?.situation && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                        <strong>Situation:</strong> {baseSc.situation}
                      </div>
                    )}
                    {baseSc?.question && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                        <strong>Question:</strong> {baseSc.question}
                      </div>
                    )}

                    <div className="rf-scenario-outcomes">
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          Under Base Rules
                        </div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>
                          {sc.old_outcome}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          Under Proposed Amendment
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: sc.outcome_changed ? "var(--color-warning)" : "var(--text-primary)",
                            marginTop: "2px",
                          }}
                        >
                          {sc.new_outcome}
                        </div>
                      </div>
                    </div>

                    {sc.explanation && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                        {sc.explanation}
                      </div>
                    )}

                    {sc.rule_references && sc.rule_references.length > 0 && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          Grounded Rule Excerpts:
                        </div>
                        {sc.rule_references.map((quote, qidx) => (
                          <div key={qidx} className="rf-quote-box">
                            &quot;{quote}&quot;
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", padding: "16px 0", fontSize: "0.9rem" }}>
            This amendment is awaiting intelligent evaluation on GenLayer Studionet. Click &quot;Run Intelligent Assessment&quot; to execute comparative consensus across participant scenarios.
          </div>
        )}
      </div>

      {/* Textual Diff */}
      <div className="rf-card">
        <h2 className="rf-card-title" style={{ marginBottom: "16px" }}>Textual Comparison</h2>
        <DiffViewer
          oldText={baseVersion.rule_text}
          newText={amendment.proposed_rules}
          oldTitle={`Active Base (${baseVersion.id})`}
          newTitle={`Proposed Amendment (${amendment.id})`}
        />
      </div>

      {/* Organizer Decision Panel */}
      {amendment.status === "ASSESSED" && !amendment.decision && !isStaleBase && (
        <div className="rf-card">
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-brand" style={{ marginBottom: "6px" }}>
                Organizer Action Required
              </span>
              <h2 className="rf-card-title">Record Decision & Activate Rules</h2>
              <p className="rf-card-subtitle">
                The organizer must explicitly choose an action. Material changes require public acknowledgement.
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordDecision}>
            <div className="rf-form-group">
              <label className="rf-label">Select Permitted Action *</label>
              <div style={{ display: "grid", gap: "10px", marginTop: "8px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="decision"
                    value="ACCEPTED_CLARIFICATION"
                    checked={decisionType === "ACCEPTED_CLARIFICATION"}
                    onChange={() => setDecisionType("ACCEPTED_CLARIFICATION")}
                    disabled={
                      assessment?.overall_classification === "MATERIAL_CHANGE" ||
                      assessment?.overall_classification === "REVIEW_NEEDED"
                    }
                  />
                  <div>
                    <strong>Accept as Clarification (No Material Change)</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Permitted ONLY if intelligent assessment returned NO_MATERIAL_CHANGE.
                      {(assessment?.overall_classification === "MATERIAL_CHANGE" ||
                        assessment?.overall_classification === "REVIEW_NEEDED") && (
                        <span style={{ color: "var(--color-danger)", display: "block" }}>
                          (Disabled: Assessment found {assessment?.overall_classification})
                        </span>
                      )}
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="decision"
                    value="ACKNOWLEDGED_MATERIAL_CHANGE"
                    checked={decisionType === "ACKNOWLEDGED_MATERIAL_CHANGE"}
                    onChange={() => setDecisionType("ACKNOWLEDGED_MATERIAL_CHANGE")}
                  />
                  <div>
                    <strong>Activate with Acknowledged Material Change</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Explicitly acknowledges that participant criteria or rights have been modified.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="decision"
                    value="PROSPECTIVE_REVISION"
                    checked={decisionType === "PROSPECTIVE_REVISION"}
                    onChange={() => setDecisionType("PROSPECTIVE_REVISION")}
                  />
                  <div>
                    <strong>Activate as Prospective Revision (Future Submissions Only)</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Grandfathers existing participants; applies strictly to future submissions.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="decision"
                    value="DECLINED"
                    checked={decisionType === "DECLINED"}
                    onChange={() => setDecisionType("DECLINED")}
                  />
                  <div>
                    <strong>Decline Amendment</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Rejects amendment; current active rules remain untouched.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="rf-form-group">
              <label className="rf-label">Public Decision Rationale (Minimum 15 characters) *</label>
              <textarea
                className="rf-textarea"
                style={{ minHeight: "80px" }}
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Explain why this decision is being made and address any participant impacts identified..."
                required
              />
            </div>

            <button
              type="submit"
              className="rf-btn rf-btn-primary"
              disabled={actionPending}
            >
              {actionPending ? "Executing On-Chain Transaction..." : "Submit Decision Transaction"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
