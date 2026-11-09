import { LIMITS_ID } from "@/components/limitsAnchor";
import { LimitsOpener } from "@/components/LimitsLink";
import { LIMITS_SECTION, PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { Card } from "@/components/ui";

// COPY-1: plain-language copy only. The internal limitations doc is not read for display.
// 5b: a disclaimer. The intro pair is always visible, under every result and on the empty state;
// the 8 items sit in a native details element, closed on load. Its summary is the visible,
// keyboard-focusable control and names the section. UX-3: the footer links here (#limits) and
// LimitsOpener opens the details element on arrival.
export function LimitationsPanel() {
  return (
    <section className="block limits" aria-labelledby="limits-heading">
      <Card className="limits-intro">
        <p>{PUBLIC_LIMITS_INTRO}</p>
      </Card>
      <LimitsOpener />
      <details id={LIMITS_ID} className="card disclosure limits-details">
        <summary>
          <span id="limits-heading" className="limits-summary">
            {LIMITS_SECTION}
          </span>
        </summary>
        <div className="disclosure-body">
          <ul>
            {PUBLIC_LIMITS.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong> {item.text}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
