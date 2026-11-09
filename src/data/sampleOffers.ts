// Four synthetic sample offers for the Offer Analyzer: three scam-style, one genuine-style. Written for
// this app. No real company, person, phone number or address: every name is made up and every email
// domain is a reserved example domain or a free-mail placeholder. The expected band is checked by
// src/data/sampleOffers.test.ts against the real rules, so a card never claims a result the engine
// does not give.

export type SampleChannel = "Email" | "WhatsApp" | "LinkedIn" | "Document";

export type SampleOffer = {
  id: string;
  name: string;
  channel: SampleChannel;
  kind: "scam" | "genuine";
  description: string;
  text: string;
};

export const SAMPLE_OFFERS: readonly SampleOffer[] = [
  {
    id: "visa-fee",
    name: "Visa fee before joining",
    channel: "Email",
    kind: "scam",
    description: "A large salary, no interview, and a visa fee to pay to an agent first.",
    text: `From: Falcon Crest Hospitality HR <falconcrest.hr.jobs@gmail.com>
Subject: Appointment letter - Front Office Supervisor

Dear candidate,
You are selected for Front Office Supervisor at Falcon Crest Hospitality, Dubai. No interview needed.
Salary AED 18,000 per month with free accommodation.
Please pay the visa processing fee of AED 1,950 to our travel agent within 24 hours or your offer will be cancelled.
Send your passport copy to complete the file.`,
  },
  {
    id: "whatsapp-otp",
    name: "WhatsApp code request",
    channel: "WhatsApp",
    kind: "scam",
    description: "A chat job offer that asks for the code sent to your phone.",
    text: `Hello! I am Rania from Bright Path Staffing. You are shortlisted for a part-time online job, AED 500 per day.
To activate your work account, please share the OTP you receive on your phone right now.
Offer valid today only, reply urgently.`,
  },
  {
    id: "documents-deposit",
    name: "Deposit and bank documents",
    channel: "LinkedIn",
    kind: "scam",
    description: "A message asking for a refundable deposit and your bank details.",
    text: `Hi, we reviewed your profile for the Warehouse Lead role at Sandline Logistics.
To reserve your position, transfer a refundable deposit of AED 800 and send your Emirates ID copy and bank statement.
Please act immediately as positions are limited.
Contact: sandline.recruit@yahoo.com`,
  },
  {
    id: "genuine-letter",
    name: "Standard offer letter",
    channel: "Document",
    kind: "genuine",
    description: "A plain offer that says the employer pays all visa costs.",
    text: `Dear Aisha,
We are pleased to offer you the position of Payroll Officer at Example Trading LLC, Abu Dhabi.
Basic salary AED 11,000 per month plus housing allowance.
The company pays all visa, medical and work permit costs. No payment is requested from you.
Your MoHRE offer letter will be issued for your signature.
Please reply to careers@example.ae within 10 working days.`,
  },
];
