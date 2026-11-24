import type { Metadata } from "next";
import { SenderCheck } from "@/components/SenderCheck";
import { T } from "@/components/shell/T";

export const metadata: Metadata = {
  title: "Sender Check",
  description: "A few plain facts about the email address, phone number and web address an offer came from. Runs in your browser.",
};

// Production Phase 7 (2026-11-24). The page itself holds fixed text only; the form and the checks are in
// the SenderCheck client component and run in the browser. Nothing typed here is sent or stored.
export default function SenderPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <span className="dot dot-green pulse" aria-hidden="true" />
            <span>
              <T>Runs in your browser</T>
            </span>
          </p>
          <h1 id="page-title" className="h1">
            <T>Sender Check</T>
          </h1>
          <p className="lead">
            <T>
              Look at the email address, phone number and web address an offer came from. You get plain facts and what to do next, never a verdict. Nothing is sent, saved or looked up.
            </T>
          </p>
        </div>
      </section>
      <SenderCheck />
    </div>
  );
}
