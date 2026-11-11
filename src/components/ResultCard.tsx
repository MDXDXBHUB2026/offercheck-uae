"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Quote,
  ExternalLink,
  FileDown,
  FileText,
  Info,
  Lock,
  Phone,
  RotateCcw,
  ShieldAlert,
  Square,
  Volume2,
} from "lucide-react";
import { AgentRun } from "@/components/AgentRun";
import { CrossChecksGroup, OfficialStepsGroup } from "@/components/CrossCheckGroups";
import { scoreArithmetic } from "@/components/scoreArithmetic";
import { allClearShown, noticeFor, qualifiedSummary, reportLinkShown, scoreChip, type Notice } from "@/components/scoreChip";
import { Button, ButtonLink, Callout, Card, Chip, Disclosure, cx, type ChipTone, type Tone } from "@/components/ui";
import { contact, MOHRE_INQUIRY_URL } from "@/data/uaeContacts";
import { mainChannels, REPORT_FRAUD_ID, REPORT_FRAUD_NOTE, REPORT_LINK_SENTENCE } from "@/lib/authorities";
import { CHECK_LABELS, CHECK_NOTES } from "@/lib/checkLabels";
import { CROSS_CHECK_LABELS, validCrossChecks } from "@/lib/crossCheckLabels";
import { noticeForCoverage, type Coverage } from "@/lib/coverage";
import { highlightParts, type MarkLevel } from "@/lib/highlight";
import { OFFER_NOTICE, showOfferNotice, type OfferSignal } from "@/lib/offerLikeness";
import { toResultView, type ResultView, type ViewRedFlag } from "@/lib/resultView";
import { HIGH_BAND_MIN, MEDIUM_BAND_MIN, SEVERITY_WEIGHTS } from "@/lib/scoring";
import { LANGUAGE_NOTICES, type LanguageNotice } from "@/lib/textScript";
import { languageName, TRANSLATION_PROVIDER_NAME } from "@/lib/translation";
import type { AnalysisResult, Finding, Severity } from "@/lib/types";
import { TEXT_NOT_KEPT } from "@/lib/vault";
import { WARNING_SIGNS } from "@/lib/warningSigns";
import { useLang, useT } from "@/components/shell/lang";
import { tr } from "@/lib/i18n";
import { RESULT_HEADING_ID } from "./revealResult";

// Batch B Stage 1: added to the Intake row of the Agent run for each state but full.
// BATCHB-2: a translation names the provider and the source language, from fixed lists only.
const INTAKE_NOTES: Record<Exclude<Coverage, "translated">, string | undefined> = {
  full: undefined,
  partial: "Part of the text is not in English and was not checked.",
  unchecked: "Most of the text is not in English and was not checked.",
};

// Auto-Redact (always on, 2026-11-11): shown beside "Highlights in your text" only when at least one
// number was hidden. A result re-opened from the vault drops the last sentence (the box does not hold
// the original text then).
export const REDACTION_NOTE =
  "ID, passport and bank numbers are hidden before the text is sent. A reference number in a similar format may also be hidden. Your original text is still in the box.";
export const REDACTION_NOTE_SAVED =
  "ID, passport and bank numbers are hidden before the text is sent. A reference number in a similar format may also be hidden.";

export function intakeNote(state: Coverage, sourceLang: string | null = null): string | undefined {
  if (state !== "translated") return INTAKE_NOTES[state];
  const name = sourceLang && sourceLang !== "en" ? languageName(sourceLang) : null;
  return `Checked a machine translation into English${name ? ` from ${name}` : ""}, made by ${TRANSLATION_PROVIDER_NAME}.`;
}

// The banner colour follows the chip: the band's colour, amber for a low band with a finding
// (UX-1), and neutral grey with a notice and nothing matched (never green, LANG-2).
export function bannerTone(chip: ReturnType<typeof scoreChip>, band: AnalysisResult["risk"]["band"]): Tone {
  if (chip.tone === "neutral") return "neutral";
  if (chip.tone === "caution") return "medium";
  return band === "high" ? "high" : band === "medium" ? "medium" : "green";
}

