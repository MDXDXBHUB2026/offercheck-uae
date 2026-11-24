// The Sender check (production Phase 7, 2026-11-24): a few plain facts about an email address, a phone
// number, a web address and a company name, worked out in the browser. Nothing here fetches a page,
// looks up a domain or a number, stores anything or sends anything: it only reads the text the person
// typed. It is unrelated to the /check score (src/lib/scoring.ts is not touched) and shares no code with
// the red-flag rules (src/lib/agents/redFlag.ts stays out of the client bundle).
//
// Each finding is a plain fact and what to do next, never a verdict. Offer Check cannot tell whether a
// number is a VoIP line, who owns a domain, or whether a company is registered, and says so.
//
// Numbering facts (docs/known-limitations.md, "What the Sender check cannot know"):
// - ITU-T filing "United Arab Emirates (country code +971)", communication of 7.IX.2006 by the TRA
//   (now the TDRA): national numbers are 8 to 9 digits; area codes 2, 3, 4, 6, 7 and 9 with 8 digits;
//   mobile numbers use a 05X range with 9 digits; 800 is a toll-free service range. That filing names
//   the mobile codes 50 and 55 only.
// - The mobile prefixes 52, 54, 56 and 58 are the owner's list (brief of 2026-11-24). They are not in
//   the 2006 filing, and no TDRA document was found that lists them, so the finding says it follows
//   "Offer Check's list" and that the numbering plan can change.
import { AUTHORITIES, mainChannels } from "@/lib/authorities";
import { MOHRE_INQUIRY_URL, UAE_CONTACTS } from "@/data/uaeContacts";

export type SenderInput = { email: string; phone: string; web: string; company: string };

export type SenderField = "email" | "phone" | "web";

export type SenderFinding = {
  id: string;
  field: SenderField;
  // An English template with {0}, {1}... slots, and the values for them. The page translates both.
  fact: string;
  args: string[];
  // What to do next.
  next: string;
};

export type SenderResult =
  | { kind: "empty" }
  | { kind: "checked"; findings: SenderFinding[]; fieldsChecked: SenderField[] };

// ---------- Fixed wording ----------
export const NOTHING_FLAGGED =
  "These checks found nothing to flag. This is not a clearance: confirm the employer through official channels before you pay a fee or send documents.";
export const NEED_ONE =
  "Add an email address, a phone number or a web address to run the checks. The company name is only used to compare with the email domain.";
export const CANNOT_KNOW =
  "Offer Check does not look anything up. It cannot tell whether a number is a VoIP line, who owns an address, or whether a company is registered.";

const NEXT_CONFIRM =
  "Confirm the employer through official channels before you pay a fee or send documents. Ask for a message from the company's own email domain.";
const NEXT_TYPE_IT =
  "Do not follow links in the message. Type the official address yourself, or use the official links below.";
const NEXT_PHONE =
  "Ask for the employer's UAE contact details and confirm them through official channels before you pay a fee or send documents.";

const EMAIL_DOMAIN = "email domain";
const WEB_ADDRESS = "web address";

export const FACT_NOT_AN_EMAIL = "The email address could not be read. Type only the address, for example name@company.com.";
export const FACT_NOT_A_HOST = "The web address could not be read as a web address or domain name.";
export const FACT_FREE_MAIL = "The email address uses a free-mail provider ({0}). Anyone can open an account there.";
export const FACT_LOOKALIKE_SWAPPED =
  "The {0} ({1}) is not in Offer Check's list of official addresses, but it matches {2} once look-alike letters are swapped (for example rn for m, 0 for o, 1 for l).";
export const FACT_LOOKALIKE_HYPHENS =
  "The {0} ({1}) is not in Offer Check's list of official addresses, but it matches {2} once the hyphens are removed.";
export const FACT_LOOKALIKE_CLOSE =
  "The {0} ({1}) is not in Offer Check's list of official addresses, and it differs from {2} by only one or two characters.";
