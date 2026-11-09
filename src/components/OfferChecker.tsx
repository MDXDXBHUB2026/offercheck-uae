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
import { noticeFor, qualifiedSummary, scoreChip, type Notice } from "@/components/scoreChip";
import { coverageOf, detectLanguage, isUncertainEnglish, noticeForCoverage, type Coverage } from "@/lib/coverage";
import { offerSignals, type OfferSignal } from "@/lib/offerLikeness";
import {
  failureForCheck,
  idleFlow,
  LANGUAGE_GATE_TRANSLATE_NOTE,
  LANGUAGE_GATE_UNCERTAIN_NOTE,
  TRANSLATE_BUTTON,
  TRANSLATE_CONSENT_TEXT,
  translateFlowReducer,
  type ShownTranslation,
  type TranslateAction,
  type TranslateFlow,
} from "@/components/translateFlow";
import { requestTranslation } from "@/components/translateRequest";
import { TranslateFailureAlert, TranslationShown } from "@/components/TranslationPanels";
import type { TranslationRecord } from "@/lib/translation";
import type { LanguageNotice } from "@/lib/textScript";
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
// Batch B Stage 1: the coverage state too, from the offline detector. The tier follows from it.
// BATCHB-2: after a translation, the checked text is the English translation, the coverage is
// "translated", and the original and the English are kept with the result to show under it.
// STALE-1: boxText is the text that was in the box when the check was asked for (the original, also
// after a translation). The result is shown only while the box holds exactly that text.
export type CheckedResult = {
  boxText: string;
  response: AnalyzeResponse;
  coverage: Coverage;
  languageNotice: LanguageNotice | null;
  offerSignals: OfferSignal[];
  translation: ShownTranslation | null;
};

export function recordCheck(
  response: AnalyzeResponse,
  submittedText: string,
  translation: ShownTranslation | null = null,
): CheckedResult {
  const coverage = translation ? "translated" : coverageOf(detectLanguage(submittedText));
  return {
    boxText: translation ? translation.original : submittedText,
    response,
    coverage,
    languageNotice: noticeForCoverage(coverage),
    offerSignals: offerSignals(submittedText),
    translation,
  };
}

// Batch B decision 4: shown under the button when the live text is not all English. Fixed wording.
// BATCHB-2: while translation is available, LANGUAGE_GATE_TRANSLATE_NOTE is shown instead.
export const LANGUAGE_GATE_NOTE =
  "This text does not look like English, or only part of it does. The rules read English only, so the parts in other languages will not be checked.";
export const LANGUAGE_GATE_BUTTON = "Check original anyway (not checked)";
// STALE-1: announced in the status region when an edit removes a result. No offer text.
export const RESULT_CLEARED = "Result cleared because the text changed.";

// The initial checked result: none.
export function noCheck(): CheckedResult | null {
  return null;
}

// The initial check failure (none) and STALE-1 notice (off). Named, so a test can recognise them.
function noFailure(): CheckFailure | null {
  return null;
}

function notCleared(): boolean {
  return false;
}

// The screen-reader announcement uses the chip's wording, so the two never disagree (UX-1, LANG-2).
export function resultAnnouncement(
  result: Pick<AnalyzeResponse, "risk" | "findings">,
  notice: Notice | null = null,
): string {
  // LANG-3 and OFFER-1: tier 2 or the offer-likeness notice with nothing matched reads as one
  // qualified sentence, as in the Risk aggregator row. Batch B decision 4: tier 1 has no number.
  // Decision 5: a translation with nothing matched is qualified the same way.
  if (notice === "most") return `Results ready. ${qualifiedSummary(result.risk, result.findings, notice)}`;
  if ((notice === "part" || notice === "offer" || notice === "translated") && result.findings.length === 0) {
    return `Results ready. ${qualifiedSummary(result.risk, result.findings, notice)}`;
  }
  if (notice === "translated") {
    return `Results ready. Checked an English translation. Score ${result.risk.score} of 100: ${scoreChip(result.risk, result.findings, notice).label}.`;
  }
  return `Results ready. Score ${result.risk.score} of 100: ${scoreChip(result.risk, result.findings, notice).label}.`;
}

