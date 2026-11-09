import type { Metadata } from "next";
import { inlineParts } from "@/components/limitations";
import { CHECK_LABELS } from "@/components/ResultsPanel";
import { Callout, Chip, DataTable, SectionHeader } from "@/components/ui";
import { getLabData } from "@/lib/labData";

export const metadata: Metadata = {
  title: "Test Lab",
  description: "How the fixed rules do on the synthetic test sets, computed from the case files, and what that does not prove.",
};

// Roadmap Phase 3. A server component, built at deploy time: the dev eval runs through the real
// rules here, on the server, so no rule pattern and no case text reaches the browser. The tables are
// plain HTML and need no JavaScript. Every number comes from getLabData(), the same object that
// /lab/results.json returns.
export const dynamic = "force-static";

const ids = (list: readonly string[], info: readonly string[]) => {
  const main = list.length > 0 ? list.join(", ") : "none";
  return info.length > 0 ? `${main} (info: ${info.join(", ")})` : main;
};

const ratio = (part: number, whole: number, value: number | null) =>
  value === null ? `${part} of ${whole} (not defined)` : `${part} of ${whole} (${value.toFixed(2)})`;

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((part, index) =>
        part.kind === "code" ? <code key={index}>{part.text}</code> : <span key={index}>{part.text}</span>,
      )}
    </>
  );
}

