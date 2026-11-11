// The official UAE government domains the cross-checks compare against. Built only from the URLs
// already in src/data/uaeContacts.ts, src/lib/authorities.ts and src/lib/warningSigns.ts (owner-
// confirmed links); no domain is typed here. Client-safe: plain data, no rules.
import { UAE_CONTACTS } from "@/data/uaeContacts";
import { AUTHORITIES } from "@/lib/authorities";
import { WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";

// Second-level labels under a country code, such as gov.ae or co.uk: the registrable domain then
// has three labels (mohre.gov.ae), otherwise two (u.ae).
const SECOND_LEVEL = new Set(["gov", "co", "ac", "org", "net", "com", "mil", "sch"]);

// The registrable part of a host name: "receipts.mohre.gov.ae" gives "mohre.gov.ae".
export function baseDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const take = SECOND_LEVEL.has(labels[labels.length - 2]) && labels[labels.length - 1].length === 2 ? 3 : 2;
  return labels.slice(-take).join(".");
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export const OFFICIAL_SOURCE_URLS: readonly string[] = [
  ...UAE_CONTACTS.map((entry) => entry.url),
  ...AUTHORITIES.flatMap((entry) => [entry.sourceUrl, ...(entry.alsoSee ? [entry.alsoSee.url] : [])]),
  WARNING_SIGNS_SOURCE.url,
];

// For example ["dubaipolice.gov.ae", "gdrfad.gov.ae", "icp.gov.ae", "mohre.gov.ae", "u.ae"].
export const OFFICIAL_DOMAINS: readonly string[] = [
  ...new Set(OFFICIAL_SOURCE_URLS.flatMap((url) => {
    const host = hostOf(url);
    return host ? [baseDomain(host)] : [];
  })),
].sort();

// The distinctive first label of each official domain ("mohre", "icp", "gdrfad", "dubaipolice"),
// used to spot a look-alike. One- and two-letter labels ("u" in u.ae) are too short to compare.
export const OFFICIAL_LABELS: readonly string[] = [
  ...new Set(OFFICIAL_DOMAINS.map((domain) => domain.split(".")[0]).filter((label) => label.length >= 3)),
];

export function isOfficialHost(host: string): boolean {
  return OFFICIAL_DOMAINS.includes(baseDomain(host));
}
