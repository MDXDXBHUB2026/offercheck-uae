import type { Metadata } from "next";
import { ExternalLink, FileCheck2, Phone } from "lucide-react";
import { ReferenceHelper } from "@/components/ReferenceHelper";
import { ButtonLink, Card, Chip } from "@/components/ui";
import { UAE_CONTACTS, type UaeContact } from "@/data/uaeContacts";
import { mainChannels, REPORT_FRAUD_ID, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { T } from "@/components/shell/T";

export const metadata: Metadata = {
  title: "Gov Portals Hub",
  description: "Official UAE portals and hotlines to confirm a job offer, and where to report a job scam.",
};

// Static: fixed text only. Every number and link comes from src/data/uaeContacts.ts (confirmed by
// the owner) or src/lib/authorities.ts, which imports from it.
export const dynamic = "force-static";

// The directory cards' category and level, for each contact in src/data/uaeContacts.ts.
const DIRECTORY: Record<UaeContact["id"], { category: string; authority: string }> = {
  mohre: { category: "Job offers", authority: "Federal" },
  icp: { category: "Visas", authority: "Federal" },
  amer: { category: "Visas", authority: "Dubai" },
  ecrime: { category: "Report fraud", authority: "Dubai" },
};

// "How to verify": general steps that hold for every official channel, each an action. No claim
// about how a portal works inside; its own pages say that. What the channel is for (uaeContacts.ts
// purpose) is shown above the steps, not as a step.
const VERIFY_STEPS = [
  "Open the official site with the button below, not from a link in the message you received.",
  "If what you were told does not match, call the hotline before you pay or share anything.",
] as const;

export default function PortalsPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <span className="dot dot-green pulse" aria-hidden="true" />
            <span>
              <T>Official sources only</T>
            </span>
          </p>
          <h1 id="page-title" className="h1">
            <T>Gov Portals Hub</T>
          </h1>
          <p className="lead">
            <T>
              Confirm an offer, a visa or an employer yourself, on the official UAE sites and hotlines. Offer Check is not part of any of them.
            </T>
          </p>
        </div>
      </section>

      <Card as="section" className="stack-sm" aria-labelledby="mohre-heading">
        <h2 id="mohre-heading" className="h2 row">
          <FileCheck2 className="icon text-green" aria-hidden="true" />
          <span>
            <T>Check an offer reference with MoHRE</T>
          </span>
        </h2>
        <p className="muted">
          <T>A genuine offer comes through MoHRE. Ask the employer for the reference, then look it up on the MoHRE site.</T>
        </p>
        <ReferenceHelper />
      </Card>

      <section className="stack-sm" aria-labelledby="hotlines-heading">
        <h2 id="hotlines-heading" className="h2">
          <T>Hotlines and portals</T>
        </h2>
        <ul className="grid grid-2">
          {UAE_CONTACTS.map((entry) => (
            <Card as="li" key={entry.id} className="stack-sm card-fill directory-card">
              <div className="row">
                <Chip tone="green" upper>
                  <T>{DIRECTORY[entry.id].category}</T>
                </Chip>
                <Chip tone="neutral">
                  <T>{DIRECTORY[entry.id].authority}</T>
                </Chip>
              </div>
              <h3 className="h3">
                <T>{entry.name}</T>
              </h3>
              <p className="small muted contact-arabic-name" lang="ar" dir="rtl">
                {entry.arabicName}
              </p>
              <p className="small">
                <T>{`${entry.purpose}.`}</T>
              </p>
              <p className="label-caps">
                <T>How to verify</T>
              </p>
              <ol className="verify-steps small">
                {VERIFY_STEPS.map((step, index) => (
                  <li key={step}>
                    <span className="num-tile" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>
                      <T>{step}</T>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="row card-foot">
                <ButtonLink href={`tel:${entry.hotline}`} variant="secondary" className="phone-chip">
                  <Phone className="icon" aria-hidden="true" />
                  <span className="mono" dir="ltr">{entry.hotlineLabel}</span>
                </ButtonLink>
                <ButtonLink href={entry.url} variant="primary">
                  <T>Open portal</T>
                  <ExternalLink className="icon" aria-hidden="true" />
                </ButtonLink>
              </div>
            </Card>
          ))}
        </ul>
      </section>

      <Card as="section" tone="high" className="stack-sm" id={REPORT_FRAUD_ID} aria-labelledby="report-fraud-heading">
        <h2 id="report-fraud-heading" className="h2">
          <T>If you think it is a scam</T>
        </h2>
        <p>
          <T>{REPORT_FRAUD_NOTE}</T>
        </p>
        <ul className="stack-sm">
          {mainChannels().map((channel) => (
            <li key={channel.id}>
              <ButtonLink href={channel.url} variant="secondary" block>
                <T>{channel.name}</T>
                <ExternalLink className="icon" aria-hidden="true" />
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
