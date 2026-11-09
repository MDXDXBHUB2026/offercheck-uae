import { CheckCircle2, CircleDashed } from "lucide-react";
import type { TraceStatus, TraceStep } from "@/lib/types";

const AGENT_LABELS: Record<string, string> = {
  manager: "Manager",
  // Intake only cleans the text so far: it does not extract claims yet.
  intake: "Intake (text cleaning only)",
  red_flag: "Red-flag",
  verification: "Verification",
  official_channel: "Official channel",
  risk_aggregator: "Risk aggregator",
};

const STATUS_LABELS: Record<TraceStatus, string> = {
  completed: "Completed",
  not_implemented: "Not implemented yet",
};

// The run as a timeline. Times are the measured durationMs values; a step that did not run says so.
// aggregatorSummary replaces only what the Risk aggregator row shows (LANG-2, tier 1 with no
// finding), so it agrees with the chip. Batch B Stage 1: intakeNote is added to the Intake row to say
// which part of the text was not checked. The trace itself, from the server, is unchanged.
export function AgentRun({
  trace,
  aggregatorSummary,
  intakeNote,
}: {
  trace: TraceStep[];
  aggregatorSummary?: string;
  intakeNote?: string;
}) {
  return (
    <section className="stack-sm agent-run" aria-labelledby="agent-run-heading">
      <h3 id="agent-run-heading" className="h3">
        Agent run
      </h3>
      <ol className="audit-list">
        {trace.map((step) => {
          const detail =
            step.agent === "risk_aggregator" && aggregatorSummary
              ? aggregatorSummary
              : step.agent === "intake" && intakeNote
                ? `${step.summary} ${intakeNote}`
                : step.summary;
          return (
            <li key={step.agent} className={`trace-${step.status}`}>
              <span className="row">
                <span className="trace-icon" role="img" aria-label={STATUS_LABELS[step.status]}>
                  {step.status === "completed" ? (
                    <CheckCircle2 className="icon text-green" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="icon muted" aria-hidden="true" />
                  )}
                </span>
                <span className="trace-agent">{AGENT_LABELS[step.agent] ?? step.agent}</span>
              </span>
              <span className="trace-summary">{detail}</span>
              <code className="trace-time">{step.durationMs === null ? "Not run" : `${step.durationMs.toFixed(2)} ms`}</code>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
