"use client";

import { ExternalLink } from "lucide-react";
import { useT } from "@/components/shell/lang";
import { SITE_MISSED_SCAM_FORM_URL } from "@/lib/siteConfig";

// Production Phase 5 (owner decision, 2026-11-23): a plain link to the owner's Google Form for a scam
// Offer Check missed. Shown under a result on /check and on /about and /privacy. Nothing is sent to
// the form from here: no offer text, no result, no query string, no request. It opens in a new tab,
// and the line beside it says that Google receives what the person types there. The address is
// kept only in src/lib/siteConfig.ts; with an empty value nothing is rendered.
export const MISSED_SCAM_LINK_TEXT = "Offer Check missed a scam? Tell us what it did, without pasting the offer.";
export const MISSED_SCAM_NOTE = "The link opens a Google Form in a new tab. Google receives what you type there. Offer Check does not send any offer text to the form.";

export function MissedScamLink({ url = SITE_MISSED_SCAM_FORM_URL, className }: { url?: string; className?: string }) {
  const t = useT();
  if (!url.trim()) return null;
  return (
    <div className={className ? `missed-scam ${className}` : "missed-scam"} data-missed-scam="">
      <p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {t(MISSED_SCAM_LINK_TEXT)} <ExternalLink className="icon" aria-hidden="true" />
        </a>
      </p>
      <p className="small muted">{t(MISSED_SCAM_NOTE)}</p>
    </div>
  );
}
