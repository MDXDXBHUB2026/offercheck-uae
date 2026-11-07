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

const STATUS: Record<TraceStatus, { icon: string; label: string }> = {
  completed: { icon: "✓", label: "Completed" },
  not_implemented: { icon: "○", label: "Not implemented yet" },
};

export function AgentRun({ trace }: { trace: TraceStep[] }) {
  return (
    <section className="agent-run" aria-label="Agent run">
      <h3>Agent run</h3>
      <ol>
        {trace.map((step) => (
          <li key={step.agent} className={`trace-${step.status}`}>
            <span className="trace-icon" role="img" aria-label={STATUS[step.status].label}>
              {STATUS[step.status].icon}
            </span>
            <span className="trace-agent">{AGENT_LABELS[step.agent] ?? step.agent}</span>
            <span className="trace-summary">{step.summary}</span>
            <span className="trace-time">
              {step.durationMs === null ? "Not run" : `${step.durationMs.toFixed(2)} ms`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
