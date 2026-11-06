import { describe, expect, it } from "vitest";
import { MAX_OFFER_CHARS } from "../types";
import { LEGIT_OFFER, SCAM_OFFER } from "./fixtures";
import { RULES, runRedFlagWorker } from "./redFlag";

// These push the reader to act, so they must never count as negation.
const URGING_PHRASES = [
  "don't forget",
  "do not forget",
  "never forget",
  "don't delay",
  "do not delay",
  "without delay",
  "no delay",
  "don't wait",
  "do not wait",
  "don't hesitate",
  "do not hesitate",
  "don't miss",
  "do not miss",
  "don't worry",
  "do not worry",
];

function checks(text: string): string[] {
  return runRedFlagWorker(text).map((finding) => finding.check);
}

describe("RF-001 fee_requested", () => {
  it.each([
    "Please pay the visa fee of AED 500",
    "A processing fee of AED 1,500 applies",
    "Visa fee of AED 500 must be paid before joining",
    "Transfer AED 300 to this account",
    "You must pay AED 2000 to confirm your slot",
    "A refundable security deposit is required",
    "Do not delay, pay the registration fee today",
  ])("flags %s", (text) => {
    expect(checks(text)).toContain("fee_requested");
  });

  it.each([
    "The company covers all visa and medical fees",
    "Visa fees are paid by the employer",
    "We do not charge any recruitment fees",
    "You will not be asked to pay any fee",
    "Monthly pay AED 12,000",
    "We will pay AED 12,000 per month",
    "Visa processing is free of charge",
    "School fees allowance included",
  ])("does not flag %s", (text) => {
    expect(checks(text)).not.toContain("fee_requested");
  });

  it.each([
    "Flights are covered but you pay the visa fee of AED 500",
    "Interview is not required just pay the visa fee of AED 500",
    "The company pays your salary after you pay the visa fee of AED 500",
    "Accommodation is free of charge but the medical fee of AED 400 is on you",
    "We will send your offer letter after you transfer AED 500",
    "There is no agency fee but a training fee of AED 900 applies",
    "Your medical is covered so pay the visa fee of AED 500",
    "Flights and hotel are covered and you pay the visa fee of AED 500",
    "The company pays your flight and you pay the visa fee of AED 500",
    "Salary through WPS and you pay the visa fee of AED 500",
    "The visa fee of AED 500 is paid to our company",
  ])("still flags a fee request that shares a clause with an employer-covered cost: %s", (text) => {
    expect(checks(text)).toContain("fee_requested");
  });

  it("quotes the whole clause so the evidence keeps its context", () => {
    const text = "Flights are covered but you pay the visa fee of AED 500";
    expect(runRedFlagWorker(text)[0].evidence).toEqual([text]);
  });

  it.each([
    "The company covers visa fees after joining",
    "Visa fees are covered by the company once you join",
  ])("does not flag an employer-covered cost followed by a connector: %s", (text) => {
    expect(checks(text)).not.toContain("fee_requested");
  });
});

describe("RF-001 employer named at the end of a list", () => {
  it.each([
    "The visa fee of AED 500 and the medical fee are paid by the company",
    "Visa fee of AED 500 and medical fee of AED 300 are paid by the employer",
    "The visa fee of AED 500, the medical fee of AED 300 and insurance are covered by the company",
    "Security deposit of AED 500 and agency fee of AED 300 are borne by the employer",
  ])("covers the whole list: %s", (text) => {
    expect(runRedFlagWorker(text)).toEqual([]);
  });

  it.each([
    "Flights are covered and you pay the visa fee of AED 500",
    "Pay the visa fee of AED 500 and flights are covered by the company",
    "Transfer AED 500 and the medical fee is paid by the company",
    "You pay the visa fee of AED 500 and the medical fee is paid by the company",
    "The visa fee of AED 500 is due and flights are paid by the company",
    "The visa fee of AED 500 but flights are paid by the company",
    "The visa fee of AED 500, your flights are paid by the company",
    "The visa fee of AED 500 and the company pays your flight",
    "The visa fee of AED 500. The medical fee and insurance are paid by the company",
  ])("still flags an ask outside the list: %s", (text) => {
    expect(checks(text)).toContain("fee_requested");
  });
});

