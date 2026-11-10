import { LIMITS_ID } from "@/components/limitsAnchor";
import { LimitsOpener } from "@/components/LimitsLink";
import { LIMITS_SECTION, PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { Card } from "@/components/ui";
import { T } from "@/components/shell/T";

// COPY-1: plain-language copy only. The internal limitations doc is not read for display.
// 5b: a disclaimer. The intro pair is always visible, under every result and on the empty state;
// the 8 items sit in a native details element, closed on load. Its summary is the visible,
// keyboard-focusable control and names the section. UX-3: the footer links here (#limits) and
// LimitsOpener opens the details element on arrival.
export function LimitationsPanel() {
  return (
    <section className="stack-sm limits" aria-labelledby="limits-heading">
      <Card className="limits-intro">
        <p className="small">
          <T>{PUBLIC_LIMITS_INTRO}</T>
        </p>
      </Card>
      <LimitsOpener />
      <details id={LIMITS_ID} className="card accordion limits-details">
        <summary>
          <span id="limits-heading" className="limits-summary">
            <T>{LIMITS_SECTION}</T>
          </span>
        </summary>
        <div className="disclosure-body">
          <ul className="bullets">
            {PUBLIC_LIMITS.map((item) => (
              <li key={item.title}>
                <strong>
                  <T>{item.title}</T>
                </strong>{" "}
                <T>{item.text}</T>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
