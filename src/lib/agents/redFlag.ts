import type { Finding, Severity } from "../types";

const MAX_QUOTES_PER_FINDING = 3;
const MAX_QUOTE_CHARS = 200;

type Scan = {
  evidence: string[];
  warnings: string[];
};

type Rule = {
  id: string;
  check: string;
  severity: Severity;
  // Names the info finding emitted when negation suppresses this rule.
  warningCheck?: string;
  scan: (text: string) => Scan;
};

// Splits on punctuation so "Do not delay, pay the fee" is two clauses, but keeps "12,000",
// "hr.jobs@gmail.com" and table rows such as "Visa fee: paid by employer" or "Visa fee: AED 500" whole.
const CLAUSE =
  /(?:[^.!?;:,\n]|(?<=\d),(?=\d)|(?<=\w)\.(?=\w)|(?<=\b(?:rs|dhs?))\.(?=\s*\d)|:(?=\s*(?:paid|covered|borne|sponsored|free|aed|dhs?|usd|inr|rs|₹|\$|\d)))+/gi;
// One clause can hold two ideas: "Flights are covered and you pay the visa fee". Exclusions and
// negation apply to each part separately, so one part cannot clear the other.
const CLAUSE_PART =
  /(?=\b(?:so|and|but|however|although|though|yet|instead|after|once|before|until|unless|then|just)\b)/i;
// "Send your passport and OTP": a list after "and" still belongs to the verb before it.
const AND_PART = /^and\b/i;
const MAX_LIST_REACH_CHARS = 120;
const MAX_LIST_ITEMS = 12;
const MAX_SENTENCE_TAIL_CHARS = 200;
const SENTENCE_TAIL = new RegExp(`^[^.!?;\\n]{0,${MAX_SENTENCE_TAIL_CHARS}}`);
// A list item is a bare noun phrase. Any of these gives the part its own verb or a new idea.
const NOT_A_LIST_ITEM =
  /^(?:and\s+)?(?:pay|transfer|deposit|remit|send)\b(?!\s+of\b)|^(?:so|but|however|although|though|yet|instead|after|once|before|until|unless|then|just)\b|\b(?:is|are|was|were|will|must|should|shall|can|has|have|had|you|please|kindly|required|due|payable|applies|apply|charged|collected)\b/i;
const SHARE_VERB =
  "(?:send|share|provide|submit|upload|forward|give|confirm|enter|tell|attach|whatsapp|email|reply with)";

// A negation counts only in the constructions below, so a stray "No" or "not" clears nothing.
const NEGATOR = "(?:\\bnever|\\bnot|\\bcannot|n['’]t)";
const NEAR_MATCH_CHARS = 40;
// Right before the ask: "Never share your OTP", "You do not need to pay the fee".
const NEGATED_AT_MATCH = new RegExp(`${NEGATOR}\\s+(?:ever\\s+)?(?:(?:need|have)\\s+to\\s+)?$`, "i");
// On an ask verb earlier in the part: "We never ask candidates to pay any visa fee".
const NEGATED_ASK = new RegExp(
  `${NEGATOR}\\s+(?:ever\\s+)?(?:be\\s+)?(?:ask|charg|requir|request|collect|demand|need|pay|transfer|deposit|remit|${SHARE_VERB})\\w*`,
  "i",
);
// A new payment verb starts a new ask: "We do not require experience pay the fee".
const NEW_ASK = /(?<!\b(?:to|or)\s)\b(?:pay|transfer|deposit|remit|send)\b/i;
const STARTS_WITH_ASK = /^(?:pay|transfer|deposit|remit|send)\b/i;
// On the cost itself: "No visa fee is required".
const NO_COST =
  /\bno\s+(?:\w+\s+){0,3}?(?:fees?|charges?|payments?|deposits?)\s+(?:(?:is|are)\s+)?(?:required|payable|needed|applicable|apply|applies|charged|collected)\b/i;
