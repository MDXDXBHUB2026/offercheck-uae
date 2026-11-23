// Who runs Offer Check and how to reach them. The one place for the operator line and the contact
// email (production hardening Phase 3, 2026-11-15): the About, Privacy and Terms pages read them from
// here, and src/app/siteConfig.test.ts checks that no other source file holds a copy. To name a
// person later, change SITE_OPERATOR here only. No personal name is shown anywhere on the site
// (owner instruction).
//
// The Arabic line is not in src/lib/i18nAr.ts, so that it too has one copy. [review] written for
// this app, not yet reviewed by a native speaker.
export const SITE_OPERATOR = {
  en: "Offer Check UAE, an independent project run by an individual developer in the UAE",
  // Starts with an Arabic word, so the line keeps its right-to-left direction (globals.css sets
  // unicode-bidi: plaintext on Arabic pages).
  ar: "مشروع مستقل باسم Offer Check UAE يديره مطوّر فرد في الإمارات",
} as const;

export const SITE_CONTACT_EMAIL = "offercheck.uae@gmail.com";

// The "Last updated" date at the top of /privacy and /terms (ISO date, shown as written).
export const POLICY_LAST_UPDATED = "2026-11-23";

// Production Phase 5 (owner decision, 2026-11-23): the "Offer Check missed a scam?" form. A Google
// Form run by the owner; it opens in a new tab and Google receives what the person types there.
// Offer Check never sends offer text, a result or anything else to it: it is a plain link. The only
// copy of the address: the link is shown only while this value is not empty (set it to "" to turn
// the link off everywhere). src/lib/csp.ts is not involved, because a link is a navigation, not a
// request the page makes.
export const SITE_MISSED_SCAM_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeLc3RSg_6y59__ommv0U1nckl_8bO2MQPgE8br_odCH3Dg0A/viewform";
