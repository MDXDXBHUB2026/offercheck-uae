"use client";

import { useReducer, useRef, useState, type FormEvent } from "react";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { networkFailure, responseFailure, type CheckFailure } from "@/components/checkRequest";
import { ResultsPanel } from "@/components/ResultsPanel";
import { Button, Callout, HelperText } from "@/components/ui";
import { gateReducer, INITIAL_GATE_FLOW, type GateAction, type GateFlow } from "@/lib/approvalGate";
import {
  appendEntries,
  gateStep,
  isAnalyzeResponse,
  type AnalyzeResponse,
  type AuditEntry,
  type AuditRecord,
} from "@/lib/audit";
import { qualifiedSummary, scoreChip } from "@/components/scoreChip";
import { offerSignals, type OfferSignal } from "@/lib/offerLikeness";
import { languageNotice, type LanguageNotice } from "@/lib/textScript";
import { MAX_OFFER_CHARS } from "@/lib/types";

// A synthetic sample offer the user can load into the box with one button.
export type Sample = { label: string; text: string };

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

// Why "Check offer" is blocked, or "" when it is not. Shown under the button, which stays
// focusable (aria-disabled), the same pattern as the approve button.
export function checkBlockedReason(text: string, hasSamples: boolean): string {
  if (text.trim().length > 0) return "";
  return hasSamples
    ? "Paste an offer or choose a sample, then check it."
    : "Paste an offer, then check it.";
}

// LANG-1: a check's response together with the language notice for the text that was checked.
// The flag is set once, at check time, and never follows the live text box.
// Batch A case 4: the offer signals are recorded the same way, at check time.
export type CheckedResult = {
  response: AnalyzeResponse;
  languageNotice: LanguageNotice | null;
  offerSignals: OfferSignal[];
};

export function recordCheck(response: AnalyzeResponse, submittedText: string): CheckedResult {
  return { response, languageNotice: languageNotice(submittedText), offerSignals: offerSignals(submittedText) };
}

// The initial checked result: none.
export function noCheck(): CheckedResult | null {
  return null;
}

// The screen-reader announcement uses the chip's wording, so the two never disagree (UX-1, LANG-2).
export function resultAnnouncement(
  result: Pick<AnalyzeResponse, "risk" | "findings">,
  language: LanguageNotice | null = null,
): string {
  // LANG-3: tier 2 with nothing matched reads as one qualified sentence, as in the Risk aggregator row.
  if (language === "part" && result.findings.length === 0) {
    return `Results ready. ${qualifiedSummary(result.risk, result.findings, language)}`;
  }
  return `Results ready. Score ${result.risk.score} of 100: ${scoreChip(result.risk, result.findings, language).label}.`;
}

// ruleCount and samples come from the server page, so the rules themselves never ship to the browser.
export function OfferChecker({ ruleCount, samples = [] }: { ruleCount: number; samples?: Sample[] }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<CheckedResult | null>(noCheck);
  const result = checked?.response ?? null;
  const [failure, setFailure] = useState<CheckFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const [gateFlow, dispatchGate] = useReducer(gateReducer, INITIAL_GATE_FLOW);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFailed, setAuditFailed] = useState(false);
  // Appends run one after another, so the chain stays in order. A new run starts a new chain.
  const auditQueue = useRef<Promise<AuditEntry[]>>(Promise.resolve([]));
  const runIdRef = useRef<string | null>(null);
  // The gate state as of the last action, so a second click before a re-render sees the first.
  const flowRef = useRef<GateFlow>(INITIAL_GATE_FLOW);

  const reason = checkBlockedReason(text, samples.length > 0);
  const overLimit = text.length > MAX_OFFER_CHARS;

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

  async function runCheck() {
    // The button is aria-disabled, not disabled, so a click or a retry can still arrive here.
    if (loading || reason) return;
    // The text as sent: the language notice is decided from this, not from later edits.
    const submitted = text;
    setLoading(true);
    setFailure(null);
    setChecked(null);
    dispatchGate({ type: "reset" });
    flowRef.current = INITIAL_GATE_FLOW;
    startAudit(null, []);
    try {
      let response: Response;
      try {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: submitted }),
        });
      } catch {
        setFailure(networkFailure(typeof navigator === "undefined" || navigator.onLine !== false));
        return;
      }
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (response.ok && isAnalyzeResponse(data)) {
        setChecked(recordCheck(data, submitted));
        startAudit(data.runId, data.audit);
      } else {
        setFailure(responseFailure(response.ok ? 200 : response.status, data));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void runCheck();
  }

  const announcement = loading
    ? "Checking the offer."
    : result
      ? resultAnnouncement(result, checked?.languageNotice ?? null)
      : "";

  return (
    <>
      <form className="card input-card" onSubmit={handleSubmit} aria-busy={loading || undefined}>
        <div className="input-head">
          <label htmlFor="offer">Job offer text</label>
          <span id="offer-count" className={`counter${overLimit ? " counter-over" : ""}`}>
            {COUNT_FORMAT.format(text.length)} / {COUNT_FORMAT.format(MAX_OFFER_CHARS)}
            {overLimit && <span className="counter-note"> (over the limit)</span>}
          </span>
        </div>
        <textarea
          id="offer"
          rows={9}
          value={text}
          aria-describedby="offer-count"
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the WhatsApp message, email or LinkedIn text here"
        />
        <div className="input-foot">
          {samples.length > 0 && (
            <div className="samples" role="group" aria-labelledby="samples-label">
              <span id="samples-label" className="samples-label">
                Try a synthetic sample
              </span>
              <div className="sample-list">
                {samples.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    className="sample"
                    onClick={() => setText(sample.text)}
                  >
                    <span>{sample.label}</span>
                    <span className="sample-tag">Synthetic</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="submit">
            <Button type="submit" blocked={Boolean(reason)} reasonId="check-reason" busy={loading}>
              {loading ? "Checking..." : "Check offer"}
            </Button>
            <HelperText id="check-reason">{reason}</HelperText>
          </div>
        </div>
      </form>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
      {failure && (
        <Callout tone="high" role="alert" title={failure.title} className="check-failure">
          <p>{failure.message}</p>
          {failure.retry && (
            <Button variant="secondary" onClick={() => void runCheck()}>
              Try again
            </Button>
          )}
        </Callout>
      )}
      {result && (
        <ResultsPanel
          result={result}
          ruleCount={ruleCount}
          languageNotice={checked?.languageNotice ?? null}
          offerSignals={checked?.offerSignals ?? null}
        >
          <ApprovalPanel gate={gateFlow.gate} dispatch={dispatchWithAudit} />
          <AuditTrail entries={auditLog} failed={auditFailed} />
        </ResultsPanel>
      )}
    </>
  );
}
