import { LIMITS_SECTION, PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { Card, SectionHeader } from "@/components/ui";

// COPY-1: plain-language copy only. The internal limitations doc is not read for display.
export function LimitationsPanel() {
  return (
    <section className="block limits" aria-labelledby="limits-heading">
      <SectionHeader id="limits-heading" title={LIMITS_SECTION} />
      <Card>
        <p>{PUBLIC_LIMITS_INTRO}</p>
        <ul>
          {PUBLIC_LIMITS.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong> {item.text}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
