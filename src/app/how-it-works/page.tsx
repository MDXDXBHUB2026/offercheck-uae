import type { Metadata } from "next";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { CHECK_LABELS } from "@/components/ResultsPanel";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { Callout, Chip, DataTable, SectionHeader, type ChipTone } from "@/components/ui";
import { RULES } from "@/lib/agents/redFlag";
import { COVERAGES, type Coverage } from "@/lib/coverage";
import { PIPELINE, PIPELINE_STATUS_TEXT, type PipelineStatus } from "@/lib/pipeline";
import { HIGH_BAND_MIN, MEDIUM_BAND_MIN, SEVERITY_WEIGHTS } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "How it works",
  description: "The steps Offer Check runs, which are built today, how the score is set and what leaves your browser.",
};

// Built at deploy time from the code: the registry, the rule table, the weights and the coverage
// states. A server component, so the rule patterns stay out of the client bundle; only rule ids and
// their plain names are shown, never a pattern.
export const dynamic = "force-static";

const STATUS_TONE: Record<PipelineStatus, ChipTone> = {
  built: "success",
  partial: "medium",
  "not built": "not-built",
};

// What each coverage state means for the reader. The names come from COVERAGES in src/lib/coverage.ts.
const COVERAGE_TEXT: Record<Coverage, string> = {
  full: "The text reads as English, so the rules read all of it.",
  translated:
    "You chose machine translation, so the rules read the English translation. A translation can lose or change meaning.",
  partial:
    "Only part of the text reads as English, or English could not be confirmed. The score covers the English words only.",
  unchecked: "Most of the text is not in English. The rules could not read it, so there is no score.",
};

const SEVERITY_TEXT: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Warning mention (info)",
};

export default function HowItWorksPage() {
  const weights = Object.entries(SEVERITY_WEIGHTS);
  return (
    <div className="doc-page">
      <div className="doc-hero">
        <h1 id="page-title" className="page-title">
          How it works
        </h1>
        <p className="intro">
          Offer Check runs a fixed set of steps on the text you paste. The diagram and the list below are
          drawn from one list in the code, so they show what is built today and cannot disagree with the
          app.
        </p>
      </div>

      <section className="doc-section">
        <SectionHeader id="pipeline-heading" title="The steps" />
        <div className="pipeline-layout">
          <figure className="card pipeline-figure">
            <PipelineDiagram />
          </figure>
          <ol className="pipeline-list">
            {PIPELINE.map((node) => (
              <li key={node.id} className="pipeline-item">
                <div className="pipeline-item-head">
                  <span className="pipeline-item-label">{node.label}</span>
                  <Chip tone={STATUS_TONE[node.status]}>{PIPELINE_STATUS_TEXT[node.status]}</Chip>
                </div>
                <p>{node.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader
          id="rules-heading"
          title="The red-flag rules"
          description={`${RULES.length} fixed rules read English text. Each shows the words that matched as its evidence.`}
        />
        <DataTable
          caption="Rules, what each looks for and its points"
          columns={[
            { key: "id", header: "Rule" },
            { key: "name", header: "What it looks for" },
            { key: "severity", header: "Severity" },
            { key: "points", header: "Points", numeric: true },
          ]}
          rows={RULES.map((rule) => ({
            id: rule.id,
            name: CHECK_LABELS[rule.check] ?? rule.check,
            severity: SEVERITY_TEXT[rule.severity] ?? rule.severity,
            points: SEVERITY_WEIGHTS[rule.severity],
          }))}
          rowKey={(row) => String(row.id)}
        />
      </section>

      <section className="doc-section">
        <SectionHeader id="score-heading" title="How the score is set" />
        <div className="doc-prose">
          <p>
            The risk aggregator adds fixed points for each finding, by its severity. Any high finding puts the
            score at {HIGH_BAND_MIN} or more on its own. No AI model sets or changes the score, so the same
            text always gives the same score.
          </p>
          <DataTable
            caption="Points per finding"
            columns={[
              { key: "severity", header: "Severity" },
              { key: "points", header: "Points", numeric: true },
            ]}
            rows={weights.map(([severity, points]) => ({ severity: SEVERITY_TEXT[severity] ?? severity, points }))}
            rowKey={(row) => String(row.severity)}
          />
          <ul className="doc-list">
            <li>High: a score of {HIGH_BAND_MIN} or more.</li>
            <li>
              Medium: {MEDIUM_BAND_MIN} or more, below {HIGH_BAND_MIN}.
            </li>
            <li>Low: below {MEDIUM_BAND_MIN}.</li>
          </ul>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader
          id="language-heading"
          title="Language and translation"
          description="The rules read English only. Every result records which part of the text they could read."
        />
        <ul className="doc-list coverage-list">
          {COVERAGES.map((coverage) => (
            <li key={coverage}>
              <code>{coverage}</code>: {COVERAGE_TEXT[coverage]}
            </li>
          ))}
        </ul>
        <Callout tone="neutral" title="Translation is optional">
          <p>
            For text that is not clearly English, you can choose machine translation by Google Cloud
            Translation. The text is sent only when you press &ldquo;{TRANSLATE_BUTTON}&rdquo;, every time,
            and a notice next to the button says what is sent and to whom before you press it.
          </p>
        </Callout>
      </section>

      <section className="doc-section">
        <SectionHeader id="trust-heading" title="Trust boundaries" />
        <ul className="doc-list">
          <li>The score is set only by the {RULES.length} fixed rules and the points above.</li>
          <li>
            No AI model scores your text, and Offer Check runs no AI model of its own. The Explainer step is
            not implemented yet.
          </li>
          <li>
            The only third party that can receive your text is Google Cloud Translation, and only when you
            press &ldquo;{TRANSLATE_BUTTON}&rdquo;, every time, after the notice next to the button.
          </li>
          <li>Offer Check does not store your text.</li>
          <li>
            The audit trail lives in page memory only and holds no offer or draft text. It is hash-chained, so
            it is tamper-evident, not tamper-proof.
          </li>
          <li>A person approves any reply draft before it can be copied. Offer Check sends nothing.</li>
        </ul>
      </section>
    </div>
  );
}
