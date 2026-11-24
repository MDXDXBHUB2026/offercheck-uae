"use client";

import { useState, type FormEvent } from "react";
import { Eraser, ExternalLink, ScanSearch } from "lucide-react";
import { useT } from "@/components/shell/lang";
import { Button, Callout, Card } from "@/components/ui";
import { mainChannels, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { CANNOT_KNOW, checkSender, NEED_ONE, NOTHING_FLAGGED, type SenderInput, type SenderResult } from "@/lib/senderCheck";

// Production Phase 7 (2026-11-24): the Sender check. Everything runs in this browser, on the text the
// person types: no network call, nothing stored (not even in this browser), nothing sent, no page
// fetched and no domain looked up. The logic is in src/lib/senderCheck.ts. The findings are plain facts
// with a next step, never a verdict, and they do not touch the /check score.

const EMPTY: SenderInput = { email: "", phone: "", web: "", company: "" };

// In Arabic (right to left) a typed address inside brackets is shown in the wrong order unless it is
// isolated as left-to-right text. The isolate marks are invisible and change no letter.
function withIsolates(text: string, values: string[]): string {
  if (!/[\u0600-\u06ff]/.test(text)) return text;
  return values
    .filter((value) => value.length > 2 && /[a-z]/i.test(value))
    .reduce((acc, value) => acc.split(value).join(`\u2066${value}\u2069`), text);
}

const same = (a: SenderInput, b: SenderInput) =>
  a.email === b.email && a.phone === b.phone && a.web === b.web && a.company === b.company;

export function SenderCheck() {
  const t = useT();
  const [input, setInput] = useState<SenderInput>(EMPTY);
  // The inputs as they were when the button was pressed. A result belongs to those inputs: after an edit
  // it is not shown until the checks are run again.
  const [submitted, setSubmitted] = useState<SenderInput | null>(null);

  const result = submitted && same(submitted, input) ? checkSender(submitted) : null;
  const set = (key: keyof SenderInput) => (event: { target: { value: string } }) =>
    setInput((current) => ({ ...current, [key]: event.target.value }));

  function run(event: FormEvent) {
    event.preventDefault();
    setSubmitted(input);
  }

  return (
    <div className="stack">
      <Card as="section" className="stack" aria-labelledby="sender-form-heading">
        <h2 id="sender-form-heading" className="h2 row">
          <ScanSearch className="icon text-green" aria-hidden="true" />
          <span>{t("What the sender gave you")}</span>
        </h2>
        <p className="small muted">{t("Fill in at least one of the first three. Nothing is sent, saved or looked up: the checks run in this browser.")}</p>
        <form className="stack sender-form" onSubmit={run} noValidate>
          <div className="field">
            <label htmlFor="sender-email">{t("Sender email address")}</label>
            <input
              id="sender-email"
              type="text"
              inputMode="email"
              autoComplete="off"
              spellCheck={false}
              value={input.email}
              onChange={set("email")}
            />
          </div>
          <div className="field">
            <label htmlFor="sender-phone">{t("Phone number")}</label>
            <input
              id="sender-phone"
              type="text"
              inputMode="tel"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              value={input.phone}
              onChange={set("phone")}
            />
          </div>
          <div className="field">
            <label htmlFor="sender-web">{t("Web address or domain")}</label>
            <input
              id="sender-web"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="sender-web-help"
              value={input.web}
              onChange={set("web")}
            />
            <p id="sender-web-help" className="small muted">
              {t("If you paste a full web address, only its host name is used. The page is not opened.")}
            </p>
          </div>
          <div className="field">
            <label htmlFor="sender-company">{t("Company name the offer used")}</label>
            <input
              id="sender-company"
              type="text"
              autoComplete="off"
              aria-describedby="sender-company-help"
              value={input.company}
              onChange={set("company")}
            />
            <p id="sender-company-help" className="small muted">
              {t("Optional. Only used to compare with the email domain.")}
            </p>
          </div>
          <div className="sender-actions">
            <Button type="submit">
              <ScanSearch className="icon" aria-hidden="true" />
              {t("Run the checks")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setInput(EMPTY);
                setSubmitted(null);
              }}
            >
              <Eraser className="icon" aria-hidden="true" />
              {t("Clear")}
            </Button>
          </div>
        </form>
      </Card>

      <SenderResults result={result} />

      <SenderLimits />
    </div>
  );
}

// The result under the form: one live region, always in the page, so a result is announced.
export function SenderResults({ result }: { result: SenderResult | null }) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" className="stack-sm">
      {result && result.kind === "empty" ? <p className="small">{t(NEED_ONE)}</p> : null}
      {result && result.kind === "checked" ? (
        result.findings.length === 0 ? (
          <Callout tone="neutral">
            <p className="not-clearance">{t(NOTHING_FLAGGED)}</p>
          </Callout>
        ) : (
          <Card as="section" className="stack" aria-labelledby="sender-findings-heading">
            <h2 id="sender-findings-heading" className="h2">
              {t(result.findings.length === 1 ? "{0} thing to look at" : "{0} things to look at", result.findings.length)}
            </h2>
            <ul className="stack sender-findings">
              {result.findings.map((finding) => (
                <li key={finding.id} className="card-sunken stack-sm sender-finding">
                  <p>{withIsolates(t(finding.fact, ...finding.args), finding.args)}</p>
                  <p className="small muted">
                    <strong>{t("What to do next")}:</strong> {t(finding.next)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="small muted">{t("These are facts about what you typed, not a verdict. They are separate from the score on the Analyzer page.")}</p>
          </Card>
        )
      ) : null}
    </div>
  );
}

// What the check cannot know, and the official links (read from src/lib/authorities.ts).
export function SenderLimits() {
  const t = useT();
  const channels = mainChannels();
  return (
    <Card as="section" className="stack-sm" aria-labelledby="sender-limits-heading">
      <h2 id="sender-limits-heading" className="h3">
        {t("What this check cannot know")}
      </h2>
      <p className="small muted">{t(CANNOT_KNOW)}</p>
      <h3 className="h3">{t("Official links")}</h3>
      <ul className="stack-sm small kit-links">
        {channels.map((entry) => (
          <li key={entry.id}>
            <a href={entry.url} target="_blank" rel="noopener noreferrer">
              {t(entry.name)} <ExternalLink className="icon" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <p className="small muted">{t(REPORT_FRAUD_NOTE)}</p>
    </Card>
  );
}
