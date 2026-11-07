"use client";

import { useReducer, useRef, useState, type FormEvent } from "react";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { ResultsPanel } from "@/components/ResultsPanel";
import { gateReducer, INITIAL_GATE_FLOW, type GateAction, type GateFlow } from "@/lib/approvalGate";
import {
  appendEntries,
  gateStep,
  isAnalyzeResponse,
  type AnalyzeResponse,
  type AuditEntry,
  type AuditRecord,
} from "@/lib/audit";

// A synthetic sample offer the user can load into the box with one button.
export type Sample = { label: string; text: string };

// ruleCount and samples come from the server page, so the rules themselves never ship to the browser.
export function OfferChecker({ ruleCount, samples = [] }: { ruleCount: number; samples?: Sample[] }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gateFlow, dispatchGate] = useReducer(gateReducer, INITIAL_GATE_FLOW);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFailed, setAuditFailed] = useState(false);
  // Appends run one after another, so the chain stays in order. A new run starts a new chain.
  const auditQueue = useRef<Promise<AuditEntry[]>>(Promise.resolve([]));
  const runIdRef = useRef<string | null>(null);
  // The gate state as of the last action, so a second click before a re-render sees the first.
  const flowRef = useRef<GateFlow>(INITIAL_GATE_FLOW);

  function startAudit(runId: string | null, log: AuditEntry[]) {
    runIdRef.current = runId;
    auditQueue.current = Promise.resolve(log);
    setAuditLog(log);
    setAuditFailed(false);
  }

  function logGate(records: AuditRecord[]) {
    if (records.length === 0) return;
    const runId = records[0].runId;
    auditQueue.current = auditQueue.current.then(
      (log) =>
        appendEntries(log, records).then(
          (next) => {
            if (runIdRef.current === runId) setAuditLog(next);
            return next;
          },
          () => {
            if (runIdRef.current === runId) setAuditFailed(true);
            return log;
          },
        ),
    );
  }

  function dispatchWithAudit(action: GateAction) {
    if (!result) return;
    const step = gateStep(result.runId, flowRef.current, action, result.findings);
    flowRef.current = step.after;
    logGate(step.records);
    dispatchGate(step.action);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    dispatchGate({ type: "reset" });
    flowRef.current = INITIAL_GATE_FLOW;
    startAudit(null, []);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok && isAnalyzeResponse(data)) {
        setResult(data);
        startAudit(data.runId, data.audit);
      } else if (response.ok) {
        setError("The server sent a reply this page cannot read. Try again.");
      } else {
        setError(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="card offer-form" onSubmit={handleSubmit}>
        {samples.length > 0 && (
          <div className="samples" role="group" aria-labelledby="samples-label">
            <span id="samples-label" className="samples-label">
              Try a synthetic sample:
            </span>
            {samples.map((sample) => (
              <button
                key={sample.label}
                type="button"
                className="secondary sample"
                onClick={() => setText(sample.text)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        )}
        <label htmlFor="offer">Job offer text</label>
        <textarea
          id="offer"
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the WhatsApp message, email or LinkedIn text here"
        />
        <button type="submit" disabled={loading || text.trim().length === 0}>
          {loading ? "Checking..." : "Check offer"}
        </button>
      </form>
      <div aria-live="polite">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {result && <ResultsPanel result={result} ruleCount={ruleCount} />}
      </div>
      {result && <ApprovalPanel gate={gateFlow.gate} dispatch={dispatchWithAudit} />}
      {result && <AuditTrail entries={auditLog} failed={auditFailed} />}
    </>
  );
}
