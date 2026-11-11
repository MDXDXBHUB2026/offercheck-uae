// Verification v1: deterministic cross-checks on the cleaned text only (owner decision, 2026-11-11).
// No model and no network: no domain lookup (RDAP), web search or page fetch. The cross-checks are
// score-neutral: they are returned beside the findings, never added to them, and have no weight, so
// the score, the bands and the red-flag findings are exactly what they were without this step.
// Each match carries its id, a check name (the plain reason is chosen by that name in the
// interface) and the matched words, quoted. Offer text is untrusted data, never interpreted.
import type { CrossCheck, Finding } from "../types";
import {
  authorityMentions,
  companyClaims,
  emails,
  isMessagingHost,
  isShortener,
  links,
  lookalikeOf,
  messagingAsks,
  noFeeClaims,
  quote,
  salaryCurrencies,
} from "./extract";
import { isOfficialHost } from "@/lib/officialDomains";
import { CROSS_CHECKS, type CrossCheckName } from "@/lib/crossCheckIds";

const MAX_QUOTES = 3;

export { CROSS_CHECKS };

function crossCheck(id: string, check: CrossCheckName, quotes: readonly string[]): CrossCheck {
  return { agent: "verification", id, check, evidence: [...new Set(quotes.filter(Boolean))].slice(0, MAX_QUOTES) };
}

// V-01: the free email address comes from the red-flag finding RF-005 (the same list, read once);
// the claim is a company name with a legal or trade suffix, or a government body.
function v01(text: string, findings: readonly Finding[]): CrossCheck[] {
  const freeEmail = findings.find((f) => f.source === "RF-005")?.evidence[0];
  if (!freeEmail) return [];
  const claims = companyClaims(text);
  return claims.length > 0 ? [crossCheck("V-01", "free_email_with_company_claim", [freeEmail, claims[0]])] : [];
}

// V-02: a UAE authority is named, but no email address or link in the text is on an official domain.
function v02(text: string): CrossCheck[] {
  const named = authorityMentions(text);
  if (named.length === 0) return [];
  const hosts = [...emails(text).map((e) => e.domain), ...links(text).map((l) => l.host)];
  if (hosts.some(isOfficialHost)) return [];
  return [crossCheck("V-02", "authority_without_official_domain", named.map((m) => m.quote))];
}

// V-03: a shortened link, a link to a bare IP address, or an address that looks like an official one.
function v03(text: string): CrossCheck[] {
  const found = links(text);
  const out: CrossCheck[] = [];
  const shortened = found.filter((l) => isShortener(l.host)).map((l) => quote(l.raw));
  if (shortened.length > 0) out.push(crossCheck("V-03", "link_shortener", shortened));
  const rawIp = found.filter((l) => l.rawIp).map((l) => quote(l.raw));
  if (rawIp.length > 0) out.push(crossCheck("V-03", "raw_ip_link", rawIp));
  const lookalikes = [
    ...emails(text).filter((e) => lookalikeOf(e.domain)).map((e) => e.address),
    ...found.filter((l) => !l.rawIp && lookalikeOf(l.host)).map((l) => quote(l.raw)),
  ];
  if (lookalikes.length > 0) out.push(crossCheck("V-03", "lookalike_domain", lookalikes));
  return out;
}

// V-04: the text asks to continue on WhatsApp or Telegram, and either says "only" or gives no other
// way to reply (no email address and no other link).
function v04(text: string): CrossCheck[] {
  const asks = messagingAsks(text);
  if (asks.quotes.length === 0) return [];
  const otherChannel = emails(text).length > 0 || links(text).some((l) => !isMessagingHost(l.host));
  return asks.exclusive || !otherChannel ? [crossCheck("V-04", "messaging_app_only", asks.quotes)] : [];
}

// V-05: contradictions inside the offer. A payment asked for (the red-flag finding RF-001) while the
// text also says there are no fees; or the salary given in more than one currency.
function v05(text: string, findings: readonly Finding[]): CrossCheck[] {
  const out: CrossCheck[] = [];
  const fee = findings.find((f) => f.source === "RF-001")?.evidence[0];
  const noFee = noFeeClaims(text);
  if (fee && noFee.length > 0) out.push(crossCheck("V-05", "fee_and_no_fee_claim", [fee, noFee[0]]));
  const currencies = salaryCurrencies(text);
  if (currencies.length >= 2) out.push(crossCheck("V-05", "salary_in_two_currencies", currencies.map((c) => c.quote)));
  return out;
}

// findings: the red-flag findings of the same text, read only (V-01 and V-05 reuse them).
export function runVerification(text: string, findings: readonly Finding[]): CrossCheck[] {
  return [...v01(text, findings), ...v02(text), ...v03(text), ...v04(text), ...v05(text, findings)];
}

// The distinct cross-check ids that matched, in V-01 to V-05 order.
export function matchedIds(checks: readonly CrossCheck[]): string[] {
  return CROSS_CHECKS.map((c) => c.id).filter((id) => checks.some((check) => check.id === id));
}
