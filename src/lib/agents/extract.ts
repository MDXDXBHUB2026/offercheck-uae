// Small deterministic extractors for the Verification cross-checks: email domains, links, UAE
// authority names, messaging-app mentions, company names, "no fees" claims and salary currencies.
// Offer text is untrusted data: it is only matched against fixed, bounded patterns, never
// interpreted, fetched or looked up. Every repeat below has an upper bound, and at most MAX_MATCHES
// matches of each kind are read, so a 20,000-character input stays fast.
import { OFFICIAL_LABELS, baseDomain, isOfficialHost } from "@/lib/officialDomains";

export const MAX_MATCHES = 50;
const MAX_QUOTE_CHARS = 200;

export function quote(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_QUOTE_CHARS ? `${clean.slice(0, MAX_QUOTE_CHARS - 1)}…` : clean;
}

function take(text: string, pattern: RegExp): RegExpMatchArray[] {
  const out: RegExpMatchArray[] = [];
  for (const match of text.matchAll(pattern)) {
    out.push(match);
    if (out.length >= MAX_MATCHES) break;
  }
  return out;
}

// ---------- Emails ----------
const EMAIL = /\b[a-z0-9._%+-]{1,64}@([a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63}){1,4})\b/gi;

export type EmailMention = { address: string; domain: string; index: number };

export function emails(text: string): EmailMention[] {
  return take(text, EMAIL).map((m) => ({ address: m[0], domain: m[1].toLowerCase(), index: m.index ?? 0 }));
}

// ---------- Links ----------
// A scheme or "www." always starts a link. A bare host counts only with one of these endings, so a
// typo such as "company.Please" is not read as a link.
const BARE_TLDS =
  "com|net|org|ae|ly|co|io|me|info|xyz|top|in|uk|link|site|online|gl|at|gy|id|cc|us|biz|live|app|page|to|li|su|ru|cn|pk|ph|bd|lk|np|qa|sa|om|kw|bh|gd|st|im|tk|ml|ga|cf";
const HOST_END = "(?![\\w.-]*@)(?![\\w-])";
const LINK = new RegExp(
  [
    `\\bhttps?:\\/\\/((?:[a-z0-9-]{1,63}\\.){0,8}[a-z0-9-]{1,63})${HOST_END}`,
    `(?<![@\\w.-])(www\\.(?:[a-z0-9-]{1,63}\\.){1,6}[a-z]{2,24})${HOST_END}`,
    `(?<![@\\w.\\/-])((?:[a-z0-9-]{1,63}\\.){1,6}(?:${BARE_TLDS}))${HOST_END}`,
  ]
    .map((branch) => `(?:${branch})`)
    .join("|") + `(?::\\d{1,5})?(?:\\/[^\\s<>"'()\\[\\]]{0,200})?`,
  "gi",
);
const RAW_IP = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export type LinkMention = { raw: string; host: string; rawIp: boolean; index: number };

export function links(text: string): LinkMention[] {
  return take(text, LINK).map((m) => {
    const host = (m[1] ?? m[2] ?? m[3]).toLowerCase().replace(/^www\./, "");
    return { raw: m[0].replace(/[.,;:!?]+$/, ""), host, rawIp: RAW_IP.test(host), index: m.index ?? 0 };
  });
}

// Link shorteners: the link hides where it goes. Messaging links (wa.me, t.me) are not here; the
// messaging-app check reads those.
export const LINK_SHORTENERS: readonly string[] = [
  "bit.ly",
  "bitly.com",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "v.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "rb.gy",
  "t.ly",
  "tiny.cc",
  "s.id",
  "shorte.st",
  "lnkd.in",
  "tr.im",
];

export function isShortener(host: string): boolean {
  return LINK_SHORTENERS.includes(host.toLowerCase());
}

// One letter added, removed or changed, or two neighbouring letters swapped ("moher" for "mohre").
function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length === b.length) {
    const diff = [...a].flatMap((char, index) => (char === b[index] ? [] : [index]));
    if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
  }
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// A host that is not on the official list but uses an official name: "mohre-jobs.com",
// "mohre.gov.ae.example.net", or one letter off ("moher.gov.ae", "gdrfa d"). Short official names
// (under five letters, such as "icp") are compared only as whole words, never by spelling.
export function lookalikeOf(host: string): string | null {
  const lower = host.toLowerCase();
  if (isOfficialHost(lower) || RAW_IP.test(lower)) return null;
  const tokens = lower.split(/[.-]/);
  const first = baseDomain(lower).split(".")[0];
  for (const label of OFFICIAL_LABELS) {
    if (tokens.includes(label)) return label;
    if (label.length >= 5 && editDistanceAtMostOne(first, label)) return label;
  }
  return null;
}

