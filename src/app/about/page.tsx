import type { Metadata } from "next";
import { inlineParts, readAllLimitations, type InlinePart } from "@/components/limitations";
import { PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { Callout, Disclosure, SectionHeader } from "@/components/ui";
import { REPORT_FRAUD_ID, REPORT_FRAUD_NOTE, shownAuthorities } from "@/lib/authorities";

export const metadata: Metadata = {
  title: "About and limits",
  description: "What Offer Check is for, who it is for, what it does not do, and every known limitation.",
};

// Built at deploy time: docs/known-limitations.md is read during the build, because docs/ may not be
// present on the server at runtime. No request data is read, so the page is static.
export const dynamic = "force-static";

function Inline({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "strong" ? (
          <strong key={index}>{part.text}</strong>
        ) : part.kind === "code" ? (
          <code key={index}>{part.text}</code>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

export default function AboutPage() {
  const sections = readAllLimitations();
  const technicalCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  return (
    <div className="doc-page">
      <div className="doc-hero">
        <h1 id="page-title" className="page-title">
          About and limits
        </h1>
        <p className="intro">
          Offer Check looks for common warning signs in a job offer before you pay or share anything. It
          shows risk indicators with the words that matched, not a verdict.
        </p>
      </div>

      <section className="doc-section">
        <SectionHeader id="use-heading" title="Who it is for" />
        <div className="doc-prose">
          <p>
            People in the UAE who receive a job offer by WhatsApp, email or LinkedIn and want to check it for
            warning signs, such as a request for a fee, a code or identity documents.
          </p>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader id="not-heading" title="What it does not do" />
        <ul className="doc-list">
          <li>It does not check whether a company, a sender or an offer is real.</li>
          <li>It does not contact anyone or send any message for you.</li>
          <li>It does not store your text.</li>
          <li>It does not use an AI model to score your text.</li>
          <li>
            Its rules read English only. Words in other languages are not checked unless you choose machine
            translation first.
          </li>
          <li>It does not give legal advice.</li>
        </ul>
      </section>

      <section className="doc-section">
        <SectionHeader id="data-heading" title="Synthetic data and legal advice" />
        <div className="doc-prose">
          <p>{SYNTHETIC_STATEMENT}</p>
          <p>{FOOTER_DISCLAIMER}</p>
        </div>
      </section>

      {/* Owner decision: no contact for reporting problems with Offer Check. Official channels only,
          each linked to its official page, with no phone number or email address. */}
      <section className="doc-section" id={REPORT_FRAUD_ID}>
        <SectionHeader id="report-fraud-heading" title="If you think it is a scam" description={REPORT_FRAUD_NOTE} />
        <ul className="doc-list authority-list">
          {shownAuthorities().map((entry) => (
            <li key={entry.id}>
              <strong>{entry.name}</strong> {entry.purpose}
              <span className="authority-source">
                Source:{" "}
                <a className="source-link" href={entry.sourceUrl} rel="noreferrer">
                  {entry.sourceName}
                </a>
                {entry.alsoSee && (
                  <>
                    {" "}
                    and{" "}
                    <a className="source-link" href={entry.alsoSee.url} rel="noreferrer">
                      {entry.alsoSee.name}
                    </a>
                  </>
                )}
                . Last verified {entry.lastVerified}.
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="doc-section">
        <SectionHeader id="limits-heading" title="Limits" description={PUBLIC_LIMITS_INTRO} />
        <ul className="doc-list limits-list">
          {PUBLIC_LIMITS.map((limit) => (
            <li key={limit.title}>
              <strong>{limit.title}</strong> {limit.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="doc-section">
        <SectionHeader
          id="technical-heading"
          title="Technical detail"
          description="Every item in the project's internal limitations list, as written for the people who build Offer Check. Read from the project's documentation when the site is built."
        />
        <Disclosure summary={`Show all ${technicalCount} technical items`}>
          {sections.map((section) => (
            <div key={section.title ?? "general"} className="technical-group">
              <h3 className="technical-title">
                <Inline parts={inlineParts(section.title ?? "General")} />
              </h3>
              <ul className="doc-list technical-list">
                {section.items.map((item, index) => (
                  <li key={index}>
                    <Inline parts={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Disclosure>
        <Callout tone="neutral">
          <p>
            Some technical items name files and test cases in the project. They describe the same limits as the
            list above, in more detail.
          </p>
        </Callout>
      </section>
    </div>
  );
}
