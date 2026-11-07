import { LIMITS_SECTION, type InlinePart } from "@/components/limitations";

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
    <section className="limits card" aria-labelledby="limits-heading">
      <h2 id="limits-heading" className="section-title">
        {LIMITS_SECTION}
      </h2>
      <p>{intro}</p>
      <ul>
        {items.map((parts, index) => (
          <li key={index}>
            <Inline parts={parts} />
          </li>
        ))}
      </ul>
    </section>
  );
}
