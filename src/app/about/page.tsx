import type { Metadata } from "next";
import { LimitsLink } from "@/components/LimitsLink";
import { LIMITS_SECTION } from "@/components/publicLimitations";
import { FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { Callout, SectionHeader } from "@/components/ui";
import { mainChannels, REPORT_FRAUD_ID, REPORT_FRAUD_NOTE } from "@/lib/authorities";

export const metadata: Metadata = {
  title: "About",
  description: "What Offer Check UAE is, what it does and does not do, who it is for, and where to report a job scam.",
};

// Static: fixed text only, no request data. Plain language for the public (owner decision,
// 2026-11-09); the technical detail is in docs/technical-evidence.md, which the app does not serve.
export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <div className="doc-page doc-column">
      <div className="doc-hero">
        <h1 id="page-title" className="page-title">
          About Offer Check UAE
        </h1>
        <p className="intro">
          Offer Check UAE is a free tool that looks for common warning signs in a job offer before you pay or share
          anything.
        </p>
      </div>

      <section className="doc-section">
        <SectionHeader id="problem-heading" title="The problem" />
        <div className="doc-prose">
          <p>
            Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky. They may ask you to pay a
            fee, share a code or send your identity documents before you have a real job.
          </p>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader id="does-heading" title="What it does" />
        <div className="doc-prose">
          <p>
            It reads the offer text you paste and points out warning signs in plain words, with the words that
            matched. It shows how worrying the signs are as low, medium or high. These are warning signs, not a
            verdict on any company.
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
            It reads English only. Words in other languages are not checked unless you choose machine translation
            first.
          </li>
          <li>It does not give legal advice.</li>
        </ul>
        <p className="doc-more">
          <LimitsLink>{LIMITS_SECTION}</LimitsLink>
        </p>
      </section>

      <section className="doc-section">
        <SectionHeader id="for-heading" title="Who it is for" />
        <div className="doc-prose">
          <p>
            People in the UAE who receive a job offer by WhatsApp, email or LinkedIn and want to check it for warning
            signs, such as a request for a fee, a code or identity documents.
          </p>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader id="privacy-heading" title="Your privacy" />
        <div className="doc-prose">
          <p>
            Offer Check does not store the text you paste. Your text is sent to Google, for machine translation, only
            if you press “{TRANSLATE_BUTTON}”.
          </p>
        </div>
      </section>

      <section className="doc-section">
        <SectionHeader id="data-heading" title="Example offers and legal advice" />
        <div className="doc-prose">
          <p>
            {SYNTHETIC_STATEMENT} {FOOTER_DISCLAIMER}
          </p>
        </div>
      </section>

      <section className="doc-section" id={REPORT_FRAUD_ID}>
        <Callout tone="neutral" className="report-box">
          <h2 id="report-fraud-heading" className="report-box-title">
            If you think it is a scam
          </h2>
          <p>{REPORT_FRAUD_NOTE}</p>
          <ul className="report-box-list">
            {mainChannels().map((channel) => (
              <li key={channel.id}>
                <a className="source-link" href={channel.url} rel="noreferrer">
                  {channel.name}
                </a>
              </li>
            ))}
          </ul>
        </Callout>
      </section>
    </div>
  );
}
