import { readLimitations } from "@/components/limitations";
import { LimitationsPanel } from "@/components/LimitationsPanel";
import { OfferChecker, type Sample } from "@/components/OfferChecker";
import { EVAL_OFFERS } from "@/lib/agents/eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { RULES } from "@/lib/agents/redFlag";

// True only while no server code logs or stores the request body. A test checks that.
const PROTOTYPE_NOTICE =
  "Prototype. Use synthetic or redacted offers only. The app does not store offer text.";

// Synthetic fixtures only. Only these three strings reach the browser, never the eval set itself.
const SAMPLES: Sample[] = [
  { label: "Fee scam", text: SCAM_OFFER },
  { label: "Clean offer", text: LEGIT_OFFER },
  { label: "Injection attempt", text: EVAL_OFFERS.find((offer) => offer.id === "A01")?.text ?? "" },
].filter((sample) => sample.text.length > 0);

// A server component: RULES and the limitations file are read here, so the rule patterns stay out
// of the client bundle.
export default function Home() {
  const limits = readLimitations();
  return (
    <main>
      <header className="masthead">
        <h1>Offer Check UAE</h1>
        <p className="intro">
          Paste a job offer to check it against {RULES.length} fixed rules. English text only. No AI
          is used yet, and your text is not saved.
        </p>
      </header>
      <p className="notice" role="note">
        {PROTOTYPE_NOTICE}
      </p>
      <OfferChecker ruleCount={RULES.length} samples={SAMPLES} />
      <LimitationsPanel intro={limits.intro} items={limits.items} />
    </main>
  );
}