export const FACT_LOOKALIKE_ADDED =
  "The {0} ({1}) is not in Offer Check's list of official addresses, but it contains the name in {2} with other words or hyphens added.";
export const FACT_INTERNATIONAL =
  "The {0} ({1}) uses an international form: characters outside a to z, digits and hyphens, or an xn-- label. Look-alike addresses use this form, and so do ordinary international names.";
export const FACT_MIXED_SCRIPT =
  "The {0} ({1}) mixes letters from more than one writing system in one name (for example Latin and Cyrillic). Look-alike addresses use this to resemble another name.";
export const FACT_NO_COMPANY_NAME =
  "The email domain ({0}) does not contain any word from the company name you typed ({1}). A company's own domain often does, but not always.";
export const FACT_PHONE_LETTERS =
  "The phone number contains letters. A phone number is made of digits, spaces and the signs + - ( ) only.";
export const FACT_PHONE_NO_COUNTRY =
  "The phone number has no country code and no leading 0, so Offer Check cannot tell which country it is for.";
export const FACT_PHONE_OTHER_COUNTRY =
  "The phone number starts with a country code other than +971 (the UAE). Offer Check does not look up which country it belongs to.";
export const FACT_PHONE_BAD_LENGTH =
  "The phone number has {0} digits after +971. UAE numbers have 8 or 9 digits after +971: 8 for a landline, 9 for a mobile.";
export const FACT_PHONE_MOBILE_LENGTH =
  "The phone number starts with the mobile prefix {0} but has {1} digits after +971. UAE mobile numbers have 9.";
export const FACT_PHONE_LANDLINE_LENGTH =
  "The phone number starts with the area code {0} but has {1} digits after +971. UAE landline numbers have 8.";
export const FACT_PHONE_UNKNOWN_START =
  "After +971 the phone number starts with {0}, which is not a mobile prefix (50, 52, 54, 55, 56, 58), a landline area code (2, 3, 4, 6, 7, 9) or 800 in Offer Check's list. The numbering plan can change.";

export const NEXT_STEPS = [NEXT_CONFIRM, NEXT_TYPE_IT, NEXT_PHONE] as const;
export const FIELD_NAMES = [EMAIL_DOMAIN, WEB_ADDRESS] as const;

// Every sentence the checks can produce, for the Arabic coverage test.
export const SENDER_TEMPLATES = [
  NOTHING_FLAGGED,
  NEED_ONE,
  CANNOT_KNOW,
  NEXT_CONFIRM,
  NEXT_TYPE_IT,
  NEXT_PHONE,
  EMAIL_DOMAIN,
  WEB_ADDRESS,
  FACT_NOT_AN_EMAIL,
  FACT_NOT_A_HOST,
  FACT_FREE_MAIL,
  FACT_LOOKALIKE_SWAPPED,
  FACT_LOOKALIKE_HYPHENS,
  FACT_LOOKALIKE_CLOSE,
  FACT_LOOKALIKE_ADDED,
  FACT_INTERNATIONAL,
  FACT_MIXED_SCRIPT,
  FACT_NO_COMPANY_NAME,
  FACT_PHONE_LETTERS,
  FACT_PHONE_NO_COUNTRY,
  FACT_PHONE_OTHER_COUNTRY,
  FACT_PHONE_BAD_LENGTH,
  FACT_PHONE_MOBILE_LENGTH,
  FACT_PHONE_LANDLINE_LENGTH,
  FACT_PHONE_UNKNOWN_START,
] as const;

// ---------- Official addresses, read from the two source files (nothing is copied) ----------
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// The registrable part: the last three labels under gov.ae, otherwise the last two.
function baseOf(host: string): string {
  const labels = host.split(".");
  return labels.slice(host.endsWith(".gov.ae") ? -3 : -2).join(".");
}

