import type { Metadata } from "next";
import { BookOpen, Info } from "lucide-react";
import { LimitsLink } from "@/components/LimitsLink";
import { PrintButton } from "@/components/PrintButton";
import { SignAccordion } from "@/components/SignAccordion";
import { LIMITS_SECTION } from "@/components/publicLimitations";
import { FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { Card } from "@/components/ui";
import { REPORT_FRAUD_ID } from "@/lib/authorities";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";

export const metadata: Metadata = {
  title: "Legal Guidelines",
  description:
    "Eight warning signs of a fake or risky job offer in the UAE, what to do about each one, and what Offer Check is.",
};

// Static: fixed text only, no request data. The offline library: the eight warning signs from one
// official page (src/lib/warningSigns.ts) and the plain-language About text (owner decision,
// 2026-11-09). The reference app's law articles and penalties are not copied: they had no source.
// /guide and /about redirect here (next.config.ts).
export const dynamic = "force-static";

const ABOUT: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "problem-heading",
    title: "The problem",
    body: (
      <p>
        Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky. They may ask you to pay a fee,
        share a code or send your identity documents before you have a real job.
      </p>
    ),
  },
  {
    id: "does-heading",
    title: "What it does",
    body: (
      <p>
        It reads the offer text you paste and points out warning signs in plain words, with the words that matched. It
        shows how worrying the signs are as low, medium or high. These are warning signs, not a verdict on any company.
      </p>
    ),
  },
  {
    id: "not-heading",
    title: "What it does not do",
    body: (
      <>
        <ul className="bullets">
          <li>It does not check whether a company, a sender or an offer is real.</li>
          <li>It does not contact anyone or send any message for you.</li>
          <li>Its server does not store your text.</li>
          <li>It does not use an AI model to score your text.</li>
          <li>It reads English only. Words in other languages are not checked unless you choose machine translation first.</li>
          <li>It does not give legal advice.</li>
        </ul>
        <p>
          <LimitsLink>{LIMITS_SECTION}</LimitsLink>
        </p>
      </>
    ),
  },
  {
    id: "for-heading",
    title: "Who it is for",
    body: (
      <p>
        People in the UAE who receive a job offer by WhatsApp, email or LinkedIn and want to check it for warning signs,
        such as a request for a fee, a code or identity documents.
      </p>
    ),
  },
  {
    id: "privacy-heading",
    title: "Your privacy",
    body: (
      <p>
        Offer Check&apos;s server does not store the text you paste. Your text is sent to Google, for machine
        translation, only if you press “{TRANSLATE_BUTTON}”. Save Encrypted keeps an encrypted copy in this browser
        only, locked with a passphrase that is not stored.
      </p>
    ),
  },
  {
    id: "data-heading",
    title: "Example offers and legal advice",
    body: (
      <p>
        {SYNTHETIC_STATEMENT} {FOOTER_DISCLAIMER}
      </p>
    ),
  },
];

export default function LegalPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <BookOpen className="icon" aria-hidden="true" />
            <span>Offline library</span>
          </p>
          <h1 id="page-title" className="h1">
            Legal Guidelines
          </h1>
          <p className="lead">
            Eight signs that a job offer in the UAE may be fake or risky, and what to do about each one. Not legal
            advice.
          </p>
        </div>
        <div className="hero-side">
          <PrintButton />
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="signs-heading">
        <h2 id="signs-heading" className="h2">
          Warning signs
        </h2>
        <ol className="grid grid-2">
          {WARNING_SIGNS.map((entry, index) => (
            <Card as="li" key={entry.id} id={entry.id} className="stack-sm card-fill" aria-labelledby={`${entry.id}-title`}>
              <div className="flag-head">
                <span className="num-tile" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 id={`${entry.id}-title`} className="h3">
                  {entry.sign}
                </h3>
              </div>
              <SignAccordion why={entry.why} />
              <p className="small card-foot">
                <strong className="text-green">What to do:</strong> {entry.whatToDo}
              </p>
            </Card>
          ))}
        </ol>
        <p className="small muted">
          Source:{" "}
          <a href={WARNING_SIGNS_SOURCE.url} rel="noreferrer">
            {WARNING_SIGNS_SOURCE.publisher}, “{WARNING_SIGNS_SOURCE.title}”
          </a>
          , page last updated {WARNING_SIGNS_SOURCE.updated}.
        </p>
      </section>

      <section id="about" className="stack-sm" aria-labelledby="about-heading">
        <h2 id="about-heading" className="h2 row">
          <Info className="icon text-green" aria-hidden="true" />
          <span>About Offer Check UAE</span>
        </h2>
        <p className="lead">
          Offer Check UAE is a free tool that looks for common warning signs in a job offer before you pay or share
          anything.
        </p>
        <div className="grid grid-2">
          {ABOUT.map((section) => (
            <Card as="section" key={section.id} className="stack-sm" aria-labelledby={section.id}>
              <h3 id={section.id} className="h3">
                {section.title}
              </h3>
              {section.body}
            </Card>
          ))}
        </div>
        <p>
          <a href={`/portals#${REPORT_FRAUD_ID}`}>Where to report a job scam</a>
        </p>
      </section>
    </div>
  );
}
