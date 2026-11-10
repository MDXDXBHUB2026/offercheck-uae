// Official UAE places to report a suspected job scam, shown in the Gov Portals Hub (#report-fraud).
// Owner-approved entries only, each with the official page it comes from; nothing here is invented.
// No phone number or email address here: the owner-confirmed hotlines and websites live only in
// src/data/uaeContacts.ts, and the MoHRE and eCrime website links below are read from that file so
// a link never appears with two values. No jurisdiction rule beyond the source wording.
import { contact } from "@/data/uaeContacts";

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

// LINK-2 (2026-11-10): the earlier source page (.../report-cybercrimes-online) returns 404. This is
// the UAE Government Portal page that now lists the cybercrime reporting channels: the MoI eCrimes
// platform (MoI UAE app), the Dubai Police eCrime website, Aman (Abu Dhabi Police), the My Safe
// Society app and the nearest police station or 999. It is a directory page, not any service's own
// portal. Link supplied by the owner on 2026-11-10; page "Updated On : 01 Oct 2026".
const CYBERCRIME_VERIFIED = "2026-11-10";
const CYBERCRIME_REVIEWER = "owner, link supplied 2026-11-10";

const CYBERCRIME_SOURCE = {
  sourceName: "UAE Government Portal, “Cyber safety and digital security” (page updated 01 Oct 2026)",
  sourceUrl: "https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/cyber-safety-and-digital-security",
  lastVerified: CYBERCRIME_VERIFIED,
  reviewer: CYBERCRIME_REVIEWER,
};

const LISTED = "Listed on the UAE Government Portal as a way to report cybercrime.";

export const AUTHORITIES: readonly Authority[] = [
  {
    id: "moi_ecrimes",
    // The link is the UAE Government directory page, not the MoI's own portal, and the label says
    // so. The MoI eCrimes platform's own address is not owner-confirmed (defects.md LINK-2).
    name: "UAE Government: where to report cybercrime (lists the MoI eCrimes platform)",
    purpose: "Report cybercrime such as online fraud. Available in the MoI UAE app.",
    ...CYBERCRIME_SOURCE,
  },
  {
    id: "dubai_police_ecrime",
    name: "Dubai Police eCrime website",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
    alsoSee: { name: "Dubai Police eCrime website", url: contact("ecrime").url },
  },
  {
    id: "abu_dhabi_aman",
    // As above: a directory page that lists Aman, not Aman's own address (not owner-confirmed).
    name: "UAE Government: where to report cybercrime (lists Aman, Abu Dhabi Police)",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
  },
  {
    id: "fpp_my_safe_society",
    name: "My Safe Society app of the Federal Public Prosecution",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
  },
  {
    id: "police_station",
    name: "Your nearest police station",
    purpose: LISTED,
    ...CYBERCRIME_SOURCE,
  },
  {
    id: "mohre_verify",
    name: "Ministry of Human Resources and Emiratisation (MOHRE)",
    purpose:
      "Verify a job offer by its reference number through the MOHRE enquiry service, and contact MOHRE through its official channels.",
    sourceName: "UAE Government Portal, “Tips to stay safe from labour and visa fraud”",
    sourceUrl:
      "https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/tips-to-avoid-labour-and-visa-fraud",
    alsoSee: { name: "MOHRE official website", url: contact("mohre").url },
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