// ruleCount and samples come from the server page, so the rules themselves never ship to the browser.
export function OfferChecker({ ruleCount, samples = [] }: { ruleCount: number; samples?: Sample[] }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<CheckedResult | null>(noCheck);
  // STALE-1: never show a result for text other than the text now in the box.
  const result = checked && checked.boxText === text ? checked.response : null;
  const [cleared, setCleared] = useState(notCleared);
  const [failure, setFailure] = useState<CheckFailure | null>(noFailure);
  const [loading, setLoading] = useState(false);
  const [gateFlow, dispatchGate] = useReducer(gateReducer, INITIAL_GATE_FLOW);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFailed, setAuditFailed] = useState(false);
  // Appends run one after another, so the chain stays in order. A new run starts a new chain.
  const auditQueue = useRef<Promise<AuditEntry[]>>(Promise.resolve([]));
  const runIdRef = useRef<string | null>(null);
  // The gate state as of the last action, so a second click before a re-render sees the first.
  const flowRef = useRef<GateFlow>(INITIAL_GATE_FLOW);
  // BATCHB-2: the translation steps, and the latest of them, so a double click sends once.
  const [translateFlow, setTranslateFlow] = useState<TranslateFlow>(idleFlow);
  const translateRef = useRef<TranslateFlow>(translateFlow);
  // The last check request, so "Try again" repeats it exactly (a translated check stays translated).
  const lastRequest = useRef<{ submitted: string; translation: TranslationRecord | null; shown: ShownTranslation | null } | null>(null);
  // STALE-1: the request in flight (a translation or a check) and a counter. Each request takes the
  // next id; an edit aborts the request and moves the counter on, so a late reply is ignored.
  const inFlight = useRef<AbortController | null>(null);
  const requestSeq = useRef(0);

  const reason = checkBlockedReason(text, samples.length > 0);
  const overLimit = text.length > MAX_OFFER_CHARS;
  // Batch B decision 4: the live text is not all English. The button keeps working, renamed.
  const languageGate = text.trim().length > 0 && detectLanguage(text) !== "en";
  // BATCHB-2: the Translate button, unless the server said translation is not available.
  const canTranslate = languageGate && translateFlow.step !== "unavailable";
  // LANG-4: the uncertain band (English-word share 0.15 up to 0.30) has its own explanation.
  const gateNote = !canTranslate
    ? LANGUAGE_GATE_NOTE
    : isUncertainEnglish(text)
      ? LANGUAGE_GATE_UNCERTAIN_NOTE
      : LANGUAGE_GATE_TRANSLATE_NOTE;
  const sending = translateFlow.step === "sending";

  function moveTranslate(action: TranslateAction): TranslateFlow {
    const next = translateFlowReducer(translateRef.current, action);
    if (next !== translateRef.current) {
      translateRef.current = next;
      setTranslateFlow(next);
    }
    return next;
  }

  function beginRequest(): { id: number; signal: AbortSignal } {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    requestSeq.current += 1;
    return { id: requestSeq.current, signal: controller.signal };
  }

  const isCurrent = (id: number) => requestSeq.current === id;

  // STALE-1: the text changed, so everything from the previous check goes: the result (score,
  // findings, Agent run, translation panel, draft), the approval gate and its audit chain, and any
  // failure alert. A request in flight is aborted and its reply ignored. Focus is not moved.
  function clearForEdit() {
    const hadSomething = checked !== null || loading || translateRef.current.step === "sending" || failure !== null;
    inFlight.current?.abort();
    inFlight.current = null;
    requestSeq.current += 1;
    setChecked(null);
    setFailure(null);
    setLoading(false);
    dispatchGate({ type: "reset" });
    flowRef.current = INITIAL_GATE_FLOW;
    lastRequest.current = null;
    startAudit(null, []);
    if (hadSomething) setCleared(true);
  }

  // Typing, pasting or a sample button. A sample always clears, even when it fills in the same text.
  function editText(value: string, fromSample = false) {
    setText(value);
    if (fromSample || value !== text) clearForEdit();
    if (translateRef.current.step !== "idle") moveTranslate({ type: "reset" });
  }

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

  // submitted: the text to check (the box's text, or the English translation). translation: the
  // fixed-value record for the audit trail. shown: the original and the English, after a translation.
  // The language notice is decided from the text as sent, not from later edits.
  async function runCheck(
    submitted: string = text,
    translation: TranslationRecord | null = null,
    shown: ShownTranslation | null = null,
  ) {
    // The button is aria-disabled, not disabled, so a click or a retry can still arrive here.
    if (loading || reason || submitted.trim().length === 0) return;
    lastRequest.current = { submitted, translation, shown };
    if (!shown) moveTranslate({ type: "checked" });
    const { id, signal } = beginRequest();
    setCleared(false);
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
          body: JSON.stringify(translation ? { text: submitted, translation } : { text: submitted }),
          signal,
        });
      } catch {
        // Aborted by an edit, or replaced by a newer request: no result and no alert.
        if (!isCurrent(id)) return;
        setFailure(networkFailure(typeof navigator === "undefined" || navigator.onLine !== false));
        return;
      }
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!isCurrent(id)) return;
      if (response.ok && isAnalyzeResponse(data)) {
        setChecked(recordCheck(data, submitted, shown));
        startAudit(data.runId, data.audit);
      } else {
        setFailure(responseFailure(response.ok ? 200 : response.status, data));
      }
    } finally {
      if (isCurrent(id)) {
        inFlight.current = null;
        setLoading(false);
      }
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (translateRef.current.step === "sending") return;
    // "Check original anyway" after a failed translation: the audit trail records the failure code.
    void runCheck(text, failureForCheck(translateRef.current));
  }

  // BATCHB-2: the "Send to Google and translate" button, and nothing else, sends the text for
  // translation, once per press; the disclosure is on screen before the press. The ref makes a
  // double click send once. A failure shows an alert and checks nothing; the user chooses again.
  async function sendTranslation() {
    const step = translateRef.current.step;
    if (loading || (step !== "idle" && step !== "failed")) return;
    const original = text;
    moveTranslate({ type: "send" });
    setCleared(false);
    const { id, signal } = beginRequest();
    const outcome = await requestTranslation(original, undefined, signal);
    // STALE-1: the text changed while translating: the request was aborted. Show nothing.
    if (!isCurrent(id)) return;
    inFlight.current = null;
    if (!outcome.ok) {
      moveTranslate({ type: "failed", code: outcome.code });
      return;
    }
    moveTranslate({ type: "done" });
    await runCheck(
      outcome.translatedText,
      { result: "ok", sourceLang: outcome.sourceLang },
      { original, english: outcome.translatedText, sourceLang: outcome.sourceLang },
    );
  }

  const announcement = loading
    ? "Checking the offer."
    : sending
      ? "Sending the text for translation."
      : result
      ? resultAnnouncement(
          result,
          noticeFor(checked?.coverage ?? "full", checked?.offerSignals ?? null, result.risk.band),
        )
      : cleared
        ? RESULT_CLEARED
        : "";

  return (
    <>
      <form className="card input-card" onSubmit={handleSubmit} aria-busy={loading || sending || undefined}>
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
          onChange={(event) => editText(event.target.value)}
          placeholder="Paste the WhatsApp message, email or LinkedIn text here"
        />
        {/* The action area, then the samples: the tab order follows the page (text box, actions, samples). */}
        <div className="input-foot">
          {languageGate ? (
            // Not clearly English: one banner under the box. The explanation, the disclosure (always
            // shown, before any click, while translation is on), any alert, then exactly two buttons.
            // BATCHB-2: "Send to Google and translate" sends at once, once per press.
            <Callout tone="neutral" className="language-banner">
              <p id="language-gate" className="language-gate">
                {gateNote}
              </p>
              {canTranslate && (
                <p id="translate-disclosure" className="translate-disclosure">
                  {TRANSLATE_CONSENT_TEXT}
                </p>
              )}
              {translateFlow.step === "failed" && <TranslateFailureAlert code={translateFlow.code} />}
              {translateFlow.step === "unavailable" && translateFlow.alert && (
                <TranslateFailureAlert code="translation_unavailable" />
              )}
              <div className="gate-actions">
                {canTranslate && (
                  <Button
                    blocked={Boolean(reason) || loading}
                    reasonId="check-reason"
                    busy={sending}
                    onClick={() => void sendTranslation()}
                    aria-describedby="translate-disclosure"
                  >
                    {sending ? "Translating..." : TRANSLATE_BUTTON}
                  </Button>
                )}
                <Button
                  type="submit"
                  variant={canTranslate ? "secondary" : "primary"}
                  blocked={Boolean(reason) || sending}
                  reasonId="check-reason"
                  busy={loading}
                  aria-describedby="language-gate"
                >
                  {loading ? "Checking..." : LANGUAGE_GATE_BUTTON}
                </Button>
              </div>
              <HelperText id="check-reason">{reason}</HelperText>
            </Callout>
          ) : (
            // English or empty: one primary button, nothing about translation.
            <div className="submit">
              <Button type="submit" blocked={Boolean(reason) || sending} reasonId="check-reason" busy={loading}>
                {loading ? "Checking..." : "Check offer"}
              </Button>
              <HelperText id="check-reason">{reason}</HelperText>
            </div>
          )}
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
                    onClick={() => editText(sample.text, true)}
                  >
                    <span>{sample.label}</span>
                    <span className="sample-tag">Synthetic</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
      {failure && (
        <Callout tone="high" role="alert" title={failure.title} className="check-failure">
          <p>{failure.message}</p>
          {failure.retry && (
            <Button
              variant="secondary"
              onClick={() => {
                const last = lastRequest.current;
                void (last ? runCheck(last.submitted, last.translation, last.shown) : runCheck());
              }}
            >
              Try again
            </Button>
          )}
        </Callout>
      )}
      {result && checked?.translation && <TranslationShown translation={checked.translation} />}
      {result && (
        <ResultsPanel
          result={result}
          ruleCount={ruleCount}
          languageNotice={checked?.languageNotice ?? null}
          coverage={checked?.coverage ?? null}
          sourceLang={checked?.translation?.sourceLang ?? null}
          offerSignals={checked?.offerSignals ?? null}
        >
          <ApprovalPanel gate={gateFlow.gate} dispatch={dispatchWithAudit} />
          <AuditTrail entries={auditLog} failed={auditFailed} />
        </ResultsPanel>
      )}
    </>
  );
}
