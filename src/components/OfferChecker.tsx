"use client";

import { useEffect, useReducer, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Eraser, FileText, Linkedin, Mail, MessageCircle, ScanSearch, ShieldCheck } from "lucide-react";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { networkFailure, responseFailure, type CheckFailure } from "@/components/checkRequest";
import { ReportModal, type ReportDraft } from "@/components/radar/ReportModal";
import { ResultCard } from "@/components/ResultCard";
import { SAVED_NOTICE, SaveVaultModal, savedDay } from "@/components/SaveVaultModal";
import { scoreArithmetic } from "@/components/scoreArithmetic";
import { clearReopen, peekReopen } from "@/components/vaultStore";
import type { VaultRecord } from "@/lib/vault";
import { Button, Callout, Card, Chip, HelperText } from "@/components/ui";
import type { SampleOffer } from "@/data/sampleOffers";
import { redactSensitive } from "@/lib/redact";
import { toResultView } from "@/lib/resultView";
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
import { useLang, useT } from "@/components/shell/lang";

// Where the offer came from, as in the reference app. Display and saving only: the rules read the
// text the same way for every channel. "Offer Letter PDF" means the letter's text, pasted.
export const CHANNELS = ["Email", "WhatsApp", "LinkedIn", "Offer Letter PDF"] as const;
export type Channel = (typeof CHANNELS)[number];
const CHANNEL_ICONS = { Email: Mail, WhatsApp: MessageCircle, LinkedIn: Linkedin, "Offer Letter PDF": FileText } as const;

function channelOf(sample: SampleOffer): Channel {
  return sample.channel === "Document" ? "Offer Letter PDF" : sample.channel;
}

// Auto-Redact: what is sent (for a check or a translation) is the box text with Emirates ID,
// passport and IBAN numbers masked, when the toggle is on. The box itself is not changed.
export function prepareText(text: string, autoMask: boolean): { text: string; count: number } {
  return autoMask ? redactSensitive(text) : { text, count: 0 };
}

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
// The redesign: checkedText is the text the rules read (after Auto-Redact; the English after a
// translation), shown in the source highlights and saved by Save Encrypted. channel and redacted
// are recorded at check time too.
export type CheckedResult = {
  boxText: string;
  checkedText: string;
  channel: Channel;
  redacted: number;
  response: AnalyzeResponse;
  coverage: Coverage;
  languageNotice: LanguageNotice | null;
  offerSignals: OfferSignal[];
  translation: ShownTranslation | null;
  // Decision 2h: opened from a vault record saved without its checked text.
  textNotKept?: boolean;
};

export type CheckMeta = { boxText?: string; channel?: Channel; redacted?: number };

