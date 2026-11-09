// Adapter only: turns the deterministic Manager result into the view model the reference interface
// (docs/reference/aistudio, AnalysisResult in src/types.ts there) renders. It never changes the
// score, the band or the findings, and it reads nothing from a model. Pure: the same input always
// gives the same output (resultView.test.ts).
//
// - overall_risk_level comes from our band, never from text.
// - signal and explanation come from the fixed CHECK_LABELS and CHECK_NOTES.
// - matched_text is the first evidence quote, at most MATCHED_TEXT_MAX characters. It is offer text:
//   untrusted, and the UI must render it as text only, never as HTML.
// - Info findings (*_mentioned_in_warning) are not red flags and are left out of red_flags.
// - verification_checklist comes from the official-source warning signs and the main channels.
import { mainChannels } from "./authorities";
import { CHECK_LABELS, CHECK_NOTES } from "./checkLabels";
import type { Coverage } from "./coverage";
import type { AnalysisResult, Finding, RiskBand, Severity } from "./types";
import { WARNING_SIGNS } from "./warningSigns";

export type ViewRiskLevel = "High" | "Medium" | "Low";

export type ViewRedFlag = {
  // The rule check id, kept so the UI can key and link without parsing the label.
  check: string;
  signal: string;
  severity: ViewRiskLevel;
  matched_text: string;
  explanation: string;
};

export type ViewChannel = { id: string; name: string; url: string };

export type ResultView = {
  overall_risk_level: ViewRiskLevel;
  score: number;
  coverage: Coverage;
  summary: string;
  red_flags: ViewRedFlag[];
  verification_checklist: string[];
  channels: ViewChannel[];
};

export const MATCHED_TEXT_MAX = 200;

const LEVEL: Record<RiskBand, ViewRiskLevel> = { high: "High", medium: "Medium", low: "Low" };
const SEVERITY_LEVEL: Record<Exclude<Severity, "info">, ViewRiskLevel> = { high: "High", medium: "Medium", low: "Low" };

const NOT_A_VERDICT = "These are risk indicators, not a verdict on any company.";
const NOT_CONFIRMED = "This does not confirm that the offer is genuine.";

// Cut by code points, so a surrogate pair is never split. The cut keeps the total within the max.
export function clipQuote(quote: string, max: number = MATCHED_TEXT_MAX): string {
  const points = Array.from(quote.trim());
  return points.length <= max ? points.join("") : `${points.slice(0, max - 1).join("")}…`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function isRedFlag(finding: Finding): finding is Finding & { severity: Exclude<Severity, "info"> } {
  return finding.severity !== "info";
}

function toRedFlag(finding: Finding & { severity: Exclude<Severity, "info"> }): ViewRedFlag {
  return {
    check: finding.check,
    signal: CHECK_LABELS[finding.check] ?? finding.check,
    severity: SEVERITY_LEVEL[finding.severity],
    matched_text: clipQuote(finding.evidence[0] ?? ""),
    explanation: CHECK_NOTES[finding.check] ?? "",
  };
}

// Fixed sentences chosen by band, coverage and the count of red flags. No offer text.
export function summaryFor(band: RiskBand, coverage: Coverage, flagCount: number): string {
  if (coverage === "unchecked") {
    return `Most of this text is not in English, so the rules could not check it. ${NOT_CONFIRMED}`;
  }
  const head =
    flagCount === 0
      ? `None of the rules matched. ${NOT_CONFIRMED}`
      : band === "low"
        ? // UX-1: a low band with a match never reads "Low risk indicators", which can sound safe.
          `${plural(flagCount, "warning sign")} matched. Review ${flagCount === 1 ? "it" : "them"} below. ${NOT_A_VERDICT}`
        : `${LEVEL[band]} risk indicators: ${plural(flagCount, "warning sign")} matched. ${NOT_A_VERDICT}`;
  if (coverage === "partial") return `${head} Part of the text is not in English and was not checked.`;
  if (coverage === "translated") return `${head} The rules checked a machine translation, which can change the meaning.`;
  return head;
}

// Official-source steps first (the "What to do" line of each warning sign), then one line per main
// reporting channel. Fixed text only.
export function verificationChecklist(): string[] {
  return [
    ...WARNING_SIGNS.map((sign) => sign.whatToDo),
    ...mainChannels().map((channel) => `If you think it is a scam, report it: ${channel.name}.`),
  ];
}

export function toResultView(result: Pick<AnalysisResult, "findings" | "risk">, coverage: Coverage = "full"): ResultView {
  const red_flags = result.findings.filter(isRedFlag).map(toRedFlag);
  return {
    overall_risk_level: LEVEL[result.risk.band],
    score: result.risk.score,
    coverage,
    summary: summaryFor(result.risk.band, coverage, red_flags.length),
    red_flags,
    verification_checklist: verificationChecklist(),
    channels: mainChannels(),
  };
}