// After the cost: "Recruitment fees are not payable", "Fees will not be deducted".
const NEGATED_AFTER =
  /\b(?:(?:is|are|will|shall)\s+(?:not|never)|(?:isn|aren|won)['’]t)\s+(?:be\s+)?(?:payable|required|needed|charged|collected|deducted|applicable)\b/i;
// A warning about someone else: "Beware of agents who charge a fee".
const THIRD_PARTY_WARNING =
  /\b(?:beware|careful|watch out|avoid|report)\b.{0,40}\b(?:agents?|recruiters?|anyone|people|individuals?|scammers?|fraudsters?)\s+(?:who|that|asking|charging|requesting|demanding)\b/i;

function isNegated(text: string, match: RegExpExecArray): boolean {
  const before = text.slice(0, match.index);
  if (NEGATED_AT_MATCH.test(before.slice(-NEAR_MATCH_CHARS))) return true;
  const ask = NEGATED_ASK.exec(before);
  const matchEnd = match.index + match[0].length;
  if (ask && !NEW_ASK.test(text.slice(ask.index + ask[0].length, matchEnd))) return true;
  const noCost = NO_COST.exec(text);
  if (noCost && noCost.index <= match.index && match.index < noCost.index + noCost[0].length) {
    return true;
  }
  return !STARTS_WITH_ASK.test(match[0]) && NEGATED_AFTER.test(text.slice(match.index));
}

function quote(clause: string, matchIndex: number): string {
  if (clause.length <= MAX_QUOTE_CHARS) return clause;
  const start = Math.max(0, matchIndex - MAX_QUOTE_CHARS / 2);
  return clause.slice(start, start + MAX_QUOTE_CHARS).trim();
}

// A part with its own payer ends the list: in "Send your CV and we pay the fee", we are paying.
function withListTail(parts: string[], index: number, exclude?: RegExp): string {
  let reach = parts[index];
  for (let next = index + 1; next < parts.length; next++) {
    if (!AND_PART.test(parts[next]) || exclude?.test(parts[next])) break;
    if (reach.length >= MAX_LIST_REACH_CHARS) break;
    reach += parts[next];
  }
  return reach;
}

// The rest of the sentence after a comma, as list items: "A, B and C are paid by the company".
// With no payer in that tail, no item can cover the list, so splitting it would only cost time.
function listItemsAfter(text: string, clauseEnd: number, listEnd: RegExp): string[] {
  if (text[clauseEnd] !== ",") return [];
  const tail = SENTENCE_TAIL.exec(text.slice(clauseEnd + 1, clauseEnd + 1 + MAX_SENTENCE_TAIL_CHARS));
  const items = tail?.[0] ?? "";
  if (!listEnd.test(items)) return [];
  return items.split(",").flatMap((item) => item.trim().split(CLAUSE_PART));
}

// "The visa fee of AED 500 and the medical fee are paid by the company": the payer named in the
// last item covers every item before it. "Pay AED 500 and flights are paid by us" has its own verb.
function isCoveredByListEnd(part: string, following: string[], listEnd: RegExp): boolean {
  if (NOT_A_LIST_ITEM.test(part.trim())) return false;
  for (const item of following) {
    if (AND_PART.test(item) && listEnd.test(item)) return true;
    if (NOT_A_LIST_ITEM.test(item.trim())) return false;
  }
  return false;
}

// mention finds wording that is no request on its own, so it only ever counts when negated.
function matchClauses(patterns: RegExp[], exclude?: RegExp, mention?: RegExp, listEnd?: RegExp) {
  return (text: string): Scan => {
    const scan: Scan = { evidence: [], warnings: [] };
    for (const raw of text.matchAll(CLAUSE)) {
      const clause = raw[0].trim();
      const parts = clause.split(CLAUSE_PART);
      let tail: string[] | undefined;
      // The list check is the slow step, so it runs only for a part with a hit: on "a, a, a, ..."
      // every clause would otherwise walk the same sentence tail.
      const isCovered = (index: number, part: string) => {
        if (!listEnd) return false;
        tail ??= listItemsAfter(text, raw.index + raw[0].length, listEnd);
        const following = [...parts.slice(index + 1, index + 1 + MAX_LIST_ITEMS), ...tail];
        return isCoveredByListEnd(part, following, listEnd);
      };
      let offset = 0;
      for (const [index, part] of parts.entries()) {
        if (!exclude?.test(part)) {
          const reach = withListTail(parts, index, exclude);
          const matches = patterns
            .map((pattern) => pattern.exec(reach))
            .filter((found) => found !== null && found.index < part.length) as RegExpExecArray[];
          const mentioned = mention?.exec(part);
          if ((matches.length > 0 || mentioned) && !isCovered(index, part)) {
            const request = matches.find(
              (found) =>
                !isNegated(reach, found) && !THIRD_PARTY_WARNING.test(reach.slice(0, found.index)),
            );
            if (request) {
              scan.evidence.push(quote(clause, offset + request.index));
              break;
            }
            const suppressed =
              matches[0] ?? (mentioned && isNegated(reach, mentioned) ? mentioned : null);
            if (suppressed) scan.warnings.push(quote(clause, offset + suppressed.index));
          }
        }
        offset += part.length;
      }
    }
    return scan;
  };
}

const EMAIL = /\b[a-z0-9._%+-]{1,64}@([a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63}){1,3})\b/gi;
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "yahoo.ae",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.ae",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
  "zoho.com",
  "rediffmail.com",
]);