const CHIP_TONE: Record<Tone, ChipTone> = { high: "high", medium: "caution", low: "green", green: "green", neutral: "neutral" };
const SEVERITY_TONE: Record<Exclude<Severity, "info">, Tone> = { high: "high", medium: "medium", low: "low" };
const MARK_LEVEL: Record<Exclude<Severity, "info">, MarkLevel> = { high: "High", medium: "Medium", low: "Low" };

// The checklist starts with nothing ticked. A shared empty set: toggling always makes a new one.
const NONE_TICKED: ReadonlySet<number> = new Set();

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// The text read aloud by Listen: fixed wording and rule labels only, never the offer text.
export function spokenSummary(
  view: ResultView,
  chipLabel: string,
  notice: Notice | null,
  t: (en: string, ...args: (string | number)[]) => string = (en, ...args) => tr("en", en, ...args),
): string {
  const flags = view.red_flags.map((flag) => t(flag.signal)).join(". ");
  const score = notice === "most" ? t("Not checked.") : t("Score {0} of 100: {1}.", view.score, chipLabel);
  return [score, t(view.summary), flags ? t("Red flags: {0}.", flags) : ""].filter(Boolean).join(" ");
}

// Web Speech is in the browser only; on the server and in browsers without it, Listen is not shown
// (no dead button).
function subscribeNothing() {
  return () => {};
}

function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );
}

async function copyQuote(quote: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(quote);
    return true;
  } catch {
    return false;
  }
}

// "Copied" shows this long, then the button reads "Copy quote" again.
export const COPIED_MS = 1500;

// The four dimension tiles (AI Studio port): each groups rule ids from src/lib/agents/redFlag.ts.
// A tile says only whether one of its rules matched; it has no number and no level of its own.
export const DIMENSIONS = [
  { title: "Money asked for", rules: ["RF-001"] },
  { title: "Codes, cards or documents", rules: ["RF-002", "RF-003"] },
  { title: "Pressure to act fast", rules: ["RF-004"] },
  { title: "Sender's email address", rules: ["RF-005"] },
] as const;

