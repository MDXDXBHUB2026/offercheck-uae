import { describe, expect, it } from "vitest";
import { runManager } from "./agents/manager";
import { EVAL_OFFERS } from "./agents/eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "./agents/fixtures";
import { runRecords } from "./audit";
import { runWithAudit } from "./auditRun";
import type { AnalysisResult } from "./types";

// The audit.ts change for Verification and Official channel (owner-approved, 2026-11-11, with
// conditions): one branch only; fixed vocabulary (check ids and counts); no offer text or quoted
// words in any audit entry; the entries for the existing steps stay byte-identical.

const AT = "2026-11-11T10:00:00.000Z";

// The run as it was before the two steps existed: both stubs, no new fields.
function asBefore(result: AnalysisResult): AnalysisResult {
  const stub = (agent: string) => ({ agent, status: "not_implemented" as const, durationMs: null, summary: "Not implemented yet" });
  return {
    plan: ["intake", "red_flag", "risk_aggregator"],
    findings: result.findings,
    risk: result.risk,
    trace: result.trace.map((step) =>
      step.agent === "verification" || step.agent === "official_channel" ? stub(step.agent) : step,
    ),
  };
}

const NEW_AGENTS = new Set(["verification", "official_channel"]);
const isNewStep = (record: { data: Record<string, unknown> }) => NEW_AGENTS.has(String(record.data.agent));

// Uses every cross-check, with words that never occur in the audit vocabulary.
export const CROSS_CHECK_OFFER = [
  "Zorvex Quintal Trading LLC is hiring.",
  "Write to zorvexhr@gmail.com.",
  "Message us solely on WhatsApp.",
  "Apply at bit.ly/qx7Zr or mohre-zorvex.com or http://203.0.113.9/apply.",
  "We are approved by MoHRE.",
  "There are no fees.",
  "Pay the visa fee of AED 900 today.",
  "Salary AED 9,000 per month (USD 2,450).",
].join("\n");

describe("audit entries of the existing steps are byte-identical", () => {
  it.each<[string, string]>([
    ["scam fixture", SCAM_OFFER],
    ["legit fixture", LEGIT_OFFER],
    ["every cross-check", CROSS_CHECK_OFFER],
    ...EVAL_OFFERS.map((offer): [string, string] => [offer.id, offer.text]),
  ])("%s", (_name, text) => {
    const result = runManager(text);
    const now = runRecords("run", text.length, result, AT, AT).filter((record) => !isNewStep(record));
    const before = runRecords("run", text.length, asBefore(result), AT, AT).filter((record) => !isNewStep(record));
    expect(JSON.stringify(now)).toBe(JSON.stringify(before));
  });

  it("the new steps' entries hold only agent, status, duration, check ids and a count", () => {
    const result = runManager(CROSS_CHECK_OFFER);
    for (const record of runRecords("run", 1, result, AT, AT).filter(isNewStep)) {
      expect(Object.keys(record.data).sort()).toEqual(["agent", "checkIds", "count", "durationMs", "status"]);
      expect(record.data.status).toBe("completed");
      expect(typeof record.data.count).toBe("number");
      for (const id of record.data.checkIds as string[]) expect(id).toMatch(/^(?:RF-00[1-5]|V-0[1-5])$/);
    }
  });
});

describe("an audit trail from a run with cross-check matches holds none of the offer's words", () => {
  it("every cross-check matched, and no word of the offer reaches any entry", async () => {
    const run = await runWithAudit(CROSS_CHECK_OFFER);
    expect(new Set(run.crossChecks?.map((check) => check.id))).toEqual(new Set(["V-01", "V-02", "V-03", "V-04", "V-05"]));
    const verification = run.audit.find((entry) => entry.data.agent === "verification");
    expect(verification?.data.checkIds).toEqual(["V-01", "V-02", "V-03", "V-04", "V-05"]);
    expect(verification?.data.count).toBe(run.crossChecks?.length);

    // The entries without their hashes and random run id, which are hex and could hold any digits.
    const log = JSON.stringify(run.audit.map((entry) => {
      const copy: Record<string, unknown> = { ...entry };
      for (const key of ["hash", "prevHash", "runId"]) delete copy[key];
      return copy;
    })).toLowerCase();
    // Words: every token with a letter (numbers alone are lengths and durations, not offer words).
    const words = new Set((CROSS_CHECK_OFFER.toLowerCase().match(/[a-z0-9@.-]{3,}/g) ?? []).filter((w) => /[a-z]/.test(w)));
    expect(words.size).toBeGreaterThan(30);
    for (const word of words) expect(log, word).not.toContain(word.replace(/[.,]+$/, ""));
    // The quoted evidence, whole, is nowhere in the log either.
    for (const quote of run.crossChecks?.flatMap((check) => check.evidence) ?? []) {
      expect(log).not.toContain(quote.toLowerCase());
    }
  });
});
