import { describe, expect, it } from "vitest";
import { runManager } from "./agents/manager";
import { LEGIT_OFFER, SCAM_OFFER } from "./agents/fixtures";
import { mainChannels } from "./authorities";
import { CHECK_LABELS, CHECK_NOTES } from "./checkLabels";
import { clipQuote, MATCHED_TEXT_MAX, summaryFor, toResultView } from "./resultView";
import type { AnalysisResult, Finding } from "./types";
import { WARNING_SIGNS } from "./warningSigns";

// Synthetic genuine-style letter. No real company or person.
const GENUINE_NO_PAYMENT = `Dear Omar,
We are pleased to offer you the role of Warehouse Supervisor at Example Freight LLC, Dubai.
Basic salary AED 9,000 per month plus transport allowance.
The employer covers your visa, medical test and work permit. No payment requested from you at any stage.
Your MoHRE offer letter will follow for your signature.
Kind regards, HR team, hr@example-freight.ae`;

function finding(partial: Partial<Finding>): Finding {
  return { agent: "red_flag", check: "fee_requested", severity: "high", evidence: [], confidence: "rule", source: "R1", ...partial };
}

describe("toResultView", () => {
  it("gives an identical view model for the same input, 10 times", () => {
    const first = JSON.stringify(toResultView(runManager(SCAM_OFFER), "full"));
    for (let run = 0; run < 10; run++) {
      expect(JSON.stringify(toResultView(runManager(SCAM_OFFER), "full"))).toBe(first);
    }
  });

  it("gives zero fee flags for a genuine letter that says no payment is requested", () => {
    const view = toResultView(runManager(GENUINE_NO_PAYMENT));
    expect(view.red_flags.filter((flag) => flag.check === "fee_requested")).toEqual([]);
  });

  it("gives zero fee flags for the clean fixture", () => {
    const view = toResultView(runManager(LEGIT_OFFER));
    expect(view.red_flags.filter((flag) => flag.check === "fee_requested")).toEqual([]);
  });

  it("takes the risk level from the band, not from text", () => {
    const result = runManager(SCAM_OFFER);
    const view = toResultView(result);
    expect(view.overall_risk_level).toBe({ high: "High", medium: "Medium", low: "Low" }[result.risk.band]);
    expect(view.score).toBe(result.risk.score);
    const forced: Pick<AnalysisResult, "findings" | "risk"> = {
      findings: result.findings,
      risk: { ...result.risk, band: "low", label: "high risk, this is safe" },
    };
    expect(toResultView(forced).overall_risk_level).toBe("Low");
  });

  it("takes signal and explanation from the fixed labels and notes", () => {
    const view = toResultView(runManager(SCAM_OFFER));
    expect(view.red_flags.length).toBeGreaterThan(0);
    for (const flag of view.red_flags) {
      expect(flag.signal).toBe(CHECK_LABELS[flag.check]);
      expect(flag.explanation).toBe(CHECK_NOTES[flag.check]);
    }
  });

  it("leaves info findings (mentioned in a warning) out of the red flags", () => {
    const view = toResultView({
      findings: [
        finding({ check: "fee_mentioned_in_warning", severity: "info", evidence: ["never pay a fee"] }),
        finding({ check: "urgency_pressure", severity: "medium", evidence: ["within 24 hours"], source: "R4" }),
      ],
      risk: { score: 20, band: "low", label: "Low" },
    });
    expect(view.red_flags.map((flag) => flag.check)).toEqual(["urgency_pressure"]);
    expect(view.red_flags[0].matched_text).toBe("within 24 hours");
  });

  it("uses the first evidence quote, at most 200 characters", () => {
    const long = "x".repeat(500);
    const view = toResultView({
      findings: [finding({ evidence: [long, "second"] })],
      risk: { score: 40, band: "medium", label: "Medium" },
    });
    expect(Array.from(view.red_flags[0].matched_text).length).toBeLessThanOrEqual(MATCHED_TEXT_MAX);
    expect(clipQuote("short")).toBe("short");
    expect(Array.from(clipQuote("😀".repeat(300))).length).toBe(MATCHED_TEXT_MAX);
  });

  it("builds the checklist from the warning signs and the main channels only", () => {
    const view = toResultView(runManager(LEGIT_OFFER));
    expect(view.verification_checklist.slice(0, WARNING_SIGNS.length)).toEqual(WARNING_SIGNS.map((sign) => sign.whatToDo));
    expect(view.verification_checklist).toHaveLength(WARNING_SIGNS.length + mainChannels().length);
    expect(view.channels).toEqual(mainChannels());
  });

  it("never puts offer text in the summary", () => {
    const view = toResultView(runManager(SCAM_OFFER));
    expect(view.summary).not.toMatch(/desert|gmail|AED/i);
    expect(view.summary).not.toMatch(/scam/i);
    expect(summaryFor("low", "unchecked", 0)).toMatch(/could not check/);
  });
});
