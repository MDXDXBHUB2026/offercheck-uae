import { LIMITS_SECTION, type InlinePart } from "@/components/limitations";
import { Card, SectionHeader } from "@/components/ui";

function Inline({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "strong" ? (
          <strong key={index}>{part.text}</strong>
        ) : part.kind === "code" ? (
          <code key={index}>{part.text}</code>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function LimitationsPanel({ intro, items }: { intro: string; items: InlinePart[][] }) {
  return (
    <section className="block limits" aria-labelledby="limits-heading">
      <SectionHeader id="limits-heading" title={LIMITS_SECTION} />
      <Card>
        <p>{intro}</p>
        <ul>
          {items.map((parts, index) => (
            <li key={index}>
              <Inline parts={parts} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