function findFreeEmails(text: string): Scan {
  const evidence = [...text.matchAll(EMAIL)]
    .filter((match) => FREE_EMAIL_DOMAINS.has(match[1].toLowerCase()))
    .map((match) => match[0]);
  return { evidence, warnings: [] };
}

const CURRENCY = "(?<![a-z])(?:aed|dhs?\\.?|dirhams?|usd|dollars?|inr|rs\\.?|rupees?|\\$|₹)";
const AMOUNT = `(?:${CURRENCY}\\s*\\d|\\d[\\d,.]*\\s*${CURRENCY}(?![a-z]))`;
// A money-sized number with no currency, not a count such as "Send 500 CVs".
const BARE_AMOUNT =
  "\\b(?:\\d{1,3}(?:,\\d{3})+|\\d{3,})\\b(?=\\s*(?:(?:to|into|for|now|today|as|via|by|through|at)\\b|$))";
const MONEY = `(?:${AMOUNT}|${BARE_AMOUNT})`;
// Not the noun in "your pay package", "monthly pay" or "pay of AED 9,000".
const PAY =
  "(?<!\\b(?:your|our|the|monthly|weekly|daily|hourly|annual|total|starting|overtime|basic|net|gross|base|take-home)\\s)\\bpay\\b(?!\\s+(?:of|is|package|scale|slip|rise|raise|grade|structure|band|period|date|day|rate|cheque|check|review)\\b)";
const PAYMENT_VERB = `(?:${PAY}|\\b(?:transfer|deposit|remit|send)\\b)`;
const EMPLOYER = "\\b(?:company|employer|we|hr)(?:\\s+(?:will|shall|would|to)|['’]ll)?\\s+";

const COVERED_BY_EMPLOYER =
  "\\b(?:covered|borne|paid|payable|sponsored|waived)\\s+(?:(?:directly|fully|entirely|for)\\s+)?by\\s+(?:(?:the|our|your)\\s+)?(?:\\w+\\s+)?(?:company|employer|us|sponsor)\\b";
const EMPLOYER_COVERS_COST = new RegExp(
  [
    COVERED_BY_EMPLOYER,
    "\\b(?:is|are|will be)\\s+(?:covered|waived|sponsored)\\b",
    `${EMPLOYER}(?:covers?|pays?|bears?|sponsors?|transfers?|sends?|deposits?)\\b`,
    "\\b(?:salary|wages?|payroll)\\s+(?:transfers?|deposits?|payments?)\\b",
    "\\bwps\\b",
    "\\bfree of charge\\b",
    "\\bat no cost\\b",
  ].join("|"),
  "i",
);
const EMPLOYER_SENDS = new RegExp(`${EMPLOYER}(?:send|give|confirm|provide|email|forward|share)\\b`, "i");
// "You will receive a one-time password": a code coming to the candidate is not a request for it.
const CREDENTIAL_NOT_ASKED = new RegExp(
  `${EMPLOYER_SENDS.source}|\\byou(?:['’]ll|\\s+will)\\s+(?:receive|get)\\b`,
  "i",
);