export default function LabPage() {
  const data = getLabData();
  const dev = data.devEval;
  const { holdout1, holdout2, holdout2Bar } = data.holdouts;
  const matrix = dev.confusion;
  const flagged = matrix.flaggedBands.join(" or ");
  return (
    <div className="doc-page">
      <div className="doc-hero">
        <h1 id="page-title" className="page-title">
          Test Lab
        </h1>
        <p className="intro">
          How the fixed rules do on the synthetic test sets. The dev eval numbers are computed from the case
          files when the site is built; the two holdouts ran once and show their recorded results.
        </p>
      </div>

      <section className="doc-section">
        <SectionHeader id="suites-heading" title="Summary per suite" />
        <DataTable
          caption="The test sets, their size, their result and whether they were blind"
          columns={[
            { key: "suite", header: "Suite" },
            { key: "cases", header: "Cases", numeric: true },
            { key: "result", header: "Result" },
            { key: "label", header: "Tuned or blind" },
            { key: "run", header: "Run" },
          ]}
          rows={[
            {
              suite: "Dev eval",
              cases: dev.cases,
              result: `${dev.passed} of ${dev.cases} pass`,
              label: dev.label,
              run: "When this page was built, on the current rules",
            },
            {
              suite: holdout1.name,
              cases: holdout1.cases,
              result: `Strict: ${holdout1.strict}. Right rule counted as a pass: ${holdout1.rightRuleCountedAsPass}.`,
              label: data.holdouts.label,
              run: `Once, on ${holdout1.runDate}, on rules ${holdout1.ranOnRedFlagPrefix}`,
            },
            {
              suite: holdout2.name,
              cases: holdout2.cases,
              result: holdout2.strict,
              label: data.holdouts.label,
              run: `Once, on ${holdout2.runDate}, on rules ${holdout2.ranOnRedFlagPrefix}`,
            },
          ]}
          rowKey={(row) => String(row.suite)}
        />
        <p className="section-description">
          Rules versions are the first 8 hex characters of the sha256 of the rules file when the suite ran.
        </p>
      </section>

      <section className="doc-section">
        <SectionHeader id="dev-heading" title={dev.label} description={`Source: ${dev.source}.`} />
        <DataTable
          caption="Dev eval results per group"
          columns={[
            { key: "group", header: "Group" },
            { key: "cases", header: "Cases", numeric: true },
            { key: "passed", header: "Pass", numeric: true },
            { key: "failed", header: "Fail", numeric: true },
            { key: "knownMisses", header: "Known misses", numeric: true },
          ]}
          rows={[
            ...dev.groups.map((group) => ({ ...group })),
            { group: "Total", cases: dev.cases, passed: dev.passed, failed: dev.failed, knownMisses: dev.knownMisses },
          ]}
          rowKey={(row) => String(row.group)}
        />
        <DataTable
          caption={`Confusion table: a case counts as flagged when its band is ${flagged}`}
          columns={[
            { key: "kind", header: "Case" },
            { key: "flagged", header: "Flagged", numeric: true },
            { key: "notFlagged", header: "Not flagged", numeric: true },
          ]}
          rows={[
            { kind: "Scam-like", flagged: matrix.truePositives, notFlagged: matrix.falseNegatives },
            { kind: "Not scam-like", flagged: matrix.falsePositives, notFlagged: matrix.trueNegatives },
          ]}
          rowKey={(row) => String(row.kind)}
        />
        <ul className="doc-list">
          <li>
            Precision: {ratio(matrix.truePositives, matrix.truePositives + matrix.falsePositives, matrix.precision)} of
            the flagged cases are scam-like.
          </li>
          <li>
            Recall: {ratio(matrix.truePositives, matrix.truePositives + matrix.falseNegatives, matrix.recall)} of the
            scam-like cases are flagged.
          </li>
        </ul>
        <DataTable
          caption="How many dev eval cases each rule fired on"
          columns={[
            { key: "rule", header: "Rule" },
            { key: "name", header: "What it looks for" },
            { key: "scam", header: "Scam-like cases", numeric: true },
            { key: "other", header: "Other cases", numeric: true },
          ]}
          rows={dev.ruleHits.map((hit) => ({
            rule: hit.ruleId,
            name: CHECK_LABELS[hit.check] ?? hit.check,
            scam: hit.scamCases,
            other: hit.nonScamCases,
          }))}
          rowKey={(row) => String(row.rule)}
        />
      </section>

      <section className="doc-section">
        <SectionHeader
          id="cases-heading"
          title="Every dev eval case"
          description="A case passes when its band, its rules and its warning mentions (info) all match what was expected."
        />
        <DataTable
          caption="Dev eval cases: expected and actual result"
          columns={[
            { key: "id", header: "Case" },
            { key: "group", header: "Group" },
            { key: "expected", header: "Expected band" },
            { key: "actual", header: "Result band" },
            { key: "score", header: "Score", numeric: true },
            { key: "expectedRules", header: "Expected rules" },
            { key: "actualRules", header: "Result rules" },
            { key: "outcome", header: "Outcome" },
            { key: "note", header: "Known miss" },
          ]}
          rows={dev.rows.map((row) => ({
            id: row.id,
            group: row.group,
            expected: row.expectedBand,
            actual: row.actualBand,
            score: row.score,
            expectedRules: ids(row.expectedRuleIds, row.expectedInfoIds),
            actualRules: ids(row.actualRuleIds, row.actualInfoIds),
            outcome: <Chip tone={row.passed ? "success" : "high"}>{row.passed ? "Pass" : "Fail"}</Chip>,
            note: row.knownMissReason ?? "",
          }))}
          rowKey={(row) => String(row.id)}
        />
      </section>

      <section className="doc-section">
        <SectionHeader
          id="holdouts-heading"
          title="Holdouts, as recorded"
          description={`${data.holdouts.label}. These sets are never run again, so the results below are records from the one run, not computed here.`}
        />
        <div className="card lab-holdout">
          <h3>{holdout1.name}</h3>
          <ul className="doc-list">
            <li>
              Ran once, on {holdout1.runDate}, on rules {holdout1.ranOnRedFlagPrefix}, {holdout1.ranOnNote}.
            </li>
            <li>Strict: {holdout1.strict}.</li>
            <li>Right rule counted as a pass: {holdout1.rightRuleCountedAsPass}.</li>
            <li>
              {holdout1.realMiss} {holdout1.realMissNote}
            </li>
            <li>
              Strict failures that stay strict failures: {holdout1.strictFailures.join(", ")}.{" "}
              {holdout1.strictFailuresNote}
            </li>
            <li>{holdout1.passBarNote}</li>
          </ul>
        </div>
        <div className="card lab-holdout">
          <h3>{holdout2.name}</h3>
          <ul className="doc-list">
            <li>
              Ran once, on {holdout2.runDate}, after the rules were frozen at rules {holdout2.ranOnRedFlagPrefix}.
            </li>
            <li>Result: {holdout2.strict}.</li>
            <li>{holdout2.failureNote}</li>
            <li>
              After tuning: {holdout2.tunedNote}. {holdout2.tunedDetail}
            </li>
          </ul>
          <p className="section-description">The locked pass bar. {holdout2.passBarLocked}</p>
          <ul className="doc-list">
            {holdout2Bar.counted.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {holdout2Bar.items.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <DataTable
            caption="Holdout 2: counts against the locked bar"
            columns={[
              { key: "item", header: "Bar item" },
              { key: "required", header: "Required" },
              { key: "count", header: "Count" },
              { key: "source", header: "Where the count comes from" },
            ]}
            rows={holdout2Bar.counts.map((row) => ({
              item: row.item,
              required: row.required,
              count: row.count,
              source: <Inline text={row.source} />,
            }))}
            rowKey={(row) => String(row.item)}
          />
          <p className="section-description">{holdout2.noRerun}</p>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader
          id="language-heading"
          title="Language samples"
          description="Each synthetic text, run through the same language check as the Check page, with no translation."
        />
        <DataTable
          caption="How many samples get each state"
          columns={[
            { key: "coverage", header: "State" },
            { key: "count", header: "Samples", numeric: true },
          ]}
          rows={data.language.counts.map((entry) => ({ coverage: <code>{entry.coverage}</code>, count: entry.count }))}
          rowKey={(_row, index) => data.language.counts[index].coverage}
        />
        <DataTable
          caption="The state each sample gets"
          columns={[
            { key: "id", header: "Sample" },
            { key: "language", header: "Language" },
            { key: "label", header: "Data" },
            { key: "coverage", header: "State" },
          ]}
          rows={data.language.rows.map((row) => ({
            id: row.id,
            language: row.language,
            label: row.label,
            coverage: <code>{row.coverage}</code>,
          }))}
          rowKey={(row) => String(row.id)}
        />
        <Callout tone="neutral">
          <p>{data.language.note}</p>
        </Callout>
      </section>

      <section className="doc-section">
        <SectionHeader id="limits-heading" title="What this does not prove" />
        <Callout tone="neutral">
          <ul className="doc-list">
            {data.doesNotProve.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Callout>
      </section>

      <section className="doc-section">
        <SectionHeader id="download-heading" title="Download" />
        <a className="button-link secondary lab-download" href="/lab/results.json" download>
          Download the results as JSON
        </a>
      </section>
    </div>
  );
}