export function recordCheck(
  response: AnalyzeResponse,
  submittedText: string,
  translation: ShownTranslation | null = null,
  meta: CheckMeta = {},
): CheckedResult {
  const coverage = translation ? "translated" : coverageOf(detectLanguage(submittedText));
  return {
    boxText: meta.boxText ?? (translation ? translation.original : submittedText),
    checkedText: submittedText,
    channel: meta.channel ?? "Email",
    redacted: meta.redacted ?? 0,
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

// The checking panel (AI Studio port) appears only when a check takes longer than this, so a fast
// check never flashes it. Nothing waits for it: the result shows the moment the server answers.
export const CHECKING_PANEL_DELAY_MS = 300;

// What a check does, in order (src/lib/agents/manager.ts). Listed, not timed: the panel does not
// claim which step is running, because the server does all three in one request.
export function checkingSteps(ruleCount: number): string[] {
  return ["Cleaning the text", `Running ${ruleCount} fixed rules`, "Building the score"];
}

// A result re-opened from the Encrypted Vault ("View result"), as a checked result: the saved text
// is both the box text and the checked text, so the result shows until the text is edited. Records
// saved before 2026-11-10 have no saved check and cannot be re-opened.
export function checkedFromVault(record: VaultRecord | null): CheckedResult | null {
  const saved = record?.check;
  if (!record || !saved) return null;
  return {
    // Decision 2h: a record saved without its text opens with an empty box; the result still shows,
    // and the source panel says the text was not kept.
    boxText: record.text ?? "",
    checkedText: record.text ?? "",
    channel: (CHANNELS as readonly string[]).includes(record.channel) ? (record.channel as Channel) : "Email",
    redacted: saved.redacted,
    response: saved.response,
    coverage: saved.coverage,
    languageNotice: noticeForCoverage(saved.coverage),
    offerSignals: saved.offerSignals,
    translation: null,
    ...(record.text === undefined ? { textNotKept: true } : {}),
  };
}

// The initial checked result: none, or the result handed over by "View result" in the vault.
export function noCheck(): CheckedResult | null {
  return checkedFromVault(peekReopen());
}

// The notice the result card shows, so the saved band wording matches the chip on screen.
function saveNotice(checked: CheckedResult, result: AnalyzeResponse): Notice | null {
  return noticeFor(checked.coverage, checked.offerSignals, result.risk.band);
}

// The initial check failure (none) and STALE-1 notice (off). Named, so a test can recognise them.
function noFailure(): CheckFailure | null {
  return null;
}

function notCleared(): boolean {
  return false;
}

type Modal = { kind: "save" } | { kind: "report"; draft: ReportDraft } | null;

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

// ruleCount, the hero and the samples come from the server page, so the rules themselves never ship
// to the browser.
export function OfferChecker({
  ruleCount,
  samples = [],
  hero = null,
}: {
  ruleCount: number;
  samples?: readonly SampleOffer[];
  hero?: ReactNode;
}) {
  const t = useT();
  const lang = useLang();
  // "View result" from the vault: the record handed over in memory, read on the first render only.
  const reopen = checkedFromVault(peekReopen());
  const [text, setText] = useState(reopen?.boxText ?? "");
  const [channel, setChannel] = useState<Channel>(reopen?.channel ?? "Email");
  const [autoMask, setAutoMask] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [checked, setChecked] = useState<CheckedResult | null>(noCheck);
  // STALE-1: never show a result for text other than the text now in the box.
  const result = checked && checked.boxText === text ? checked.response : null;
  const [cleared, setCleared] = useState(notCleared);
  const [failure, setFailure] = useState<CheckFailure | null>(noFailure);
  const [loading, setLoading] = useState(false);
  // The checking panel shows only once a check has run for CHECKING_PANEL_DELAY_MS.
  const [slowCheck, setSlowCheck] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gateFlow, dispatchGate] = useReducer(gateReducer, INITIAL_GATE_FLOW);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(reopen?.response.audit ?? []);
  const [auditFailed, setAuditFailed] = useState(false);
  // Appends run one after another, so the chain stays in order. A new run starts a new chain.
  const auditQueue = useRef<Promise<AuditEntry[]>>(Promise.resolve(reopen?.response.audit ?? []));
  const runIdRef = useRef<string | null>(reopen?.response.runId ?? null);
  // When the result came from the vault: the day it was saved, shown above it.
  const [reopenedAt] = useState(reopen ? (peekReopen()?.savedAt ?? null) : null);
  // After Save Encrypted: an inline confirmation on the page (no alert).
  const [savedNotice, setSavedNotice] = useState(false);
  // The gate state as of the last action, so a second click before a re-render sees the first.
  const flowRef = useRef<GateFlow>(INITIAL_GATE_FLOW);
  // BATCHB-2: the translation steps, and the latest of them, so a double click sends once.
  const [translateFlow, setTranslateFlow] = useState<TranslateFlow>(idleFlow);
  const translateRef = useRef<TranslateFlow>(translateFlow);
  // The handed-over record has been read into state: drop it from memory.
  useEffect(() => {
    clearReopen();
  }, []);
  // The last check request, so "Try again" repeats it exactly (a translated check stays translated).
  const lastRequest = useRef<{
    submitted: string;
    translation: TranslationRecord | null;
    shown: ShownTranslation | null;
    meta: CheckMeta;
  } | null>(null);
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

  // The checking panel's timer: started with a check, stopped when it ends or the text changes.
  function stopSlowTimer() {
    if (slowTimer.current !== null) clearTimeout(slowTimer.current);
    slowTimer.current = null;
    setSlowCheck(false);
  }

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
    stopSlowTimer();
    dispatchGate({ type: "reset" });
    flowRef.current = INITIAL_GATE_FLOW;
    lastRequest.current = null;
    startAudit(null, []);
    setSavedNotice(false);
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
    meta: CheckMeta = {},
  ) {
    // The button is aria-disabled, not disabled, so a click or a retry can still arrive here.
    if (loading || reason || submitted.trim().length === 0) return;
    lastRequest.current = { submitted, translation, shown, meta };
    if (!shown) moveTranslate({ type: "checked" });
    const { id, signal } = beginRequest();
    setCleared(false);
    stopSlowTimer();
    slowTimer.current = setTimeout(() => setSlowCheck(true), CHECKING_PANEL_DELAY_MS);
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
        setChecked(recordCheck(data, submitted, shown, { channel, ...meta }));
        startAudit(data.runId, data.audit);
      } else {
        setFailure(responseFailure(response.ok ? 200 : response.status, data));
      }
    } finally {
      if (isCurrent(id)) {
        inFlight.current = null;
        setLoading(false);
        stopSlowTimer();
      }
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (translateRef.current.step === "sending") return;
    // "Check original anyway" after a failed translation: the audit trail records the failure code.
    const prepared = prepareText(text, autoMask);
    void runCheck(prepared.text, failureForCheck(translateRef.current), null, { boxText: text, redacted: prepared.count });
  }

  // BATCHB-2: the "Send to Google and translate" button, and nothing else, sends the text for
  // translation, once per press; the disclosure is on screen before the press. The ref makes a
  // double click send once. A failure shows an alert and checks nothing; the user chooses again.
  async function sendTranslation() {
    const step = translateRef.current.step;
    if (loading || (step !== "idle" && step !== "failed")) return;
    const boxText = text;
    // Auto-Redact applies before the send too: Google receives the masked text.
    const prepared = prepareText(boxText, autoMask);
    const original = prepared.text;
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
      { boxText, redacted: prepared.count },
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

  const channelHint =
    channel === "Offer Letter PDF"
      ? t("Paste the text of the letter. Offer Check does not read files or images.")
      : t("Paste the {0} message as text.", channel);

  return (
    <div className="stack">
      {hero}
      {samples.length > 0 && (
        <section className="stack-sm samples" aria-labelledby="samples-label">
          <h2 id="samples-label" className="label-caps">
            {t("Try a synthetic sample")}
          </h2>
          <ul className="grid grid-4">
            {samples.map((sample) => (
              <Card as="li" key={sample.id} className="sample-card">
                <span className="row-between">
                  <span id={`sample-${sample.id}`} className="sample-name">
                    {t(sample.name)}
                  </span>
                  <Chip tone="neutral">{t(channelOf(sample))}</Chip>
                </span>
                <span className="sample-desc">{t(sample.description)}</span>
                <Button
                  variant="secondary"
                  className="sample"
                  aria-describedby={`sample-${sample.id}`}
                  onClick={() => {
                    setChannel(channelOf(sample));
                    editText(sample.text, true);
                  }}
                >
                  {t("Load sample")}
                  <ArrowRight className="icon sample-arrow" aria-hidden="true" />
                </Button>
              </Card>
            ))}
          </ul>
          <p className="small muted">{t("Made-up examples written for this app. No real company or person.")}</p>
        </section>
      )}
      <form className="card stack input-card" onSubmit={handleSubmit} aria-busy={loading || sending || undefined}>
        <div className="controls-bar">
          <div className="tabs tabs-boxed channel-tabs" role="group" aria-label={t("Where the offer came from")}>
            {CHANNELS.map((option) => {
              const Icon = CHANNEL_ICONS[option];
              return (
                <button
                  key={option}
                  type="button"
                  className="tab"
                  aria-pressed={channel === option}
                  onClick={() => setChannel(option)}
                >
                  <Icon className="icon" aria-hidden="true" />
                  {t(option)}
                </button>
              );
            })}
          </div>
          <Button variant="secondary" aria-pressed={autoMask} aria-describedby="mask-note" onClick={() => setAutoMask(!autoMask)}>
            <ShieldCheck className="icon" aria-hidden="true" />
            {t(autoMask ? "Auto-Redact on" : "Auto-Redact off")}
          </Button>
        </div>
        <p id="mask-note" className="small muted">
          {autoMask
            ? t(
                "Auto-Redact is on: Emirates ID, passport and IBAN numbers are masked in this browser before the text is checked or translated.",
              )
            : t("Auto-Redact is off: the text is sent as it is in the box.")}
        </p>
        <div className="field">
          <div className="input-meta">
            <label htmlFor="offer">{t("Job offer text")}</label>
            <span id="offer-count" className={`counter${overLimit ? " counter-over" : ""}`}>
              {COUNT_FORMAT.format(text.length)} / {COUNT_FORMAT.format(MAX_OFFER_CHARS)}
              {overLimit && <span className="counter-note"> ({t("over the limit")})</span>}
            </span>
          </div>
          <textarea
            id="offer"
            rows={9}
            value={text}
            aria-describedby="offer-count offer-hint"
            onChange={(event) => editText(event.target.value)}
            placeholder={t("Paste the WhatsApp message, email, LinkedIn message or offer letter text here")}
          />
          <div className="input-meta">
            <span id="offer-hint">{channelHint}</span>
            {text.length > 0 && (
              <button type="button" className="link-btn" onClick={() => editText("")}>
                <Eraser className="icon" aria-hidden="true" />
                {t("Clear text")}
              </button>
            )}
          </div>
        </div>
        {languageGate ? (
          // Not clearly English: one banner under the box. The explanation, the disclosure (always
          // shown, before any click, while translation is on), any alert, then exactly two buttons.
          // BATCHB-2: "Send to Google and translate" sends at once, once per press.
          <Callout tone="neutral" className="language-banner">
            <p id="language-gate" className="language-gate">
              {t(gateNote)}
            </p>
            {canTranslate && (
              <p id="translate-disclosure" className="translate-disclosure">
                {t(TRANSLATE_CONSENT_TEXT)}
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
                  {sending ? t("Translating...") : t(TRANSLATE_BUTTON)}
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
                {loading ? t("Checking...") : t(LANGUAGE_GATE_BUTTON)}
              </Button>
            </div>
            <HelperText id="check-reason">{t(reason)}</HelperText>
          </Callout>
        ) : (
          // English or empty: one big audit button, nothing about translation.
          <div className="submit">
            <Button type="submit" large block blocked={Boolean(reason) || sending} reasonId="check-reason" busy={loading}>
              <ScanSearch className="icon" aria-hidden="true" />
              {loading ? t("Checking...") : t("Check offer")}
            </Button>
            <HelperText id="check-reason">{t(reason)}</HelperText>
          </div>
        )}
      </form>
      <p className="visually-hidden" role="status">
        {t(announcement)}
      </p>
      {/* The checking panel: hidden from screen readers, which hear "Checking the offer." from the
          status region above. The steps are a list of what a check does, not a progress report. */}
      {loading && slowCheck && (
        <div className="progress checking" aria-hidden="true">
          <span className="checking-ring" />
          <div className="stack-sm">
            <p className="checking-title">{t("Checking the offer")}</p>
            <ol className="checking-steps small">
              {checkingSteps(ruleCount).map((step) => (
                <li key={step}>{t(step)}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {failure && (
        <Callout tone="high" role="alert" title={t(failure.title)} className="check-failure">
          <p>{t(failure.message)}</p>
          {failure.retry && (
            <Button
              variant="secondary"
              onClick={() => {
                const last = lastRequest.current;
                void (last ? runCheck(last.submitted, last.translation, last.shown, last.meta) : runCheck());
              }}
            >
              {t("Try again")}
            </Button>
          )}
        </Callout>
      )}
      {result && checked?.translation && <TranslationShown translation={checked.translation} />}
      {result && reopenedAt && (
        <Callout tone="neutral" role="note" className="reopened-note">
          <p>{t("Opened from your Encrypted Vault. Saved {0}.", savedDay(new Date(reopenedAt), lang))}</p>
        </Callout>
      )}
      {result && savedNotice && (
        <Callout tone="success" role="status" className="saved-notice">
          <p>
            {t(SAVED_NOTICE)} <a href="/vault">{t("Open the Encrypted Vault")}</a>
          </p>
        </Callout>
      )}
      {result && checked && (
        <ResultCard
          result={result}
          ruleCount={ruleCount}
          languageNotice={checked.languageNotice}
          coverage={checked.coverage}
          sourceLang={checked.translation?.sourceLang ?? null}
          offerSignals={checked.offerSignals}
          sourceText={checked.checkedText}
          channel={checked.channel}
          redacted={checked.redacted}
          textNotKept={checked.textNotKept ?? false}
          onNewAudit={() => editText("")}
          onSave={() => setModal({ kind: "save" })}
          onReport={(flag) =>
            setModal({
              kind: "report",
              draft: { title: flag.signal, description: flag.explanation, warningQuote: flag.matched_text },
            })
          }
        >
          <ApprovalPanel gate={gateFlow.gate} dispatch={dispatchWithAudit} />
          <AuditTrail entries={auditLog} failed={auditFailed} />
        </ResultCard>
      )}
      {modal?.kind === "save" && result && checked && (
        <SaveVaultModal
          view={toResultView(result, checked.coverage)}
          channel={checked.channel}
          checkedText={checked.checkedText}
          bandLabel={scoreChip(result.risk, result.findings, saveNotice(checked, result)).label}
          points={saveNotice(checked, result) === "most" ? null : scoreArithmetic(result.findings, result.risk)}
          check={{
            response: checked.response,
            coverage: checked.coverage,
            offerSignals: checked.offerSignals,
            redacted: checked.redacted,
            sourceLang: checked.translation?.sourceLang ?? null,
          }}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setSavedNotice(true);
          }}
        />
      )}
      {modal?.kind === "report" && <ReportModal initial={modal.draft} onClose={() => setModal(null)} />}
    </div>
  );
}