export const RULES: Rule[] = [
  {
    id: "RF-001",
    check: "fee_requested",
    severity: "high",
    warningCheck: "fee_mentioned_in_warning",
    scan: matchClauses(
      [
        new RegExp(`${PAYMENT_VERB}.{0,40}\\b(?:fees?|charges|money)\\b`, "i"),
        new RegExp(
          `${PAYMENT_VERB}.{0,40}?\\d.{0,60}?\\b(?:confirm|secure|reserve|release|activate|process)\\w*`,
          "i",
        ),
        new RegExp(`${PAYMENT_VERB}.{0,40}${MONEY}`, "i"),
        new RegExp(
          `\\b(?:fees?|charges?|costs?|payment)\\s*(?:[:-]\\s*|(?:of|is|amount)\\s+)?${MONEY}`,
          "i",
        ),
        /\b(?:fees?|charges|deposits?)\b.{0,30}\b(?:required|due\b(?!\s+to\b)|payable|applicable|mandatory|applies|apply|non-refundable|must be paid|to be paid|on you|from you|on candidate|deducted|collected|charged)\b/i,
        /\b(?:settle|clear|arrange|bring|submit|charged?|collects?)\b.{0,40}\b(?:fees?|charges|deposits?)\b/i,
        /\b(?:candidates?|applicants?|you)\s+(?:bears?|(?:is|are)\s+responsible\s+for|must\s+(?:bear|cover))\b.{0,40}\b(?:fees?|charges|costs?)\b/i,
      ],
      EMPLOYER_COVERS_COST,
      /\b(?:charg\w*|fees?|deposits?)\b/i,
      new RegExp(COVERED_BY_EMPLOYER, "i"),
    ),
  },
  {
    id: "RF-002",
    check: "credentials_requested",
    severity: "high",
    warningCheck: "credentials_mentioned_in_warning",
    scan: matchClauses(
      [
        new RegExp(`\\b${SHARE_VERB}\\b.{0,40}\\b(?:otp|cvv|cvc)\\b`, "i"),
        /\b(?:otp|cvv|cvc)\s+(?:(?:is|are)\s+)?(?:needed|required)\b/i,
        /\b(?:need|require|want)\s+(?:your|the|that|this)\s+(?:\w+\s+)?(?:otp|cvv|cvc|password)\b/i,
        /\b(?:send|give|share|tell)\s+us\s+(?:your|the|that|this)\s+(?:\w+\s+)?code\b(?!\s+of\b)/i,
        /\bbank(?:ing)?\s+login\b|\bonline\s+banking\s+(?:password|login|credentials|details)\b/i,
        /\bone[- ]time (?:password|passcode|code|pin)\b/i,
        /\b(?:debit|credit|atm) card (?:number|details)\b/i,
        new RegExp(
          `\\b${SHARE_VERB}\\b.{0,40}\\b(?:password|verification code|card number|(?:your|atm|card|bank)\\s+pin)\\b`,
          "i",
        ),
        new RegExp(`\\b${SHARE_VERB}\\b.{0,40}\\bcode\\b.{0,30}\\b(?:sent|got|receive|received)\\b`, "i"),
      ],
      CREDENTIAL_NOT_ASKED,
    ),
  },
  {
    id: "RF-003",
    check: "identity_documents_requested",
    severity: "medium",
    warningCheck: "documents_mentioned_in_warning",
    scan: matchClauses(
      [
        /\b(?:passport|emirates id)\s+(?:copy|scan|photo|number|details)\b/i,
        new RegExp(
          `\\b${SHARE_VERB}\\b.{0,40}\\b(?:passport|emirates id|bank (?:account|details|statement)|iban)\\b`,
          "i",
        ),
        /\b(?:need|require)\b.{0,20}\b(?:passport|emirates id)\b/i,
      ],
      EMPLOYER_SENDS,
    ),
  },
  {
    id: "RF-004",
    check: "urgency_pressure",
    severity: "medium",
    warningCheck: "urgency_mentioned_in_warning",
    scan: matchClauses([
      /\bwithin\s+(?:\d{1,3}|one|two|few|a few)\s+(?:hours?|hrs?|minutes?|mins?)\b(?!\s+(?:of|from)\b)/i,
      /\b(?:act|apply|reply|respond|pay|confirm|send|contact us)\s+(?:now|immediately|today|right away|asap)\b/i,
      /\b(?:today only|last chance|final notice|final reminder|urgently)\b/i,
      /\burgent\s+(?:hiring|hire|requirement|required|need|needed|vacanc(?:y|ies)|openings?|recruitment|joiners?)\b/i,
      /^\s*urgent\s*$/i,
      /\blimited\s+(?:slots?|seats?|vacanc(?:y|ies)|positions?)\b/i,
      /\b(?:offer|slot|position)\s+(?:will\s+)?(?:be cancelled|(?:expires?|lapses?)\s+(?:today|tonight|tomorrow|soon|in\s+\d|within))\b/i,
    ]),
  },
  {
    id: "RF-005",
    check: "free_email_contact",
    severity: "medium",
    scan: findFreeEmails,
  },
];

function toFinding(check: string, severity: Severity, source: string, quotes: string[]): Finding {
  return {
    agent: "red_flag",
    check,
    severity,
    evidence: [...new Set(quotes)].slice(0, MAX_QUOTES_PER_FINDING),
    confidence: "rule",
    source,
  };
}

// Offer text is untrusted data: it is only ever matched against fixed patterns, never interpreted.
export function runRedFlagWorker(offerText: string): Finding[] {
  const findings: Finding[] = [];
  for (const rule of RULES) {
    const { evidence, warnings } = rule.scan(offerText);
    if (evidence.length > 0) {
      findings.push(toFinding(rule.check, rule.severity, rule.id, evidence));
    }
    if (warnings.length > 0 && rule.warningCheck) {
      findings.push(toFinding(rule.warningCheck, "info", `${rule.id}-W`, warnings));
    }
  }
  return findings;
}
