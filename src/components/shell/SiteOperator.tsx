"use client";

import { useLang } from "@/components/shell/lang";
import { SITE_CONTACT_EMAIL, SITE_OPERATOR } from "@/lib/siteConfig";

// The operator line and the contact address, both read from src/lib/siteConfig.ts (the only copy).
// The address is shown left to right in Arabic too.
export function SiteOperator() {
  return <>{SITE_OPERATOR[useLang()]}</>;
}

export function ContactEmail() {
  return (
    <a href={`mailto:${SITE_CONTACT_EMAIL}`} lang="en" dir="ltr">
      {SITE_CONTACT_EMAIL}
    </a>
  );
}
