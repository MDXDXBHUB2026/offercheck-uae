import { OfferChecker } from "@/components/OfferChecker";
import { RULES } from "@/lib/agents/redFlag";

// True only while no server code logs or stores the request body. A test checks that.
const PROTOTYPE_NOTICE =
  "Prototype. Use synthetic or redacted offers only. The app does not store offer text.";

// A server component: RULES is read here, so the rule patterns stay out of the client bundle.
export default function Home() {
  return (
    <main>
      <h1>Offer Check UAE</h1>
      <p className="notice" role="note">
        {PROTOTYPE_NOTICE}
      </p>
      <p className="intro">
        Paste a job offer to check it against {RULES.length} fixed rules. English text only. No AI
        is used yet, and your text is not saved.
      </p>
      <OfferChecker ruleCount={RULES.length} />
    </main>
  );
}
