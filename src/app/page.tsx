import { OfferChecker } from "@/components/OfferChecker";
import { RULES } from "@/lib/agents/redFlag";

// A server component: RULES is read here, so the rule patterns stay out of the client bundle.
export default function Home() {
  return (
    <main>
      <h1>Offer Check UAE</h1>
      <p className="intro">
        Paste a job offer to check it against {RULES.length} fixed rules. English text only. No AI
        is used yet, and your text is not saved.
      </p>
      <OfferChecker ruleCount={RULES.length} />
    </main>
  );
}
