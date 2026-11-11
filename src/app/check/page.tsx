import type { Metadata } from "next";
import { Gauge, Landmark, Quote, Radio, ShieldCheck } from "lucide-react";
import { HeroStage } from "@/components/HeroStage";
import { AnalyzerNotice } from "@/components/AnalyzerNotice";
import { OfferChecker } from "@/components/OfferChecker";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { RULES } from "@/lib/agents/redFlag";
import { T } from "@/components/shell/T";

export const metadata: Metadata = {
  title: "Offer Analyzer",
  description: "Paste a job offer to see which fixed red-flag rules it matches, with the evidence.",
};

// A server component: RULES is read here, so the rule patterns stay out of the client bundle. The
// samples are the four synthetic offers in src/data/sampleOffers.ts (never the dev or holdout sets).
// The layout supplies <main>.
export default function CheckPage() {
  const hero = (
    <HeroStage>
      <div className="stack-sm hero-glass hero-main">
        <div className="hero-badges">
          <span className="hero-badge hero-badge-green">
            <ShieldCheck className="icon pulse" aria-hidden="true" />
            <span>
              <T>Fixed rules, no AI scoring</T>
            </span>
          </span>
          <span className="hero-badge mono">
            <span className="ping-icon" aria-hidden="true">
              <Radio className="icon text-green" />
            </span>
            <span>
              <T args={[RULES.length]}>{"{0} rules, every finding quoted"}</T>
            </span>
          </span>
        </div>
        <h1 id="page-title" className="h1">
          <T>Check a job offer before you pay or share anything.</T>
        </h1>
        <p className="lead">
          <T args={[RULES.length]}>
            {
              "Paste a job offer to check it against {0} fixed rules. The rules read English. Other languages can be translated by Google Cloud Translation if you agree. Offer Check's server does not store your text."
            }
          </T>
        </p>
        <ul className="hero-chips small">
          <li className="hero-chip">
            <Quote className="icon text-green" aria-hidden="true" />
            <span>
              <T>Warning signs with the words that matched</T>
            </span>
          </li>
          <li className="hero-chip">
            <Gauge className="icon text-sky" aria-hidden="true" />
            <span>
              <T>Low, medium or high risk indicators</T>
            </span>
          </li>
          <li className="hero-chip">
            <Landmark className="icon text-amber" aria-hidden="true" />
            <span>
              <T>Official places to confirm and to report</T>
            </span>
          </li>
        </ul>
      </div>
    </HeroStage>
  );
  return (
    <div className="stack">
      <OfferChecker ruleCount={RULES.length} samples={SAMPLE_OFFERS} hero={hero} />
      <AnalyzerNotice />
    </div>
  );
}