export function officialHosts(): string[] {
  const urls = [
    ...AUTHORITIES.flatMap((entry) => [entry.sourceUrl, entry.alsoSee?.url ?? ""]),
    ...mainChannels().map((channel) => channel.url),
    ...UAE_CONTACTS.map((entry) => entry.url),
    MOHRE_INQUIRY_URL,
  ];
  return [...new Set(urls.flatMap((url) => hostOf(url) ?? []))].sort();
}

export function officialBases(): string[] {
  return [...new Set(officialHosts().map(baseOf))].sort();
}

// The names looked for inside a longer address: the first label of a gov.ae base, four letters or more.
function officialNames(): string[] {
  return officialBases()
    .filter((base) => base.endsWith(".gov.ae"))
    .map((base) => base.split(".")[0])
    .filter((name) => name.length >= 4);
}

export function isOfficialHost(host: string): boolean {
  return officialBases().some((base) => host === base || host.endsWith(`.${base}`));
}

// ---------- Reading what was typed ----------
const SCRIPTS: [string, RegExp][] = [
  ["Latin", /\p{Script=Latin}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Han", /\p{Script=Han}/u],
];

function scriptsIn(label: string): Set<string> {
  const found = new Set<string>();
  for (const char of label) {
    if (!/\p{L}/u.test(char)) continue;
    found.add(SCRIPTS.find(([, re]) => re.test(char))?.[0] ?? "Other");
  }
  return found;
}

// Only the host name is kept from a pasted address: no scheme, user, port, path, query or fragment.
// Nothing is fetched. null when no host name can be read.
export function hostFromAddress(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;
  text = text.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^\/\//, "");
  text = text.split(/[/?#\\]/)[0];
  if (text.includes("@")) text = text.slice(text.lastIndexOf("@") + 1);
  text = text.replace(/:\d*$/, "").replace(/\.$/, "").toLowerCase();
  if (!/^[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+$/u.test(text)) return null;
  return text.replace(/^www\./, "");
}

export function emailParts(raw: string): { host: string } | null {
  const text = raw.trim();
  const at = text.lastIndexOf("@");
  if (at < 1 || text.indexOf("@") !== at || /\s/.test(text)) return null;
  const host = hostFromAddress(text.slice(at + 1));
  return host ? { host } : null;
}

// ---------- Free-mail providers (this file's own list) ----------
const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zohomail.com",
  "yandex.com",
  "yandex.ru",
  "inbox.com",
  "tutanota.com",
  "fastmail.com",
]);
// Providers that use a country ending: yahoo.co.uk, hotmail.fr, outlook.ae, live.com.au and so on.
const FREE_MAIL_BRANDS = /^(?:yahoo|hotmail|outlook|live|msn)\.(?:com?\.[a-z]{2}|[a-z]{2,3})$/;

export function isFreeMail(host: string): boolean {
  return FREE_MAIL.has(host) || FREE_MAIL_BRANDS.test(host);
}

// ---------- Look-alike addresses ----------
const CONFUSABLES: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", у: "y", і: "i", ј: "j", ѕ: "s", ԁ: "d",
  ο: "o", α: "a", ν: "v",
};

function withoutHyphens(text: string): string {
  return text.replace(/-/g, "");
}

function swapLookalikes(text: string): string {
  const mapped = [...text].map((char) => CONFUSABLES[char] ?? char).join("");
  return mapped.replace(/rn/g, "m").replace(/vv/g, "w").replace(/0/g, "o").replace(/1/g, "l");
}

// Edit distance, stopping early above `limit`.
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    if (Math.min(...row) > limit) return limit + 1;
    previous = row;
  }
  return previous[b.length];
}

export type Lookalike = { official: string; how: "swapped" | "hyphens" | "close" | "added" };

