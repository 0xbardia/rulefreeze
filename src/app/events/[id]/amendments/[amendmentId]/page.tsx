"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { canSubmitDecision, viewAssessment } from "@/lib/assessment-status";
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
import { isDemoEventId, isLiveEventId, isDemoAmendmentId, isLiveAmendmentId } from "@/lib/id-routing";
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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

      if (isDemoEventId(eventId) && isDemoAmendmentId(amendmentId)) {
        setIsDemo(true);
        ev = await mockFetchEvent(eventId);
        am = await mockFetchAmendment(amendmentId);
        baseV = await mockFetchRuleVersion(am.base_version_id);
        if (am.assessment_ids.length > 0) {
          assess = await mockFetchAssessment(am.assessment_ids[am.assessment_ids.length - 1]!);
        }
      } else if (isLiveEventId(eventId) && isLiveAmendmentId(amendmentId)) {
        if (demo) {
          throw new Error(
            `Event "${eventId}" and amendment "${amendmentId}" are live on-chain records, but Demo Mode is active. Switch off Demo Mode in the header.`
          );
        }
        if (!cfg.contractAddress) {
          throw new Error(
            "Contract address is not configured. Cannot review live on-chain amendment."
          );
        }
        setIsDemo(false);
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
      } else {
        throw new Error(
          `Invalid route IDs: event "${eventId}" or amendment "${amendmentId}". Expected live IDs ("ev-<number>", "amend-<number>") or demo IDs ("demo-ev-<number>", "demo-amend-<number>").`
        );
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

      const txRecord = await trackTransaction(
        txHash,
        "assess_amendment",
        `Assessing amendment ${amendmentId}`,
        contractAddress,
        61999,
        activeAccount
      );

      if (txRecord.status !== "FINALIZED" && txRecord.status !== "ACCEPTED") {
        setError(`Transaction not finalized (${txRecord.status}).`);
        return;
      }

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

    if (assessment && !canSubmitDecision(assessment, decisionType)) {
      const view = viewAssessment(assessment);
      setError(
        view.kind === "processing"
          ? `Cannot activate from an assessment processing failure (${view.stage}).`
          : view.kind === "grounding"
          ? "Cannot activate an assessment whose quotations are not grounded in the rule text."
          : `Cannot use ${decisionType} for classification ${view.classification}.`
      );
      return;
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

      const txRecord = await trackTransaction(
        txHash,
        "decide_amendment",
        `Deciding amendment ${amendmentId}: ${decisionType}`,
        contractAddress,
        61999,
        activeAccount!
      );

      if (txRecord.status !== "FINALIZED" && txRecord.status !== "ACCEPTED") {
        setError(`Transaction not finalized (${txRecord.status}).`);
        return;
      }

      setTimeout(loadData, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "56px 20px", textAlign: "center", color: "var(--rf-ink-muted)" }}>
        Loading amendment review desk...
      </div>
    );
  }

  if (error && !amendment) {
    return (
      <div className="rf-banner rf-banner-warning">
        <div style={{ flex: 1 }}>Error loading amendment {amendmentId}: {error}</div>
        <Link href={`/events/${eventId}`} className="rf-btn rf-btn-secondary rf-btn-sm">
          Return to Event
        </Link>
      </div>
    );
  }

  if (!amendment || !event || !baseVersion) return null;

  const isStaleBase = event.active_version_id !== amendment.base_version_id;
  const assessmentView = assessment ? viewAssessment(assessment) : null;

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
        <Link href="/events" style={{ color: "var(--rf-ink-muted)" }}>
          Registry
        </Link>
        <span style={{ color: "var(--rf-ink-subtle)" }}>/</span>
        <Link href={`/events/${event.id}`} style={{ color: "var(--rf-ink-muted)" }}>
          {event.name}
        </Link>
        <span style={{ color: "var(--rf-ink-subtle)" }}>/</span>
        <span className="rf-mono" style={{ color: "var(--rf-ink-secondary)" }}>
          {amendment.id}
        </span>
      </div>

      {/* Header Desk Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--rf-border-subtle)",
          paddingBottom: "20px",
        }}
      >
        <div style={{ flex: "1 1 480px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
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
            <span className="rf-badge rf-badge-neutral rf-mono">Base: {amendment.base_version_id}</span>
          </div>

          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
            Amendment Review Desk
          </h1>

          <p style={{ color: "var(--rf-ink-secondary)", fontSize: "0.98rem", marginTop: "6px", lineHeight: 1.55 }}>
            {amendment.explanation}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button type="button" onClick={copyLink} className="rf-btn rf-btn-secondary rf-btn-sm">
            {copied ? "Link Copied!" : "Share Review Desk"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rf-banner rf-banner-warning">
          <div style={{ flex: 1 }}>{error}</div>
        </div>
      )}

      {/* Stale Base Warning */}
      {isStaleBase && !amendment.decision && (
        <div className="rf-banner rf-banner-warning">
          <div>
            <strong>Stale Base Version Detected:</strong> This amendment was proposed against{" "}
            <code>{amendment.base_version_id}</code>, but the active version is currently{" "}
            <code>{event.active_version_id}</code>. RuleFreeze invariants forbid activating amendments against superseded rule baselines. A new proposal must be filed against the active version.
          </div>
        </div>
      )}

      {/* Finalized Decision Banner */}
      {amendment.decision && (
        <div
          className={`rf-banner ${
            amendment.decision.type === "ACCEPTED_CLARIFICATION" ||
            amendment.decision.type === "ACKNOWLEDGED_MATERIAL_CHANGE" ||
            amendment.decision.type === "PROSPECTIVE_REVISION"
              ? "rf-banner-safe"
              : "rf-banner-warning"
          }`}
          style={{ flexDirection: "column", gap: "6px", marginBottom: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="rf-badge rf-badge-safe" style={{ fontSize: "0.75rem" }}>
              FINALIZED ON-CHAIN
            </span>
            <strong style={{ fontSize: "0.95rem" }}>
              Organizer Decision: {amendment.decision.type}
            </strong>
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--rf-ink-primary)" }}>
            Rationale: &quot;{amendment.decision.rationale}&quot;
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
            Decided by <span className="rf-mono">{amendment.decision.decided_by}</span> on{" "}
            {new Date(amendment.decision.decided_at * 1000).toLocaleString()}
          </div>
        </div>
      )}

      {/* 1. Intelligent Assessment Results Card */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <span className="rf-badge rf-badge-brand" style={{ marginBottom: "6px" }}>
              GenLayer Equivalence Consensus
            </span>
            <h2 className="rf-card-title">1. Semantic Assessment Verdict</h2>
            <p className="rf-card-subtitle">
              Intelligent contract consensus testing whether rule revisions alter participant outcomes.
            </p>
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
            {/* Distinguish Processing Failure vs Grounding Failure vs Semantic Verdict */}
            {assessmentView?.kind === "processing" && (
              <div
                className="rf-card"
                style={{
                  borderColor: "var(--rf-danger-solid)",
                  backgroundColor: "var(--rf-danger-bg)",
                  color: "var(--rf-danger-text)",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="rf-badge rf-badge-danger">PROCESSING FAILURE</span>
                  <strong>Assessment Execution Aborted</strong>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--rf-danger-text)" }}>
                  This is NOT a completed semantic review. Stage: {assessmentView.stage}. {assessmentView.detail}
                </p>
              </div>
            )}

            {assessmentView?.kind === "grounding" && (
              <div
                className="rf-card"
                style={{
                  borderColor: "var(--rf-warning-solid)",
                  backgroundColor: "var(--rf-warning-bg)",
                  color: "var(--rf-warning-text)",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="rf-badge rf-badge-warning">GROUNDING FAILURE</span>
                  <strong>Quotation Verification Did Not Match Rules</strong>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--rf-warning-text)" }}>
                  The model produced outputs, but the cited quotes were not found verbatim in the registered rule text.
                </p>
              </div>
            )}

            {/* Overall Verdict Banner */}
            <div
              style={{
                background: "var(--rf-surface-subtle)",
                border: "1px solid var(--rf-border-default)",
                borderRadius: "var(--rf-radius-md)",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--rf-ink-muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Authoritative Classification
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
                      style={{ fontSize: "1rem", padding: "6px 14px", fontWeight: 700 }}
                    >
                      {assessment.overall_classification ||
                        (assessmentView?.kind === "processing"
                          ? "PROCESSING_FAILURE"
                          : "UNGROUNDED")}
                    </span>
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--rf-ink-muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Affected Dimensions
                  </span>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                    {assessment.changed_dimensions.length === 0 ? (
                      <span className="rf-badge rf-badge-safe">None (No Substantive Shift)</span>
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
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--rf-ink-muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    Citation Grounding
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      className={`rf-badge ${
                        assessment.grounding_verified ? "rf-badge-safe" : "rf-badge-danger"
                      }`}
                    >
                      {assessment.grounding_verified
                        ? "Quotes Grounded in Rules"
                        : "Quotation Verification Failed"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid var(--rf-border-subtle)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--rf-ink-primary)" }}>
                  Consensus Reasoning:
                </div>
                <div
                  style={{
                    fontSize: "0.92rem",
                    color: "var(--rf-ink-secondary)",
                    marginTop: "4px",
                    lineHeight: 1.55,
                  }}
                >
                  {assessment.reasoning}
                </div>
                {assessment.uncertainty && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: "var(--rf-warning-bg)",
                      border: "1px solid var(--rf-warning-border)",
                      borderRadius: "var(--rf-radius-sm)",
                      fontSize: "0.84rem",
                      color: "var(--rf-warning-text)",
                    }}
                  >
                    <strong>Uncertainty / Missing Facts:</strong> {assessment.uncertainty}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Participant Scenario Probes Comparison */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                  Participant Scenario Probes ({assessment.scenarios.length})
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)" }}>
                  Testing identical participant facts against base vs proposed rules
                </span>
              </div>

              {assessment.scenarios.length === 0 && (
                <p style={{ color: "var(--rf-danger-text)", fontSize: "0.9rem" }}>
                  No scenario outcomes were produced. Missing outcomes are not a successful comparison.
                </p>
              )}

              <div style={{ display: "grid", gap: "14px" }}>
                {assessment.scenarios.map((sc) => {
                  const baseSc = baseVersion.scenarios.find((s) => s.id === sc.scenario_id);
                  return (
                    <div
                      key={sc.scenario_id}
                      className="rf-scenario-card"
                      style={{
                        borderLeft: sc.outcome_changed
                          ? "4px solid var(--rf-danger-solid)"
                          : "4px solid var(--rf-safe-solid)",
                      }}
                    >
                      <div className="rf-scenario-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span className="rf-badge rf-badge-neutral rf-mono">{sc.scenario_id}</span>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {baseSc?.title || sc.scenario_id}
                          </strong>
                          {baseSc?.dimension && (
                            <span className="rf-badge rf-badge-neutral">{baseSc.dimension}</span>
                          )}
                        </div>

                        <span
                          className={`rf-badge ${
                            sc.outcome_changed ? "rf-badge-danger" : "rf-badge-safe"
                          }`}
                        >
                          {sc.outcome_changed ? "Outcome Changed" : "Outcome Unchanged"}
                        </span>
                      </div>

                      {baseSc?.situation && (
                        <div style={{ fontSize: "0.88rem", color: "var(--rf-ink-secondary)", marginBottom: "6px" }}>
                          <strong>Situation:</strong> {baseSc.situation}
                        </div>
                      )}
                      {baseSc?.question && (
                        <div style={{ fontSize: "0.84rem", color: "var(--rf-ink-muted)", marginBottom: "8px" }}>
                          <strong>Question:</strong> {baseSc.question}
                        </div>
                      )}

                      <div className="rf-scenario-outcomes">
                        <div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--rf-ink-muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                            }}
                          >
                            Outcome Under Active Base Rules
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "var(--rf-ink-primary)",
                              marginTop: "2px",
                              fontSize: "0.95rem",
                            }}
                          >
                            {sc.old_outcome}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--rf-ink-muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                            }}
                          >
                            Outcome Under Proposed Revision
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: sc.outcome_changed
                                ? "var(--rf-danger-text)"
                                : "var(--rf-safe-text)",
                              marginTop: "2px",
                              fontSize: "0.95rem",
                            }}
                          >
                            {sc.new_outcome}
                          </div>
                        </div>
                      </div>

                      {sc.explanation && (
                        <div style={{ fontSize: "0.85rem", color: "var(--rf-ink-secondary)", marginTop: "8px", lineHeight: 1.5 }}>
                          {sc.explanation}
                        </div>
                      )}

                      {sc.rule_references && sc.rule_references.length > 0 && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--rf-ink-muted)", fontWeight: 700, textTransform: "uppercase" }}>
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
          </div>
        ) : (
          <div
            style={{
              color: "var(--rf-ink-muted)",
              padding: "24px 0",
              fontSize: "0.92rem",
              textAlign: "center",
            }}
          >
            This amendment is awaiting intelligent evaluation on GenLayer Studionet. Click &quot;Run Intelligent Assessment&quot; above to execute comparative consensus across participant scenario probes.
          </div>
        )}
      </div>

      {/* 3. Textual Comparison View */}
      <div className="rf-card">
        <div className="rf-card-header">
          <div>
            <h2 className="rf-card-title">2. Textual Rules Comparison</h2>
            <p className="rf-card-subtitle">
              Exact source differences between active baseline and proposed amendment.
            </p>
          </div>
        </div>

        <DiffViewer
          oldText={baseVersion.rule_text}
          newText={amendment.proposed_rules}
          oldTitle={`Active Base (${baseVersion.id})`}
          newTitle={`Proposed Amendment (${amendment.id})`}
        />
      </div>

      {/* 4. Organizer Action / Decision Panel */}
      {amendment.status === "ASSESSED" && !amendment.decision && !isStaleBase && (
        <div className="rf-card" style={{ borderTop: "3px solid var(--rf-brand)" }}>
          <div className="rf-card-header">
            <div>
              <span className="rf-badge rf-badge-brand" style={{ marginBottom: "6px" }}>
                Organizer Action Required
              </span>
              <h2 className="rf-card-title">3. Record Decision & Activate Rules</h2>
              <p className="rf-card-subtitle">
                The organizer must choose an allowed action. Material changes require public acknowledgement.
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordDecision}>
            <div className="rf-form-group">
              <label className="rf-label">Permitted Activation Decisions *</label>
              <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                {/* Option 1: Clarification */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "var(--rf-radius-md)",
                    border: "1px solid",
                    borderColor:
                      decisionType === "ACCEPTED_CLARIFICATION"
                        ? "var(--rf-accent)"
                        : "var(--rf-border-default)",
                    background:
                      decisionType === "ACCEPTED_CLARIFICATION"
                        ? "var(--rf-brand-subtle)"
                        : "var(--rf-surface)",
                    cursor:
                      assessment && canSubmitDecision(assessment, "ACCEPTED_CLARIFICATION")
                        ? "pointer"
                        : "not-allowed",
                    opacity:
                      assessment && canSubmitDecision(assessment, "ACCEPTED_CLARIFICATION") ? 1 : 0.6,
                  }}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="ACCEPTED_CLARIFICATION"
                    checked={decisionType === "ACCEPTED_CLARIFICATION"}
                    onChange={() => setDecisionType("ACCEPTED_CLARIFICATION")}
                    disabled={!assessment || !canSubmitDecision(assessment, "ACCEPTED_CLARIFICATION")}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <strong style={{ color: "var(--rf-ink-primary)" }}>
                      Accept as Clarification (No Material Change)
                    </strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                      Permitted ONLY if intelligent assessment returned NO_MATERIAL_CHANGE.
                      {(assessment?.overall_classification === "MATERIAL_CHANGE" ||
                        assessment?.overall_classification === "REVIEW_NEEDED") && (
                        <span style={{ color: "var(--rf-danger-text)", display: "block", fontWeight: 600 }}>
                          (Disabled: Assessment found {assessment?.overall_classification})
                        </span>
                      )}
                    </div>
                  </div>
                </label>

                {/* Option 2: Material Change */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "var(--rf-radius-md)",
                    border: "1px solid",
                    borderColor:
                      decisionType === "ACKNOWLEDGED_MATERIAL_CHANGE"
                        ? "var(--rf-accent)"
                        : "var(--rf-border-default)",
                    background:
                      decisionType === "ACKNOWLEDGED_MATERIAL_CHANGE"
                        ? "var(--rf-brand-subtle)"
                        : "var(--rf-surface)",
                    cursor:
                      assessment && canSubmitDecision(assessment, "ACKNOWLEDGED_MATERIAL_CHANGE")
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="ACKNOWLEDGED_MATERIAL_CHANGE"
                    checked={decisionType === "ACKNOWLEDGED_MATERIAL_CHANGE"}
                    onChange={() => setDecisionType("ACKNOWLEDGED_MATERIAL_CHANGE")}
                    disabled={!assessment || !canSubmitDecision(assessment, "ACKNOWLEDGED_MATERIAL_CHANGE")}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <strong style={{ color: "var(--rf-ink-primary)" }}>
                      Activate with Acknowledged Material Change
                    </strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                      Explicitly acknowledges that participant criteria or rights have been modified.
                    </div>
                  </div>
                </label>

                {/* Option 3: Prospective Revision */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "var(--rf-radius-md)",
                    border: "1px solid",
                    borderColor:
                      decisionType === "PROSPECTIVE_REVISION"
                        ? "var(--rf-accent)"
                        : "var(--rf-border-default)",
                    background:
                      decisionType === "PROSPECTIVE_REVISION"
                        ? "var(--rf-brand-subtle)"
                        : "var(--rf-surface)",
                    cursor:
                      assessment && canSubmitDecision(assessment, "PROSPECTIVE_REVISION")
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="PROSPECTIVE_REVISION"
                    checked={decisionType === "PROSPECTIVE_REVISION"}
                    onChange={() => setDecisionType("PROSPECTIVE_REVISION")}
                    disabled={!assessment || !canSubmitDecision(assessment, "PROSPECTIVE_REVISION")}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <strong style={{ color: "var(--rf-ink-primary)" }}>
                      Activate as Prospective Revision (Future Submissions Only)
                    </strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                      Grandfathers existing participants; applies strictly to future submissions.
                    </div>
                  </div>
                </label>

                {/* Option 4: Decline */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "var(--rf-radius-md)",
                    border: "1px solid",
                    borderColor:
                      decisionType === "DECLINED"
                        ? "var(--rf-accent)"
                        : "var(--rf-border-default)",
                    background:
                      decisionType === "DECLINED"
                        ? "var(--rf-brand-subtle)"
                        : "var(--rf-surface)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="DECLINED"
                    checked={decisionType === "DECLINED"}
                    onChange={() => setDecisionType("DECLINED")}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <strong style={{ color: "var(--rf-ink-primary)" }}>Decline Amendment</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--rf-ink-muted)", marginTop: "2px" }}>
                      Rejects amendment; current active rules remain untouched.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="rf-form-group">
              <label className="rf-label" htmlFor="decision-rationale">
                Public Decision Rationale (Minimum 15 characters) *
              </label>
              <textarea
                id="decision-rationale"
                className="rf-textarea"
                style={{ minHeight: "90px" }}
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Explain why this decision is being made and address any participant impacts identified..."
                required
              />
              <div className="rf-help">
                {decisionRationale.length}/15 minimum characters entered.
              </div>
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

      {/* 5. Progressive Disclosure of Technical Details */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="rf-btn rf-btn-secondary rf-btn-sm"
        >
          {showTechnicalDetails ? "Hide Technical Details ▲" : "View Technical On-Chain Details ▼"}
        </button>
      </div>

      {showTechnicalDetails && (
        <div className="rf-card" style={{ marginTop: "16px", background: "var(--rf-surface-subtle)" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "10px" }}>
            Technical On-Chain Metadata
          </h3>
          <div style={{ display: "grid", gap: "8px", fontSize: "0.82rem", color: "var(--rf-ink-secondary)" }}>
            <div>
              Contract Address: <span className="rf-mono">{contractAddress || "Demo Adapter"}</span>
            </div>
            <div>
              Base Version ID: <span className="rf-mono">{amendment.base_version_id}</span>
            </div>
            <div>
              Active Event Version ID: <span className="rf-mono">{event.active_version_id}</span>
            </div>
            <div>
              Assessment IDs:{" "}
              <span className="rf-mono">
                {amendment.assessment_ids.length > 0
                  ? amendment.assessment_ids.join(", ")
                  : "None"}
              </span>
            </div>
            {assessment && (
              <div>
                Policy Version:{" "}
                <span className="rf-mono">{assessment.policy_version || "rulefreeze-eval-v1.1"}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
