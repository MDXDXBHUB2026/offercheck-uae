"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
import { addLocalReport } from "@/components/radar/localReports";
import { Button, Card } from "@/components/ui";
import { THREAT_TYPES } from "@/data/threatSamples";
import { useT } from "@/components/shell/lang";

const REGIONS = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "UAE wide"] as const;

export type ReportDraft = { title?: string; description?: string; warningQuote?: string };

// The reference app's "Report Scam to Threat Radar" modal. Here it sends nothing: the report is
// added to this tab's Threat Radar list only (localReports.ts). For a real report, the modal points
// to the official channels in the Gov Portals Hub.
export function ReportModal({ initial, onClose }: { initial: ReportDraft; onClose: () => void }) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [type, setType] = useState<string>(THREAT_TYPES[0]);
  const [region, setRegion] = useState<string>(REGIONS[0]);
  const [description, setDescription] = useState(initial.description ?? "");
  const [warningQuote, setWarningQuote] = useState(initial.warningQuote ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Add a title and a description.");
      return;
    }
    addLocalReport({ title: title.trim(), type, region, description: description.trim(), warningQuote: warningQuote.trim() });
    setDone(true);
  }

  return (
    <div className="modal-backdrop no-print" role="presentation">
      <Card as="section" className="modal stack-sm" aria-labelledby="report-modal-title">
        <div className="modal-head">
          <h2 id="report-modal-title" className="h3 row">
            <ShieldAlert className="icon text-red" aria-hidden="true" />
            <span>{t("Add to Threat Radar")}</span>
          </h2>
          <Button variant="secondary" onClick={onClose} aria-label={t("Close")}>
            <X className="icon" aria-hidden="true" />
          </Button>
        </div>
        {done ? (
          <div className="empty stack-sm" role="status">
            <Check className="icon icon-xl text-green success-tick" aria-hidden="true" />
            <p className="h3">{t("Added to this tab's Threat Radar")}</p>
            <p className="muted">
              {t(
                "It was not sent anywhere and is gone after a reload. To report a scam, use the official channels in the Gov Portals Hub.",
              )}
            </p>
            <Button variant="secondary" onClick={onClose}>
              {t("Close")}
            </Button>
          </div>
        ) : (
          <form className="stack-sm" onSubmit={submit}>
            <p className="small muted">
              {t("This stays in this browser tab only. Offer Check does not send reports to anyone.")}
            </p>
            <div className="field">
              <label htmlFor="report-title">{t("Title")}</label>
              <input id="report-title" ref={firstField} type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="report-type">{t("Type")}</label>
                <select id="report-type" value={type} onChange={(e) => setType(e.target.value)}>
                  {THREAT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {t(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="report-region">{t("Emirate")}</label>
                <select id="report-region" value={region} onChange={(e) => setRegion(e.target.value)}>
                  {REGIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="report-quote">{t("Quoted text")}</label>
              <input id="report-quote" type="text" value={warningQuote} onChange={(e) => setWarningQuote(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="report-description">{t("How it works")}</label>
              <textarea id="report-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && (
              <p className="text-red small" role="alert">
                {t(error)}
              </p>
            )}
            <div className="row">
              <Button variant="secondary" onClick={onClose}>
                {t("Cancel")}
              </Button>
              <Button type="submit" variant="danger">
                {t("Add to this tab")}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
