import { scoreFindings } from "../scoring";
import type { AnalysisResult, TraceStep } from "../types";
import { cleanOfferText } from "./intake";
import { RULES, runRedFlagWorker } from "./redFlag";

const NOT_IMPLEMENTED = "Not yet implemented";

function timed<T>(run: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = run();
  return { result, durationMs: performance.now() - start };
}

function notImplemented(agent: string): TraceStep {
  return { agent, status: "not_implemented", durationMs: null, summary: NOT_IMPLEMENTED };
}

// Plans, routes and merges only. It never sends, stores or contacts anyone.
// The trace only reports on the run: nothing in it feeds into the score.
export function runManager(offerText: string): AnalysisResult {
  const start = performance.now();
  const intake = timed(() => cleanOfferText(offerText));
  const redFlag = timed(() => runRedFlagWorker(intake.result.text));
  const aggregator = timed(() => scoreFindings(redFlag.result));
  const durationMs = performance.now() - start;

  const findings = redFlag.result;
  const risk = aggregator.result;
  const plan = ["intake", "red_flag", "risk_aggregator"];

  return {
    plan,
    findings,
    risk,
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
      notImplemented("verification"),
      notImplemented("official_channel"),
      {
        agent: "risk_aggregator",
        status: "completed",
        durationMs: aggregator.durationMs,
        summary: `Score ${risk.score} of 100: ${risk.label}`,
      },
    ],
  };
}