describe("RF-001 payment wording", () => {
  it.each([
    "Transfer 500 to reserve your seat",
    "Send USD 200 to release your contract",
    "Deposit 1,500 Dhs to process your file",
    "Pay Dhs.500 to activate your permit",
    "Transfer AED500 to this account",
    "A payment of AED 900 is needed",
    "Pay AED 500 to our agent.",
    "Transfer INR 5000 to our agent",
    "Pay Rs 5,000 to our agent",
    "Pay Rs. 5,000 to our agent",
    "Send 5000 rupees to this number",
    "Pay ₹5000 now",
    "Pay 500AED today",
    "Pay 500 to our agent",
    "Transfer 1,500 to this account",
    "Visa fee: INR 5000",
    "Registration fee 500 to our agent",
  ])("flags %s", (text) => {
    expect(checks(text)).toContain("fee_requested");
  });

  it.each([
    "Send 500 CVs to our recruiters",
    "Salary INR 50,000 per month",
    "Starting pay of AED 9,000 per month",
    "Pay 3 months notice if you resign",
    "Working 40 hours 5 days a week",
    "Pay rise of 500 after probation",
  ])("does not treat %s as a payment ask", (text) => {
    expect(checks(text)).not.toContain("fee_requested");
  });

  it.each([
    "The employer will transfer AED 500 to process your visa",
    "We'll pay AED 750 to confirm your medical slot",
    "The Employer shall bear all recruitment fees",
    "Visa fee: paid by employer",
    "Your payroll deposit of AED 8,000 arrives monthly",
    "The visa fee of AED 500 is paid directly by the employer",
    "The medical fee of AED 300 is borne by the company",
    "The company bears the visa fee of AED 500",
    "The company to pay AED 500 for your medical",
  ])("does not flag an employer as payer: %s", (text) => {
    expect(checks(text)).not.toContain("fee_requested");
  });
});