export function lookalikeOf(host: string): Lookalike | null {
  if (isOfficialHost(host)) return null;
  const targets = [...new Set([...officialHosts(), ...officialBases()])];
  const squashed = withoutHyphens(host);
  const swapped = swapLookalikes(squashed);
  const sameOrBelow = (candidate: string, target: string) => candidate === target || candidate.endsWith(`.${target}`);

  for (const target of targets) {
    if (swapLookalikes(host) !== host && sameOrBelow(swapped, target)) return { official: target, how: "swapped" };
    if (squashed !== host && sameOrBelow(squashed, target)) return { official: target, how: "hyphens" };
  }
  for (const target of targets) {
    // A very short name (u.ae) would match too much by edit distance.
    if (target.length < 6) continue;
    if ([host, squashed, swapped].some((variant) => editDistance(variant, target, 2) <= 2)) return { official: target, how: "close" };
  }
  for (const target of targets) {
    if (target.length >= 6 && swapped.includes(target)) return { official: target, how: "added" };
  }
  for (const name of officialNames()) {
    if (swapped.includes(name)) {
      const target = officialBases().find((base) => base.startsWith(`${name}.`)) ?? name;
      return { official: target, how: "added" };
    }
  }
  return null;
}

// ---------- Phone numbers (UAE numbering, see the header) ----------
const MOBILE_PREFIXES = ["50", "52", "54", "55", "56", "58"] as const;
const LANDLINE_CODES = ["2", "3", "4", "6", "7", "9"] as const;
const UAE_DIGITS = "971";

type PhoneRead = { kind: "uae"; national: string } | { kind: "other" } | { kind: "none" } | { kind: "letters" };

export function readPhone(raw: string): PhoneRead {
  const text = raw.trim();
  if (/\p{L}/u.test(text)) return { kind: "letters" };
  const digits = text.replace(/\D/g, "");
  const international = /^\s*(?:\+|00)/.test(text);
  if (international) {
    const all = text.replace(/^\s*(?:\+|00)/, "").replace(/\D/g, "");
    if (!all) return { kind: "none" };
    if (!all.startsWith(UAE_DIGITS)) return { kind: "other" };
    // "+971 (0)50 ...": the 0 after the country code is not part of the number.
    return { kind: "uae", national: all.slice(UAE_DIGITS.length).replace(/^0/, "") };
  }
  if (digits.startsWith(UAE_DIGITS) && digits.length >= 11) return { kind: "uae", national: digits.slice(UAE_DIGITS.length).replace(/^0/, "") };
  if (digits.startsWith("0")) return { kind: "uae", national: digits.slice(1) };
  // Toll-free numbers are dialled inside the UAE without a leading 0 (800 followed by the number).
  if (digits.startsWith("800")) return { kind: "uae", national: digits };
  return { kind: "none" };
}

function phoneFindings(raw: string): SenderFinding[] {
  const read = readPhone(raw);
  const make = (id: string, fact: string, args: string[] = []): SenderFinding => ({ id, field: "phone", fact, args, next: NEXT_PHONE });
  if (read.kind === "letters") return [make("phone-letters", FACT_PHONE_LETTERS)];
  if (read.kind === "none") return [make("phone-no-country", FACT_PHONE_NO_COUNTRY)];
  if (read.kind === "other") return [make("phone-other-country", FACT_PHONE_OTHER_COUNTRY)];
  const { national } = read;
  // 800 is a toll-free range whose length varies.
  if (national.startsWith("800")) return [];
  const length = String(national.length);
  if (national.length < 8 || national.length > 9) return [make("phone-length", FACT_PHONE_BAD_LENGTH, [length])];
  const mobile = MOBILE_PREFIXES.find((prefix) => national.startsWith(prefix));
  if (mobile) return national.length === 9 ? [] : [make("phone-mobile-length", FACT_PHONE_MOBILE_LENGTH, [mobile, length])];
  const area = LANDLINE_CODES.find((code) => national.startsWith(code));
  if (area) return national.length === 8 ? [] : [make("phone-landline-length", FACT_PHONE_LANDLINE_LENGTH, [area, length])];
  return [make("phone-unknown-start", FACT_PHONE_UNKNOWN_START, [national.slice(0, 2)])];
}

