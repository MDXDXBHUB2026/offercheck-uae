import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { ContactEmail, SiteOperator } from "@/components/shell/SiteOperator";
import { T } from "@/components/shell/T";
import { Card } from "@/components/ui";
import { REPORT_FRAUD_ID } from "@/lib/authorities";

export const metadata: Metadata = {
  title: "About",
  description: "What Offer Check UAE is for, how it works, what it cannot do, and who runs it.",
};

// Production hardening Phase 3 (owner decision, 2026-11-15): About is its own page again (it was
// /legal#about). Fixed text only, no request data. "What it cannot do" is the owner's reversal of
// LIMITS-2 for this page only: five plain lines drawn from docs/known-limitations.md, not the old
// nine-item section. The operator line and the contact address come from src/lib/siteConfig.ts.
// Rendered per request only so that it gets the CSP nonce (src/proxy.ts); it reads no request data.

// How a check works, in order. Each line matches the code: src/components/checkRequest.ts (masking),
// src/lib/agents/redFlag.ts (five rules), src/lib/scoring.ts (points and bands),
// src/lib/agents/verification.ts (cross-checks), src/lib/officialSteps.ts (official steps).
const HOW_IT_WORKS = [
  "You paste the text of an offer: a message, an email or a post. Emirates ID, passport and UAE IBAN numbers in common formats are hidden in your browser before the text is sent.",
  "Five fixed rules read the text for warning signs: a request to pay a fee or money; a request for a code, password or card details; a request for identity or bank documents; pressure to act quickly; and a free email address.",
  "Each sign found adds 20 or 40 points, by how serious it is, up to 100. A request to pay, or for a code, password or card details, puts the score at 60 or more on its own. 0 to 29 is low, 30 to 59 is medium, 60 and over is high.",
  "Each finding quotes the words in your text that matched, so you can see why it was flagged.",
  "Cross-checks point out other things in the text, such as a shortened link or a request to continue only on WhatsApp. They do not change the score.",
  "Official steps tell you which UAE government channel to use to confirm the offer yourself.",
] as const;

// What it cannot do: docs/known-limitations.md in plain words.
const CANNOT_DO = [
  "The rules look for known patterns only. An offer worded another way can be missed.",
  "The rules read English. Text in other languages is checked only if you choose machine translation first, and a translation can lose or change meaning.",
  "It has been tested on made-up example offers only, not validated on real scams.",
  "A low score does not mean an offer is genuine.",
  "Cross-checks read only the text you paste. No company, website or offer number is looked up anywhere.",
] as const;

export default function AboutPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <Info className="icon" aria-hidden="true" />
            <span>
              <T>About</T>
            </span>
          </p>
          <h1 id="page-title" className="h1">
            <T>About Offer Check UAE</T>
          </h1>
          <p className="lead">
            <T>Offer Check UAE is a free tool that looks for common warning signs in a job offer before you pay or share anything.</T>
          </p>
        </div>
      </section>

      <Card as="section" className="stack-sm" aria-labelledby="for-heading">
        <h2 id="for-heading" className="h2">
          <T>What it is for, and who it is for</T>
        </h2>
        <p>
          <T>
            Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky. They may ask you to pay a fee, share a code or send your identity documents before you have a real job.
          </T>
        </p>
        <p>
          <T>
            People in the UAE who receive a job offer by WhatsApp, email or LinkedIn and want to check it for warning signs, such as a request for a fee, a code or identity documents.
          </T>
        </p>
      </Card>

      <Card as="section" className="stack-sm" aria-labelledby="how-heading">
        <h2 id="how-heading" className="h2">
          <T>How it works</T>
        </h2>
        <ol className="bullets">
          {HOW_IT_WORKS.map((line) => (
            <li key={line}>
              <T>{line}</T>
            </li>
          ))}
        </ol>
        <p>
          <strong>
            <T>It does not use an AI model to score your text.</T>
          </strong>{" "}
          <T>Fixed rules set the score, so the same English text always gets the same score.</T>
        </p>
      </Card>

      <Card as="section" className="stack-sm" aria-labelledby="cannot-heading">
        <h2 id="cannot-heading" className="h2">
          <T>What it cannot do</T>
        </h2>
        <ul className="bullets">
          {CANNOT_DO.map((line) => (
            <li key={line}>
              <T>{line}</T>
            </li>
          ))}
        </ul>
      </Card>

      <Card as="section" className="stack-sm" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="h2">
          <T>Your privacy</T>
        </h2>
        <p>
          <T>
            {
              "Offer Check's server does not store or log the text you check. Text is sent to Google only if you choose translation. Save to Encrypted Vault keeps an encrypted copy in this browser only. There are no advertising or tracking scripts."
            }
          </T>
        </p>
        <p>
          <Link href="/privacy">
            <T>Read the privacy notice</T>
          </Link>{" "}
          <span aria-hidden="true">·</span>{" "}
          <Link href="/terms">
            <T>Read the terms of use</T>
          </Link>
        </p>
      </Card>

      <Card as="section" className="stack-sm" aria-labelledby="who-heading">
        <h2 id="who-heading" className="h2">
          <T>Who runs it</T>
        </h2>
        <p>
          <SiteOperator />.
        </p>
        <p>
          <T>Offer Check UAE is not affiliated with any government body. It does not report anything for you and does not give legal advice.</T>
        </p>
        <p>
          <T>Contact:</T> <ContactEmail />
        </p>
        <p>
          <Link href={`/portals#${REPORT_FRAUD_ID}`}>
            <T>Where to report a job scam</T>
          </Link>
        </p>
      </Card>
    </div>
  );
}
