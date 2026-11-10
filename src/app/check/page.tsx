import type { Metadata } from "next";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { LimitationsPanel } from "@/components/LimitationsPanel";
import { OfferChecker } from "@/components/OfferChecker";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { RULES } from "@/lib/agents/redFlag";

export const metadata: Metadata = {
  title: "Offer Analyzer",
  description: "Paste a job offer to see which fixed red-flag rules it matches, with the evidence.",
};

// A server component: RULES is read here, so the rule patterns stay out of the client bundle. The
// samples are the four synthetic offers in src/data/sampleOffers.ts (never the dev or holdout sets).
// The layout supplies <main>.
export default function CheckPage() {
  const hero = (
    <section className="card hero hero-video" aria-labelledby="page-title">
      <HeroBackdrop />
      <div className="stack-sm hero-glass">
        <p className="label-caps text-green">
          <span className="dot" aria-hidden="true" /> Fixed rules, no AI scoring
        </p>
        <h1 id="page-title" className="h1">
          Check a job offer before you pay or share anything.
        </h1>
        <p className="lead">
          Paste a job offer to check it against {RULES.length} fixed rules. The rules read English. Other languages can
          be translated by Google Cloud Translation if you agree. Offer Check&apos;s server does not store your text.
        </p>
      </div>
      <ul className="hero-side hero-glass stack-sm small">
        <li>Warning signs with the words that matched</li>
        <li>Low, medium or high risk indicators</li>
        <li>Official places to confirm and to report</li>
      </ul>
    </section>
  );
  return (
    <div className="stack">
      <OfferChecker ruleCount={RULES.length} samples={SAMPLE_OFFERS} hero={hero} />
      <LimitationsPanel />
    </div>
  );
}
