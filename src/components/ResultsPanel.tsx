import type { ReactNode } from "react";
import { AgentRun } from "@/components/AgentRun";
import { CheckCircleIcon, QuoteGlyph } from "@/components/icons";
import { scoreArithmetic } from "@/components/scoreArithmetic";
import { NOT_CHECKED_LABEL } from "@/components/scoreChip";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Callout, Card, Chip, SectionHeader } from "@/components/ui";
import { HIGH_BAND_MIN, MEDIUM_BAND_MIN, SEVERITY_WEIGHTS } from "@/lib/scoring";
import { OFFER_NOTICE, showOfferNotice, type OfferSignal } from "@/lib/offerLikeness";
import { LANGUAGE_NOTICES, type LanguageNotice } from "@/lib/textScript";
import type { AnalysisResult } from "@/lib/types";

export const CHECK_LABELS: Record<string, string> = {
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

// One plain line on why each pattern matters. General guidance, not a finding about the sender.
const CHECK_NOTES: Record<string, string> = {
  fee_requested: "Being asked to pay before you start work is a common pattern in recruitment scams.",
  credentials_requested: "An employer has no need for your passwords, one-time codes or card details.",
  identity_documents_requested:
    "Sending identity or bank documents before a verified written offer can expose you to fraud.",
  urgency_pressure: "Pressure to act fast leaves you less time to check the offer.",
  free_email_contact: "Recruiters for a registered company usually write from the company's own domain.",
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Quotes({ quotes }: { quotes: string[] }) {
  return (
    <>
      {quotes.map((quote) => (
        <blockquote key={quote}>
          <QuoteGlyph />
          <span>{quote}</span>
        </blockquote>
      ))}
    </>
  );
}

// Two columns from 1024px: the score on the left (sticky), and on the right the findings, the
// agent run, then whatever the caller passes (the draft and the audit trail). One column below.
export function ResultsPanel({
  result,
  ruleCount,
  languageNotice = null,
  offerSignals = null,
  children,
}: {
  result: AnalysisResult;
  ruleCount: number;
  // LANG-1: set from the text that was checked, never from the live text box. Fixed wording only.
  languageNotice?: LanguageNotice | null;
  // Batch A case 4: also set at check time. null means not recorded, so no notice.
  offerSignals?: readonly OfferSignal[] | null;
  children?: ReactNode;
}) {
  const { risk, findings } = result;
  const riskFindings = findings.filter((finding) => finding.severity !== "info");
  const warningMentions = findings.filter((finding) => finding.severity === "info");
  const arithmetic = scoreArithmetic(findings, risk);
  const notChecked = languageNotice === "most" && findings.length === 0;
  return (
    <div className="results">
      <div className="results-side">
        <section className="card score-card" aria-labelledby="results-heading">
          <h2 id="results-heading" className="eyebrow">
            Risk indicators
          </h2>
          <ScoreGauge risk={risk} findings={findings} languageNotice={languageNotice} />
          {languageNotice && (
            <Callout tone="neutral" role="note" className="language-notice">
              <p>{LANGUAGE_NOTICES[languageNotice]}</p>
            </Callout>
          )}
          {offerSignals && showOfferNotice(offerSignals, risk.band, languageNotice) && (
            <Callout tone="neutral" role="note" className="offer-notice">
              <p>{OFFER_NOTICE}</p>
            </Callout>
          )}
          <dl className="score-facts">
            {arithmetic && (
              <div>
                <dt>Points</dt>
                <dd className="arithmetic">{arithmetic}</dd>
              </div>
            )}
            <div>
              <dt>Bands</dt>
              <dd className="band-key">
                Each matched rule adds points. Bands: high {HIGH_BAND_MIN} or more, medium{" "}
                {MEDIUM_BAND_MIN} to {HIGH_BAND_MIN - 1}, low below {MEDIUM_BAND_MIN}.
              </dd>
            </div>
          </dl>
          <Callout tone="neutral" className="disclaimer">
            <p>
              These are risk indicators, not a verdict on any company. Before you pay or share
              anything, confirm the offer through official government channels.
            </p>
          </Callout>
        </section>
      </div>

      <div className="results-main">
        <section className="block" aria-labelledby="findings-heading">
          <SectionHeader id="findings-heading" title="Findings" />

          {/* LANG-2: when most of the text is not English and nothing matched, say the rules could
              not read it, with no tick: "none matched" would imply they ran on readable text. */}
          {riskFindings.length === 0 && (
            <Card className="empty-state">
              {!notChecked && <CheckCircleIcon size={24} />}
              <p className="no-match">
                {notChecked
                  ? `The ${ruleCount} rules read English only, so they could not check most of this text.`
                  : warningMentions.length === 0
                  ? `None of the ${ruleCount} rules matched.`
                  : `None of the ${ruleCount} rules counted toward the score. The text mentions ${plural(warningMentions.length, "topic")} only in a warning, shown below.`}{" "}
                This does not confirm that the offer is genuine.
              </p>
            </Card>
          )}

          {riskFindings.length > 0 && (
            <ul className="findings">
              {riskFindings.map((finding) => (
                <li key={finding.source} className={`card finding finding-${finding.severity}`}>
                  <Chip tone={finding.severity === "low" ? "success" : finding.severity === "high" ? "high" : "medium"} className="severity">
                    {finding.severity} rule, +{SEVERITY_WEIGHTS[finding.severity]} points
                  </Chip>
                  <h3>{CHECK_LABELS[finding.check] ?? finding.check}</h3>
                  {CHECK_NOTES[finding.check] && <p className="finding-note">{CHECK_NOTES[finding.check]}</p>}
                  <Quotes quotes={finding.evidence} />
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
                  <h3>{CHECK_LABELS[finding.check] ?? finding.check}</h3>
                  <Quotes quotes={finding.evidence} />
                  <p className="source">Rule {finding.source}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AgentRun
          trace={result.trace}
          aggregatorSummary={notChecked ? `Score ${risk.score} of 100. ${NOT_CHECKED_LABEL}.` : undefined}
        />

        {children}
      </div>
    </div>
  );
}