// ---------- UAE authorities named in the text ----------
export type AuthorityId = "mohre" | "icp" | "gdrfa" | "dubai_police";

// A name inside an address ("mohre-jobs.com", "visa@mohre.example") is part of that address, not a
// mention of the authority: the look-alike check reads addresses.
const NOT_IN_ADDRESS_BEFORE = "(?<![@./\\w-])";
const NOT_IN_ADDRESS_AFTER = "(?![\\w-]{0,63}\\.[a-z]{2,})(?!\\w)";
const named = (source: string, flags: string) => new RegExp(`${NOT_IN_ADDRESS_BEFORE}(?:${source})${NOT_IN_ADDRESS_AFTER}`, flags);

const AUTHORITY_PATTERNS: readonly { id: AuthorityId; pattern: RegExp }[] = [
  { id: "mohre", pattern: named("mohre|ministry of human resources(?: (?:and|&) emiratisation)?", "gi") },
  // "ICP" only in capitals; the long name in any case.
  { id: "icp", pattern: named("ICP", "g") },
  { id: "icp", pattern: named("federal authority for identity", "gi") },
  // "Amer" alone is also a first name, so only "Amer centre" or "Amer service" counts.
  { id: "gdrfa", pattern: named("gdrfa(?:-?d)?|general directorate of residency and foreigners affairs|amer (?:cent(?:er|re)s?|services?)", "gi") },
  { id: "dubai_police", pattern: named("dubai police", "gi") },
];

export type AuthorityMention = { id: AuthorityId; quote: string; index: number };

export function authorityMentions(text: string): AuthorityMention[] {
  return AUTHORITY_PATTERNS.flatMap(({ id, pattern }) =>
    take(text, pattern).map((m) => ({ id, quote: m[0], index: m.index ?? 0 })),
  );
}

// ---------- Text that speaks as, or for, a UAE authority ----------
// A plain mention ("your offer letter will be issued through MoHRE") is not enough. These cues are
// read only when the text also names an authority above; "the Ministry" then refers back to it.
const AUTH =
  "(?:mohre|ministry of human resources(?: (?:and|&) emiratisation)?|icp|federal authority for identity|gdrfa(?:-?d)?|general directorate of residency and foreigners affairs|amer (?:cent(?:er|re)s?|services?)|dubai police|ministry)";
const SP = "[ \\t]+";
const ARTICLE = `(?:(?:an?|the|our)${SP})?`;
const ROLE = "(?:officer|agent|official|representative|inspector|staff|employee)s?";
const SPEAKS_AS: readonly RegExp[] = [
  // "This is MoHRE", "We are from the Ministry", "I am an officer of MoHRE", "on behalf of GDRFA".
  new RegExp(
    `\\b(?:this is|we are|we're|i am|i'm|i work (?:for|at|with)|we work (?:for|at|with)|on behalf of|representing|acting for)${SP}(?:(?:from|with|at)${SP})?${ARTICLE}(?:${ROLE}${SP}(?:of|from|at|with)${SP}${ARTICLE})?${AUTH}\\b`,
    "gi",
  ),
  // "Greetings from the Ministry", "This message is from MoHRE".
  new RegExp(`\\b(?:greetings|hello|hi|(?:this|our)${SP}(?:message|e-?mail|letter|notice|call|sms)(?:${SP}is)?)${SP}(?:from|sent by|on behalf of)${SP}${ARTICLE}${AUTH}\\b`, "gi"),
  // "MoHRE officer", "Ministry agent", "MoHRE recruitment team".
  new RegExp(`\\b${AUTH}${SP}(?:officer|agent|representative|inspector|staff|employee|recruit(?:er|ment${SP}(?:team|officer|desk|department|agent)))s?\\b`, "gi"),
  // "an officer from MoHRE", "representative of the Ministry".
  new RegExp(`\\b${ROLE}${SP}(?:from|of|at|with)${SP}${ARTICLE}${AUTH}\\b`, "gi"),
];
// "Approved by MoHRE" counts only together with a payment asked for (the red-flag rule RF-001).
const APPROVED_BY = new RegExp(
  `\\b(?:(?:approved|authori[sz]ed|certified|registered|licensed|endorsed|accredited|sanctioned|verified|appointed)${SP}by${SP}${ARTICLE}${AUTH}|${AUTH}[ \\t-]+(?:approved|authori[sz]ed|certified|registered|licensed|accredited))\\b`,
  "gi",
);
const SENDER_LINE = /^[ \t]*(?:from|sender|sent by)[ \t]*:[^\n]{0,160}$/gim;
// A sign-off line ("Regards," or "Regards, MoHRE Team"), then up to three lines of signature.
const SIGN_OFF =
  /^[ \t]*(?:(?:best |kind |warm |with )?regards|sincerely|yours (?:sincerely|faithfully|truly)|thanks(?: and regards)?|thank you)[ \t]*(?:[.!]|,(?:[ \t]*[^\n.!?]{1,60})?)?[ \t]*$(?:\n[^\n]{0,120}){0,3}/gim;

