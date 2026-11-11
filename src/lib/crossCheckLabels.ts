// Plain words for the Verification cross-checks (src/lib/agents/verification.ts), keyed by check
// name. For the browser: words only, no patterns. None of them clears an offer or a company; they
// say what the text shows.
import type { CrossCheck } from "@/lib/types";
import { CROSS_CHECK_COUNT } from "@/lib/crossCheckIds";

export const CROSS_CHECK_LABELS: Readonly<Record<string, string>> = {
  free_email_with_company_claim: "Free email address for a named company or government body",
  authority_without_official_domain: "Presents itself as a UAE authority, with no official address",
  link_shortener: "Shortened link",
  raw_ip_link: "Link to a numeric address",
  lookalike_domain: "Address that looks like an official one",
  messaging_app_only: "Asks to continue only on a messaging app",
  fee_and_no_fee_claim: "Asks for a payment and also says there are no fees",
  salary_in_two_currencies: "Salary in more than one currency",
};

export const CROSS_CHECK_REASONS: Readonly<Record<string, string>> = {
  free_email_with_company_claim: "The text names a company or a government body, but gives a free email address.",
  authority_without_official_domain:
    "The text presents itself as coming from, or acting for, a UAE authority, but gives no address on an official UAE government website from Offer Check's list, or ties an address that is not on that list to the authority.",
  link_shortener: "A shortened link hides the website it opens.",
  raw_ip_link: "The link goes to a numeric address instead of a website name.",
  lookalike_domain: "An email address or link uses the name of an official UAE government website, but is not on that website.",
  messaging_app_only: "The text asks you to continue on WhatsApp or Telegram, with no other way to reply.",
  fee_and_no_fee_claim: "The text asks you to pay and also says there are no fees.",
  salary_in_two_currencies: "The salary is given in more than one currency.",
};

export const CROSS_CHECKS_NOTE =
  "These cross-checks read only the text you checked. Nothing is looked up outside Offer Check, and they do not change the score.";
export const CROSS_CHECKS_NONE = "{0} cross-checks ran and none matched. This does not confirm that the offer is genuine.";
export const OFFICIAL_STEPS_NOTE = "Official pages and services that apply to these findings. Use the official page for current details.";

export { CROSS_CHECK_COUNT };

// Saved records and server replies are checked before use: a malformed entry is dropped.
export function validCrossChecks(value: unknown): CrossCheck[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CrossCheck =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as CrossCheck).id === "string" &&
      typeof (item as CrossCheck).check === "string" &&
      (item as CrossCheck).check in CROSS_CHECK_LABELS &&
      Array.isArray((item as CrossCheck).evidence) &&
      (item as CrossCheck).evidence.every((quote) => typeof quote === "string"),
  );
}
