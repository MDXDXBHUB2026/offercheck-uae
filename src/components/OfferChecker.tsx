"use client";

import { useReducer, useRef, useState, type FormEvent } from "react";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { ResultsPanel } from "@/components/ResultsPanel";
import { planBlocks } from "@/lib/agents/drafter";
import { gateReducer, INITIAL_GATE_FLOW, type GateAction } from "@/lib/approvalGate";
import { appendEntries, gateRecords, type AuditEntry, type AuditRecord } from "@/lib/audit";
import type { AnalysisResult } from "@/lib/types";

type AnalyzeResponse = AnalysisResult & { runId: string; audit: AuditEntry[] };

// ruleCount comes from the server page, so the rules themselves never ship to the browser.
export function OfferChecker({ ruleCount }: { ruleCount: number }) {
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
    // The draft adapts to the findings shown above. Only their rule ids reach the drafter.
    const full = action.type === "prepare" ? { ...action, findings: result.findings } : action;
    logGate(gateRecords(result.runId, gateFlow, gateReducer(gateFlow, full), planBlocks(result.findings)));
    dispatchGate(full);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    dispatchGate({ type: "reset" });
    startAudit(null, []);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
        startAudit(data.runId, data.audit ?? []);
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
      <form onSubmit={handleSubmit}>
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