describe("negation", () => {
  it.each([
    ["We never ask candidates to pay any visa fee", "fee_mentioned_in_warning", "RF-001-W"],
    ["You won't need to pay any processing fee", "fee_mentioned_in_warning", "RF-001-W"],
    ["Recruiters cannot charge recruitment fees", "fee_mentioned_in_warning", "RF-001-W"],
    ["Never share your OTP or password", "credentials_mentioned_in_warning", "RF-002-W"],
    ["Do not send your passport to anyone", "documents_mentioned_in_warning", "RF-003-W"],
  ])("suppresses %s and keeps it visible at info level", (text, check, source) => {
    const findings = runRedFlagWorker(text);
    expect(findings.map((finding) => [finding.check, finding.severity, finding.source])).toEqual([
      [check, "info", source],
    ]);
    expect(findings[0].evidence).toEqual([text]);
  });

  it("flags a request after a contrast word", () => {
    const findings = runRedFlagWorker("There is no agency fee but a training fee of AED 900 applies");
    expect(findings.map((finding) => finding.source)).toEqual(["RF-001"]);
  });

  it("flags a request after a condition word", () => {
    expect(checks("We won't issue your visa until you pay the processing fee")).toContain(
      "fee_requested",
    );
  });

  it.each(URGING_PHRASES)("does not treat the urging phrase %s as negation", (phrase) => {
    expect(URGING_PHRASES).toContain("don't forget");
    expect(URGING_PHRASES).toContain("without delay");
    expect(checks(`${phrase} to pay the visa fee of AED 500`)).toContain("fee_requested");
  });

  it("treats a curly apostrophe the same in an urging phrase", () => {
    expect(checks("Don’t forget to pay the visa fee")).toContain("fee_requested");
  });

  it.each([
    "This is not a scam so pay the visa fee of AED 500",
    "No interview is needed so pay the visa fee of AED 500",
    "We do not offer refunds then pay the visa fee of AED 500",
    "We do not offer any refunds and you pay the visa fee of AED 500",
    "No experience needed pay the visa fee",
    "No experience needed pay the visa fee of AED 500",
    "No interview needed and pay the visa fee of AED 500",
    "No later than Friday pay the visa fee of AED 500",
    "We do not require experience pay the visa fee of AED 500",
    "Experience is not required pay the visa fee of AED 500",
  ])("does not let an unrelated negation clear an ask: %s", (text) => {
    const findings = runRedFlagWorker(text);
    expect(findings.map((finding) => finding.source)).toEqual(["RF-001"]);
  });

  it.each([
    ["We never ask candidates or agents to pay any visa fee", "RF-001-W"],
    ["We never ask you or anyone in your family to pay any visa fee", "RF-001-W"],
    ["We do not charge any recruitment fees", "RF-001-W"],
    ["Recruiters will not collect a deposit", "RF-001-W"],
    ["Do not pay any fee to anyone", "RF-001-W"],
    ["No fee is required", "RF-001-W"],
    ["No visa fees are payable", "RF-001-W"],
    ["No deposit needed", "RF-001-W"],
    ["Visa fees are never charged to candidates", "RF-001-W"],
    ["Visa fees will not be deducted from your salary", "RF-001-W"],
    ["Agency fees are not collected from you", "RF-001-W"],
  ])("accepts a negation bound to the ask or cost: %s", (text, source) => {
    expect(runRedFlagWorker(text).map((finding) => finding.source)).toEqual([source]);
  });

  it("does not let wording after an imperative clear it", () => {
    const text = "Pay the visa fee of AED 500 experience is not required";
    expect(runRedFlagWorker(text).map((finding) => finding.source)).toEqual(["RF-001"]);
  });

  it.each([
    "Beware of agents who charge a fee",
    "Report any agent who collects a fee",
    "Watch out for recruiters who collect a deposit",
  ])("treats a warning about third parties as info: %s", (text) => {
    expect(runRedFlagWorker(text).map((finding) => finding.source)).toEqual(["RF-001-W"]);
  });

  it("still flags our own agents charging a fee", () => {
    expect(checks("Our agents who charge the fee of AED 500 will call you")).toContain("fee_requested");
  });

  it("does not report a bare no as a warning", () => {
    expect(runRedFlagWorker("There is no agency fee")).toEqual([]);
  });
});

describe("RF-001 needs the candidate as payer", () => {
  it.each([
    "Beware of agents asking for a processing fee",
    "Visa fees are reimbursed after joining",
    "Duties include processing visa fees for clients",
    "Your pay package includes children's school fees allowance",
    "You will handle agency fees and invoices for our clients",
    "Fees are listed on our website",
  ])("does not fire on the bare word in %s", (text) => {
    expect(runRedFlagWorker(text)).toEqual([]);
  });

  it.each([
    "Visa fee required",
    "Fee required from you",
    "Visa fee payable by the candidate",
    "Visa fee: AED 500",
    "Training fee - AED 900",
    "Medical fee will be deducted from your salary",
    "You will be charged a processing fee",
    "Kindly settle the agency fee",
    "Candidate bears the visa fee",
    "Agent fee to be collected at airport",
  ])("fires when the candidate pays: %s", (text) => {
    expect(checks(text)).toContain("fee_requested");
  });

  it("does not treat fees payable by the company as the candidate paying", () => {
    expect(checks("Visa fees are payable by the company")).not.toContain("fee_requested");
  });
});

