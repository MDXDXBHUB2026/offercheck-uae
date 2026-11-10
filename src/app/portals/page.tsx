import type { Metadata } from "next";
import { ExternalLink, FileCheck2, Phone } from "lucide-react";
import { ReferenceHelper } from "@/components/ReferenceHelper";
import { ButtonLink, Card, Chip } from "@/components/ui";
import { UAE_CONTACTS, type UaeContact } from "@/data/uaeContacts";
import { mainChannels, REPORT_FRAUD_ID, REPORT_FRAUD_NOTE } from "@/lib/authorities";

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

// "How to verify": general steps that hold for every official channel. No claim about how a
// portal works inside; its own pages say that.
function verifySteps(entry: UaeContact): string[] {
  return [
    "Open the official site with the button below, not from a link in the message you received.",
    `What it is for: ${entry.purpose}.`,
    "If what you were told does not match, call the hotline before you pay or share anything.",
  ];
}

export default function PortalsPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <span className="dot dot-green pulse" aria-hidden="true" />
            <span>Official sources only</span>
          </p>
          <h1 id="page-title" className="h1">
            Gov Portals Hub
          </h1>
          <p className="lead">
            Confirm an offer, a visa or an employer yourself, on the official UAE sites and hotlines. Offer Check is not
            part of any of them.
          </p>
        </div>
      </section>

      <Card as="section" className="stack-sm" aria-labelledby="mohre-heading">
        <h2 id="mohre-heading" className="h2 row">
          <FileCheck2 className="icon text-green" aria-hidden="true" />
          <span>Check an offer reference with MoHRE</span>
        </h2>
        <p className="muted">
          A genuine offer comes through MoHRE. Ask the employer for the reference, then look it up on the MoHRE site.
        </p>
        <ReferenceHelper />
      </Card>

      <section className="stack-sm" aria-labelledby="hotlines-heading">
        <h2 id="hotlines-heading" className="h2">
          Hotlines and portals
        </h2>
        <ul className="grid grid-2">
          {UAE_CONTACTS.map((entry) => (
            <Card as="li" key={entry.id} className="stack-sm card-fill directory-card">
              <div className="row">
                <Chip tone="green" upper>
                  {DIRECTORY[entry.id].category}
                </Chip>
                <Chip tone="neutral">{DIRECTORY[entry.id].authority}</Chip>
              </div>
              <h3 className="h3">{entry.name}</h3>
              <p className="small muted" lang="ar" dir="rtl">
                {entry.arabicName}
              </p>
              <p className="label-caps">How to verify</p>
              <ol className="verify-steps small">
                {verifySteps(entry).map((step, index) => (
                  <li key={step}>
                    <span className="num-tile" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="row card-foot">
                <ButtonLink href={`tel:${entry.hotline}`} variant="secondary" className="phone-chip">
                  <Phone className="icon" aria-hidden="true" />
                  <span className="mono" dir="ltr">{entry.hotlineLabel}</span>
                </ButtonLink>
                <ButtonLink href={entry.url} variant="primary">
                  Open portal
                  <ExternalLink className="icon" aria-hidden="true" />
                </ButtonLink>
              </div>
            </Card>
          ))}
        </ul>
      </section>

      <Card as="section" tone="high" className="stack-sm" id={REPORT_FRAUD_ID} aria-labelledby="report-fraud-heading">
        <h2 id="report-fraud-heading" className="h2">
          If you think it is a scam
        </h2>
        <p>{REPORT_FRAUD_NOTE}</p>
        <ul className="stack-sm">
          {mainChannels().map((channel) => (
            <li key={channel.id}>
              <ButtonLink href={channel.url} variant="secondary" block>
                {channel.name}
                <ExternalLink className="icon" aria-hidden="true" />
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
