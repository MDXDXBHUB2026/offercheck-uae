import { AgentRun } from "@/components/AgentRun";
import { HIGH_BAND_MIN, MEDIUM_BAND_MIN, SEVERITY_WEIGHTS } from "@/lib/scoring";
import type { AnalysisResult } from "@/lib/types";

const CHECK_LABELS: Record<string, string> = {
  fee_requested: "Asks you to pay a fee or money",
  credentials_requested: "Asks for a code, password or card details",
  identity_documents_requested: "Asks for identity or bank documents",
  urgency_pressure: "Pressure to act quickly",
  free_email_contact: "Uses a free email address",
  fee_mentioned_in_warning: "Fee mentioned in a warning",
  credentials_mentioned_in_warning: "Code or password mentioned in a warning",
  documents_mentioned_in_warning: "Documents mentioned in a warning",
  urgency_mentioned_in_warning: "Urgency mentioned in a warning",
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function ResultsPanel({ result, ruleCount }: { result: AnalysisResult; ruleCount: number }) {
  const { risk, findings } = result;
  const riskFindings = findings.filter((finding) => finding.severity !== "info");
  const warningMentions = findings.filter((finding) => finding.severity === "info");
  return (
    <section className="results" aria-label="Results">
      <div className={`score score-${risk.band}`}>
        <span className="score-value">{risk.score}</span>
        <span className="score-max">/ 100</span>
        <span className="score-label">{risk.label}</span>
      </div>
      <p className="band-key">
        Each matched rule adds points. Bands: high {HIGH_BAND_MIN} or more, medium{" "}
        {MEDIUM_BAND_MIN} to {HIGH_BAND_MIN - 1}, low below {MEDIUM_BAND_MIN}.
      </p>

      {riskFindings.length === 0 && (
        <p className="no-match">
          {warningMentions.length === 0
            ? `None of the ${ruleCount} rules matched.`
            : `None of the ${ruleCount} rules counted toward the score. The text mentions ${plural(warningMentions.length, "topic")} only in a warning, shown below.`}{" "}
          This does not confirm that the offer is genuine.
        </p>
      )}

      {riskFindings.length > 0 && (
        <ul className="findings">
          {riskFindings.map((finding) => (
            <li key={finding.source}>
              <h2>
                {CHECK_LABELS[finding.check] ?? finding.check}
                <span className={`severity severity-${finding.severity}`}>
                  {finding.severity} rule, +{SEVERITY_WEIGHTS[finding.severity]} points
                </span>
              </h2>
              {finding.evidence.map((quote) => (
                <blockquote key={quote}>{quote}</blockquote>
              ))}
              <p className="source">Rule {finding.source}</p>
            </li>
          ))}
        </ul>
      )}

      {warningMentions.length > 0 && (
        <ul className="warning-mentions">
          {warningMentions.map((finding) => (
            <li key={finding.source}>
              <p className="warning-note">Mentioned in a warning, not counted in the score</p>
              <h2>{CHECK_LABELS[finding.check] ?? finding.check}</h2>
              {finding.evidence.map((quote) => (
                <blockquote key={quote}>{quote}</blockquote>
              ))}
              <p className="source">Rule {finding.source}</p>
            </li>
          ))}
        </ul>
      )}

      <AgentRun trace={result.trace} />

      <p className="disclaimer">
        These are risk indicators, not a verdict on any company. Before you pay or share anything,
        confirm the offer through official government channels.
      </p>
    </section>
  );
}
