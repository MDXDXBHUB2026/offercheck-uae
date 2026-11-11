// The five Verification cross-checks and the check names each can report. Plain data, shared by the
// server step (src/lib/agents/verification.ts) and the interface, which must not import the patterns.
export const CROSS_CHECKS = [
  { id: "V-01", checks: ["free_email_with_company_claim"] },
  { id: "V-02", checks: ["authority_without_official_domain"] },
  { id: "V-03", checks: ["link_shortener", "raw_ip_link", "lookalike_domain"] },
  { id: "V-04", checks: ["messaging_app_only"] },
  { id: "V-05", checks: ["fee_and_no_fee_claim", "salary_in_two_currencies"] },
] as const;

export type CrossCheckName = (typeof CROSS_CHECKS)[number]["checks"][number];

export const CROSS_CHECK_COUNT = CROSS_CHECKS.length;
