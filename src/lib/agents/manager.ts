import { scoreFindings } from "../scoring";
import type { AnalysisResult, TraceStep } from "../types";
import { selectOfficialSteps } from "../officialSteps";
import { cleanOfferText } from "./intake";
import { RULES, runRedFlagWorker } from "./redFlag";
import { authorityMentionIds, CROSS_CHECKS, matchedIds, runVerification } from "./verification";

function timed<T>(run: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = run();
  return { result, durationMs: performance.now() - start };
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

// "2 official steps for 3 findings", "1 official step for a UAE authority named in the text", or both.
function officialSummary(forFindings: number, findings: number, forMentionOnly: number): string {
  const steps = (count: number) => `${count} ${plural(count, "official step", "official steps")}`;
  const mention = `${steps(forMentionOnly)} for a UAE authority named in the text`;
  if (forFindings === 0) return forMentionOnly === 0 ? "No official step applies to these findings" : mention;
  const base = `${steps(forFindings)} for ${findings} ${plural(findings, "finding", "findings")}`;
  return forMentionOnly === 0 ? base : `${base}, and ${mention}`;
}

// Plans, routes and merges only. It never sends, stores or contacts anyone.
// The trace only reports on the run: nothing in it feeds into the score.
// Verification and Official channel (2026-11-11) run on the cleaned text and the red-flag findings,
// with no model and no network. They are score-neutral: the score is computed from the red-flag
// findings alone, before either of them runs, and neither adds to the findings.
export function runManager(offerText: string): AnalysisResult {
  const start = performance.now();
  const intake = timed(() => cleanOfferText(offerText));
  const redFlag = timed(() => runRedFlagWorker(intake.result.text));
  const aggregator = timed(() => scoreFindings(redFlag.result));
  const findings = redFlag.result;
  const risk = aggregator.result;
  const verification = timed(() => runVerification(intake.result.text, findings));
  const crossChecks = verification.result;
  const crossIds = matchedIds(crossChecks);
  const ruleIds = findings.filter((f) => f.severity !== "info").map((f) => f.source);
  // A plain mention of an authority adds that authority's entry, with no cross-check.
  const official = timed(() => selectOfficialSteps([...ruleIds, ...crossIds, ...authorityMentionIds(intake.result.text)]));
  const officialSteps = official.result;
  // The audit keeps to rule and cross-check ids; a mention is counted in the step count only.
  const coveredIds = [...ruleIds, ...crossIds].filter((id) => officialSteps.some((step) => step.forIds.includes(id)));
  const forFindings = officialSteps.filter((step) => step.forIds.some((id) => coveredIds.includes(id))).length;
  const forMentionOnly = officialSteps.length - forFindings;
  const durationMs = performance.now() - start;

  const plan = ["intake", "red_flag", "verification", "official_channel", "risk_aggregator"];
  const steps: TraceStep[] = [
    {
      agent: "verification",
      status: "completed",
      durationMs: verification.durationMs,
      summary: `${crossIds.length} of ${CROSS_CHECKS.length} cross-checks matched`,
      checkIds: crossIds,
      count: crossChecks.length,
    },
    {
      agent: "official_channel",
      status: "completed",
      durationMs: official.durationMs,
      summary: officialSummary(forFindings, coveredIds.length, forMentionOnly),
      checkIds: coveredIds,
      count: officialSteps.length,
    },
  ];

  return {
    plan,
    findings,
    risk,
    crossChecks,
    officialSteps,
    trace: [
      {
        agent: "manager",
        status: "completed",
        durationMs,
        summary: `Ran ${plan.length} steps and merged the results`,
      },
      {
        agent: "intake",
        status: "completed",
        durationMs: intake.durationMs,
        summary: `Cleaned ${intake.result.text.length} characters, removed ${intake.result.hiddenCharsRemoved} hidden`,
      },
      {
        agent: "red_flag",
        status: "completed",
        durationMs: redFlag.durationMs,
        summary: `${findings.filter((f) => f.severity !== "info").length} of ${RULES.length} rules matched`,
      },
      ...steps,
      {
        agent: "risk_aggregator",
        status: "completed",
        durationMs: aggregator.durationMs,
        summary: `Score ${risk.score} of 100: ${risk.label}`,
      },
    ],
  };
}