describe("rule scope", () => {
  it.each([
    "We will send you an OTP to log in",
    "We will never ask you for your OTP or password",
    "Experience with CVV handling is an advantage",
  ])("does not treat a mention as a credentials request: %s", (text) => {
    expect(checks(text)).not.toContain("credentials_requested");
  });

  it.each(["We need your passport and Emirates ID now", "Attach a photo of your passport"])(
    "flags a document request: %s",
    (text) => {
      expect(checks(text)).toContain("identity_documents_requested");
    },
  );

  it.each([
    "We will give your passport back after visa stamping",
    "HR will confirm your Emirates ID status on arrival",
  ])("does not flag the employer handling documents: %s", (text) => {
    expect(checks(text)).not.toContain("identity_documents_requested");
  });

  it.each([
    "The office is within 30 minutes of Dubai Marina",
    "You will triage urgent customer requests",
    "We have urgent care cover on our insurance",
  ])("does not treat %s as pressure", (text) => {
    expect(checks(text)).not.toContain("urgency_pressure");
  });

  it.each(["Urgent: reply with your documents", "This offer expires tonight"])(
    "treats %s as pressure",
    (text) => {
      expect(checks(text)).toContain("urgency_pressure");
    },
  );

  it.each(["hr@hotmail.co.uk", "hr@yahoo.ae", "hr@zoho.com", "hr@outlook.ae"])(
    "flags the free email domain in %s",
    (email) => {
      expect(checks(`Contact ${email}`)).toContain("free_email_contact");
    },
  );
});

describe("RF-002 credentials_requested", () => {
  it.each([
    "Send the OTP you receive",
    "Share your card number with HR",
    "Your CVV is needed to confirm",
    "Tell us your PIN",
    "Enter your one-time password",
    "Send the one time pin you received",
    "Share your one-time pin with our agent",
    "Forward the ONE-TIME PIN from your bank",
    "We need your OTP",
    "We need the OTP from your phone",
    "Send us the code",
    "Give us the code",
    "Share us your code",
    "Tell us the code",
    "Send your CV and bank login",
    "Your online banking password is required",
    "Send your passport and OTP",
  ])("flags %s", (text) => {
    expect(checks(text)).toContain("credentials_requested");
  });

  it.each([
    ["We do not need your OTP", "RF-002-W"],
    ["Never share your bank login", "RF-002-W"],
    ["We will never ask for your online banking password", "RF-002-W"],
  ])("keeps a warning at info level: %s", (text, source) => {
    expect(runRedFlagWorker(text).map((finding) => finding.source)).toEqual([source]);
  });

  it.each([
    "Never share your OTP with anyone",
    "Never share your one-time pin with anyone",
    "Your portal password will be emailed to you",
    "Share your location pin with the driver",
    "You will receive a one-time password to activate your employee portal",
    "You need to verify your account with OTP",
    "Send us the code of conduct",
    "We will send you the code",
  ])("does not flag %s", (text) => {
    expect(checks(text)).not.toContain("credentials_requested");
  });
});

describe("RF-003 identity_documents_requested", () => {
  it.each([
    "Send your passport copy",
    "Emirates ID scan required",
    "WhatsApp your bank statement to this number",
    "Provide your IBAN today",
  ])("flags %s", (text) => {
    expect(checks(text)).toContain("identity_documents_requested");
  });

  it.each([
    "Your salary will be paid to your bank account",
    "Do not send your passport to anyone",
    "Bring your original passport on day one",
  ])("does not flag %s", (text) => {
    expect(checks(text)).not.toContain("identity_documents_requested");
  });
});

describe("RF-004 urgency_pressure", () => {
  it.each([
    "Reply within 24 hours",
    "Act now to secure this job",
    "Limited slots available",
    "This offer will expire tonight",
    "Urgent hiring for drivers",
  ])("flags %s", (text) => {
    expect(checks(text)).toContain("urgency_pressure");
  });

  it.each(["Please reply within 5 working days", "There is no urgent deadline"])(
    "does not flag %s",
    (text) => {
      expect(checks(text)).not.toContain("urgency_pressure");
    },
  );
});