// ---------- Domains ----------
function domainFindings(field: "email" | "web", host: string): SenderFinding[] {
  const name = field === "email" ? EMAIL_DOMAIN : WEB_ADDRESS;
  const found: SenderFinding[] = [];
  const labels = host.split(".");
  const international = labels.some((label) => label.startsWith("xn--")) || /[^ -~]/.test(host);
  const mixed = labels.some((label) => scriptsIn(label).size > 1);
  if (mixed) found.push({ id: `${field}-mixed-script`, field, fact: FACT_MIXED_SCRIPT, args: [name, host], next: NEXT_TYPE_IT });
  else if (international) found.push({ id: `${field}-international`, field, fact: FACT_INTERNATIONAL, args: [name, host], next: NEXT_TYPE_IT });
  const look = lookalikeOf(host);
  if (look) {
    const fact = {
      swapped: FACT_LOOKALIKE_SWAPPED,
      hyphens: FACT_LOOKALIKE_HYPHENS,
      close: FACT_LOOKALIKE_CLOSE,
      added: FACT_LOOKALIKE_ADDED,
    }[look.how];
    found.push({ id: `${field}-lookalike-${look.how}`, field, fact, args: [name, host, look.official], next: NEXT_TYPE_IT });
  }
  return found;
}

// ---------- The company name against the email domain ----------
const COMPANY_FILLER = new Set([
  "the", "and", "for", "llc", "ltd", "limited", "fze", "fzc", "fzco", "fzllc", "inc", "corp", "plc", "pjsc", "llp", "company",
  "group", "general", "trading", "services", "solutions", "recruitment", "recruiters", "consultancy", "consultants", "consulting",
  "jobs", "careers", "international", "holding", "holdings", "establishment", "branch", "global", "uae", "dubai",
]);

function companyWords(company: string): string[] | null {
  const text = company.trim().toLowerCase();
  if (!text || /[^ -~]/.test(text)) return null;
  const words = text.split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
  if (words.length === 0) return null;
  const significant = words.filter((word) => !COMPANY_FILLER.has(word));
  return significant.length > 0 ? significant : words;
}

function companyFinding(host: string, company: string): SenderFinding | null {
  const words = companyWords(company);
  if (!words) return null;
  const squashed = host.replace(/[^a-z0-9]/g, "");
  if (words.some((word) => squashed.includes(word))) return null;
  return { id: "email-no-company-name", field: "email", fact: FACT_NO_COMPANY_NAME, args: [host, company.trim()], next: NEXT_CONFIRM };
}

// ---------- The whole check ----------
export function checkSender(input: SenderInput): SenderResult {
  const email = input.email.trim();
  const phone = input.phone.trim();
  const web = input.web.trim();
  if (!email && !phone && !web) return { kind: "empty" };

  const findings: SenderFinding[] = [];
  const fieldsChecked: SenderField[] = [];

  if (email) {
    fieldsChecked.push("email");
    const parts = emailParts(email);
    if (!parts) {
      findings.push({ id: "email-unreadable", field: "email", fact: FACT_NOT_AN_EMAIL, args: [], next: NEXT_CONFIRM });
    } else if (isFreeMail(parts.host)) {
      findings.push({ id: "email-free-mail", field: "email", fact: FACT_FREE_MAIL, args: [parts.host], next: NEXT_CONFIRM });
    } else {
      findings.push(...domainFindings("email", parts.host));
      if (!isOfficialHost(parts.host)) {
        const missing = companyFinding(parts.host, input.company);
        if (missing) findings.push(missing);
      }
    }
  }
  if (web) {
    fieldsChecked.push("web");
    const host = hostFromAddress(web);
    if (!host) findings.push({ id: "web-unreadable", field: "web", fact: FACT_NOT_A_HOST, args: [], next: NEXT_TYPE_IT });
    else findings.push(...domainFindings("web", host));
  }
  if (phone) {
    fieldsChecked.push("phone");
    findings.push(...phoneFindings(phone));
  }
  return { kind: "checked", findings, fieldsChecked };
}
