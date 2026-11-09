// Official UAE places to report a suspected job scam, shown on /about#report-fraud. Owner-approved
// entries only, each with the official page it comes from; nothing here is invented. No phone number
// or email address on purpose: the official sources disagree on MOHRE's numbers, so the page links
// to the official pages instead. No jurisdiction rule beyond the source wording.

export type Authority = {
  id: string;
  name: string;
  // What it is for, in the source's words.
  purpose: string;
  sourceName: string;
  sourceUrl: string;
  // A second official page, where the owner gave one.
  alsoSee?: { name: string; url: string };
  // ISO date the owner checked the source.
  lastVerified: string;
  reviewer: string;
};

const VERIFIED = "2026-11-09";
const REVIEWER = "owner, approved 2026-11-09";

const CYBERCRIME_SOURCE = {
  sourceName: "UAE Government Portal, “Report cybercrimes online” (page last updated 04 Mar 2024)",
  sourceUrl:
    "https://u.ae/en/information-and-services/justice-safety-and-the-law/cyber-safety-and-digital-security/report-cybercrimes-online",
};

const LISTED = "Listed on the UAE Government Portal as a way to report cybercrime.";

export const AUTHORITIES: readonly Authority[] = [
  {
    id: "moi_ecrimes",
    name: "Ministry of Interior eCrimes platform",
    purpose: "Report cybercrime such as online fraud. Available in the MoI UAE app.",
    ...CYBERCRIME_SOURCE,
    lastVerified: VERIFIED,
    reviewer: REVIEWER,
  },
  {
    id: "dubai_police_ecrime",
    name: "Dubai Police eCrime website",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
    lastVerified: VERIFIED,
    reviewer: REVIEWER,
  },
  {
    id: "abu_dhabi_aman",
    name: "Abu Dhabi Police Aman service",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
    lastVerified: VERIFIED,
    reviewer: REVIEWER,
  },
  {
    id: "fpp_my_safe_society",
    name: "My Safe Society app of the Federal Public Prosecution",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
    lastVerified: VERIFIED,
    reviewer: REVIEWER,
  },
  {
    id: "police_station",
    name: "Your nearest police station",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
    lastVerified: VERIFIED,
    reviewer: REVIEWER,
  },
  {
    id: "mohre_verify",
    name: "Ministry of Human Resources and Emiratisation (MOHRE)",
    purpose:
      "Verify a job offer by its reference number through the MOHRE enquiry service, and contact MOHRE through its official channels.",
    sourceName: "UAE Government Portal, “Tips to stay safe from labour and visa fraud”",
    sourceUrl:
      "https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/tips-to-avoid-labour-and-visa-fraud",
    alsoSee: { name: "MOHRE official website", url: "https://www.mohre.gov.ae" },
    lastVerified: VERIFIED,
    reviewer: REVIEWER,
  },
];

// The renderer shows an entry only when it has a source link and a date it was last verified.
export function shownAuthorities(list: readonly Authority[] = AUTHORITIES): Authority[] {
  return list.filter(
    (entry) => /^https:\/\/\S+$/.test(entry.sourceUrl ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(entry.lastVerified ?? ""),
  );
}

// The main channels /about shows as links in a small box (owner decision, 2026-11-09). The dates,
// reviewer and source text stay in the list above and are not shown on the page. MOHRE links to
// its own site; the others to the UAE Government Portal page that lists them.
export const MAIN_CHANNEL_IDS = ["moi_ecrimes", "dubai_police_ecrime", "abu_dhabi_aman", "mohre_verify"] as const;

export function mainChannels(list: readonly Authority[] = AUTHORITIES): { id: string; name: string; url: string }[] {
  const shown = shownAuthorities(list);
  return MAIN_CHANNEL_IDS.flatMap((id) => {
    const entry = shown.find((item) => item.id === id);
    return entry ? [{ id: entry.id, name: entry.name, url: entry.alsoSee?.url ?? entry.sourceUrl }] : [];
  });
}

export const REPORT_FRAUD_ID = "report-fraud";

export const REPORT_FRAUD_NOTE =
  "Offer Check does not report anything for you and does not give legal advice. These are official UAE channels; use the official page for current details.";

export const REPORT_LINK_SENTENCE = "If you think this is a scam, see the official places to report it.";