// The cue counts only where its words name an authority ("ICP" in capitals) or say "Ministry".
const namesAuthority = (words: string) => authorityMentions(words).length > 0 || /\bministry\b/i.test(words);

// The words that present the text as coming from, or acting for, a UAE authority.
export function speaksForAuthority(text: string): string[] {
  const cues = SPEAKS_AS.flatMap((pattern) => take(text, pattern).map((m) => m[0])).filter(namesAuthority);
  const sender = take(text, SENDER_LINE).map((m) => m[0]).filter((line) => authorityMentions(line).length > 0);
  const signature = take(text, SIGN_OFF).flatMap((m) =>
    m[0].split("\n").filter((line) => authorityMentions(line).length > 0),
  );
  return [...cues, ...sender, ...signature].map(quote);
}

export function approvalClaims(text: string): string[] {
  return take(text, APPROVED_BY).map((m) => m[0]).filter(namesAuthority).map(quote);
}

// An email address or link the text ties to a named authority: "MoHRE portal www.x.com",
// "MoHRE: x@mail.com", "contact GDRFA at x@mail.com", "www.x.com, the official MoHRE portal".
const ADDRESS_NOUN =
  "(?:(?:online|payment)[ \\t]+)?(?:portal|website|web site|site|page|link|e-?mail(?:[ \\t]+address)?|address|account|desk|office|help ?desk|service)";
