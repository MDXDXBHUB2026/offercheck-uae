import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ContactEmail, SiteOperator } from "@/components/shell/SiteOperator";
import { T } from "@/components/shell/T";
import { Card } from "@/components/ui";
import { POLICY_LAST_UPDATED } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Offer Check UAE, an early prototype that shows risk indicators in job offers.",
};

// Production hardening Phase 3 (2026-11-15). Drafted, pending legal review (docs/privacy-terms.md).
// Plain statements only: no law, no jurisdiction, no liability clause, no compliance claim. Fixed
// text only; rendered per request only for the CSP nonce (src/proxy.ts).

const SECTIONS: readonly { id: string; title: string; lines: readonly string[] }[] = [
  {
    id: "prototype-heading",
    title: "An early prototype",
    lines: [
      "Offer Check UAE is an early prototype. It has been tested on made-up example offers only, not validated on real scams. It may change, stop working or be wrong.",
    ],
  },
  {
    id: "verdict-heading",
    title: "Risk indicators, not a verdict",
    lines: [
      "A result shows risk indicators found in the text you paste. It is not a verdict on any offer, sender or company, and it is not legal advice.",
      "A low score, or “No risk indicators found”, does not mean an offer is genuine.",
    ],
  },
  {
    id: "accuracy-heading",
    title: "No guarantee of accuracy",
    lines: [
      "Offer Check gives no guarantee that a result is accurate or complete. It can miss warning signs, and it can flag an honest offer. A machine translation can lose or change meaning.",
    ],
  },
  {
    id: "confirm-heading",
    title: "Confirm through official channels",
    lines: [
      "Before you pay, share documents or accept an offer, confirm it yourself through the official UAE channels listed in the Gov Portals Hub. Offer Check does not report anything for you.",
    ],
  },
  {
    id: "kit-heading",
    title: "The Action & Report Kit",
    lines: [
      "The Action & Report Kit under each result is created on your device from the check you just ran, and nothing in it is sent. It is not an official report form, and Offer Check does not report anything for you. What you copy, save or send from it is your choice.",
    ],
  },
  {
    id: "use-heading",
    title: "Acceptable use",
    lines: [
      "Use Offer Check to check job offers for yourself or for someone you are helping.",
      "Do not send checks or translations with scripts or other automated tools, try to get around the limits, or try to disrupt the service.",
      "Do not paste unlawful content.",
    ],
  },
  {
    id: "changes-heading",
    title: "Limits and changes to the service",
    lines: [
      "The operator may limit, change or stop the service, or any part of it, at any time. Limits on how often you can check or translate already apply.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <FileText className="icon" aria-hidden="true" />
            <span>
              <T>Terms</T>
            </span>
          </p>
          <h1 id="page-title" className="h1">
            <T>Terms of use</T>
          </h1>
          <p className="small muted">
            <T>Last updated:</T>{" "}
            <time dateTime={POLICY_LAST_UPDATED} lang="en" dir="ltr">
              {POLICY_LAST_UPDATED}
            </time>
          </p>
          <p className="lead">
            <T>The terms for using Offer Check UAE.</T>
          </p>
        </div>
      </section>

      {SECTIONS.map((section) => (
        <Card as="section" key={section.id} className="stack-sm" aria-labelledby={section.id}>
          <h2 id={section.id} className="h2">
            <T>{section.title}</T>
          </h2>
          {section.lines.length === 1 ? (
            <p>
              <T>{section.lines[0]}</T>
            </p>
          ) : (
            <ul className="bullets">
              {section.lines.map((line) => (
                <li key={line}>
                  <T>{line}</T>
                </li>
              ))}
            </ul>
          )}
          {section.id === "confirm-heading" && (
            <p>
              <Link href="/portals">
                <T>Open the Gov Portals Hub</T>
              </Link>
            </p>
          )}
        </Card>
      ))}

      <Card as="section" className="stack-sm" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="h2">
          <T>Contact</T>
        </h2>
        <p>
          <SiteOperator />.
        </p>
        <p>
          <T>Questions about these terms:</T> <ContactEmail />
        </p>
        <p>
          <Link href="/privacy">
            <T>Read the privacy notice</T>
          </Link>{" "}
          <span aria-hidden="true">·</span>{" "}
          <Link href="/about">
            <T>About Offer Check UAE</T>
          </Link>
        </p>
      </Card>
    </div>
  );
}
