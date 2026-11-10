"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/components/shell/lang";

// One warning sign's "Why it matters" text, folded under a button (AI Studio port). The text is
// passed in from src/lib/warningSigns.ts and rendered as text; nothing is added. The panel stays in
// the page when folded (so search, print and the server render keep it); it is hidden from view and
// from assistive tech until opened. The fold animates grid-template-rows 0fr to 1fr, only when
// motion is allowed.
export function SignAccordion({ why }: { why: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const t = useT();
  return (
    <div className="accordion" data-open={open ? "true" : undefined}>
      <button
        type="button"
        className="accordion-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span>{t("Why it matters")}</span>
        <ChevronDown className="icon accordion-chevron" aria-hidden="true" />
      </button>
      <div id={panelId} className="accordion-panel">
        <div className="accordion-inner">
          <p className="small">{t(why)}</p>
        </div>
      </div>
    </div>
  );
}
