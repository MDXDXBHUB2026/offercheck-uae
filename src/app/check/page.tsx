import type { Metadata } from "next";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { HeroPreview } from "@/components/HeroPreview";
import { LimitationsPanel } from "@/components/LimitationsPanel";
import { OfferChecker, type Sample } from "@/components/OfferChecker";
import { EVAL_OFFERS } from "@/lib/agents/eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { RULES } from "@/lib/agents/redFlag";

export const metadata: Metadata = {
  title: "Check an offer",
  description: "Paste a job offer to see which fixed red-flag rules it matches, with the evidence.",
};

// Synthetic fixtures only. Only these three strings reach the browser, never the eval set itself.
const SAMPLES: Sample[] = [
  { label: "Fee scam", text: SCAM_OFFER },
  { label: "Clean offer", text: LEGIT_OFFER },
  { label: "Injection attempt", text: EVAL_OFFERS.find((offer) => offer.id === "A01")?.text ?? "" },
].filter((sample) => sample.text.length > 0);

// A server component: RULES is read here, so the rule patterns stay out of the client bundle. The
// limitations panel shows fixed public copy (COPY-1). The layout supplies <main>.
export default function CheckPage() {
  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title" className="page-title">
            Check a job offer before you pay or share anything.
          </h1>
          <p className="intro">
            Paste a job offer to check it against {RULES.length} fixed rules. The rules read English.
            Other languages can be translated by Google Cloud Translation if you agree. The score is set
            by fixed rules, not AI. Offer Check does not save your text.
          </p>
          <a className="button-link button-light" href="#offer">
            Check an offer
          </a>
        </div>
        <HeroPreview sampleText={SCAM_OFFER} />
        {/* Decorative background video, positioned behind the hero by CSS. */}
        <HeroBackdrop />
      </section>
      <OfferChecker ruleCount={RULES.length} samples={SAMPLES} />
      <LimitationsPanel />
    </>
  );
}