describe("RF-005 free_email_contact", () => {
  it.each(["Contact hr.dept@gmail.com", "Email JOBS@YAHOO.COM", "Write to a.b@outlook.com."])(
    "flags %s",
    (text) => {
      expect(checks(text)).toContain("free_email_contact");
    },
  );

  it("does not flag a company domain", () => {
    expect(checks("Contact careers@example-logistics.ae")).not.toContain("free_email_contact");
  });
});

describe("runRedFlagWorker", () => {
  it("defines exactly 5 rules with unique ids", () => {
    expect(RULES).toHaveLength(5);
    expect(new Set(RULES.map((rule) => rule.id)).size).toBe(5);
  });

  it("returns findings in the shared format", () => {
    for (const finding of runRedFlagWorker(SCAM_OFFER)) {
      expect(finding.agent).toBe("red_flag");
      expect(finding.confidence).toBe("rule");
      expect(finding.source).toMatch(/^RF-\d{3}$/);
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });

  it("quotes evidence exactly from the offer", () => {
    for (const finding of runRedFlagWorker(SCAM_OFFER)) {
      for (const quote of finding.evidence) {
        expect(SCAM_OFFER).toContain(quote);
      }
    }
  });

  it("does not cut a quote at the dot inside an email address", () => {
    const [finding] = runRedFlagWorker("Send the OTP to hr.jobs@example.ae today.");
    expect(finding.evidence).toEqual(["Send the OTP to hr.jobs@example.ae today"]);
  });

  it("flags all 5 checks on the scam sample", () => {
    expect(checks(SCAM_OFFER)).toEqual([
      "fee_requested",
      "credentials_requested",
      "identity_documents_requested",
      "urgency_pressure",
      "free_email_contact",
    ]);
  });

  it("flags nothing on the legit sample", () => {
    expect(runRedFlagWorker(LEGIT_OFFER)).toEqual([]);
  });

  it("is deterministic", () => {
    expect(runRedFlagWorker(SCAM_OFFER)).toEqual(runRedFlagWorker(SCAM_OFFER));
  });

  it("caps evidence at 3 unique quotes", () => {
    const text =
      "Pay the visa fee. Pay the visa fee. Pay the agent fee. Pay the medical fee. Pay the ticket fee.";
    const [finding] = runRedFlagWorker(text);
    expect(finding.evidence).toEqual(["Pay the visa fee", "Pay the agent fee", "Pay the medical fee"]);
  });

  it("keeps the matched phrase in the quote for a very long clause", () => {
    const text = `${"word ".repeat(200)}pay the visa fee ${"word ".repeat(200)}`;
    const [finding] = runRedFlagWorker(text);
    expect(finding.evidence[0]).toContain("visa fee");
    expect(finding.evidence[0].length).toBeLessThanOrEqual(200);
  });

  it("handles maximum-size input quickly", () => {
    const inputs = [
      "a".repeat(MAX_OFFER_CHARS),
      "pay ".repeat(MAX_OFFER_CHARS / 4),
      "no ".repeat(MAX_OFFER_CHARS / 3),
      "and ".repeat(MAX_OFFER_CHARS / 4),
      "a, ".repeat(MAX_OFFER_CHARS / 3),
      "a,".repeat(MAX_OFFER_CHARS / 2),
      `${"a,".repeat(94)}paid by us,`.repeat(Math.floor(MAX_OFFER_CHARS / 199)),
      `${"fee,".repeat(46)}paid by us,`.repeat(Math.floor(MAX_OFFER_CHARS / 195)),
    ];
    for (const input of inputs) {
      const start = performance.now();
      runRedFlagWorker(input);
      expect(performance.now() - start).toBeLessThan(1000);
    }
  });
});