const NAME_THEN_ADDRESS = new RegExp(
  `^(?:['’]s)?[ \\t]*(?:official[ \\t]+)?(?:${ADDRESS_NOUN}[ \\t]*)?(?:[:\\-–(][ \\t]*|(?:at|on|via|through|is)[ \\t]+)?$`,
  "i",
);
const ADDRESS_THEN_NAME = /^[ \t]*(?:[,(\-–][ \t]*)?(?:is[ \t]+)?(?:(?:the|our)[ \t]+)?(?:official[ \t]+)?$/i;
const MAX_GAP = 60;

export function addressesTiedToAuthority(text: string): { address: string; host: string }[] {
  const mentions = authorityMentions(text);
  const addresses = [
    ...emails(text).map((e) => ({ address: e.address, host: e.domain, index: e.index })),
    ...links(text).map((l) => ({ address: l.raw, host: l.host, index: l.index })),
  ];
  return addresses
    .filter((a) =>
      mentions.some((m) => {
        const mEnd = m.index + m.quote.length;
        if (a.index >= mEnd) {
          const gap = text.slice(mEnd, a.index);
          return gap.length <= MAX_GAP && NAME_THEN_ADDRESS.test(gap);
        }
        const gap = text.slice(a.index + a.address.length, m.index);
        return a.index + a.address.length <= m.index && gap.length <= MAX_GAP && ADDRESS_THEN_NAME.test(gap);
      }),
    )
    .map(({ address, host }) => ({ address: quote(address), host }));
}

// ---------- Company or government body named as the sender ----------
const COMPANY_SUFFIX =
  "LLC|L\\.L\\.C\\.?|FZE|FZCO|FZ-LLC|DMCC|Ltd\\.?|Limited|Group|Company|Co\\.|Corporation|Corp\\.?|Inc\\.?|PJSC|Establishment|Est\\.|Trading|Hospitality|Hotels?|Resorts?|Contracting|Holdings?|Industries";
const COMPANY_NAME = new RegExp(`\\b(?:[A-Z][A-Za-z&'-]{0,30}[ \\t]+){1,5}(?:${COMPANY_SUFFIX})(?![A-Za-z])`, "g");
const GOVERNMENT_BODY = /\b(?:Ministry of (?:[A-Z][a-z]{1,20}[ \t]?){1,4}|Government of (?:the )?(?:UAE|United Arab Emirates|Dubai|Abu Dhabi|Sharjah)|(?:Dubai|Abu Dhabi|Sharjah) Police|Federal Authority)\b/g;

export function companyClaims(text: string): string[] {
  return [
    ...take(text, COMPANY_NAME).map((m) => quote(m[0])),
    ...take(text, GOVERNMENT_BODY).map((m) => quote(m[0])),
    ...authorityMentions(text).map((m) => m.quote),
  ];
}

// ---------- Messaging apps ----------
const APP = "(?:whats\\s?app|telegram)";
const MESSAGING_LINK = /\b(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me)\//gi;
const MESSAGING_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "t.me", "telegram.me", "telegram.org"]);
// "Join our Telegram channel", "Add me on WhatsApp".
const JOIN_APP = new RegExp(
  `\\b(?:join|add[ \\t]+(?:me|us)[ \\t]+on)[ \\t]+(?:our[ \\t]+|my[ \\t]+|the[ \\t]+|this[ \\t]+)?${APP}\\b`,
  "gi",
);
// "Contact us only on WhatsApp", "Telegram only".
const ONLY_ON_APP = new RegExp(
  `\\b(?:only|solely|strictly|exclusively)[ \\t]+(?:(?:on|via|through|by|over|using)[ \\t]+)?${APP}\\b|\\b${APP}[ \\t]+only\\b`,
  "gi",
);
// "Message HR on WhatsApp", "Continue the process on Telegram".
const ASK_ON_APP = new RegExp(
  `\\b(?:contact|message|text|reply|write|chat|continue|talk|reach|join|add|send|ping|call|connect)\\b[^.!?\\n]{0,60}?\\b(?:on|via|through|over|using|in|at)[ \\t]+(?:our[ \\t]+|my[ \\t]+|the[ \\t]+|this[ \\t]+)?${APP}\\b`,
  "gi",
);
const NEGATED_BEFORE = /\b(?:never|not|don['’]t|do not|no one|nobody)\b[^.!?\n]{0,40}$/i;

export function messagingAsks(text: string): { quotes: string[]; exclusive: boolean } {
  const kept = (pattern: RegExp) =>
    take(text, pattern).filter((m) => !NEGATED_BEFORE.test(text.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0)));
  const exclusive = kept(ONLY_ON_APP);
  const asks = [...exclusive, ...kept(ASK_ON_APP), ...kept(JOIN_APP), ...take(text, MESSAGING_LINK)];
  return { quotes: [...new Set(asks.map((m) => quote(m[0])))], exclusive: exclusive.length > 0 };
}

export function isMessagingHost(host: string): boolean {
  return MESSAGING_HOSTS.has(host.toLowerCase());
}

// ---------- "No fees" claims ----------
const NO_FEES =
  /\b(?:no|zero|without(?: any)?)[ \t]+(?:[a-z]{1,15}[ \t]+){0,2}?(?:fees?|charges?|costs?)\b|\bfree of (?:charge|cost)\b|\b(?:do(?:es)?(?: not|n['’]t)|never|will not|won['’]t)[ \t]+charge[ \t]+(?:any|you|candidates|applicants)\b/gi;

export function noFeeClaims(text: string): string[] {
  return take(text, NO_FEES).map((m) => quote(m[0]));
}

// ---------- Salary currencies ----------
const CURRENCIES: readonly { code: string; pattern: string }[] = [
  { code: "AED", pattern: "aed|dhs?\\.?|dirhams?" },
  { code: "USD", pattern: "usd|us\\$|\\$|dollars?" },
  { code: "INR", pattern: "inr|rs\\.?|₹|rupees?" },
  { code: "SAR", pattern: "sar|riyals?" },
  { code: "QAR", pattern: "qar" },
  { code: "OMR", pattern: "omr" },
  { code: "KWD", pattern: "kwd" },
  { code: "BHD", pattern: "bhd" },
  { code: "EUR", pattern: "eur|euros?|€" },
  { code: "GBP", pattern: "gbp|£|pounds?" },
  { code: "PHP", pattern: "php|₱|pesos?" },
];
const CURRENCY_ANY = CURRENCIES.map((c) => c.pattern).join("|");
const NUMBER = "\\d[\\d,.]{0,15}";
const AMOUNT = new RegExp(
  `(?<![a-z])(?:${CURRENCY_ANY})[ \\t]?${NUMBER}|${NUMBER}[ \\t]?(?:${CURRENCY_ANY})(?![a-z])`,
  "gi",
);
const SALARY_WORDS =
  /\b(?:salary|salaries|wages?|package|ctc|stipend|remuneration|compensation|per month|a month|monthly|per annum|a year|annually|p\.m)\b/i;
const SENTENCE = /[^.!?\n]{1,400}/g;

function currencyOf(amount: string): string | null {
  const lower = amount.toLowerCase();
  for (const { code, pattern } of CURRENCIES) {
    if (new RegExp(`(?:^|[\\d\\s])(?:${pattern})(?:$|[\\d\\s])`, "i").test(lower)) return code;
  }
  return null;
}

// The salary amounts, one per currency, from sentences that talk about salary.
export function salaryCurrencies(text: string): { code: string; quote: string }[] {
  const byCode = new Map<string, string>();
  for (const sentence of take(text, SENTENCE)) {
    if (!SALARY_WORDS.test(sentence[0])) continue;
    for (const amount of take(sentence[0], AMOUNT)) {
      const code = currencyOf(amount[0]);
      if (code && !byCode.has(code)) byCode.set(code, quote(amount[0]));
    }
  }
  return [...byCode].map(([code, q]) => ({ code, quote: q }));
}
