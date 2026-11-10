"use client";

import { useState, type FormEvent } from "react";
import { Copy, ExternalLink, FileSearch } from "lucide-react";
import { Button, ButtonLink, Callout } from "@/components/ui";
import { MOHRE_INQUIRY_URL } from "@/data/uaeContacts";
import { useT } from "@/components/shell/lang";

// The reference app's "MoHRE reference check" claimed to validate reference formats that are not
// published. Here it only tidies what was typed (spaces removed, upper case) so it is easy to copy,
// and sends the person to the MoHRE enquiry page, the only place that can confirm it. It never says
// a reference is valid or invalid. Nothing is sent anywhere.
export function tidyReference(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function ReferenceHelper() {
  const [value, setValue] = useState("");
  const [shown, setShown] = useState("");
  const [copied, setCopied] = useState(false);
  const t = useT();

  function submit(event: FormEvent) {
    event.preventDefault();
    setShown(tidyReference(value));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form className="stack-sm" onSubmit={submit}>
      <div className="field">
        <label htmlFor="mohre-ref">{t("Offer letter or work permit reference")}</label>
        <input id="mohre-ref" type="text" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="row">
        <Button type="submit" variant="secondary" blocked={!value.trim()} reasonId="mohre-ref-help">
          <FileSearch className="icon" aria-hidden="true" />
          {t("Prepare to check")}
        </Button>
        <ButtonLink href={MOHRE_INQUIRY_URL} variant="primary">
          {t("Open the MoHRE enquiry page")}
          <ExternalLink className="icon" aria-hidden="true" />
        </ButtonLink>
      </div>
      <p id="mohre-ref-help" className="small muted">
        {t("Offer Check cannot tell whether a reference is real. Only MoHRE can confirm it.")}
      </p>
      {shown && (
        <Callout tone="info" role="status" title={t("Ready to check on the MoHRE site")}>
          <p className="mono">{shown}</p>
          <div className="row">
            <Button variant="secondary" onClick={() => void copy()}>
              <Copy className="icon" aria-hidden="true" />
              {copied ? t("Copied") : t("Copy reference")}
            </Button>
          </div>
        </Callout>
      )}
    </form>
  );
}
