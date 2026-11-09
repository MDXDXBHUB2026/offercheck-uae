import type { Metadata } from "next";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";

export const metadata: Metadata = {
  title: "Warning signs",
  description: "Eight warning signs of a fake or risky job offer in the UAE, and what to do about each one.",
};

// Static: fixed text only, no request data.
export const dynamic = "force-static";

export default function GuidePage() {
  return (
    <div className="doc-page doc-column">
      <div className="doc-hero">
        <h1 id="page-title" className="page-title">
          Warning signs
        </h1>
        <p className="intro">
          Eight signs that a job offer in the UAE may be fake or risky, and what to do about each one.
        </p>
      </div>

      <div className="sign-list">
        {WARNING_SIGNS.map((entry) => (
          <article key={entry.id} id={entry.id} className="card sign" aria-labelledby={`${entry.id}-title`}>
            <h2 id={`${entry.id}-title`} className="sign-title">
              {entry.sign}
            </h2>
            <p>{entry.why}</p>
            <p className="sign-action">
              <strong>What to do:</strong> {entry.whatToDo}
            </p>
          </article>
        ))}
      </div>

      <p className="doc-source">
        Source:{" "}
        <a className="source-link" href={WARNING_SIGNS_SOURCE.url} rel="noreferrer">
          {WARNING_SIGNS_SOURCE.publisher}, “{WARNING_SIGNS_SOURCE.title}”
        </a>
        , page last updated {WARNING_SIGNS_SOURCE.updated}.
      </p>
    </div>
  );
}
