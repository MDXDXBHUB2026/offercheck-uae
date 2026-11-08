import { SectionHeader, Timeline } from "@/components/ui";
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
// finding), so it agrees with the chip. The trace itself, from the server, is unchanged.
export function AgentRun({ trace, aggregatorSummary }: { trace: TraceStep[]; aggregatorSummary?: string }) {
  return (
    <section className="block agent-run" aria-labelledby="agent-run-heading">
      <SectionHeader id="agent-run-heading" title="Agent run" />
      <Timeline
        items={trace.map((step) => ({
          id: step.agent,
          title: AGENT_LABELS[step.agent] ?? step.agent,
          status: step.status,
          statusLabel: STATUS_LABELS[step.status],
          detail: step.agent === "risk_aggregator" && aggregatorSummary ? aggregatorSummary : step.summary,
          meta: step.durationMs === null ? "Not run" : `${step.durationMs.toFixed(2)} ms`,
        }))}
      />
    </section>
  );
}
