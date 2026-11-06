import { describe, expect, it } from "vitest";
import { scoreFindings } from "./scoring";
import type { Finding, Severity } from "./types";

function finding(severity: Severity): Finding {
  return {
    agent: "red_flag",
    check: "test",
    severity,
    evidence: ["quote"],
    confidence: "rule",
    source: "RF-000",
  };
}

describe("scoreFindings", () => {
  it("scores no findings as 0 with no-indicator wording", () => {
    expect(scoreFindings([])).toEqual({ score: 0, band: "low", label: "No risk indicators found" });
  });

  it("uses no-indicator wording when only info findings exist", () => {
    expect(scoreFindings([finding("info")])).toEqual({
      score: 0,
      band: "low",
      label: "No risk indicators found",
    });
  });

  it.each<[Severity[], number, string]>([
    [["info"], 0, "low"],
    [["low"], 10, "low"],
    [["medium"], 20, "low"],
    [["high"], 60, "high"],
    [["high", "low"], 60, "high"],
    [["medium", "medium"], 40, "medium"],
    [["medium", "medium", "medium"], 60, "high"],
    [["high", "medium"], 60, "high"],
    [["high", "medium", "medium"], 80, "high"],
    [["high", "high"], 80, "high"],
  ])("scores %j as %i (%s)", (severities, score, band) => {
    const result = scoreFindings(severities.map(finding));
    expect(result.score).toBe(score);
    expect(result.band).toBe(band);
  });

  it("caps the score at 100", () => {
    const severities: Severity[] = ["high", "high", "high"];
    expect(scoreFindings(severities.map(finding)).score).toBe(100);
  });

  it("never uses verdict wording", () => {
    const severities: Severity[] = ["high", "medium", "low"];
    for (const severity of severities) {
      expect(scoreFindings([finding(severity)]).label).toMatch(/risk indicators$/);
    }
  });
});
