// Threat Radar entries: SAMPLE REPORTS (DEMO DATA). Written for this app to show the layout; they are
// not real reports, and no real company, person, number or date appears. The radar shows them under
// the label "Sample reports (demo data)". The reference app's report dates, upvote counts and law
// references are left out: they would be invented numbers.

export const THREAT_TYPES = [
  "Advance fee",
  "Chat task job",
  "Document harvesting",
  "Look-alike sender",
] as const;

export type ThreatType = (typeof THREAT_TYPES)[number];

export type ThreatSample = {
  id: string;
  title: string;
  type: ThreatType;
  severity: "High" | "Medium";
  region: string;
  description: string;
  warningQuote: string;
};

export const SAMPLE_LABEL = "Sample reports (demo data)";

export const THREAT_SAMPLES: readonly ThreatSample[] = [
  {
    id: "demo-1",
    title: "Visa fee asked before any interview",
    type: "Advance fee",
    severity: "High",
    region: "Dubai",
    description:
      "A made-up example: an email offers a hotel job with a high salary, skips the interview, and asks for a visa processing fee paid to a travel agent.",
    warningQuote: "Please pay the visa processing fee within 24 hours or your offer will be cancelled.",
  },
  {
    id: "demo-2",
    title: "Part-time online job asks for a phone code",
    type: "Chat task job",
    severity: "High",
    region: "UAE wide",
    description:
      "A made-up example: a chat message offers daily pay for simple online tasks and asks for the one-time code sent to the phone to open an account.",
    warningQuote: "Share the OTP you receive to activate your work account.",
  },
  {
    id: "demo-3",
    title: "Deposit and bank statement to reserve a role",
    type: "Document harvesting",
    severity: "High",
    region: "Sharjah",
    description:
      "A made-up example: a recruiter asks for a refundable deposit, an Emirates ID copy and a bank statement before any written offer.",
    warningQuote: "Transfer a refundable deposit and send your Emirates ID copy and bank statement.",
  },
  {
    id: "demo-4",
    title: "Company name used from a free email address",
    type: "Look-alike sender",
    severity: "Medium",
    region: "Abu Dhabi",
    description:
      "A made-up example: a message uses a company-sounding name but is sent from a free email address instead of the company's own domain.",
    warningQuote: "Contact our HR team at the free-mail address below for joining formalities.",
  },
];