function FlagCard({
  finding,
  flag,
  index,
  onReport,
}: {
  finding: Finding & { severity: Exclude<Severity, "info"> };
  flag: ViewRedFlag;
  index: number;
  onReport?: (flag: ViewRedFlag) => void;
}) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const t = useT();
  const tone = SEVERITY_TONE[finding.severity];

  useEffect(() => {
    if (copied !== "copied") return;
    const timer = window.setTimeout(() => setCopied("idle"), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Card as="li" tone={tone} className="stack-sm flag-card">
      <div className="flag-head">
        <span className={cx("num-tile", `tone-${tone}`)} aria-hidden="true">
          {index + 1}
        </span>
        <div className="stack-sm">
          <div className="row">
            <Chip tone={CHIP_TONE[tone]} upper>
              {t("{0} rule, +{1} points", finding.severity, SEVERITY_WEIGHTS[finding.severity])}
            </Chip>
          </div>
          <h3 className="h3">{t(CHECK_LABELS[finding.check] ?? finding.check)}</h3>
          {CHECK_NOTES[finding.check] && <p className="small muted">{t(CHECK_NOTES[finding.check] ?? "")}</p>}
        </div>
      </div>
      {finding.evidence.map((quote) => (
        <div key={quote} className="card-sunken stack-sm">
          <p className="quote-label">{t("Quoted from the offer")}</p>
          <p className="quote">{quote}</p>
        </div>
      ))}
      {/* No rule ID here: the title above is the plain name. The ID is in "How this was checked". */}
      <div className="row-between">
        <div className="row no-print">
          <Button
            variant="secondary"
            onClick={() => void copyQuote(finding.evidence.join("\n")).then((ok) => setCopied(ok ? "copied" : "failed"))}
          >
            {copied === "copied" ? <Check className="icon" aria-hidden="true" /> : <Copy className="icon" aria-hidden="true" />}
            {copied === "copied" ? t("Copied") : t("Copy quote")}
          </Button>
          {onReport && (
            <Button variant="secondary" onClick={() => onReport(flag)}>
              <ShieldAlert className="icon" aria-hidden="true" />
              {t("Add to Threat Radar")}
            </Button>
          )}
        </div>
      </div>
      <p className="small text-red" role="status">
        {copied === "failed" ? t("Your browser did not allow copying. Select the quote and copy it yourself.") : ""}
      </p>
    </Card>
  );
}

// The result in the reference layout: risk banner, toolbar, two views (the red flags, and the
// checked text with each evidence quote marked), the checklist and the official portals. The score,
// band and findings are the server's, unchanged; every piece of offer text is rendered as text.
export function ResultCard({
  result,
  ruleCount,
  languageNotice: languageTier = null,
  coverage = null,
  sourceLang = null,
  offerSignals = null,
  sourceText = "",
  channel = null,
  redacted = 0,
  reopened = false,
  textNotKept = false,
  onNewAudit,
  onSave,
  onReport,
  children,
}: {
  result: AnalysisResult;
  ruleCount: number;
  // LANG-1: set from the text that was checked, never from the live text box. Fixed wording only.
  languageNotice?: LanguageNotice | null;
  // Batch B Stage 1: the coverage state, set at check time.
  coverage?: Coverage | null;
  // BATCHB-2: the source language code of a translation, from the fixed list.
  sourceLang?: string | null;
  // Batch A case 4: also set at check time. null means not recorded, so no notice.
  offerSignals?: readonly OfferSignal[] | null;
  // The text the rules read (always after Auto-Redact; the English after a translation).
  sourceText?: string;
  channel?: string | null;
  redacted?: number;
  // Re-opened from the Encrypted Vault: the box does not hold the original text, so the redaction
  // note does not say it does.
  reopened?: boolean;
  // Decision 2h: opened from a vault record saved without its checked text.
  textNotKept?: boolean;
  onNewAudit?: () => void;
  onSave?: () => void;
  onReport?: (flag: ViewRedFlag) => void;
  children?: ReactNode;
}) {
  const [view, setView] = useState<"flags" | "source">("flags");
  const [ticked, setTicked] = useState<ReadonlySet<number>>(NONE_TICKED);
  const [speaking, setSpeaking] = useState(false);
  const speech = useSpeechSupported();
  const lang = useLang();
  const t = useT();

  const { risk, findings } = result;
  const riskFindings = findings.filter((f): f is Finding & { severity: Exclude<Severity, "info"> } => f.severity !== "info");
  const warningMentions = findings.filter((finding) => finding.severity === "info");
  const crossChecks = validCrossChecks(result.crossChecks);
  const state: Coverage =
    coverage ?? (languageTier === "most" ? "unchecked" : languageTier === "part" ? "partial" : "full");
  const languageNotice = noticeForCoverage(state);
  // OFFER-1: one notice for the chip, the banner, the empty state and the Agent run.
  const notice = noticeFor(state, offerSignals, risk.band);
  const chip = scoreChip(risk, findings, notice);
  const tone = bannerTone(chip, risk.band);
  const resultView = toResultView(result, state);
  // Batch B decision 4: no points sum when the text was not checked.
  const arithmetic = notice === "most" ? null : scoreArithmetic(findings, risk);
  const notChecked = languageNotice === "most" && findings.length === 0;
  const partNotChecked = languageNotice === "part" && findings.length === 0;
  const translatedNone = notice === "translated" && findings.length === 0;
  const offerUnlike = notice === "offer" && findings.length === 0;
  // "Check it yourself": the warning-sign actions only, things you can check. The reporting
  // channels are a separate block below, with no ticks.
  const checklist = WARNING_SIGNS.map((sign) => sign.whatToDo);
  const ecrime = contact("ecrime");
  const otherChannels = mainChannels().filter((channel) => channel.url !== ecrime.url);

  const parts = highlightParts(
    sourceText,
    riskFindings.flatMap((finding) =>
      finding.evidence.map((quote) => ({
        quote,
        level: MARK_LEVEL[finding.severity],
        label: t(CHECK_LABELS[finding.check] ?? finding.check),
      })),
    ),
  );

  function listen() {
    if (!speech) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(spokenSummary(resultView, chip.label, notice, t));
    utterance.lang = lang === "ar" ? "ar-AE" : "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  function toggle(index: number) {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const portals = [
    { label: t("MoHRE offer enquiry"), url: MOHRE_INQUIRY_URL },
    { label: t("MoHRE website"), url: contact("mohre").url },
    { label: lang === "ar" ? contact("icp").arabicName : contact("icp").name, url: contact("icp").url },
  ];

  return (
    <div className="stack result">
      <Card
        as="section"
        tone={tone}
        className={cx("banner result-head score-card", `score-${chip.tone === "band" ? risk.band : chip.tone}`)}
        aria-labelledby="results-heading"
      >
        <div className="row-between result-head-row">
          <div className="result-title-block">
            <span className="gauge-wrap">
              {/* The score ring (AI Studio port): decoration around the icon, filled to risk.score from
                  scoring.ts. The number and the chip text carry the meaning; no ring when the text
                  was not checked, because there is no score to show. */}
              {notice !== "most" && (
                <svg className={cx("gauge", `gauge-${tone}`)} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
                  <circle className="gauge-track" cx="36" cy="36" r="33" pathLength={100} />
                  <circle
                    className="gauge-value"
                    cx="36"
                    cy="36"
                    r="33"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={100 - Math.min(100, Math.max(0, risk.score))}
                  />
                </svg>
              )}
              <span className={cx("icon-tile", tone === "high" ? "text-red" : tone === "medium" ? "text-amber" : tone === "green" ? "text-green" : "muted")}>
                {allClearShown(notice) && tone === "green" ? (
                  <CheckCircle2 className="icon icon-xl" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="icon icon-xl" aria-hidden="true" />
                )}
              </span>
            </span>
            <div className="stack-sm">
              {/* tabIndex -1: focus moves here when a check completes (revealResult.ts). */}
              <h2 id={RESULT_HEADING_ID} className="label-caps" tabIndex={-1}>
                {t("Risk indicators")}
              </h2>
              <p className="h1 score-text">
                {notice === "most" ? (
                  <span className="score-value score-not-checked">{t("Not checked")}</span>
                ) : (
                  <>
                    <span className="score-value">{risk.score}</span> <span className="score-max">/ 100</span>
                  </>
                )}
              </p>
              <p className={cx("chip", `chip-${CHIP_TONE[tone]}`, "score-label")}>{t(chip.label)}</p>
            </div>
          </div>
          {/* The actions sit on the score's row, at the end (top right in English, top left in
              Arabic), so Save is in view when the result is. On a narrow screen the group wraps under
              the score, above the rule tiles. Not printed. */}
          <div className="result-head-end">
            <div className="result-toolbar no-print" role="group" aria-label={t("Result actions")}>
              {speech && (
                <Button variant="secondary" onClick={listen} aria-pressed={speaking}>
                  {speaking ? <Square className="icon" aria-hidden="true" /> : <Volume2 className="icon" aria-hidden="true" />}
                  {speaking ? t("Stop") : t("Listen")}
                </Button>
              )}
              <Button variant="secondary" onClick={() => window.print()}>
                <FileDown className="icon" aria-hidden="true" />
                {t("Export PDF")}
              </Button>
              {onSave && (
                <Button variant="secondary" onClick={onSave}>
                  <Lock className="icon" aria-hidden="true" />
                  {t("Save to Encrypted Vault")}
                </Button>
              )}
              {onNewAudit && (
                <Button variant="secondary" onClick={onNewAudit}>
                  <RotateCcw className="icon" aria-hidden="true" />
                  {t("New Audit")}
                </Button>
              )}
            </div>
            <p className="result-meta">
              <strong>{t(plural(riskFindings.length, "red flag"))}</strong>
              {channel ? ` · ${t(channel)}` : ""}
              {redacted > 0 ? ` · ${t(`${plural(redacted, "number")} removed before checking`)}` : ""}
            </p>
          </div>
        </div>
        <p className="lead">{t(resultView.summary)}</p>
        {/* Evidence basis: a count of findings, each quoted from the text. Not shown when the text
            was not checked: there is nothing to count. */}
        {notice !== "most" && (
          <p className="evidence-basis small">
            <Quote className="icon text-green" aria-hidden="true" />
            <span>
              <strong>{t("Evidence basis:")}</strong>{" "}
              {riskFindings.length === 0
                ? t("no rule matched, so there is nothing to quote.")
                : t(`${plural(riskFindings.length, "matched rule")}, each with the exact words quoted from the text.`)}
            </span>
          </p>
        )}
        <ul className="dimensions" aria-label={t("Rule groups")}>
          {DIMENSIONS.map((dimension) => {
            const matched = riskFindings.filter((finding) => (dimension.rules as readonly string[]).includes(finding.source));
            const found = notice !== "most" && matched.length > 0;
            const dimTone = matched.some((finding) => finding.severity === "high") ? "high" : "medium";
            return (
              <li key={dimension.title} className={cx("dimension", found && `dimension-found tone-${dimTone}`)}>
                <span className="dimension-title">{t(dimension.title)}</span>
                <span className="dimension-bar" aria-hidden="true">
                  <span className="dimension-fill" />
                </span>
                <span className="dimension-status">
                  {t(notice === "most" ? "Not checked" : found ? "Indicator found" : "No indicator found")}
                </span>
              </li>
            );
          })}
        </ul>
        {languageNotice && (
          <Callout tone="neutral" role="note" className="language-notice">
            <p>{t(LANGUAGE_NOTICES[languageNotice])}</p>
          </Callout>
        )}
        {offerSignals && showOfferNotice(offerSignals, risk.band, languageNotice) && (
          <Callout tone="neutral" role="note" className="offer-notice">
            <p>{t(OFFER_NOTICE)}</p>
          </Callout>
        )}
        <dl className="stack-sm small">
          {arithmetic && (
            <div>
              <dt className="label-caps">{t("Points")}</dt>
              <dd className="arithmetic mono">{t(arithmetic)}</dd>
            </div>
          )}
          <div>
            <dt className="label-caps">{t("Bands")}</dt>
            <dd className="band-key">
              {t(
                "Each matched rule adds points. Bands: high {0} or more, medium {1} to {2}, low below {3}.",
                HIGH_BAND_MIN,
                MEDIUM_BAND_MIN,
                HIGH_BAND_MIN - 1,
                MEDIUM_BAND_MIN,
              )}
            </dd>
          </div>
        </dl>
        <Callout tone="neutral" className="disclaimer">
          <p>
            {t(
              "These are risk indicators, not a verdict on any company. Before you pay or share anything, confirm the offer through official government channels.",
            )}
          </p>
        </Callout>
        {reportLinkShown(risk.band, notice) && (
          <p className="report-link">
            <a href={`/portals#${REPORT_FRAUD_ID}`}>{t(REPORT_LINK_SENTENCE)}</a>
          </p>
        )}
      </Card>

      <Card as="section" className="stack" aria-label={t("Findings")}>
        <div className="view-switch">
          <div className="tabs tabs-boxed" role="tablist" aria-label={t("Result view")}>
            <button
              type="button"
              role="tab"
              id="tab-flags"
              className="tab"
              aria-selected={view === "flags"}
              aria-controls="panel-flags"
              onClick={() => setView("flags")}
            >
              <AlertTriangle className="icon" aria-hidden="true" />
              {t("Documented red flags ({0})", riskFindings.length)}
            </button>
            <button
              type="button"
              role="tab"
              id="tab-source"
              className="tab"
              aria-selected={view === "source"}
              aria-controls="panel-source"
              onClick={() => setView("source")}
            >
              <FileText className="icon" aria-hidden="true" />
              {t("Highlights in your text")}
            </button>
          </div>
          {view === "source" && (
            <div className="row small" aria-hidden="true">
              <span className="legend">
                <span className="swatch" /> {t("High")}
              </span>
              <span className="legend">
                <span className="swatch swatch-medium" /> {t("Medium")}
              </span>
              <span className="legend">
                <span className="swatch swatch-low" /> {t("Low")}
              </span>
            </div>
          )}
        </div>
        {/* Auto-Redact is silent: only when a number was hidden does the result say so. */}
        {redacted > 0 && <p className="small muted redaction-note">{t(reopened ? REDACTION_NOTE_SAVED : REDACTION_NOTE)}</p>}

        <div id="panel-flags" role="tabpanel" aria-labelledby="tab-flags" hidden={view !== "flags"} className="stack">
          {/* LANG-2, LANG-3, OFFER-1: with any notice, no green tick and no "all clear". */}
          {riskFindings.length === 0 && (
            <div className="empty stack-sm">
              {allClearShown(notice) ? (
                <CheckCircle2 className="icon icon-xl text-green" aria-hidden="true" />
              ) : (
                <Info className="icon icon-xl icon-info muted" aria-hidden="true" />
              )}
              <p className="no-match">
                {notChecked
                  ? t(
                      "The {0} rules read English only, so they could not check most of this text. This does not confirm that the offer is genuine.",
                      ruleCount,
                    )
                  : partNotChecked
                    ? t(
                        "None of the {0} rules matched in the English part. Part of the text was not checked, and this does not confirm that the offer is genuine.",
                        ruleCount,
                      )
                    : translatedNone
                      ? t(
                          "None of the {0} rules matched in the English translation. A translation can change the meaning, so this does not confirm that the offer is genuine.",
                          ruleCount,
                        )
                      : offerUnlike
                        ? t(
                            "None of the {0} rules matched. This text has no clear signs of a job offer, and this does not confirm that the offer is genuine.",
                            ruleCount,
                          )
                        : warningMentions.length === 0
                          ? t("None of the {0} rules matched. This does not confirm that the offer is genuine.", ruleCount)
                          : t(
                              "None of the {0} rules counted toward the score. The text mentions {1} only in a warning, shown below. This does not confirm that the offer is genuine.",
                              ruleCount,
                              plural(warningMentions.length, "topic"),
                            )}
              </p>
            </div>
          )}

          {riskFindings.length > 0 && (
            <ul className="stack findings">
              {riskFindings.map((finding, index) => (
                <FlagCard
                  key={finding.source}
                  finding={finding}
                  index={index}
                  flag={resultView.red_flags.find((flag) => flag.check === finding.check) ?? resultView.red_flags[0]}
                  onReport={onReport}
                />
              ))}
            </ul>
          )}

          {warningMentions.length > 0 && (
            <ul className="stack-sm warning-mentions">
              {warningMentions.map((finding) => (
                <li key={finding.source} className="card-sunken stack-sm">
                  <p className="label-caps">{t("Mentioned in a warning, not counted in the score")}</p>
                  <h3 className="h3">{t(CHECK_LABELS[finding.check] ?? finding.check)}</h3>
                  {finding.evidence.map((quote) => (
                    <p key={quote} className="quote">
                      {quote}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div id="panel-source" role="tabpanel" aria-labelledby="tab-source" hidden={view !== "source"} className="stack-sm">
          {textNotKept && <p className="small">{t(TEXT_NOT_KEPT)}</p>}
          <p className="small muted">{t("The text the rules read. Each quoted warning sign is marked.")}</p>
          <div className="source-text" dir="auto">
            {parts.map((part, index) =>
              part.mark ? (
                <mark
                  key={index}
                  className={cx("mark", part.mark.level === "High" ? "mark-high" : part.mark.level === "Medium" ? "mark-medium" : null)}
                  title={part.mark.label}
                >
                  {part.text}
                </mark>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )}
          </div>
        </div>
      </Card>

      <CrossChecksGroup result={result} />
      <OfficialStepsGroup result={result} />

      <div className="grid grid-2">
        <div className="stack">
        <Card as="section" className="stack-sm" aria-labelledby="checklist-heading">
          <div className="row-between">
            <h2 id="checklist-heading" className="h3 row">
              <ClipboardCheck className="icon text-green" aria-hidden="true" />
              <span>{t("Check it yourself")}</span>
            </h2>
            <Chip tone={ticked.size === checklist.length ? "green" : "neutral"} pill>
              {t("{0} / {1} done", ticked.size, checklist.length)}
            </Chip>
          </div>
          {/* How many of the steps you ticked. Your own progress, not a measure of the offer. */}
          <span className="meter" aria-hidden="true">
            <span className="meter-fill" style={{ inlineSize: `${(ticked.size / Math.max(1, checklist.length)) * 100}%` }} />
          </span>
          <ul className="stack-sm">
            {checklist.map((item, index) => (
              <li key={item}>
                <label className={cx("check-item", ticked.has(index) && "done")}>
                  <input type="checkbox" checked={ticked.has(index)} onChange={() => toggle(index)} />
                  <span>{t(item)}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" tone="high" className="stack-sm report-block" aria-labelledby="report-heading">
          <h2 id="report-heading" className="h3 row">
            <ShieldAlert className="icon text-red" aria-hidden="true" />
            <span>{t("If it looks like a scam, report it")}</span>
          </h2>
          <p className="small muted">{t(REPORT_FRAUD_NOTE)}</p>
          <div className="row">
            <ButtonLink href={ecrime.url} variant="danger">
              {lang === "ar" ? ecrime.arabicName : ecrime.name}
              <ExternalLink className="icon" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href={`tel:${ecrime.hotline}`}>
              <Phone className="icon" aria-hidden="true" />
              <span>
                {t("Call")} <span dir="ltr">{ecrime.hotlineLabel}</span>
              </span>
            </ButtonLink>
          </div>
          <ul className="stack-sm small report-links">
            {otherChannels.map((channel) => (
              <li key={channel.id}>
                <a href={channel.url} target="_blank" rel="noopener noreferrer">
                  {t(channel.name)}
                </a>
              </li>
            ))}
          </ul>
        </Card>
        </div>

        <Card as="section" className="stack-sm" aria-labelledby="portals-heading">
          <h2 id="portals-heading" className="h3 row">
            <ExternalLink className="icon text-green" aria-hidden="true" />
            <span>{t("Direct Government Portals")}</span>
          </h2>
          <p className="small muted">{t("Confirm the employer and the offer yourself, on the official sites.")}</p>
          <div className="stack-sm">
            {portals.map((portal) => (
              <ButtonLink key={portal.url} href={portal.url} block>
                {portal.label}
                <ExternalLink className="icon" aria-hidden="true" />
              </ButtonLink>
            ))}
          </div>
          <p className="portal-bar small">
            <a href={`/portals#${REPORT_FRAUD_ID}`}>{t("All hotlines and reporting channels")}</a>
          </p>
        </Card>
      </div>

      <Disclosure summary={t("How this was checked")} className="no-print">
        <AgentRun
          trace={result.trace}
          aggregatorSummary={qualifiedSummary(risk, findings, notice) ?? undefined}
          intakeNote={intakeNote(state, sourceLang)}
        />
        {/* The only place on the card with rule IDs: each matched rule's plain name, its points and
            its ID as a small reference, so the score can be traced to the rules. */}
        {findings.length > 0 && (
          <div className="stack-sm rule-refs">
            <h3 className="h3">{t("Rules that matched")}</h3>
            <ul className="stack-sm small">
              {riskFindings.map((finding) => (
                <li key={finding.source}>
                  {t(CHECK_LABELS[finding.check] ?? finding.check)}: {t("+{0} points", SEVERITY_WEIGHTS[finding.severity])}{" "}
                  <bdi className="rule-ref muted" dir="ltr">
                    {finding.source}
                  </bdi>
                </li>
              ))}
              {warningMentions.map((finding) => (
                <li key={finding.source}>
                  {t(CHECK_LABELS[finding.check] ?? finding.check)}: {t("Mentioned in a warning, not counted in the score")}{" "}
                  <bdi className="rule-ref muted" dir="ltr">
                    {finding.source}
                  </bdi>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* The cross-checks that matched, by plain name with their ID; no points, they are not scored. */}
        {crossChecks.length > 0 && (
          <div className="stack-sm rule-refs cross-check-refs">
            <h3 className="h3">{t("Cross-checks that matched")}</h3>
            <ul className="stack-sm small">
              {crossChecks.map((check, index) => (
                <li key={`${check.check}-${index}`}>
                  {t(CROSS_CHECK_LABELS[check.check])}: {t("Not counted in the score")}{" "}
                  <bdi className="rule-ref muted" dir="ltr">
                    {check.id}
                  </bdi>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Disclosure>

      {children}
    </div>
  );
}
