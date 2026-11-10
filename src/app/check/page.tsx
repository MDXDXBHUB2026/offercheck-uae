import type { Metadata } from "next";
import { Gauge, Landmark, Quote, Radio, ShieldCheck } from "lucide-react";
import { HeroStage } from "@/components/HeroStage";
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
    <HeroStage exampleCount={SAMPLE_OFFERS.length}>
      <div className="stack-sm hero-glass hero-main">
        <div className="hero-badges">
          <span className="hero-badge hero-badge-green">
            <ShieldCheck className="icon pulse" aria-hidden="true" />
            <span>Fixed rules, no AI scoring</span>
          </span>
          <span className="hero-badge mono">
            <span className="ping-icon" aria-hidden="true">
              <Radio className="icon text-green" />
            </span>
            <span>{RULES.length} rules, every finding quoted</span>
          </span>
        </div>
        <h1 id="page-title" className="h1">
          Check a job offer before you pay or share anything.
        </h1>
        <p className="lead">
          Paste a job offer to check it against {RULES.length} fixed rules. The rules read English. Other languages can
          be translated by Google Cloud Translation if you agree. Offer Check&apos;s server does not store your text.
        </p>
        <ul className="hero-chips small">
          <li className="hero-chip">
            <Quote className="icon text-green" aria-hidden="true" />
            <span>Warning signs with the words that matched</span>
          </li>
          <li className="hero-chip">
            <Gauge className="icon text-sky" aria-hidden="true" />
            <span>Low, medium or high risk indicators</span>
          </li>
          <li className="hero-chip">
            <Landmark className="icon text-amber" aria-hidden="true" />
            <span>Official places to confirm and to report</span>
          </li>
        </ul>
      </div>
    </HeroStage>
  );
  return (
    <div className="stack">
      <OfferChecker ruleCount={RULES.length} samples={SAMPLE_OFFERS} hero={hero} />
      <LimitationsPanel />
    </div>
  );
}
